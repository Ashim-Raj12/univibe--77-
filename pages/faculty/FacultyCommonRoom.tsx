import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import { FacultyPost } from "../../types/faculty";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../components/Toast";
import Spinner from "../../components/Spinner";
import { format } from "date-fns";
import PostCard from "../../components/PostCard";
import PostCardSkeleton from "../../components/PostCardSkeleton";
import PostForm from "../../components/PostForm";
import SuggestedFaculty from "../../components/SuggestedFaculty";

const POSTS_PER_PAGE = 10;

const FacultyCommonRoom: React.FC = () => {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Restrict non-faculty users
  if (profile?.enrollment_status !== "faculty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Faculty Access Only
        </h2>
        <p className="text-gray-600">
          This area is restricted to faculty members.
        </p>
      </div>
    );
  }

  const fetchPosts = useCallback(
    async (isNew = false) => {
      if (isNew) {
        setLoading(true);
        setPage(0);
        setPosts([]);
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
        .is("community_id", null)
        .eq("profiles.enrollment_status", "faculty")
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
        setError(error.message);
      } else if (data) {
        const authorIds = [...new Set((data as any[]).map((p) => p.user_id))];
        let postsWithProStatus = data as any[];

        if (authorIds.length > 0) {
          const { data: proSubs } = await supabase
            .from("user_subscriptions")
            .select("user_id, subscriptions:subscription_id(name)")
            .in("user_id", authorIds)
            .eq("status", "active");

          const proUserIds = new Set(
            (proSubs || [])
              .filter(
                (s) => (s.subscriptions as any)?.name?.toUpperCase() === "PRO"
              )
              .map((s) => s.user_id)
          );

          postsWithProStatus = (data as any[]).map((post) => ({
            ...post,
            profiles: {
              ...post.profiles,
              has_pro_badge: proUserIds.has(post.user_id),
            },
          }));
        }

        if (isNew) {
          setPosts(postsWithProStatus);
        } else {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = postsWithProStatus.filter(
              (p: any) => !existingIds.has(p.id)
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

  useEffect(() => {
    fetchPosts();
  }, []);

  // Effect for initial data load
  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for real-time subscriptions
  useEffect(() => {
    const handleRealtimeInsert = async (payload: { new: any }) => {
      // Fetch the complete post data with profile information
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, created_at, content, image_url, user_id, community_id, location, profiles!inner(*), likes(*), comments!inner(count)"
        )
        .eq("id", payload.new.id)
        .single();

      // Only handle posts created by faculty
      if (
        data &&
        !error &&
        (data.profiles as any)?.enrollment_status === "faculty"
      ) {
        setPosts((currentPosts) => {
          const exists = currentPosts.some((p) => p.id === data.id);
          if (exists) return currentPosts;
          return [data as unknown as any, ...currentPosts];
        });
      }
    };

    const handleRealtimeUpdate = async (payload: { new: any }) => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, created_at, content, image_url, user_id, community_id, location, profiles!inner(*), likes(*), comments!inner(count)"
        )
        .eq("id", payload.new.id)
        .single();

      // Only handle posts created by faculty
      if (
        data &&
        !error &&
        (data.profiles as any)?.enrollment_status === "faculty"
      ) {
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post.id === data.id ? (data as unknown as any) : post
          )
        );
      }
    };

    const handlePostDelete = (payload: any) => {
      setPosts((currentPosts) =>
        currentPosts.filter((p) => p.id !== payload.old?.id)
      );
    };

    const handleNewPostCreated = (event: CustomEvent<any>) => {
      // Add the new post from PostForm to the top of the list
      setPosts((currentPosts) => [event.detail, ...currentPosts]);
    };

    // Listen for custom event from PostForm
    window.addEventListener(
      "new-post-created",
      handleNewPostCreated as EventListener
    );

    const channel = supabase.channel("faculty-posts-realtime");
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        (payload) => {
          // Only handle public posts (no community_id)
          if (payload.new.community_id === null) {
            handleRealtimeInsert(payload);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
        },
        (payload) => {
          // Only handle public posts (no community_id)
          if (payload.new.community_id === null) {
            handleRealtimeUpdate(payload);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => handlePostDelete(payload)
      )
      .subscribe();

    return () => {
      window.removeEventListener(
        "new-post-created",
        handleNewPostCreated as EventListener
      );
      supabase.removeChannel(channel);
    };
  }, []);

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
          No posts found. Try adjusting your filters!
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

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  if (error)
    return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>;

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-3xl font-bold text-text-heading">
            Welcome to the Faculty Common Room,{" "}
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
        <aside className="hidden lg:block space-y-6 sticky top-24">
          {profile && (
            <div className="bg-card p-4 rounded-2xl shadow-soft text-center border border-border">
              <img
                src={
                  profile.avatar_url ||
                  `https://avatar.vercel.sh/${profile.id}.png`
                }
                alt={profile.name || ""}
                className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-slate-100"
              />
              <h2 className="font-bold text-xl text-text-heading">
                {profile.name}
              </h2>
              <p className="text-sm text-text-body">
                {profile.faculty_title || "Faculty"}
              </p>
            </div>
          )}
          <SuggestedFaculty />
        </aside>
      </div>
    </>
  );
};

export default FacultyCommonRoom;
