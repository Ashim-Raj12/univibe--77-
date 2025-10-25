import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  StudyGroupWithMemberCount,
  StudyGroupInviteWithDetails,
} from "../types";
import Spinner from "./Spinner";
import { Link } from "react-router-dom";

const InviteCard: React.FC<{
  invite: StudyGroupInviteWithDetails;
  onAccept: (inviteId: number) => void;
  onDecline: (inviteId: number) => void;
  actionLoading: boolean;
}> = ({ invite, onAccept, onDecline, actionLoading }) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
      <div>
        <p className="text-sm text-blue-800">
          You've been invited to join{" "}
          <strong className="font-bold">{invite.study_groups.name}</strong> by{" "}
          <strong className="font-bold">{invite.profiles.name}</strong>.
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => onAccept(invite.id)}
          disabled={actionLoading}
          className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-focus transition-colors disabled:opacity-50 min-w-[80px] flex justify-center"
        >
          {actionLoading ? <Spinner size="sm" /> : "Accept"}
        </button>
        <button
          onClick={() => onDecline(invite.id)}
          disabled={actionLoading}
          className="bg-slate-200 text-text-body px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

const GroupCard: React.FC<{ group: StudyGroupWithMemberCount }> = ({
  group,
}) => {
  const memberCount = group.study_group_members[0]?.count ?? 0;
  return (
    <Link
      to={`/group/${group.id}`}
      className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all duration-300 transform hover:scale-[1.02]"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-text-heading">{group.name}</h4>
          <p className="text-xs text-text-muted mt-1">{group.college}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            group.type === "public"
              ? "bg-blue-100 text-blue-800"
              : "bg-purple-100 text-purple-800"
          }`}
        >
          {group.type}
        </span>
      </div>
      <p className="text-sm text-text-body mt-2 h-10 overflow-hidden">
        {group.description}
      </p>
      <p className="text-xs text-text-muted mt-2 font-semibold">
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </p>
    </Link>
  );
};

const StudyGroupsTab: React.FC = () => {
  const { user, profile } = useAuth();
  const [myGroups, setMyGroups] = useState<StudyGroupWithMemberCount[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<
    StudyGroupWithMemberCount[]
  >([]);
  const [invites, setInvites] = useState<StudyGroupInviteWithDetails[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!user || !profile?.college) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch pending invites for the user.
      const { data: invitesData, error: invitesError } = await supabase
        .from("study_group_invites")
        .select("*, study_groups!inner(*), profiles:inviter_id!inner(*)")
        .eq("invitee_id", user.id)
        .eq("status", "pending");
      if (invitesError) throw invitesError;

      // Enrich inviter profiles with PRO status
      let enrichedInvites =
        (invitesData as StudyGroupInviteWithDetails[]) || [];
      const inviterIds = enrichedInvites.map((i) => i.inviter_id);
      if (inviterIds.length > 0) {
        const { data: proSubs } = await supabase
          .from("user_subscriptions")
          .select("user_id, subscriptions:subscription_id(name)")
          .in("user_id", inviterIds)
          .eq("status", "active");
        const proUserIds = new Set(
          (proSubs || [])
            .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
            .map((s) => s.user_id)
        );
        enrichedInvites = enrichedInvites.map((invite) => ({
          ...invite,
          profiles: {
            ...invite.profiles,
            has_pro_badge: proUserIds.has(invite.inviter_id),
          },
        }));
      }
      setInvites(enrichedInvites);

      // 2. Fetch all group IDs the user is a member of.
      const { data: membershipData, error: membershipError } = await supabase
        .from("study_group_members")
        .select("group_id")
        .eq("user_id", user.id);
      if (membershipError) throw membershipError;
      const myGroupIds = membershipData?.map((m) => m.group_id) || [];

      // 3. Fetch full details for "My Groups".
      let myGroupsData: StudyGroupWithMemberCount[] = [];
      if (myGroupIds.length > 0) {
        const { data, error } = await supabase
          .from("study_groups")
          .select("*, study_group_members(count)")
          .in("id", myGroupIds)
          .order("name");
        if (error) throw error;
        myGroupsData = data || [];
      }
      setMyGroups(myGroupsData);

      // 4. Fetch "Discover Groups" (public groups in their college they are NOT a member of).
      let discoverQuery = supabase
        .from("study_groups")
        .select("*, study_group_members(count)")
        .eq("college", profile.college)
        .eq("type", "public");

      if (myGroupIds.length > 0) {
        discoverQuery = discoverQuery.not(
          "id",
          "in",
          `(${myGroupIds.join(",")})`
        );
      }
      const { data: discoverData, error: discoverError } =
        await discoverQuery.order("name");
      if (discoverError) throw discoverError;
      setDiscoverGroups(discoverData || []);
    } catch (e: any) {
      console.error("Error fetching study groups:", e);
      setError(
        `Failed to fetch study groups. This might be due to a database security rule. Error: ${e.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("study-groups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_groups" },
        fetchGroups
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_members",
          filter: `user_id=eq.${user.id}`,
        },
        fetchGroups
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_invites",
          filter: `invitee_id=eq.${user.id}`,
        },
        fetchGroups
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchGroups]);

  const handleAcceptInvite = async (inviteId: number) => {
    setActionLoading(inviteId);
    const { error } = await supabase.rpc("accept_study_group_invite", {
      p_invite_id: inviteId,
    });
    if (error) {
      alert("Failed to accept invite: " + error.message);
    }
    // Real-time will handle the update
    setActionLoading(null);
  };

  const handleDeclineInvite = async (inviteId: number) => {
    setActionLoading(inviteId);
    const { error } = await supabase
      .from("study_group_invites")
      .update({ status: "declined" })
      .eq("id", inviteId);

    if (error) {
      alert("Failed to decline invite: " + error.message);
    }
    // Real-time will handle the update
    setActionLoading(null);
  };

  return (
    <div className="space-y-6 p-2">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : error ? (
        <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="font-bold">Error Loading Groups</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : (
        <>
          {invites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-text-heading">
                Pending Invitations
              </h3>
              {invites.map((invite) => (
                <InviteCard
                  key={invite.id}
                  invite={invite}
                  onAccept={handleAcceptInvite}
                  onDecline={handleDeclineInvite}
                  actionLoading={actionLoading === invite.id}
                />
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-text-heading">My Groups</h2>
            <Link
              to="/create-study-group"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-soft text-sm inline-block"
            >
              Create Group
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-6 bg-slate-50 rounded-xl">
              You haven't joined any groups yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}

          <div className="pt-4">
            <h2 className="text-xl font-bold text-text-heading">
              Discover Groups
            </h2>
          </div>

          {discoverGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-6 bg-slate-50 rounded-xl">
              No other public groups found in your college.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoverGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudyGroupsTab;
