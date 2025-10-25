import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";
import {
  NotificationWithActor,
  Profile,
  Message,
  VibeCoinWallet,
} from "../types";
import { formatDistanceToNow } from "date-fns";
import Spinner from "./Spinner";
import VerifiedBadge from "./VerifiedBadge";
import ParentNavLinks from "./ParentNavLinks";
import StudentNavLinks from "./StudentNavLinks";
import { getRoleFromProfile } from "../pages/ProfilePage";
import WebsiteLogo from "./WebsiteLogo";
import VibeCoinLogo from "./VibeCoinLogo";

const NotificationItem: React.FC<{
  notification: NotificationWithActor;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  const { user } = useAuth();
  let content: React.ReactNode;
  const actorProfile = notification.actor;

  const actorNameWithBadge = (
    <strong className="inline-flex items-center gap-1">
      {actorProfile?.name}
      {actorProfile && <VerifiedBadge profile={actorProfile} />}
    </strong>
  );

  switch (notification.type) {
    case "new_follower":
      content = <>{actorNameWithBadge} started following you.</>;
      break;
    case "new_comment":
      content = <>{actorNameWithBadge} commented on your post.</>;
      break;
    case "new_like":
      content = <>{actorNameWithBadge} liked your post.</>;
      break;
    case "new_message":
      content = <>{actorNameWithBadge} sent you a message.</>;
      break;
    case "verification_approved":
      content = (
        <>
          Your ID is <strong className="text-green-600">approved!</strong>
        </>
      );
      break;
    case "verification_rejected":
      content = (
        <>
          Your ID was <strong className="text-red-600">rejected</strong>.
        </>
      );
      break;
    case "parent_verification_approved":
      content = (
        <>
          Your parent verification is{" "}
          <strong className="text-green-600">approved!</strong>
        </>
      );
      break;
    case "parent_verification_rejected":
      content = (
        <>
          Your parent verification was{" "}
          <strong className="text-red-600">rejected</strong>.
        </>
      );
      break;
    case "subscription_approved":
      content = (
        <>
          Your{" "}
          <strong>
            {(notification.metadata as Record<string, any>)?.plan_name || "PRO"}
          </strong>{" "}
          plan is active!
        </>
      );
      break;
    case "report_resolved":
      content = <>Your recent report has been reviewed and resolved.</>;
      break;
    default:
      content = <>New notification from {actorNameWithBadge}</>;
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
        notification.is_read
          ? "hover:bg-dark-card"
          : "bg-primary/10 hover:bg-primary/20"
      }`}
    >
      <img
        src={
          actorProfile?.avatar_url ||
          `https://avatar.vercel.sh/${actorProfile?.id}.png`
        }
        alt={actorProfile?.name || ""}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1">
        <p className="text-sm text-text-body">{content}</p>
        <p className="text-xs text-text-muted mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary mt-1 flex-shrink-0 self-center"></div>
      )}
    </div>
  );
};

const NotificationPanel: React.FC<{
  notifications: NotificationWithActor[];
  notifLoading: boolean;
  handleClearAll: () => void;
  handleNotificationClick: (notification: NotificationWithActor) => void;
  isMobile?: boolean;
  onClose?: () => void;
}> = ({
  notifications,
  notifLoading,
  handleClearAll,
  handleNotificationClick,
  isMobile = false,
  onClose,
}) => {
  return (
    <>
      <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
        <h3 className="font-bold text-lg">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear all
          </button>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-text-muted hover:text-text-heading rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifLoading ? (
          <div className="p-4 flex justify-center">
            <Spinner />
          </div>
        ) : notifications.length === 0 ? (
          <p className="p-4 text-sm text-center text-text-muted">
            No new notifications.
          </p>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleNotificationClick(n)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const ProfilePanel: React.FC<{
  profile: Profile;
  wallet: VibeCoinWallet | null;
  onClose: () => void;
}> = ({ profile, wallet, onClose }) => {
  const [counts, setCounts] = useState<{
    followers: number;
    following: number;
  }>({ followers: 0, following: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      if (!profile.id) return;
      const followersPromise = supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);
      const followingPromise = supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);
      const [{ count: followers }, { count: following }] = await Promise.all([
        followersPromise,
        followingPromise,
      ]);
      setCounts({ followers: followers ?? 0, following: following ?? 0 });
    };
    fetchCounts();
  }, [profile.id]);

  const handleLinkClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const QuickLink: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ onClick, icon, children }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left p-3 rounded-lg text-text-body font-semibold hover:bg-dark-card transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h3 className="font-bold text-lg">Quick Menu</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-dark-card text-text-muted hover:text-text-heading"
          title="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="text-center">
        <img
          src={
            profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`
          }
          alt={profile.name || "avatar"}
          className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-slate-100"
        />
        <h2 className="font-bold text-xl text-text-heading mt-2 flex items-center justify-center gap-1.5">
          {profile.name} <VerifiedBadge profile={profile} />
        </h2>
        <p className="text-sm text-text-muted">@{profile.username}</p>
      </div>

      <div className="flex justify-around my-6 text-center">
        <div
          className="cursor-pointer"
          onClick={() =>
            handleLinkClick(`/friends?userId=${profile.id}&view=followers`)
          }
        >
          <p className="font-bold text-lg text-text-heading">
            {counts.followers}
          </p>
          <p className="text-sm text-text-muted hover:underline">Followers</p>
        </div>
        <div
          className="cursor-pointer"
          onClick={() =>
            handleLinkClick(`/friends?userId=${profile.id}&view=following`)
          }
        >
          <p className="font-bold text-lg text-text-heading">
            {counts.following}
          </p>
          <p className="text-sm text-text-muted hover:underline">Following</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-dark-card flex justify-between items-center">
        <span className="font-semibold text-sm">Wallet Balance</span>
        <span className="font-bold text-yellow-500 flex items-center gap-1">
          <VibeCoinLogo className="h-4 w-4" />
          {wallet?.balance ?? 0}
        </span>
      </div>

      <nav className="mt-6 space-y-1 flex-grow">
        <QuickLink
          onClick={() => handleLinkClick(`/profile/${profile.id}`)}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          }
        >
          View Profile
        </QuickLink>
        <QuickLink
          onClick={() =>
            handleLinkClick(
              profile.enrollment_status === "parent"
                ? "/edit-parent-profile"
                : "/edit-profile"
            )
          }
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path
                fillRule="evenodd"
                d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                clipRule="evenodd"
              />
            </svg>
          }
        >
          Edit Profile
        </QuickLink>
        <QuickLink
          onClick={() => handleLinkClick("/wallet")}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M8 4a3 3 0 00-3 3v4a3 3 0 003 3h4a3 3 0 003-3V7a3 3 0 00-3-3H8zM14 7a1 1 0 11-2 0 1 1 0 012 0z" />
              <path d="M16 3a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h12zM4 3a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4z" />
            </svg>
          }
        >
          My Wallet
        </QuickLink>
      </nav>
    </div>
  );
};

const ProfileDropdown: React.FC<{
  profile: Profile;
  idSuffix: string;
  onDoubleClick?: () => void;
}> = ({ profile, idSuffix, onDoubleClick }) => {
  return (
    <div
      onDoubleClick={onDoubleClick}
      className="w-full mt-auto cursor-pointer"
      title="Double-click for more options"
    >
      <Link
        to={`/profile/${profile.id}`}
        id={`tour-profile-dropdown${idSuffix}`}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dark-card transition-colors"
      >
        <img
          src={
            profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`
          }
          alt={profile.name || ""}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-bold text-sm text-text-heading truncate">
              {profile.name}
            </p>
            <VerifiedBadge profile={profile} size="h-4 w-4" />
          </div>
          <p className="text-xs text-text-muted truncate">
            @{profile.username}
          </p>
        </div>
      </Link>
    </div>
  );
};

const Navbar: React.FC = () => {
  const { user, profile, signOut, subscription, wallet } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    []
  );
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isMobileProfilePanelOpen, setIsMobileProfilePanelOpen] =
    useState(false);
  const [notifLoading, setNotifLoading] = useState(true);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isMobileNotifOpen, setIsMobileNotifOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);

  const isNotifOpenRef = useRef(isNotifOpen);
  isNotifOpenRef.current = isNotifOpen;
  const isMobileNotifOpenRef = useRef(isMobileNotifOpen);
  isMobileNotifOpenRef.current = isMobileNotifOpen;

  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const didLongPress = useRef(false);

  const handleProfileLongPressStart = () => {
    didLongPress.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      setIsMobileProfilePanelOpen(true);
      didLongPress.current = true;
    }, 500); // 500ms for a long press
  };

  const handleProfileLongPressEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  };

  const handleProfileClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (didLongPress.current) {
      e.preventDefault(); // Prevent navigation if long press happened
    }
  };

  const adminEmails = [
    "sumitkumar050921@gmail.com",
    "admin.univibe@example.com",
  ];
  const isAdmin = !!user?.email && adminEmails.includes(user.email);

  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadNotifCount(notifCount ?? 0);
  }, [user]);

  const fetchUnreadMessagesCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_seen", false);
    setUnreadMessagesCount(count ?? 0);
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } else {
      setNotifications((data as NotificationWithActor[]) || []);
      setUnreadNotifCount(
        (data as NotificationWithActor[]).filter((n) => !n.is_read).length
      );
    }
    setNotifLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotificationCount();
    fetchUnreadMessagesCount();
  }, [fetchNotificationCount]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isNotifOpenRef.current || isMobileNotifOpenRef.current) {
            fetchNotifications();
          } else {
            fetchNotificationCount();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotificationCount, fetchNotifications, location.pathname]);

  // Realtime subscription for unread messages count
  useEffect(() => {
    if (!user) return;
    const messagesChannel = supabase
      .channel(`user-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Re-fetch unread messages count on any change affecting messages received by this user
          fetchUnreadMessagesCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user, fetchUnreadMessagesCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node))
        setIsNotifOpen(false);
      if (
        mobileNotifRef.current &&
        !mobileNotifRef.current.contains(event.target as Node)
      )
        setIsMobileNotifOpen(false);
      if (
        profilePanelRef.current &&
        !profilePanelRef.current.contains(event.target as Node)
      )
        setIsProfilePanelOpen(false);
      if (
        mobileSidebarRef.current &&
        !mobileSidebarRef.current.contains(event.target as Node)
      )
        setIsMobileSidebarOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleNotificationClick = async (
    notification: NotificationWithActor
  ) => {
    setIsNotifOpen(false);
    setIsMobileNotifOpen(false);

    let link = "#";
    switch (notification.type) {
      case "new_follower":
        link = `/profile/${notification.actor_id}`;
        break;
      case "new_comment":
      case "new_like":
        link = `/post/${notification.entity_id}`;
        break;
      case "new_message":
        link = `/chat/${notification.actor_id}`;
        break;
      default:
        link = `/profile/${user?.id}`;
    }
    navigate(link);

    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    if (!notification.is_read) {
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    }

    await supabase.from("notifications").delete().eq("id", notification.id);
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;

    const allIds = notifications.map((n) => n.id);
    const originalNotifications = [...notifications];

    setNotifications([]);
    setUnreadNotifCount(0);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", allIds);

    if (error) {
      setNotifications(originalNotifications);
      console.error("Failed to clear all notifications:", error);
    }
  };

  if (!profile || !user) return null;

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-colors ${
      isActive
        ? "bg-primary/10 text-primary"
        : "hover:bg-dark-card text-text-body"
    }`;
  const userRole = getRoleFromProfile(profile);
  const isParent = userRole === "parent";

  const mobileSearchLink = isParent ? "/suggestions" : "/find-fellows";

  const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-xs font-medium w-16 ${
      isActive ? "text-primary" : "text-text-muted"
    }`;

  return (
    <>
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      {isProfilePanelOpen && profile && (
        <div
          ref={profilePanelRef}
          className="hidden md:block fixed top-0 left-64 w-72 h-full bg-card border-r border-border z-20 animate-slide-in-left shadow-lg"
        >
          <ProfilePanel
            profile={profile}
            wallet={wallet}
            onClose={() => setIsProfilePanelOpen(false)}
          />
        </div>
      )}
      {/* Mobile Profile Panel (Bottom Sheet) */}
      {isMobileProfilePanelOpen && profile && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileProfilePanelOpen(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-top animate-slide-in-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-border rounded-full mx-auto mt-2 mb-2"></div>{" "}
            {/* Grabber handle */}
            <ProfilePanel
              profile={profile}
              wallet={wallet}
              onClose={() => setIsMobileProfilePanelOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Sidebar for Desktop & Mobile */}
      <aside
        ref={mobileSidebarRef}
        className={`flex flex-col w-64 fixed inset-y-0 bg-card border-r border-border p-4 z-40 transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <Link
          to={isParent ? "/common-room" : "/home"}
          className="flex items-center gap-2 text-xl font-bold text-text-heading px-2 py-4"
        >
          <WebsiteLogo />
          <span>UniVibe</span>
        </Link>
        <div className="flex-grow overflow-y-auto">
          {isParent ? (
            <ParentNavLinks
              isMobile={isMobileView}
              navLinkClasses={navLinkClasses}
              closeMobileMenu={() => setIsMobileSidebarOpen(false)}
              subscription={subscription}
              profile={profile}
              onSignOut={handleSignOut}
            />
          ) : (
            <StudentNavLinks
              isMobile={isMobileView}
              navLinkClasses={navLinkClasses}
              closeMobileMenu={() => setIsMobileSidebarOpen(false)}
              profile={profile}
              user={user}
              subscription={subscription}
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
              unreadMessagesCount={unreadMessagesCount}
            />
          )}
        </div>

        {/* Desktop-only bottom section of sidebar */}
        <div className="hidden md:flex flex-col gap-2 mt-auto">
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                if (!isNotifOpen) fetchNotifications();
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dark-card transition-colors relative"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-text-body"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="font-semibold text-text-heading hidden lg:block">
                Notifications
              </span>
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 left-6 inline-block py-0.5 px-1.5 leading-none text-center whitespace-nowrap align-baseline font-bold bg-red-600 text-white rounded-full text-xs">
                  {unreadNotifCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div
                className="absolute bottom-4 left-full ml-2 w-80 bg-card rounded-2xl shadow-soft-lg border z-40 max-h-[70vh] flex flex-col animate-fade-in-up"
                style={{ animationDuration: "0.2s" }}
              >
                <NotificationPanel
                  notifications={notifications}
                  notifLoading={notifLoading}
                  handleClearAll={handleClearAll}
                  handleNotificationClick={handleNotificationClick}
                />
              </div>
            )}
          </div>
          <ProfileDropdown
            profile={profile}
            idSuffix="-desktop"
            onDoubleClick={() => setIsProfilePanelOpen((p) => !p)}
          />
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 bg-card/80 backdrop-blur-sm border-b border-border z-20 flex items-center justify-between p-2 h-16">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded-full text-text-body hover:bg-slate-100"
          aria-label="Open menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link
          to={isParent ? "/common-room" : "/home"}
          className="flex items-center gap-2 text-lg font-bold text-text-heading"
        >
          <WebsiteLogo size="w-7 h-7" />
        </Link>
        <div ref={mobileNotifRef} className="relative">
          <button
            onClick={() => {
              setIsMobileNotifOpen(!isMobileNotifOpen);
              if (!isMobileNotifOpen) fetchNotifications();
            }}
            className="p-2 rounded-full text-text-body relative hover:bg-slate-100"
            aria-label="Open notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-card"></span>
            )}
          </button>
          {isMobileNotifOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-80 bg-card rounded-2xl shadow-soft-lg border z-40 max-h-[70vh] flex flex-col animate-fade-in-up"
              style={{ animationDuration: "0.2s" }}
            >
              <NotificationPanel
                notifications={notifications}
                notifLoading={notifLoading}
                handleClearAll={handleClearAll}
                handleNotificationClick={handleNotificationClick}
                isMobile={true}
                onClose={() => setIsMobileNotifOpen(false)}
              />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center h-16 z-30 shadow-top">
        <NavLink
          to={isParent ? "/common-room" : "/home"}
          className={mobileNavLinkClasses}
        >
          {({ isActive }) => (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill={isActive ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>Home</span>
            </>
          )}
        </NavLink>
        <NavLink to={mobileSearchLink} className={mobileNavLinkClasses}>
          {({ isActive }) => (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill={isActive ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Search</span>
            </>
          )}
        </NavLink>

        <button
          onClick={() => navigate("/create-post")}
          className="w-16 h-16 -mt-8 bg-primary text-white rounded-full flex items-center justify-center shadow-soft-md active:animate-press"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        <NavLink to="/chat" className={mobileNavLinkClasses}>
          {({ isActive }) => (
            <>
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill={isActive ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={isActive ? 0 : 1.5}
                >
                  <path
                    fillRule="evenodd"
                    d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                    clipRule="evenodd"
                  />
                </svg>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center py-0.5 px-1.5 text-xs font-bold bg-red-600 text-white rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
              </div>
              <span>Chat</span>
            </>
          )}
        </NavLink>
        <NavLink
          to={`/profile/${user.id}`}
          className={mobileNavLinkClasses}
          onClick={handleProfileClick}
          onPointerDown={handleProfileLongPressStart}
          onPointerUp={handleProfileLongPressEnd}
          onPointerLeave={handleProfileLongPressEnd}
          onTouchStart={handleProfileLongPressStart}
          onTouchEnd={handleProfileLongPressEnd}
          onContextMenu={(e) => e.preventDefault()}
          title="Long-press for quick menu"
        >
          <div className="relative">
            <img
              src={
                profile.avatar_url || `https://avatar.vercel.sh/${user.id}.png`
              }
              alt="Profile"
              className="w-6 h-6 rounded-full object-cover"
            />
          </div>
          <span>Profile</span>
        </NavLink>
      </nav>
    </>
  );
};

export default Navbar;
