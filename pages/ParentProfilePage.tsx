import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import Spinner from "../components/Spinner";
import { Profile } from "../types";
import ConfirmationModal from "../components/ConfirmationModal";
import ProfileCompletionAlert from "../components/ProfileCompletionAlert";

const debounce = <F extends (...args: any[]) => any>(
  func: F,
  delay: number
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const ParentProfilePage: React.FC = () => {
  const {
    user,
    profile,
    loading: authLoading,
    refetchProfile,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    linkedin_url: "",
    twitter_url: "",
    github_url: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.enrollment_status !== "parent") {
        navigate("/home", { replace: true });
      } else {
        setFormData({
          name: profile.name || "",
          username: profile.username || "",
          bio: profile.bio || "",
          linkedin_url: profile.linkedin_url || "",
          twitter_url: profile.twitter_url || "",
          github_url: profile.github_url || "",
        });
        setPreview(profile.avatar_url);
        setPageLoading(false);
      }
    }
  }, [authLoading, profile, navigate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkUsername = useCallback(
    debounce(async (uname: string) => {
      setUsernameLoading(true);
      if (uname.length > 0 && uname !== profile?.username) {
        if (!/^[a-z0-9_]{3,15}$/.test(uname)) {
          setUsernameError("3-15 lowercase letters, numbers, or underscores.");
          setUsernameLoading(false);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", uname)
          .single();
        setUsernameError(data ? "Username is already taken." : null);
      } else {
        setUsernameError(null);
      }
      setUsernameLoading(false);
    }, 500),
    [profile?.username]
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData((prev) => ({ ...prev, username: value }));
    if (value.length > 0) {
      setUsernameLoading(true);
      checkUsername(value);
    } else {
      setUsernameError(null);
      setUsernameLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || usernameError || usernameLoading) return;

    setLoading(true);
    setError(null);
    let avatarUrl = profile.avatar_url;

    try {
      if (avatarFile) {
        const filePath = `${user.id}/avatar`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
        avatarUrl = `${publicUrl}?t=${new Date().getTime()}`;
      }

      const updates: Partial<Profile> = {
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        linkedin_url: formData.linkedin_url || null,
        twitter_url: formData.twitter_url || null,
        github_url: formData.github_url || null,
        avatar_url: avatarUrl,
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refetchProfile();
      navigate(`/profile/${user.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("delete_own_user_account");
      if (rpcError) throw rpcError;

      await signOut();
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(
        "Failed to delete account. Please try again or contact support."
      );
      console.error("Error deleting account:", err);
      setIsDeleting(false);
    }
  };

  const inputClasses =
    "w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

  if (pageLoading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <ProfileCompletionAlert />
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <h1 className="text-3xl font-bold text-text-heading mb-6">
          Edit Parent Profile
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 space-y-6"
        >
          <div className="flex items-center gap-6">
            <img
              src={
                preview || `https://avatar.vercel.sh/${user?.id}.png?text=UV`
              }
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-4 border-slate-100"
            />
            <div>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                Change Photo
              </button>
              <p className="text-xs text-text-muted mt-2">
                PNG, JPG, WEBP up to 2MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="name"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="username"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  className={inputClasses}
                  required
                />
                {usernameLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
              {usernameError ? (
                <p className="text-red-500 text-xs mt-1">{usernameError}</p>
              ) : (
                formData.username.length > 2 &&
                !usernameLoading &&
                formData.username !== profile?.username && (
                  <p className="text-green-600 text-xs mt-1">
                    Username available!
                  </p>
                )
              )}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="bio"
            >
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className={inputClasses}
              rows={3}
            ></textarea>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-text-heading mb-4">
              Social Links
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-text-body mb-2"
                  htmlFor="linkedin_url"
                >
                  LinkedIn URL
                </label>
                <input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-text-body mb-2"
                  htmlFor="twitter_url"
                >
                  Twitter URL
                </label>
                <input
                  id="twitter_url"
                  name="twitter_url"
                  type="url"
                  value={formData.twitter_url}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-text-body mb-2"
                  htmlFor="github_url"
                >
                  GitHub URL
                </label>
                <input
                  id="github_url"
                  name="github_url"
                  type="url"
                  value={formData.github_url}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="pt-6 border-t border-red-200">
            <h3 className="font-semibold text-red-700">Danger Zone</h3>
            <p className="text-sm text-red-600 mt-1">
              Deleting your account is permanent and cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
            >
              Delete My Account
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200/60 flex justify-end gap-3">
            <Link
              to={`/profile/${user?.id}`}
              className="px-6 py-2.5 text-sm font-semibold text-text-body bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || usernameLoading || !!usernameError}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-focus rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {loading ? <Spinner size="sm" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? All of your data will be erased. This action cannot be undone."
        confirmText="Yes, Delete My Account"
        isLoading={isDeleting}
      />
    </>
  );
};

export default ParentProfilePage;
