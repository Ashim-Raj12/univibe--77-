import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  CollabPostWithProfiles,
  CollabDeliverableWithUploader,
} from "../types";

interface CollabApplication {
  id: number;
  post_id: number;
  applicant_id: string;
  status: "pending" | "accepted" | "declined";
  applied_at: string;
  responded_at?: string;
  applicant: {
    id: string;
    name: string;
    has_pro_badge?: boolean;
  };
}
import Spinner from "../components/Spinner";
import { format } from "date-fns";
import { toast } from "../components/Toast";
import CollabChat from "../components/CollabChat";
import VerifiedBadge from "../components/VerifiedBadge";

const DeliverablesList: React.FC<{
  deliverables: CollabDeliverableWithUploader[];
}> = ({ deliverables }) => (
  <div>
    <h4 className="font-bold text-lg mb-2">
      Submissions ({deliverables.length})
    </h4>
    <div className="space-y-3">
      {deliverables.map((d) => (
        <div key={d.id} className="bg-slate-100 p-3 rounded-lg border">
          <a
            href={d.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline break-all"
          >
            {d.file_name}
          </a>
          {d.notes && (
            <p className="text-sm text-text-body mt-1 italic">"{d.notes}"</p>
          )}
          <p className="text-xs text-text-muted mt-2">
            Submitted {format(new Date(d.created_at), "PPp")}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const CollabPostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, refetchWallet, subscription } = useAuth();
  const [post, setPost] = useState<CollabPostWithProfiles | null>(null);
  const [deliverables, setDeliverables] = useState<
    CollabDeliverableWithUploader[]
  >([]);
  const [applications, setApplications] = useState<CollabApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [myApplication, setMyApplication] = useState<CollabApplication | null>(
    null
  );

  // State for submission form
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);

  const postId = parseInt(id!, 10);

  const fetchData = useCallback(async () => {
    if (isNaN(postId)) {
      setError("Invalid post ID.");
      setLoading(false);
      return;
    }
    // Don't set loading to true on refetch

    const postPromise = supabase
      .from("collab_posts")
      .select("*, poster:poster_id(*), helper:helper_id(*)")
      .eq("id", postId)
      .single();

    const deliverablesPromise = supabase
      .from("collab_deliverables")
      .select("*, uploader:uploader_id(*)")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    const applicationsPromise = supabase
      .from("collab_applications")
      .select("*, applicant:applicant_id(*)")
      .eq("post_id", postId)
      .order("applied_at", { ascending: false });

    const [
      { data: postData, error: postError },
      { data: deliverablesData, error: deliverablesError },
      { data: applicationsData, error: applicationsError },
    ] = await Promise.all([
      postPromise,
      deliverablesPromise,
      applicationsPromise,
    ]);

    if (postError) {
      setError(postError.message);
    } else if (postData) {
      const userIds = [postData.poster_id, postData.helper_id].filter(Boolean);
      let enrichedPost = postData;

      if (userIds.length > 0) {
        const { data: proSubs } = await supabase
          .from("user_subscriptions")
          .select("user_id, subscriptions:subscription_id(name)")
          .in("user_id", userIds)
          .eq("status", "active");

        const proUserIds = new Set(
          proSubs
            ?.filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
            .map((s) => s.user_id)
        );

        enrichedPost = {
          ...postData,
          poster: {
            ...postData.poster,
            has_pro_badge: proUserIds.has(postData.poster_id),
          },
          helper: postData.helper
            ? {
                ...postData.helper,
                has_pro_badge: proUserIds.has(postData.helper_id!),
              }
            : null,
        };
      }
      setPost(enrichedPost as any);
      // Set hasApplied if the current user is the helper
      setHasApplied(user?.id === enrichedPost.helper_id);
    }

    if (deliverablesError) {
      console.error("Error fetching deliverables:", deliverablesError);
    } else {
      setDeliverables(deliverablesData as any);
    }

    if (applicationsError) {
      console.error("Error fetching applications:", applicationsError);
    } else if (applicationsData) {
      const enrichedApplications = applicationsData.map((app: any) => ({
        ...app,
        applicant: {
          ...app.applicant,
          has_pro_badge: false, // TODO: Add pro badge logic if needed
        },
      }));
      setApplications(enrichedApplications);

      // Set myApplication if current user has applied
      const myApp = enrichedApplications.find(
        (app: any) => app.applicant_id === user?.id
      );
      setMyApplication(myApp || null);
      setHasApplied(!!myApp);
    }

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const mainChannel = supabase
      .channel(`collab-post-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_posts",
          filter: `id=eq.${postId}`,
        },
        fetchData
      )
      .subscribe();

    const deliverablesChannel = supabase
      .channel(`collab-deliverables-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_deliverables",
          filter: `post_id=eq.${postId}`,
        },
        fetchData
      )
      .subscribe();

    const applicationsChannel = supabase
      .channel(`collab-applications-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collab_applications",
          filter: `post_id=eq.${postId}`,
        },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mainChannel);
      supabase.removeChannel(deliverablesChannel);
      supabase.removeChannel(applicationsChannel);
    };
  }, [fetchData, postId]);

  const handleApply = async () => {
    if (!user || !post || post.poster_id === user.id) return;
    setActionLoading(true);
    const { error } = await supabase.from("collab_applications").insert({
      post_id: postId,
      applicant_id: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Application submitted!");
      // Immediately update local state to show "Applied"
      setHasApplied(true);
      setMyApplication({
        id: -1, // Temporary ID
        post_id: postId,
        applicant_id: user.id,
        status: "pending",
        applied_at: new Date().toISOString(),
        applicant: {
          id: user.id,
          name: (profile as any)?.name || "You",
          has_pro_badge: (profile as any)?.has_pro_badge || false,
        },
      });
    }
    setActionLoading(false);
  };

  const handleAcceptApplication = async (applicationId: number) => {
    if (!user) return;
    setActionLoading(true);
    const { error } = await supabase.rpc("accept_collab_application", {
      p_application_id: applicationId,
      p_poster_id: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Application accepted!");
    }
    setActionLoading(false);
  };

  const handleDeclineApplication = async (applicationId: number) => {
    if (!user) return;
    setActionLoading(true);
    const { error } = await supabase.rpc("decline_collab_application", {
      p_application_id: applicationId,
      p_poster_id: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Application declined.");
    }
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!post || !user || post.poster_id !== user.id || !post.helper_id) return;
    if (
      !window.confirm(
        "Are you sure you want to mark this task as complete? This will release the VibeCoins to the helper."
      )
    )
      return;

    setActionLoading(true);
    try {
      // FIX: Re-implementing backend RPC 'release_escrow_and_pay' on the client-side to fix the data type bug.
      // This should ideally be an atomic transaction on the backend, but this is the best we can do from the frontend.
      const { error: rpcError } = await supabase.rpc("complete_task_and_pay", {
        p_post_id: postId,
        p_poster_id: post.poster_id,
        p_helper_id: post.helper_id,
        p_amount: post.reward_coins,
      });

      if (rpcError) throw rpcError;

      await refetchWallet();
      toast.success("Task completed and payment sent!");
      // The realtime subscription will update the post status on the page.
    } catch (err: any) {
      toast.error(
        err.message || "An unexpected error occurred while completing the task."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionFile || !user) return;
    setSubmissionLoading(true);
    try {
      const filePath = `${postId}/${user.id}/${Date.now()}_${
        submissionFile.name
      }`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("collab-deliverables")
        .upload(filePath, submissionFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("collab-deliverables")
        .getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase
        .from("collab_deliverables")
        .insert({
          post_id: postId,
          uploader_id: user.id,
          file_url: publicUrl,
          file_name: submissionFile.name,
          notes: submissionNotes,
        });

      if (insertError) throw insertError;

      toast.success("Work submitted successfully!");
      setSubmissionFile(null);
      setSubmissionNotes("");
      const fileInput = document.getElementById(
        "deliverable-file"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      toast.error(err.message || "Failed to submit work.");
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user || !post || post.poster_id !== user.id) return;
    if (post.status !== "open" && post.status !== "cancelled") return;
    if (
      !window.confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    )
      return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("collab_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast.success("Post deleted successfully!");
      // Redirect to collab page
      window.location.href = "/vibe-collab";
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!post || !profile)
    return <p className="text-center text-text-muted">Post not found.</p>;

  const isOwner = user?.id === post.poster_id;
  const isHelper = user?.id === post.helper_id;
  const hasProAccess =
    subscription?.status === "active" &&
    subscription.subscriptions.name?.toUpperCase() === "PRO";
  const isProTask =
    post.task_type === "tutoring" || post.task_type === "project_help";

  // Filter deliverables for helper to only show their own uploads
  const myDeliverables = isHelper
    ? deliverables.filter((d) => d.uploader_id === user?.id)
    : deliverables;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-card p-8 rounded-2xl shadow-soft border">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="font-semibold text-primary">{post.subject}</p>
        <div className="text-sm text-text-muted mt-2">
          Posted by{" "}
          <Link
            to={`/profile/${post.poster.id}`}
            className="font-semibold hover:underline inline-flex items-center gap-1"
          >
            {post.poster.name}
            <VerifiedBadge profile={post.poster} />
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t space-y-2">
          <p>
            <strong>Status:</strong>{" "}
            <span className="capitalize font-semibold">
              {post.status.replace("_", " ")}
            </span>
          </p>
          <p>
            <strong>Reward:</strong>{" "}
            <span className="font-semibold text-yellow-600">
              {post.reward_coins} VibeCoins
            </span>
          </p>
          <p>
            <strong>Type:</strong>{" "}
            <span className="capitalize font-semibold">
              {post.task_type.replace("_", " ")}
            </span>
          </p>
          {isOwner &&
            (post.status === "open" || post.status === "cancelled") && (
              <button
                onClick={handleDeletePost}
                disabled={actionLoading}
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 mt-4"
              >
                {actionLoading ? <Spinner size="sm" /> : "Delete Post"}
              </button>
            )}
        </div>

        <div className="mt-4">
          <h3 className="font-bold mb-2">Description</h3>
          <p className="whitespace-pre-wrap text-text-body">
            {post.description}
          </p>
        </div>
      </div>

      {/* ACTION PANEL */}
      <div className="bg-card p-6 rounded-2xl shadow-soft border">
        {isOwner ? (
          <div>
            <h3 className="font-bold mb-4">Poster Controls</h3>
            {post.status === "open" && (
              <div className="space-y-4">
                <h4 className="font-semibold">
                  Applications ({applications.length})
                </h4>
                {applications.length === 0 ? (
                  <p className="text-sm text-center text-text-muted p-4 bg-slate-50 rounded-lg">
                    No applications yet. Waiting for helpers to apply...
                  </p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="bg-slate-50 p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${app.applicant.id}`}
                              className="font-semibold hover:underline"
                            >
                              {app.applicant.name}
                            </Link>
                            <VerifiedBadge profile={app.applicant} />
                            <span className="text-xs text-text-muted">
                              Applied {format(new Date(app.applied_at), "PPp")}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {app.status === "pending" ? (
                              <>
                                <button
                                  onClick={() =>
                                    handleAcceptApplication(app.id)
                                  }
                                  disabled={actionLoading}
                                  className="bg-green-500 text-white px-3 py-1 text-sm rounded font-semibold disabled:opacity-50"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeclineApplication(app.id)
                                  }
                                  disabled={actionLoading}
                                  className="bg-red-500 text-white px-3 py-1 text-sm rounded font-semibold disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <span
                                className={`text-sm font-semibold capitalize ${
                                  app.status === "accepted"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {app.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {post.status === "in_progress" && post.helper && (
              <div className="space-y-6">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <p className="text-sm">
                    You are working with{" "}
                    <Link
                      to={`/profile/${post.helper.id}`}
                      className="font-bold hover:underline inline-flex items-center gap-1"
                    >
                      {post.helper.name}
                      <VerifiedBadge profile={post.helper} />
                    </Link>
                    .
                  </p>
                </div>
                {myDeliverables.length > 0 ? (
                  <DeliverablesList deliverables={myDeliverables} />
                ) : (
                  <p className="text-sm text-center text-text-muted p-4 bg-slate-50 rounded-lg">
                    No work has been submitted yet.
                  </p>
                )}
                <div className="h-[32rem] bg-white rounded-lg border">
                  <CollabChat
                    postId={post.id}
                    currentUser={profile}
                    otherUser={post.helper}
                  />
                </div>
                <button
                  onClick={handleComplete}
                  disabled={actionLoading || deliverables.length === 0}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg w-full font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    "Mark as Complete & Pay Helper"
                  )}
                </button>
              </div>
            )}
            {post.status === "completed" && (
              <div>
                <p className="text-green-600 font-semibold text-center mb-4">
                  This task is complete.
                </p>
                {deliverables.length > 0 && (
                  <DeliverablesList deliverables={deliverables} />
                )}
              </div>
            )}
          </div>
        ) : isHelper ? (
          <div>
            <h3 className="font-bold mb-4">Helper Dashboard</h3>
            {post.status === "in_progress" && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSubmitWork}
                  className="p-4 bg-slate-50 rounded-lg border space-y-3"
                >
                  <h4 className="font-bold text-lg">Submit Your Work</h4>
                  <input
                    id="deliverable-file"
                    type="file"
                    onChange={(e) =>
                      setSubmissionFile(
                        e.target.files ? e.target.files[0] : null
                      )
                    }
                    required
                    className="w-full text-sm"
                  />
                  <textarea
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Add a note (optional)..."
                    className="w-full p-2 border rounded text-sm"
                    rows={2}
                  ></textarea>
                  <button
                    type="submit"
                    disabled={submissionLoading}
                    className="bg-primary text-white px-4 py-2 text-sm rounded-lg font-semibold disabled:opacity-50"
                  >
                    {submissionLoading ? <Spinner size="sm" /> : "Submit"}
                  </button>
                </form>
                {myDeliverables.length > 0 && (
                  <DeliverablesList deliverables={myDeliverables} />
                )}
                <div className="h-[32rem] bg-white rounded-lg border">
                  <CollabChat
                    postId={post.id}
                    currentUser={profile}
                    otherUser={post.poster}
                  />
                </div>
              </div>
            )}
            {post.status === "completed" && (
              <div>
                <p className="text-green-600 font-semibold text-center mb-4">
                  Task completed! You have been paid.
                </p>
                {myDeliverables.length > 0 && (
                  <DeliverablesList deliverables={myDeliverables} />
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="font-bold mb-4">Interested?</h3>
            {myApplication ? (
              <div className="text-center">
                <p
                  className={`font-semibold ${
                    myApplication.status === "accepted"
                      ? "text-green-600"
                      : myApplication.status === "declined"
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {myApplication.status === "pending"
                    ? "Applied"
                    : `Application ${myApplication.status}`}
                </p>
                {myApplication.status === "accepted" && (
                  <p className="text-sm text-text-muted mt-2">
                    You can now chat and submit your work!
                  </p>
                )}
              </div>
            ) : isProTask && !hasProAccess ? (
              <Link
                to="/subscriptions"
                className="block text-center bg-yellow-500 text-white px-4 py-2 rounded-lg w-full font-semibold hover:bg-yellow-600 transition-colors"
              >
                ✨ Upgrade to PRO to Help
              </Link>
            ) : (
              <button
                onClick={handleApply}
                disabled={actionLoading || post.status !== "open"}
                className="bg-primary text-white px-4 py-2 rounded-lg w-full font-semibold disabled:bg-slate-400"
              >
                {actionLoading ? (
                  <Spinner size="sm" />
                ) : post.status !== "open" ? (
                  "Task is no longer open"
                ) : (
                  "Apply to Help"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollabPostDetailPage;
