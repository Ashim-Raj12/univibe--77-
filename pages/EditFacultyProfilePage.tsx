import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/Spinner";
import { toast } from "../components/Toast";

const debounce = <F extends (...args: any[]) => any>(
  func: F,
  delay: number
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

interface OfficeHours {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

const EditFacultyProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [state, setState] = useState("");
  const [homeTown, setHomeTown] = useState("");
  const [gender, setGender] = useState("");
  const [course, setCourse] = useState("");
  const [username, setUsername] = useState("");
  const [hobbiesInterests, setHobbiesInterests] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [researchInterests, setResearchInterests] = useState<string[]>([]);
  const [newResearchInterest, setNewResearchInterest] = useState("");
  const [education, setEducation] = useState<
    { degree: string; institution: string; year: number }[]
  >([]);
  const [publications, setPublications] = useState<string[]>([]);
  const [newPublication, setNewPublication] = useState("");
  const [officeHours, setOfficeHours] = useState<OfficeHours[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .single();

        if (error) throw error;

        // Set form values
        setName(data.name || "");
        setTitle(data.faculty_title || "");
        setDepartment(data.department || "");
        setOfficeLocation(data.office_location || "");
        setBio(data.bio || "");
        setCollege(data.college || "");
        setState(data.state || "");
        setHomeTown(data.home_town || "");
        setGender(data.gender || "");
        setCourse(data.course || "");
        setUsername(data.username || "");
        setHobbiesInterests(
          Array.isArray(data.hobbies_interests)
            ? data.hobbies_interests
            : data.hobbies_interests
            ? data.hobbies_interests.split(",").map((h) => h.trim())
            : []
        );
        setLinkedinUrl(data.linkedin_url || "");
        setTwitterUrl(data.twitter_url || "");
        setGithubUrl(data.github_url || "");
        setResearchInterests(data.research_interests || []);
        setEducation(data.education_background || []);
        setPublications(data.publications || []);
        setAvatarUrl(data.avatar_url || "");

        // Fetch office hours
        const { data: hoursData, error: hoursError } = await supabase
          .from("faculty_office_hours")
          .select("*")
          .eq("faculty_id", user?.id);

        if (hoursError) throw hoursError;
        setOfficeHours(hoursData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAvatarFile(event.target.files[0]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkUsername = useCallback(
    debounce(async (uname: string) => {
      setUsernameLoading(true);
      if (uname.length > 0 && uname !== user?.username) {
        if (!/^[a-z0-9_]{3,15}$/.test(uname)) {
          setUsernameError("3-15 lowercase letters, numbers, or underscores.");
          setUsernameLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", uname);
        if (error) {
          console.error("Error checking username:", error);
          setUsernameError("Error checking username availability.");
        } else {
          setUsernameError(
            data && data.length > 0 ? "Username is already taken." : null
          );
        }
      } else {
        setUsernameError(null);
      }
      setUsernameLoading(false);
    }, 500),
    [user?.username]
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(value);
    if (value.length > 0) {
      setUsernameLoading(true);
      checkUsername(value);
    } else {
      setUsernameError(null);
      setUsernameLoading(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split(".").pop();
    const filePath = `${user?.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) throw uploadError;

    return `https://jcjkomunegqtjbamfila.supabase.co/storage/v1/object/public/avatars/${filePath}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Upload new avatar if selected
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = (await uploadAvatar()) || avatarUrl;
      }

      // Update profile
      const updates: any = {
        name,
        faculty_title: title,
        department,
        office_location: officeLocation,
        bio,
        college,
        state,
        home_town: homeTown,
        gender,
        course,
        hobbies_interests: hobbiesInterests.join(", "),
        linkedin_url: linkedinUrl,
        twitter_url: twitterUrl,
        github_url: githubUrl,
        research_interests: researchInterests,
        education_background: education,
        publications,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (!user.username) {
        updates.username = username;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update office hours
      // First delete existing hours
      await supabase
        .from("faculty_office_hours")
        .delete()
        .eq("faculty_id", user.id);

      // Then insert new hours
      if (officeHours.length > 0) {
        const { error: hoursError } = await supabase
          .from("faculty_office_hours")
          .insert(
            officeHours.map((hours) => ({
              ...hours,
              faculty_id: user.id,
            }))
          );

        if (hoursError) throw hoursError;
      }

      toast.success("Profile updated successfully!");
      navigate(`/faculty/${user.id}`);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <h1 className="text-3xl font-bold text-text-heading mb-6">
        Edit Faculty Profile
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 space-y-6"
      >
        <div className="flex items-center gap-6">
          <img
            src={
              avatarFile
                ? URL.createObjectURL(avatarFile)
                : avatarUrl || "/default-avatar.png"
            }
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-slate-100"
          />
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() =>
                (
                  document.querySelector(
                    'input[type="file"]'
                  ) as HTMLInputElement
                )?.click()
              }
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
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="title"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="e.g., Professor of Computer Science"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="department"
            >
              Department
            </label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="officeLocation"
            >
              Office Location
            </label>
            <input
              id="officeLocation"
              type="text"
              value={officeLocation}
              onChange={(e) => setOfficeLocation(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                required
                disabled={!!user.username}
                maxLength={15}
              />
              {usernameLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            {!!user.username ? (
              <p className="text-xs text-text-muted mt-1">
                Username cannot be changed.
              </p>
            ) : usernameError ? (
              <p className="text-red-500 text-xs mt-1">{usernameError}</p>
            ) : username.length > 2 && !usernameLoading ? (
              <p className="text-green-600 text-xs mt-1">Username available!</p>
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
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
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
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300 resize-none"
            placeholder="Tell us about yourself..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="college"
            >
              College
            </label>
            <input
              id="college"
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Your college name"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="state"
            >
              State
            </label>
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Your state"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="homeTown"
            >
              Home Town
            </label>
            <input
              id="homeTown"
              type="text"
              value={homeTown}
              onChange={(e) => setHomeTown(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Your home town"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="course"
            >
              Course
            </label>
            <input
              id="course"
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Your course"
            />
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-medium text-text-body mb-2"
            htmlFor="hobbies"
          >
            Hobbies & Interests
          </label>
          <div className="flex gap-2">
            <input
              id="hobbies"
              type="text"
              value={newHobby}
              onChange={(e) => setNewHobby(e.target.value)}
              className="flex-1 w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Add a hobby or interest"
            />
            <button
              type="button"
              onClick={() => {
                if (newHobby.trim()) {
                  setHobbiesInterests([...hobbiesInterests, newHobby.trim()]);
                  setNewHobby("");
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-focus transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {hobbiesInterests.map((hobby, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-slate-100 text-text-body rounded-full text-sm flex items-center"
              >
                {hobby}
                <button
                  type="button"
                  onClick={() =>
                    setHobbiesInterests(
                      hobbiesInterests.filter((_, i) => i !== index)
                    )
                  }
                  className="ml-2 text-slate-500 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="linkedin"
            >
              LinkedIn URL
            </label>
            <input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="twitter"
            >
              Twitter URL
            </label>
            <input
              id="twitter"
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="https://twitter.com/yourhandle"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="github"
            >
              GitHub URL
            </label>
            <input
              id="github"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="https://github.com/yourusername"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-text-heading mb-4 border-t pt-6">
          Research Interests
        </h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newResearchInterest}
              onChange={(e) => setNewResearchInterest(e.target.value)}
              className="flex-1 w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Add a research interest"
            />
            <button
              type="button"
              onClick={() => {
                if (newResearchInterest.trim()) {
                  setResearchInterests([
                    ...researchInterests,
                    newResearchInterest.trim(),
                  ]);
                  setNewResearchInterest("");
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-focus transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {researchInterests.map((interest, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-slate-100 text-text-body rounded-full text-sm flex items-center"
              >
                {interest}
                <button
                  type="button"
                  onClick={() =>
                    setResearchInterests(
                      researchInterests.filter((_, i) => i !== index)
                    )
                  }
                  className="ml-2 text-slate-500 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-text-heading mb-4 border-t pt-6">
          Education Background
        </h3>
        <div className="space-y-4">
          {education.map((edu, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => {
                    const newEducation = [...education];
                    newEducation[index].degree = e.target.value;
                    setEducation(newEducation);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                  placeholder="Degree"
                />
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => {
                    const newEducation = [...education];
                    newEducation[index].institution = e.target.value;
                    setEducation(newEducation);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                  placeholder="Institution"
                />
                <input
                  type="number"
                  value={edu.year}
                  onChange={(e) => {
                    const newEducation = [...education];
                    newEducation[index].year = parseInt(e.target.value);
                    setEducation(newEducation);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                  placeholder="Year"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setEducation(education.filter((_, i) => i !== index))
                }
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setEducation([
                ...education,
                {
                  degree: "",
                  institution: "",
                  year: new Date().getFullYear(),
                },
              ])
            }
            className="px-4 py-2 text-sm bg-slate-100 text-text-body rounded-xl hover:bg-slate-200 transition-colors"
          >
            Add Education
          </button>
        </div>

        <h3 className="text-lg font-semibold text-text-heading mb-4 border-t pt-6">
          Publications
        </h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPublication}
              onChange={(e) => setNewPublication(e.target.value)}
              className="flex-1 w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
              placeholder="Add a publication"
            />
            <button
              type="button"
              onClick={() => {
                if (newPublication.trim()) {
                  setPublications([...publications, newPublication.trim()]);
                  setNewPublication("");
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-focus transition-colors"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {publications.map((pub, index) => (
              <div key={index} className="flex items-center justify-between">
                <p className="text-text-body">{pub}</p>
                <button
                  type="button"
                  onClick={() =>
                    setPublications(publications.filter((_, i) => i !== index))
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-text-heading mb-4 border-t pt-6">
          Office Hours
        </h3>
        <div className="space-y-4">
          {officeHours.map((hours, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <select
                  value={hours.day_of_week}
                  onChange={(e) => {
                    const newHours = [...officeHours];
                    newHours[index].day_of_week = parseInt(e.target.value);
                    setOfficeHours(newHours);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                >
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, i) => (
                    <option key={i} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={hours.start_time}
                  onChange={(e) => {
                    const newHours = [...officeHours];
                    newHours[index].start_time = e.target.value;
                    setOfficeHours(newHours);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                />
                <input
                  type="time"
                  value={hours.end_time}
                  onChange={(e) => {
                    const newHours = [...officeHours];
                    newHours[index].end_time = e.target.value;
                    setOfficeHours(newHours);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                />
                <input
                  type="text"
                  value={hours.location}
                  onChange={(e) => {
                    const newHours = [...officeHours];
                    newHours[index].location = e.target.value;
                    setOfficeHours(newHours);
                  }}
                  className="block w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300"
                  placeholder="Location"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setOfficeHours(officeHours.filter((_, i) => i !== index))
                }
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setOfficeHours([
                ...officeHours,
                {
                  day_of_week: 1,
                  start_time: "09:00",
                  end_time: "10:00",
                  location: "",
                  notes: "",
                },
              ])
            }
            className="px-4 py-2 text-sm bg-slate-100 text-text-body rounded-xl hover:bg-slate-200 transition-colors"
          >
            Add Office Hours
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-sm font-semibold text-text-body bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || usernameLoading || !!usernameError}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-focus rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {saving ? <Spinner size="sm" /> : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditFacultyProfilePage;
