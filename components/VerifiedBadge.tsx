import React from "react";
import { Profile } from "../types";

interface VerifiedBadgeProps {
  profile: Profile;
  size?: string;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  profile,
  size = "h-5 w-5",
}) => {
  // A user with a PRO subscription should always display the PRO badge,
  // which takes precedence over the standard verification badge.
  if (profile.has_pro_badge) {
    return (
      <div className="group relative inline-flex pro-badge-shine rounded-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`text-yellow-500 ${size}`}
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="absolute bottom-full mb-2 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          PRO User
        </span>
      </div>
    );
  }

  // If not a PRO user, check if they are verified.
  if (profile.is_verified) {
    const isStudent = profile.enrollment_status !== "parent";
    const tooltipText = isStudent ? "Verified Student" : "Verified Parent";
    const customColor = profile.badge_color;
    const colorClass = customColor ? "" : "text-primary";
    const style = customColor ? { color: customColor } : {};

    return (
      <div className="group relative inline-flex">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`${colorClass} ${size}`}
          style={style}
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="absolute bottom-full mb-2 w-max bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          {tooltipText}
        </span>
      </div>
    );
  }

  // If neither PRO nor verified, show nothing.
  return null;
};

export default React.memo(VerifiedBadge);
