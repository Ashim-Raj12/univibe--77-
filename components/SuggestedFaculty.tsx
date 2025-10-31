import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Profile } from "../types";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import Spinner from "./Spinner";
import VerifiedBadge from "./VerifiedBadge";

const SuggestedFaculty: React.FC = () => {
  const { user, profile } = useAuth();
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Suggest faculty from all colleges, excluding the current user.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("enrollment_status", "faculty")
        .neq("id", user.id)
        .limit(5);

      if (error) {
        console.error("Error fetching faculty suggestions:", error);
      } else if (data) {
        setSuggestions(data);
      }
      setLoading(false);
    };

    if (user) {
      fetchSuggestions();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="bg-card p-4 rounded-2xl shadow-soft border border-border">
        <h3 className="text-lg font-bold text-text-heading mb-4">
          Faculty Colleagues
        </h3>
        <div className="flex justify-center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show the component if there are no suggestions or user is not fully loaded
  }

  return (
    <div className="bg-card p-4 rounded-2xl shadow-soft border border-border">
      <h3 className="text-lg font-bold text-text-heading mb-4">
        Faculty Colleagues
      </h3>
      <div className="space-y-4">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={s.avatar_url || `https://avatar.vercel.sh/${s.id}.png`}
                alt={s.name || ""}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/profile/${s.id}`}
                    className="font-semibold text-text-heading hover:underline text-sm"
                  >
                    {s.name}
                  </Link>
                  <VerifiedBadge profile={s} />
                </div>
                <p className="text-xs text-text-muted">
                  {s.faculty_title || "Faculty"}
                </p>
              </div>
            </div>
            <Link
              to={`/profile/${s.id}`}
              className="text-sm font-semibold text-primary hover:underline bg-dark-card px-3 py-1.5 rounded-lg transition-colors hover:bg-border"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedFaculty;
