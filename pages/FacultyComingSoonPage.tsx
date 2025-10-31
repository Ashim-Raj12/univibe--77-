import React from "react";
import { Link } from "react-router-dom";
import WebsiteLogo from "../components/WebsiteLogo";

const FacultyComingSoonPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-soft border border-border text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-3xl font-bold text-text-heading mb-8"
        >
          <WebsiteLogo />
          <span>UniVibe</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-heading mb-4">
            Faculty Portal Coming Soon
          </h1>
          <p className="text-text-body mb-6">
            We're working hard to bring you an amazing faculty experience. In
            the meantime, you can explore the platform as a student or parent.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/register"
            className="block w-full bg-primary text-white py-3 px-6 rounded-xl hover:bg-primary-focus transition-all duration-300 font-semibold shadow-soft"
          >
            Register as Student
          </Link>

          <Link
            to="/login"
            className="block w-full bg-dark-card text-text-heading py-3 px-6 rounded-xl hover:bg-dark-card/80 transition-all duration-300 font-semibold border border-border"
          >
            Sign In as Student
          </Link>

          <Link
            to="/faculty-login"
            className="block w-full bg-transparent text-primary py-3 px-6 rounded-xl hover:bg-primary/10 transition-all duration-300 font-semibold"
          >
            Faculty Login
          </Link>
        </div>

        <p className="mt-8 text-sm text-text-muted">
          Have questions? Contact us at{" "}
          <a
            href="mailto:support@univibe.com"
            className="text-primary hover:underline"
          >
            programwithashim@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default FacultyComingSoonPage;
