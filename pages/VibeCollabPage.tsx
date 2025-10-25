import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { CollabPostWithProfiles, CollabTaskType } from "../types";
import Spinner from "../components/Spinner";
import CollabPostCard from "../components/CollabPostCard";
import { toast } from "../components/Toast";

const MarketplaceView: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const [posts, setPosts] = useState<CollabPostWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpenPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collab_posts")
        .select("*, poster:poster_id(*)")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (data) {
        const posterIds = [...new Set(data.map((p) => p.poster_id))];
        if (posterIds.length > 0) {
          const { data: proSubs } = await supabase
            .from("user_subscriptions")
            .select("user_id, subscriptions:subscription_id(name)")
            .in("user_id", posterIds)
            .eq("status", "active");
          const proUserIds = new Set(
            (proSubs || [])
              .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
              .map((s) => s.user_id)
          );
          const enrichedPosts = data.map((p) => ({
            ...p,
            poster: { ...p.poster, has_pro_badge: proUserIds.has(p.poster_id) },
          }));
          setPosts(enrichedPosts as any);
        } else {
          setPosts(data as any);
        }
      }
      setLoading(false);
    };
    fetchOpenPosts();
  }, [onUpdate]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  if (posts.length === 0)
    return (
      <p className="text-center text-text-muted py-10 bg-card rounded-xl border border-border">
        No open collaboration tasks right now. Be the first to post one!
      </p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <CollabPostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

const MyPostingsView: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CollabPostWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");

  useEffect(() => {
    if (!user) return;
    const fetchMyPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collab_posts")
        .select("*, poster:poster_id(*), helper:helper_id(*)")
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        const userIds = [
          ...new Set(data.map((p) => p.helper_id).filter(Boolean) as string[]),
        ];
        if (userIds.length > 0) {
          const { data: proSubs } = await supabase
            .from("user_subscriptions")
            .select("user_id, subscriptions:subscription_id(name)")
            .in("user_id", userIds)
            .eq("status", "active");
          const proUserIds = new Set(
            (proSubs || [])
              .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
              .map((s) => s.user_id)
          );
          const enrichedPosts = data.map((p) => ({
            ...p,
            helper: p.helper
              ? { ...p.helper, has_pro_badge: proUserIds.has(p.helper_id!) }
              : null,
          }));
          setPosts(enrichedPosts as any);
        } else {
          setPosts(data as any);
        }
      }
      setLoading(false);
    };
    fetchMyPosts();
  }, [user]);

  const filteredPosts = posts.filter((p) => p.status === activeTab);
  const tabs = ["open", "in_progress", "completed", "cancelled", "disputed"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md ${
              activeTab === tab
                ? "bg-white text-primary shadow-sm"
                : "text-text-muted"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : filteredPosts.length === 0 ? (
        <p className="text-center text-text-muted py-10">
          No posts in this category.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <CollabPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

const MyWorkView: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CollabPostWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("in_progress");

  useEffect(() => {
    if (!user) return;
    const fetchMyWork = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("collab_posts")
        .select("*, poster:poster_id(*), helper:helper_id(*)")
        .eq("helper_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        const userIds = [...new Set(data.map((p) => p.poster_id))];
        if (userIds.length > 0) {
          const { data: proSubs } = await supabase
            .from("user_subscriptions")
            .select("user_id, subscriptions:subscription_id(name)")
            .in("user_id", userIds)
            .eq("status", "active");
          const proUserIds = new Set(
            (proSubs || [])
              .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
              .map((s) => s.user_id)
          );
          const enrichedPosts = data.map((p) => ({
            ...p,
            poster: { ...p.poster, has_pro_badge: proUserIds.has(p.poster_id) },
          }));
          setPosts(enrichedPosts as any);
        } else {
          setPosts(data as any);
        }
      }
      setLoading(false);
    };
    fetchMyWork();
  }, [user]);

  const filteredPosts = posts.filter((p) => p.status === activeTab);
  const tabs = ["in_progress", "completed"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md ${
              activeTab === tab
                ? "bg-white text-primary shadow-sm"
                : "text-text-muted"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : filteredPosts.length === 0 ? (
        <p className="text-center text-text-muted py-10">
          No tasks in this category.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <CollabPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Page Component ---
const VibeCollabPage = () => {
  const [activeTab, setActiveTab] = useState<
    "marketplace" | "my-postings" | "my-work"
  >("marketplace");
  const [key, setKey] = useState(0); // Used to force re-fetch in marketplace

  const handleSuccess = () => {
    setKey((prev) => prev + 1); // Trigger re-fetch for marketplace
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-heading">VibeCollab</h1>
            <p className="text-text-muted mt-1">
              Find peers for tutoring, collaboration, and project help.
            </p>
          </div>
          <Link
            to="/create-collab"
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold shadow-soft hover:bg-primary-focus transition-all transform hover:-translate-y-0.5 active:scale-95 flex-shrink-0 inline-block"
          >
            Post a Collaboration
          </Link>
        </div>

        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${
                activeTab === "marketplace"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-body"
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab("my-postings")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${
                activeTab === "my-postings"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-body"
              }`}
            >
              My Postings
            </button>
            <button
              onClick={() => setActiveTab("my-work")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${
                activeTab === "my-work"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-body"
              }`}
            >
              My Work
            </button>
          </nav>
        </div>

        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-lg">
          <p className="font-bold">
            Peer Learning & Tutoring Only — Not for Exam Submissions.
          </p>
        </div>

        {activeTab === "marketplace" && (
          <MarketplaceView key={key} onUpdate={handleSuccess} />
        )}
        {activeTab === "my-postings" && <MyPostingsView />}
        {activeTab === "my-work" && <MyWorkView />}
      </div>
    </>
  );
};

export default VibeCollabPage;
