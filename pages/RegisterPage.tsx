import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "../services/supabase";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Spinner from "../components/Spinner";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { indianStatesAndUTs } from "../data/states";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../components/Toast";
import WebsiteLogo from "../components/WebsiteLogo";
import AuthLayout from "../components/AuthLayout";

const UserTypeButton: React.FC<{
  onClick: () => void;
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}> = ({ onClick, selected, icon, title, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 flex items-center gap-4 ${
      selected
        ? "bg-primary/10 border-primary shadow-soft"
        : "bg-transparent border-border hover:border-slate-300"
    }`}
  >
    <div
      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        selected ? "bg-primary text-white" : "bg-dark-card text-text-muted"
      }`}
    >
      {icon}
    </div>
    <div>
      <p
        className={`font-semibold ${
          selected ? "text-primary" : "text-text-heading"
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-text-body">{subtitle}</p>
    </div>
  </button>
);

const performUsernameCheck = async (
  username: string
): Promise<string | null> => {
  if (!username) return null;
  if (!/^[a-z0-9_]{3,15}$/.test(username)) {
    return "3–15 lowercase letters, numbers, or underscores.";
  }
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();
  return data ? "Username is already taken." : null;
};

const RegisterPage: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    userType: "admitted" as "admitted" | "exploring" | "parent" | "faculty",
    email: "",
    password: "",
    name: "",
    username: "",
    college: "",
    state: "",
    enrollmentStatus: "" as
      | "current_student"
      | "incoming_student"
      | "passed_out"
      | "exploring"
      | "",
    joiningYear: "",
    facultyTitle: "",
    department: "",
    consultationRate: "",
    consultationAvailable: false,
    consultationDuration: 30,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [allColleges, setAllColleges] = useState<string[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [filteredColleges, setFilteredColleges] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const collegeDropdownRef = useRef<HTMLDivElement>(null);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/home", { replace: true });
    }
  }, [session, authLoading, navigate]);

  useEffect(() => {
    const fetchColleges = async () => {
      setCollegesLoading(true);
      const { data } = await supabase
        .from("colleges")
        .select("name")
        .order("name");
      if (data) setAllColleges(data.map((c) => c.name));
      setCollegesLoading(false);
    };
    fetchColleges();
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return setFilteredColleges([]);
    const filtered = collegeSearch
      ? allColleges.filter((c) =>
          c.toLowerCase().includes(collegeSearch.toLowerCase())
        )
      : allColleges;
    setFilteredColleges(filtered.slice(0, 100));
  }, [collegeSearch, allColleges, isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        collegeDropdownRef.current &&
        !collegeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData((p) => ({ ...p, username: value }));
    if (usernameCheckTimeout.current)
      clearTimeout(usernameCheckTimeout.current);
    setUsernameLoading(true);
    usernameCheckTimeout.current = setTimeout(async () => {
      const err = await performUsernameCheck(value);
      setUsernameError(err);
      setUsernameLoading(false);
    }, 500);
  };

  const handleCollegeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setCollegeSearch(value);
    if (!isDropdownOpen) setIsDropdownOpen(true);
  };

  const handleCollegeSelect = (collegeName: string) => {
    setFormData((p) => ({ ...p, college: collegeName }));
    setCollegeSearch(collegeName);
    setIsDropdownOpen(false);
  };

  const isStudent =
    formData.userType === "admitted" || formData.userType === "exploring";

  const derivedEnrollmentStatus = useMemo(() => {
    if (formData.userType === "parent") return "parent";
    if (formData.userType === "exploring") return "exploring";
    if (formData.userType === "faculty") return "faculty";
    return formData.enrollmentStatus;
  }, [formData.userType, formData.enrollmentStatus]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent && !formData.college.trim())
      return setError("Please select or add your college.");
    if (usernameError || usernameLoading)
      return setError("Please resolve username issues.");

    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: signUpError,
    } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          enrollment_status: derivedEnrollmentStatus,
          referrer_id: searchParams.get("ref") || null,
        },
      },
    });

    if (signUpError || !user) {
      setError(signUpError?.message || "Registration failed.");
      setLoading(false);
      return;
    }

    try {
      const joiningYearNumber = formData.joiningYear
        ? parseInt(formData.joiningYear, 10)
        : null;

      const payload: any = {
        id: user.id,
        name: formData.name.trim(),
        username: formData.username.trim(),
        state: formData.state,
        enrollment_status: derivedEnrollmentStatus,
        joining_year: joiningYearNumber,
      };

      if (isStudent && formData.college)
        payload.college = formData.college.trim();
      if (formData.userType === "faculty") {
        const rate = parseFloat(formData.consultationRate);
        payload.faculty_title = formData.facultyTitle.trim();
        payload.department = formData.department.trim();
        payload.consultation_rate = isNaN(rate) ? null : rate;
        payload.consultation_available = !!formData.consultationAvailable;
        payload.consultation_duration =
          parseInt(String(formData.consultationDuration), 10) || 30;
      }

      console.log("Payload being sent:", payload); // Debug log

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(payload);
      if (upsertError) {
        console.error("Upsert error:", upsertError); // Debug log
        toast.error(
          `Could not save all profile details: ${upsertError.message}`
        );
        setLoading(false);
        return;
      }
      setIsSuccess(true);
    } catch (err) {
      console.error("Catch error:", err); // Debug log
      toast.error("An error occurred while saving your profile.");
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full px-4 py-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-border">
          <h1 className="text-2xl font-bold text-text-heading">
            Almost there!
          </h1>
          <p className="text-text-body mt-2">
            We’ve sent a verification link to <strong>{formData.email}</strong>.
          </p>
          {formData.userType === "faculty" ? (
            <div className="mt-6 space-y-3">
              <p className="text-text-body">
                Since you registered as faculty, you can complete your faculty
                profile now.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/edit-faculty-profile"
                  className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold"
                >
                  Complete Faculty Profile
                </Link>
                <Link
                  to="/login"
                  className="inline-block bg-white border border-border px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-block mt-6 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold"
            >
              Back to Login
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-3xl font-bold text-text-heading"
        >
          <WebsiteLogo />
          <span>UniVibe</span>
        </Link>
        <h1 className="text-2xl font-bold text-text-heading mt-4">
          Create Your Account
        </h1>
        <p className="text-text-body">Join your campus community today.</p>
      </div>

      <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-border">
        <form onSubmit={handleRegister} className="space-y-6">
          {/* user type selection */}
          <div className="space-y-3">
            <UserTypeButton
              onClick={() =>
                setFormData((p) => ({ ...p, userType: "admitted" }))
              }
              selected={formData.userType === "admitted"}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              title="Admitted Student"
              subtitle="You have an offer letter from a college."
            />
            <UserTypeButton
              onClick={() =>
                setFormData((p) => ({ ...p, userType: "exploring" }))
              }
              selected={formData.userType === "exploring"}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              }
              title="Exploring Colleges"
              subtitle="You're preparing for admissions."
            />
            <UserTypeButton
              onClick={() =>
                setFormData((p) => ({ ...p, userType: "faculty" }))
              }
              selected={formData.userType === "faculty"}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2a2 2 0 00-2 2v2H8a2 2 0 00-2 2v2h12V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zM6 14v6h12v-6H6zm3 2h6v2H9v-2z" />
                </svg>
              }
              title="Faculty / Staff"
              subtitle="Representing a college — create your faculty profile."
            />
            <UserTypeButton
              onClick={() => setFormData((p) => ({ ...p, userType: "parent" }))}
              selected={formData.userType === "parent"}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              }
              title="Parent / Guardian"
              subtitle="You're a parent supporting your child."
            />
          </div>

          <hr className="border-border" />

          {/* general inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              className={inputClasses}
              required
            />
            <div>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  placeholder="Username"
                  className={inputClasses}
                  required
                  maxLength={15}
                />
                {usernameLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
              {usernameError ? (
                <p className="text-red-500 text-xs mt-1">{usernameError}</p>
              ) : formData.username.length > 2 && !usernameLoading ? (
                <p className="text-green-600 text-xs mt-1">
                  Username available!
                </p>
              ) : null}
            </div>
          </div>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Address"
            className={inputClasses}
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className={`${inputClasses} pr-12`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-4 flex items-center text-text-muted hover:text-text-body"
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>

          <PasswordStrengthMeter password={formData.password} />

          {/* student fields */}
          {isStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div ref={collegeDropdownRef} className="relative">
                <input
                  type="text"
                  name="college"
                  value={collegeSearch}
                  onChange={handleCollegeChange}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={
                    collegesLoading
                      ? "Loading colleges..."
                      : "College / University"
                  }
                  className={inputClasses}
                  required={isStudent}
                  autoComplete="off"
                />
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredColleges.length > 0 ? (
                      filteredColleges.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onMouseDown={() => handleCollegeSelect(c)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-dark-card"
                        >
                          {c}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onMouseDown={() => handleCollegeSelect(collegeSearch)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-dark-card"
                      >
                        Add "
                        <strong className="text-primary">
                          {collegeSearch}
                        </strong>
                        "
                      </button>
                    )}
                  </div>
                )}
              </div>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={inputClasses}
                required={isStudent}
              >
                <option value="" disabled>
                  Home State
                </option>
                {indianStatesAndUTs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* admitted student fields */}
          {formData.userType === "admitted" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <select
                name="enrollmentStatus"
                value={formData.enrollmentStatus}
                onChange={handleChange}
                className={inputClasses}
                required
              >
                <option value="" disabled>
                  Enrollment Status
                </option>
                <option value="incoming_student">Future Student</option>
                <option value="current_student">Current Student</option>
                <option value="passed_out">Alumni</option>
              </select>
              <input
                type="number"
                name="joiningYear"
                value={formData.joiningYear}
                onChange={handleChange}
                placeholder="Joining Year (e.g., 2024)"
                className={inputClasses}
                min="1900"
                max="2100"
              />
            </div>
          )}

          {/* faculty fields */}
          {formData.userType === "faculty" && (
            <div className="space-y-4">
              <input
                type="text"
                name="facultyTitle"
                value={formData.facultyTitle}
                onChange={handleChange}
                placeholder="Title (e.g., Assistant Professor)"
                className={inputClasses}
                required
              />
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Department (e.g., Computer Science)"
                className={inputClasses}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  name="consultationRate"
                  value={formData.consultationRate}
                  onChange={handleChange}
                  placeholder="Consultation Rate (₹)"
                  className={inputClasses}
                  min="0"
                />
                <input
                  type="number"
                  name="consultationDuration"
                  value={String(formData.consultationDuration)}
                  onChange={handleChange}
                  placeholder="Duration (minutes)"
                  className={inputClasses}
                  min="10"
                />
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="consultationAvailable"
                  checked={!!formData.consultationAvailable}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text-body">
                  Available for consultations
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center font-semibold shadow-soft"
            >
              {loading ? <Spinner size="sm" /> : "Create Account"}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-text-body">
        Already have an account?{" "}
        <Link
          to={formData.userType === "faculty" ? "/faculty-login" : "/login"}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;
