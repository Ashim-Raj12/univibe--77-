import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { Post, PostWithProfile, Profile } from "../types";
import PostCard from "../components/PostCard";
import { useAuth } from "../hooks/useAuth";
import PostCardSkeleton from "../components/PostCardSkeleton";
import PostForm from "../components/PostForm";
import Spinner from "../components/Spinner";

const POSTS_PER_PAGE = 10;

const CommonRoomPage: React.FC = () => {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(
    async (isNew = false) => {
      if (isNew) {
        setLoading(true);
        setPage(0); // Reset page for new fetch
        setPosts([]); // Clear existing posts
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const currentPage = isNew ? 0 : page;
      const from = currentPage * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      let query = supabase
        .from("posts")
        .select(
          "id, created_at, content, image_url, user_id, community_id, location, profiles!inner(*), likes(*), comments!inner(count)"
        )
        .is("community_id", null) // Fetch only posts not in a community
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
        setError(error.message);
      } else if (data) {
        const authorIds = [
          ...new Set((data as PostWithProfile[]).map((p) => p.user_id)),
        ];
        let postsWithProStatus = data as PostWithProfile[];

        if (authorIds.length > 0) {
          const { data: proSubs } = await supabase
            .from("user_subscriptions")
            .select("user_id, subscriptions:subscription_id(name)")
            .in("user_id", authorIds)
            .eq("status", "active");

          const proUserIds = new Set(
            (proSubs || [])
              .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
              .map((s) => s.user_id)
          );

          postsWithProStatus = (data as PostWithProfile[]).map((post) => ({
            ...post,
            profiles: {
              ...post.profiles,
              has_pro_badge: proUserIds.has(post.user_id),
            },
          }));
        }

        if (isNew) {
          setPosts(postsWithProStatus as any);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = (postsWithProStatus as any).filter(
              (p: PostWithProfile) => !existingIds.has(p.id)
            );
            return [...prev, ...newPosts];
          });
        }

        if (data.length < POSTS_PER_PAGE) {
          setHasMore(false);
        } else {
          setHasMore(true);
          setPage((prev) => prev + 1);
        }
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [page]
  );

  // Effect for initial data load
  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for real-time subscriptions
  useEffect(() => {
    const handleRealtimeChange = () => {
      // Refetch all posts to ensure data consistency, including pro badges.
      fetchPosts(true);
    };

    const handlePostDelete = (payload: { old: { id: number } }) => {
      setPosts((current) => current.filter((p) => p.id !== payload.old.id));
    };

    const channel = supabase.channel("common-room-posts-realtime");
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: "community_id=is.null",
        },
        handleRealtimeChange
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: "community_id=is.null",
        },
        handleRealtimeChange
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        handlePostDelete
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const handlePostDeleted = (postId: number) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-500">{error}</p>;
    }

    if (posts.length === 0) {
      return (
        <p className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-border">
          Welcome to the Common Room! No posts here yet.
        </p>
      );
    }

    return (
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPostDeleted={handlePostDeleted}
            onPostUpdated={handlePostUpdated}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-text-heading">
        Welcome to the Common Room,{" "}
        {profile?.name ? profile.name.split(" ")[0] : "User"}!
      </h1>

      <div className="bg-card rounded-2xl shadow-soft border border-border">
        <PostForm
          onNewPost={() => {
            // After submitting a new post, trigger a refetch for instant feedback.
            setTimeout(() => fetchPosts(true), 250);
          }}
        />
      </div>

      {renderContent()}

      {!loading && posts.length > 0 && hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchPosts()}
            disabled={loadingMore}
            className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[150px] font-semibold shadow-soft hover:shadow-soft-md active:animate-press mx-auto"
          >
            {loadingMore ? <Spinner size="sm" /> : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommonRoomPage;
