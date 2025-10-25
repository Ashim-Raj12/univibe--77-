import React, { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";
import { CollabTaskType } from "../types";
import { toast } from "../components/Toast";

const CreateCollabPage: React.FC = () => {
  const { user, wallet, refetchWallet } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<CollabTaskType>("collaboration");
  const [reward, setReward] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClasses =
    "w-full px-4 py-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be logged in to post a task.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the academic integrity policy.");
      return;
    }
    const rewardAmount = parseFloat(reward);
    if (isNaN(rewardAmount) || rewardAmount <= 0) {
      setError("Please enter a valid, positive reward amount.");
      return;
    }
    if (wallet && wallet.balance < rewardAmount) {
      setError(
        `Insufficient VibeCoins. Your balance is ${wallet.balance}, but you need ${rewardAmount}. Please top up your wallet.`
      );
      return;
    }

    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc(
        "create_collab_and_escrow",
        {
          p_title: title,
          p_subject: subject,
          p_description: description,
          p_task_type: taskType,
          p_reward_coins: rewardAmount,
        }
      );

      if (rpcError) throw rpcError;

      await refetchWallet();
      toast.success("Your collaboration post is live!");
      navigate("/vibecollab");
    } catch (err: any) {
      console.error("Error creating collab post:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/80">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-text-heading">
            Post a Collaboration
          </h1>
          <button
            onClick={() => navigate("/vibecollab")}
            className="text-text-muted hover:text-text-heading"
            title="Back"
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="collab-title"
            >
              Title
            </label>
            <input
              id="collab-title"
              type="text"
              placeholder="e.g., 'Need help with Python project'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClasses}
              maxLength={100}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="collab-subject"
            >
              Subject
            </label>
            <input
              id="collab-subject"
              type="text"
              placeholder="e.g., 'Computer Science'"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className={inputClasses}
              maxLength={50}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-text-body mb-2"
              htmlFor="collab-description"
            >
              Description
            </label>
            <textarea
              id="collab-description"
              placeholder="Describe the task in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className={inputClasses}
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="collab-task-type"
              >
                Task Type
              </label>
              <select
                id="collab-task-type"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as CollabTaskType)}
                className={inputClasses}
              >
                <option value="collaboration">Collaboration</option>
                <option value="tutoring">Tutoring</option>
                <option value="notes">Notes Exchange</option>
                <option value="project_help">Project Help</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-text-body mb-2"
                htmlFor="collab-reward"
              >
                Reward (VibeCoins)
              </label>
              <div className="relative">
                <input
                  id="collab-reward"
                  type="number"
                  placeholder="e.g., 500"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  required
                  min="1"
                  className={inputClasses}
                />
                {reward && parseFloat(reward) > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-green-600">
                    (₹{(parseFloat(reward) / 10).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-lg">
              <p className="font-bold">Academic Integrity Policy</p>
              <p>
                This platform is for peer learning and collaboration only.
                Posting or completing graded assignments, exams, or quizzes for
                others is strictly forbidden.
              </p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer p-2 -ml-2 rounded-lg hover:bg-slate-100">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-slate-300"
              />
              <span className="text-sm font-medium text-text-body">
                I confirm this is NOT for a graded assignment, exam, or quiz.
              </span>
            </label>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/vibecollab")}
              className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold"
            >
              {loading ? <Spinner size="sm" /> : "Post Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCollabPage;
