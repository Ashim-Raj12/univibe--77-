import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import Spinner from "../components/Spinner";
import { Profile } from "../types";
import ConfirmationModal from "../components/ConfirmationModal";
import { indianStatesAndUTs } from "../data/states";
import { toast } from "../components/Toast";
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

const EditProfilePage: React.FC = () => {
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
    college: "",
    home_town: "",
    state: "",
    course: "",
    joining_year: "",
    hobbies_interests: "",
    enrollment_status: "current_student" as
      | "current_student"
      | "incoming_student"
      | "passed_out"
      | "exploring",
    gender: "male" as "male" | "female",
    linkedin_url: "",
    twitter_url: "",
    github_url: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [collegeInput, setCollegeInput] = useState("");
  const [filteredColleges, setFilteredColleges] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allColleges, setAllColleges] = useState<string[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const collegeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.enrollment_status === "parent") {
        navigate("/home", { replace: true });
      } else {
        setFormData({
          name: profile.name || "",
          username: profile.username || "",
          bio: profile.bio || "",
          college: profile.college || "",
          home_town: profile.home_town || "",
          state: profile.state || "",
          course: profile.course || "",
          joining_year: profile.joining_year?.toString() || "",
          hobbies_interests: profile.hobbies_interests || "",
          enrollment_status: profile.enrollment_status || "current_student",
          gender: profile.gender || "male",
          linkedin_url: profile.linkedin_url || "",
          twitter_url: profile.twitter_url || "",
          github_url: profile.github_url || "",
        });
        setPreview(profile.avatar_url);
        setCollegeInput(profile.college || "");
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

  useEffect(() => {
    const fetchColleges = async () => {
      setCollegesLoading(true);
      const { data, error } = await supabase
        .from("colleges")
        .select("name")
        .order("name", { ascending: true });
      if (data) {
        setAllColleges(data.map((c) => c.name));
      }
      setCollegesLoading(false);
    };
    fetchColleges();
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) {
      setFilteredColleges([]);
      return;
    }
    const filtered = allColleges.filter((c) =>
      c.toLowerCase().includes(collegeInput.toLowerCase())
    );
    setFilteredColleges(filtered.slice(0, 100));
  }, [collegeInput, allColleges, isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collegeDropdownRef.current &&
        !collegeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        if (collegeInput !== formData.college) {
          setCollegeInput(formData.college);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [formData.college, collegeInput]);

  const handleCollegeSelect = (selected: string) => {
    setFormData((prev) => ({ ...prev, college: selected }));
    setCollegeInput(selected);
    setIsDropdownOpen(false);
  };

  const handleCollegeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCollegeInput(value);
    setFormData((prev) => ({ ...prev, college: "" }));
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
    if (!user || !profile) return;

    if (!formData.college && !profile.college) {
      setError("Please select a valid college from the list.");
      return;
    }

    if (!profile.username) {
      if (usernameError || usernameLoading || !formData.username) {
        setError("Please set a valid username.");
        return;
      }
    }

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
        bio: formData.bio,
        course: formData.course,
        home_town: formData.home_town,
        hobbies_interests: formData.hobbies_interests,
        gender: formData.gender as any,
        linkedin_url: formData.linkedin_url || null,
        twitter_url: formData.twitter_url || null,
        github_url: formData.github_url || null,
        avatar_url: avatarUrl,
        enrollment_status: formData.enrollment_status as any,
      };

      if (!profile.username) {
        updates.username = formData.username;
      }

      if (!profile.college) {
        updates.college = formData.college;
        updates.state = formData.state;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (updateError) throw updateError;

      await refetchProfile();
      toast.success("Profile updated successfully!");
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
    "w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300 disabled:bg-slate-100 disabled:cursor-not-allowed";

  const isFaculty = profile?.enrollment_status === "faculty";

  if (pageLoading || authLoading || !profile) {
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
          Edit Profile
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  disabled={!!profile.username}
                  maxLength={15}
                />
                {usernameLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
              {!!profile.username ? (
                <p className="text-xs text-text-muted mt-1">
                  Username cannot be changed.
                </p>
              ) : usernameError ? (
                <p className="text-red-500 text-xs mt-1">{usernameError}</p>
              ) : formData.username.length > 2 && !usernameLoading ? (
                <p className="text-green-600 text-xs mt-1">
                  Username available!
                </p>
              ) : null}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="gender"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={inputClasses}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div ref={collegeDropdownRef} className="relative">
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="college"
              >
                College / University
              </label>
              <input
                id="college"
                type="text"
                value={collegeInput}
                onChange={handleCollegeInputChange}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => {
                    if (collegeInput !== formData.college) {
                      setCollegeInput(formData.college);
                    }
                  }, 150);
                }}
                className={inputClasses}
                placeholder={
                  collegesLoading ? "Loading..." : "Search for your college..."
                }
                required
                disabled={collegesLoading || !!profile.college}
                autoComplete="off"
              />
              {!!profile.college && (
                <p className="text-xs text-text-muted mt-1">
                  College cannot be changed after initial setup.
                </p>
              )}
              {isDropdownOpen && !profile.college && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredColleges.length > 0 ? (
                    filteredColleges.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCollegeSelect(c);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-body hover:bg-slate-100"
                      >
                        {c}
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-sm text-text-muted">
                      {collegeInput ? "No results found." : "Start typing..."}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="home_town"
              >
                Home Town
              </label>
              <input
                id="home_town"
                name="home_town"
                type="text"
                value={formData.home_town}
                onChange={handleChange}
                className={inputClasses}
                placeholder="e.g., Mumbai"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="state"
              >
                Home State / Union Territory
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={inputClasses}
                required
                disabled={!!profile.college}
              >
                <option value="" disabled>
                  Select your state...
                </option>
                {indianStatesAndUTs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="course"
              >
                Course / Major
              </label>
              <input
                id="course"
                name="course"
                type="text"
                value={formData.course}
                onChange={handleChange}
                className={inputClasses}
                placeholder="e.g., Computer Science"
              />
            </div>
            {!isFaculty && (
              <div>
                <label
                  className="block text-sm font-medium text-text-body mb-2"
                  htmlFor="joining_year"
                >
                  Graduation Year (Batch)
                </label>
                <input
                  id="joining_year"
                  name="joining_year"
                  type="number"
                  value={formData.joining_year}
                  className={inputClasses}
                  placeholder="e.g., 2029"
                  disabled
                />
                <p className="text-xs text-text-muted mt-1">
                  Graduation year cannot be changed after registration.
                </p>
              </div>
            )}
          </div>
          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="hobbies_interests"
            >
              Hobbies & Interests
            </label>
            <input
              id="hobbies_interests"
              name="hobbies_interests"
              type="text"
              value={formData.hobbies_interests}
              onChange={handleChange}
              className={inputClasses}
              placeholder="e.g., Coding, Gaming, Reading"
            />
            <p className="text-xs text-text-muted mt-1">
              Separate with commas.
            </p>
          </div>
          {!isFaculty && (
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="enrollment_status"
              >
                Enrollment Status
              </label>
              <select
                id="enrollment_status"
                name="enrollment_status"
                value={formData.enrollment_status}
                onChange={handleChange}
                className={inputClasses}
                required
              >
                <option value="incoming_student">Future Student</option>
                <option value="current_student">Current Student</option>
                <option value="passed_out">Alumni / Passed Out</option>
              </select>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-text-heading mb-4 border-t pt-6">
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
                  Twitter (X) URL
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
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="pt-4 border-t border-slate-200/60 flex justify-end gap-3">
            <Link
              to={`/profile/${user?.id}`}
              className="px-6 py-2.5 text-sm font-semibold text-text-body bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={
                loading ||
                (collegesLoading && !profile.college) ||
                usernameLoading ||
                !!usernameError
              }
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

export default EditProfilePage;
