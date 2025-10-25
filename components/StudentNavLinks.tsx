import React from "react";
import { NavLink } from "react-router-dom";
import { Profile, UserSubscriptionWithPlan } from "../types";
import { User } from "@supabase/supabase-js";

interface StudentNavLinksProps {
  isMobile: boolean;
  navLinkClasses: (props: { isActive: boolean }) => string;
  closeMobileMenu: () => void;
  profile: Profile | null;
  user: User | null;
  subscription: UserSubscriptionWithPlan | null;
  isAdmin: boolean;
  onSignOut: () => void;
  unreadMessagesCount?: number;
}

const StudentNavLinks: React.FC<StudentNavLinksProps> = ({
  isMobile,
  navLinkClasses,
  closeMobileMenu,
  profile,
  user,
  subscription,
  isAdmin,
  onSignOut,
  unreadMessagesCount = 0,
}) => {
  const isPro =
    subscription?.status === "active" &&
    subscription.subscriptions.name === "PRO";

  return (
    <nav
      className={`items-start gap-1 ${
        isMobile ? "flex flex-col w-full" : "flex flex-col"
      }`}
    >
      {/* Main */}
      <NavLink to="/home" className={navLinkClasses} onClick={closeMobileMenu}>
        Home
      </NavLink>

      <hr className="my-3 border-slate-200/60" />

      {/* Discovery */}
      <NavLink
        to="/find-fellows"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Find Fellows
      </NavLink>
      <NavLink
        to="/suggestions"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Suggestions
      </NavLink>
      <NavLink
        to={`/friends?userId=${user?.id}`}
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        My Network
      </NavLink>
      <NavLink
        to="/feedback"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Feedback
      </NavLink>

      <hr className="my-3 border-slate-200/60" />

      {/* Campus Life */}
      <NavLink
        to="/communities"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        Communities
      </NavLink>
      <NavLink
        to="/global-events"
        className={navLinkClasses}
        onClick={closeMobileMenu}
      >
        <span className="flex items-center gap-2">
          Global Events
          {!isPro && (
            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
              PRO
            </span>
          )}
        </span>
      </NavLink>
      {profile?.is_verified && (
        <>
          <NavLink
            to="/college-hub"
            className={navLinkClasses}
            onClick={closeMobileMenu}
          >
            <span className="truncate">
              {profile?.college || "College Hub"}
            </span>
          </NavLink>

          <NavLink
            to="/study-hub"
            className={navLinkClasses}
            onClick={closeMobileMenu}
          >
            Study Hub
          </NavLink>

          <NavLink
            to="/vibecollab"
            className={navLinkClasses}
            onClick={closeMobileMenu}
          >
            <span className="flex items-center gap-2">VibeCollab</span>
          </NavLink>

          <NavLink
            to="/campus-tour"
            className={navLinkClasses}
            onClick={closeMobileMenu}
          >
            <span className="flex items-center gap-2">
              Campus Tour
              {!isPro && (
                <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                  PRO
                </span>
              )}
            </span>
          </NavLink>
        </>
      )}

      <hr className="my-3 border-slate-200/60" />

      {/* Comms & Info */}
      <NavLink to="/chat" className={navLinkClasses} onClick={closeMobileMenu}>
        <span className="flex items-center gap-2">
          <span>Messages</span>
          {unreadMessagesCount > 0 && (
            <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
              {unreadMessagesCount}
            </span>
          )}
        </span>
      </NavLink>

      {subscription ? (
        <NavLink
          to="/subscriptions"
          className={navLinkClasses}
          onClick={closeMobileMenu}
        >
          Manage Subscription
        </NavLink>
      ) : (
        <NavLink
          to="/subscriptions"
          className={navLinkClasses}
          onClick={closeMobileMenu}
        >
          ✨ Go Pro
        </NavLink>
      )}
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

      {isAdmin && (
        <>
          <hr className="my-3 border-slate-200/60" />
          <NavLink
            to="/admin/dashboard"
            className={navLinkClasses}
            onClick={closeMobileMenu}
          >
            Admin Panel
          </NavLink>
        </>
      )}

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
        <NavLink
          to="/wallet"
          className={navLinkClasses}
          onClick={closeMobileMenu}
        >
          My Wallet
        </NavLink>
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

export default StudentNavLinks;
