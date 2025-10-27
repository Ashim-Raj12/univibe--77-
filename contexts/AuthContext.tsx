import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { Profile, UserSubscriptionWithPlan, VibeCoinWallet } from "../types";
import { supabase } from "../services/supabase";
import { profilesCache } from "../services/cache";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  subscription: UserSubscriptionWithPlan | null;
  wallet: VibeCoinWallet | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  refetchWallet: () => Promise<void>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => Promise<void>;
  mutatingFriendshipIds: Set<string>;
  friendshipsLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] =
    useState<UserSubscriptionWithPlan | null>(null);
  const [wallet, setWallet] = useState<VibeCoinWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [mutatingFriendshipIds, setMutatingFriendshipIds] = useState<
    Set<string>
  >(new Set());
  const [friendshipsLoading, setFriendshipsLoading] = useState(true);

  const fetchFriendships = useCallback(async (userToFetch: User | null) => {
    if (!userToFetch) {
      setFollowingIds(new Set());
      setFriendshipsLoading(false);
      return;
    }
    setFriendshipsLoading(true);
    const { data: friendshipsData, error: friendshipsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userToFetch.id);

    if (friendshipsData) {
      setFollowingIds(new Set(friendshipsData.map((f) => f.following_id)));
    } else if (friendshipsError) {
      console.error(
        "Error fetching friendships:",
        JSON.stringify(friendshipsError, null, 2)
      );
    }
    setFriendshipsLoading(false);
  }, []);

  const fetchCoreUserData = useCallback(async (userToFetch: User | null) => {
    if (!userToFetch) {
      setProfile(null);
      setSubscription(null);
      setWallet(null);
      return;
    }

    // With the new robust, two-step registration, a skeleton profile and wallet
    // are guaranteed to exist after a successful signUp. This logic fetches all
    // essential user data in parallel.
    const profilePromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", userToFetch.id)
      .single();

    const walletPromise = supabase
      .from("vibecoin_wallets")
      .select("*")
      .eq("user_id", userToFetch.id)
      .single();

    const subscriptionPromise = supabase
      .from("user_subscriptions")
      .select("*, subscriptions:subscription_id(*)")
      .eq("user_id", userToFetch.id)
      .in("status", ["active", "pending_review"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [
      { data: profileData, error: profileError },
      { data: walletData, error: walletError },
      { data: subscriptionData, error: subscriptionError },
    ] = await Promise.all([profilePromise, walletPromise, subscriptionPromise]);

    if (profileError) {
      console.error("Critical: Error fetching profile:", profileError);
    }
    if (walletError) {
      console.error("Critical: Error fetching wallet:", walletError);
    }
    if (subscriptionError) {
      console.error(
        "Error fetching subscription:",
        JSON.stringify(subscriptionError, null, 2)
      );
    }

    if (profileData) {
      // Special parent override (keep this logic)
      const parentOverrideEmails = [
        "rituraj0gupta@gmail.com",
        "sumit129@gmail.com",
      ];
      if (
        userToFetch?.email &&
        parentOverrideEmails.includes(userToFetch.email)
      ) {
        (profileData as Profile).enrollment_status = "parent";
      }
      setProfile(profileData as Profile);
      profilesCache.set(profileData as Profile);
    } else {
      setProfile(null);
      // This case should now be extremely rare and indicates a major backend failure,
      // as the skeleton profile creation trigger should not fail.
      console.error(
        `CRITICAL: Profile not found for user ${userToFetch.id}. The signup trigger likely failed catastrophically.`
      );
    }

    setWallet(walletData as VibeCoinWallet | null);
    setSubscription(subscriptionData as UserSubscriptionWithPlan | null);
  }, []);

  useEffect(() => {
    setLoading(true);

    const getInitialSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const currentUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUser(currentUser);

      // Fetch user-specific data BEFORE unsetting the loading flag
      if (currentUser) {
        await fetchCoreUserData(currentUser);
        await fetchFriendships(currentUser);
      }

      setLoading(false); // Key change: unblock UI AFTER data is fetched
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        const currentUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(currentUser);

        if (!currentUser) {
          // SIGNED_OUT
          setProfile(null);
          setSubscription(null);
          setWallet(null);
          setFollowingIds(new Set());
        } else {
          // SIGNED_IN or other events
          // Fetch data in the background
          profilesCache.invalidate(currentUser.id);
          fetchCoreUserData(currentUser);
          fetchFriendships(currentUser);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchCoreUserData, fetchFriendships]);

  useEffect(() => {
    if (!user) return;
    const profileChannel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new as Profile);
          profilesCache.set(payload.new as Profile);
        }
      )
      .subscribe();

    const walletChannel = supabase
      .channel(`wallet-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vibecoin_wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setWallet(payload.new as VibeCoinWallet);
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel(`subscriptions-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCoreUserData(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [user, fetchCoreUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      profilesCache.invalidate(user.id); // Invalidate before refetching
      await fetchCoreUserData(user);
    }
  }, [user, fetchCoreUserData]);

  const refetchWallet = useCallback(async () => {
    if (user) {
      // This now refetches all core data, including the wallet.
      await fetchCoreUserData(user);
    }
  }, [user, fetchCoreUserData]);

  const isFollowing = useCallback(
    (userId: string) => followingIds.has(userId),
    [followingIds]
  );

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!user || mutatingFriendshipIds.has(userId)) return;

      const wasFollowing = followingIds.has(userId);
      setMutatingFriendshipIds((prev) => new Set(prev).add(userId));
      setFollowingIds((prev) => {
        const newSet = new Set(prev);
        wasFollowing ? newSet.delete(userId) : newSet.add(userId);
        return newSet;
      });

      try {
        const { error } = await supabase.rpc("toggle_follow", {
          p_follower_id: user.id,
          p_following_id: userId,
        });
        if (error) throw error;
      } catch (e: any) {
        setFollowingIds((prev) => {
          const newSet = new Set(prev);
          wasFollowing ? newSet.add(userId) : newSet.delete(userId);
          return newSet;
        });
        console.error("Follow action failed:", e);
        alert(
          "An unexpected error occurred while trying to follow. Please try again."
        );
        throw e;
      } finally {
        setMutatingFriendshipIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    },
    [user, followingIds, mutatingFriendshipIds]
  );

  const value: AuthContextType = useMemo(
    () => ({
      session,
      user,
      profile,
      subscription,
      wallet,
      loading,
      signOut,
      refetchProfile,
      refetchWallet,
      isFollowing,
      toggleFollow,
      mutatingFriendshipIds,
      friendshipsLoading,
    }),
    [
      session,
      user,
      profile,
      subscription,
      wallet,
      loading,
      signOut,
      refetchProfile,
      refetchWallet,
      isFollowing,
      toggleFollow,
      mutatingFriendshipIds,
      friendshipsLoading,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
