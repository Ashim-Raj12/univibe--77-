import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Spinner from "../components/Spinner";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../components/Toast";
import WebsiteLogo from "../components/WebsiteLogo";
import AuthLayout from "../components/AuthLayout";

const FacultyLoginPage: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/home", { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check if user is faculty
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("enrollment_status")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Unable to verify faculty status. Please try regular login.");
        setLoading(false);
        return;
      }

      if (profile.enrollment_status !== "faculty") {
        setError(
          "This login page is for faculty members only. Please use the regular login."
        );
        setLoading(false);
        return;
      }

      // Faculty login successful - redirect to college hub
      navigate("/college-hub", { replace: true });
    }
  };

  const inputClasses =
    "w-full px-4 py-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

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
          Faculty Login
        </h1>
        <p className="text-text-body">Sign in to your faculty account.</p>
      </div>

      <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-border">
        <form onSubmit={handleLogin} className="space-y-6">
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

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center font-semibold shadow-soft"
            >
              {loading ? <Spinner size="sm" /> : "Sign In"}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-text-body">
        Not a faculty member?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Student Login
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-text-body">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};

export default FacultyLoginPage;
