import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";

const ProfileCompletionAlert: React.FC = () => {
  const { profile } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Reset dismissal on profile change
    setIsDismissed(false);
  }, [profile]);

  if (!profile || isDismissed) return null;

  const isProfileIncomplete = () => {
    if (!profile.name?.trim() || !profile.username?.trim()) return true;

    if (profile.enrollment_status === "parent") {
      return !profile.bio?.trim();
    }

    // Students and faculty
    const requiredFields = [
      "college",
      "state",
      "gender",
      "bio",
      "home_town",
      "course",
      "hobbies_interests",
    ];

    for (const field of requiredFields) {
      if (!profile[field as keyof typeof profile]?.toString().trim()) {
        return true;
      }
    }

    return false;
  };

  if (!isProfileIncomplete()) return null;

  const getEditLink = () => {
    if (profile.enrollment_status === "parent") return "/edit-parent-profile";
    if (profile.enrollment_status === "faculty") return "/edit-faculty-profile";
    return "/edit-profile";
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">
              Your profile is incomplete. Please fill in all required fields to
              unlock all features.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={getEditLink()}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
          >
            Complete Profile
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-red-400 hover:text-red-600 p-1"
            title="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionAlert;
