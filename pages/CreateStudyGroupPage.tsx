import React, { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";

const CreateStudyGroupPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || !profile?.college) return;

    setLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc(
        "create_study_group_and_add_creator",
        {
          p_name: name,
          p_description: description,
          p_college: profile.college,
          p_type: type,
        }
      );

      if (rpcError) throw rpcError;
      navigate("/study-hub");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/80">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-text-heading">
            Create Study Group
          </h1>
          <button
            onClick={() => navigate("/study-hub")}
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
            <label className="block text-sm font-medium text-text-body mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              placeholder="Enter group name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClasses}
              rows={4}
              placeholder="Describe your study group"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Group Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "public" | "private")}
              className={inputClasses}
            >
              <option value="public">
                Public (Visible to everyone in your college)
              </option>
              <option value="private">Private (Visible only to members)</option>
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/study-hub")}
              className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold"
            >
              {loading ? <Spinner size="sm" /> : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStudyGroupPage;
