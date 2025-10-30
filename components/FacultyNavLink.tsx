import React from "react";
import { NavLink } from "react-router-dom";
import { UserSubscriptionWithPlan, Profile } from "../types";

interface FacultyNavLinksProps {
  isMobile: boolean;
  navLinkClasses: (props: { isActive: boolean }) => string;
  closeMobileMenu: () => void;
  subscription: UserSubscriptionWithPlan | null;
  profile: Profile | null;
  onSignOut: () => void;
}

const FacultyNavLinks: React.FC<FacultyNavLinksProps> = ({
  isMobile,
  navLinkClasses,
  closeMobileMenu,
  subscription,
  profile,
  onSignOut,
}) => {
  const idSuffix = isMobile ? "-mobile" : "-desktop";

  return (
    <nav
      className={`items-start gap-1 ${
        isMobile ? "flex flex-col w-full" : "flex flex-col"
      }`}
    >
      <NavLink
        to="/faculty-common-room"
        id={`tour-faculty-common-room${idSuffix}`}
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
            clipRule="evenodd"
          />
        </svg>
        <span>Faculty Room</span>
      </NavLink>
      <NavLink
        to="/faculty"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Find Faculty
      </NavLink>
      <NavLink
        to="/my-consultations"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Consultations
      </NavLink>

      <hr className="my-3 border-slate-200/60" />
      <NavLink
        to="/chat"
        id={`tour-messages${idSuffix}`}
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Messages
      </NavLink>
      <NavLink
        to="/subscriptions"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        {subscription ? "Manage Subscription" : "✨ Go Pro"}
      </NavLink>
      <NavLink to="/about" className={navLinkClasses} onClick={closeMobileMenu}>
        About Us
      </NavLink>
      <NavLink
        to="/download-app"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Download App
      </NavLink>
      <NavLink
        to="/feedback"
        id={`tour-feedback${idSuffix}`}
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Feedback
      </NavLink>

      <hr className="my-3 border-slate-200/60" />

      <div className="bg-white rounded-lg p-1 border border-slate-200/80 w-full">
        {profile && (
          <NavLink
            to={`/profile/${profile.id}`}
            className={navLinkClasses}
            onClick={closeMobileMenu}
          >
            My Profile
          </NavLink>
        )}
        <button
          onClick={() => {
            closeMobileMenu();
            onSignOut();
          }}
          className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-colors text-red-600 hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default FacultyNavLinks;
