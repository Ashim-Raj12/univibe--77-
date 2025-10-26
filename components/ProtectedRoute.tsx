import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Navbar from "./Navbar";
import Spinner from "./Spinner";
import OnboardingTour, { TourStep } from "./OnboardingTour";
import UpgradeToPro from "./UpgradeToPro";
import ProfileCompletionAlert from "./ProfileCompletionAlert";
import { supabase } from "../services/supabase";
import {
  getRoleFromProfile,
  getHomePathForProfile,
} from "../pages/ProfilePage";
import useIsMobile from "../hooks/useIsMobile";

const ProtectedRoute: React.FC = () => {
  const { session, profile, user, loading, signOut, subscription } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);
  const isMobile = useIsMobile();

  const tourKey = "onboardingTourCompleted_parent_v1";

  useEffect(() => {
    if (!loading && profile?.enrollment_status === "parent") {
      const hasCompletedTour = !!localStorage.getItem(tourKey);
      if (!hasCompletedTour) {
        const timer = setTimeout(() => {
          setShowTour(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, profile]);

  const parentTourSteps: TourStep[] = [
    {
      target: "",
      title: "Welcome to UniVibe!",
      content:
        "This quick tour will show you how to navigate the platform as a parent. Let's get started!",
      placement: "center",
    },
    {
      target: {
        desktop: "#tour-common-room-desktop",
        mobile: "#tour-common-room-mobile",
      },
      title: "The Common Room",
      content:
        "This is your main feed. Here you can see posts from students and other parents, and share your own thoughts.",
      placement: "right",
    },
    {
      target: {
        desktop: "#tour-messages-desktop",
        mobile: "#tour-messages-mobile",
      },
      title: "Private Messages",
      content:
        "Connect with other parents or students directly. You can find all your conversations here.",
      placement: "right",
    },
    {
      target: {
        desktop: "#tour-feedback-desktop",
        mobile: "#tour-feedback-mobile",
      },
      title: "Give Us Feedback",
      content:
        "Have an idea or found a bug? We'd love to hear from you. Use this link to send us your thoughts.",
      placement: "right",
    },
    {
      target: {
        desktop: "#tour-profile-dropdown-desktop",
        mobile: "#tour-profile-dropdown-mobile",
      },
      title: "Your Profile",
      content:
        "Access your profile or sign out from here. You can update your information by visiting your profile page.",
      placement: "top",
    },
  ];

  const handleTourComplete = () => {
    setShowTour(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  const userRole = getRoleFromProfile(profile);
  const homePath = getHomePathForProfile(profile);

  const parentAllowedPaths = [
    "/common-room",
    "/profile",
    "/chat",
    "/about",
    "/feedback",
    "/suggestions",
    "/edit-parent-profile",
    "/subscriptions",
    "/live-academy",
    "/campus-tour",
    "/global-events",
  ];
  const facultyAllowedPaths = [
    "/college-hub",
    "/profile",
    "/chat",
    "/feedback",
    "/edit-profile",
    "/subscriptions",
  ];
  const studentBlockedPaths = ["/common-room", "/edit-parent-profile"];

  // Admin paths are handled by AdminLayout, don't redirect them away from it
  if (!location.pathname.startsWith("/admin")) {
    if (
      userRole === "parent" &&
      !parentAllowedPaths.some((p) => location.pathname.startsWith(p))
    ) {
      return <Navigate to={homePath} replace />;
    }
    if (
      userRole === "faculty" &&
      !facultyAllowedPaths.some((p) => location.pathname.startsWith(p))
    ) {
      return <Navigate to={homePath} replace />;
    }
    if (
      userRole === "student" &&
      studentBlockedPaths.some((p) => location.pathname.startsWith(p))
    ) {
      return <Navigate to={homePath} replace />;
    }
  }

  const isChatPage =
    location.pathname.startsWith("/chat/") ||
    location.pathname.startsWith("/group/") ||
    location.pathname.startsWith("/doubt-session/");
  const showNavbar = !isMobile || !isChatPage;

  const proOnlyPaths = ["/campus-tour"];
  const isProPath = proOnlyPaths.some((p) => location.pathname.startsWith(p));
  const hasProAccess =
    subscription?.status === "active" &&
    subscription.subscriptions.name?.toUpperCase() === "PRO";
  const isVerifiedStudent =
    profile.enrollment_status !== "parent" && profile.is_verified;

  const renderContent = () => {
    if (location.pathname.startsWith("/study-hub") && !isVerifiedStudent) {
      return (
        <div className="text-center p-8 bg-card rounded-2xl shadow-soft border border-slate-200/50 max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold text-text-heading">
            Verification Required
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-lg text-text-body">
            The Study Hub is an exclusive feature for verified students. Please
            verify your student status on your profile to gain access.
          </p>
          <Navigate to={`/profile/${user.id}`} />
        </div>
      );
    }

    if (isProPath && !hasProAccess) {
      const featureName = location.pathname.startsWith("/campus-tour")
        ? "Campus Tours"
        : location.pathname.startsWith("/global-events")
        ? "Global Events"
        : "this feature";
      return <UpgradeToPro featureName={featureName} />;
    }
    return <Outlet />;
  };

  return (
    <>
      {showTour && (
        <OnboardingTour
          steps={parentTourSteps}
          onComplete={handleTourComplete}
          tourKey={tourKey}
        />
      )}
      <div className="h-screen bg-background text-text-body flex flex-col md:flex-row">
        {showNavbar && <Navbar />}
        <main
          className={`flex-1 overflow-y-auto ${
            showNavbar ? "md:ml-64 pt-8 pb-20 md:pb-0" : "h-full"
          }`}
        >
          <div
            className={`animate-fade-in-up ${
              isChatPage
                ? "h-full"
                : "container mx-auto max-w-7xl px-4 py-2 md:py-8 sm:px-6 lg:px-8"
            }`}
          >
            {!isChatPage && <ProfileCompletionAlert />}
            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
};

export default ProtectedRoute;
