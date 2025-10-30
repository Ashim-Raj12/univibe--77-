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
        Faculty Room
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
