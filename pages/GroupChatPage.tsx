import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  StudyGroup,
  StudyGroupMessage,
  StudyGroupMessageWithProfile,
  Profile,
  ReplyInfo,
  StudyGroupInvite,
} from "../types";
import Spinner from "../components/Spinner";
import { format, isToday, isYesterday } from "date-fns";
import VerifiedBadge from "../components/VerifiedBadge";
import EditGroupModal from "../components/EditGroupModal";
import InviteFriendsModal from "../components/InviteFriendsModal";
import { usePresence } from "../contexts/PresenceContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import FileRenderer from "../components/FileRenderer";
import { toast } from "../components/Toast";

const REPLY_PREFIX = "[REPLY::";
const REPLY_SUFFIX = "::REPLY]";
const REPLY_REGEX = /^\[REPLY::(.*?)::REPLY\](.*)$/s;

function findLastIndex<T>(
  array: T[],
  predicate: (value: T, index: number, obj: T[]) => unknown
): number {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}

const formatReplyContent = (
  replyInfo: ReplyInfo,
  mainContent: string
): string => {
  return `${REPLY_PREFIX}${JSON.stringify(
    replyInfo
  )}${REPLY_SUFFIX}${mainContent}`;
};

const parseReply = (
  content: string | null
): { replyInfo: ReplyInfo | null; mainContent: string } => {
  if (!content) {
    return { replyInfo: null, mainContent: "" };
  }

  const match = content.match(REPLY_REGEX);

  if (!match) {
    return { replyInfo: null, mainContent: content };
  }

  try {
    const jsonPart = match[1];
    const mainContent = match[2];
    const replyInfo = JSON.parse(jsonPart);
    return { replyInfo, mainContent };
  } catch (e) {
    console.error("Failed to parse reply JSON:", e, "Content:", content);
    // Fallback if JSON is malformed
    return { replyInfo: null, mainContent: content };
  }
};

const ChatMessage: React.FC<{
  message: StudyGroupMessageWithProfile;
  isSender: boolean;
  onDelete: (messageId: number) => void;
  onReply: (message: StudyGroupMessageWithProfile) => void;
  onEdit: (message: StudyGroupMessageWithProfile) => void;
}> = ({ message, isSender, onDelete, onReply, onEdit }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const messageClasses = isSender
    ? 'bg-primary text-white relative before:content-[""] before:absolute before:bottom-0 before:right-[-7px] before:w-0 before:h-0 before:border-[8px] before:border-transparent before:border-l-primary'
    : 'bg-slate-200 text-text-heading relative before:content-[""] before:absolute before:bottom-0 before:left-[-7px] before:w-0 before:h-0 before:border-[8px] before:border-transparent before:border-r-slate-200';

  const { replyInfo, mainContent } = parseReply(message.content);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return `Yesterday ${format(date, "p")}`;
    return format(date, "MMM d, p");
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleMessageClick = () => {
    // Enable tap-to-show-menu only on mobile
    if (window.innerWidth < 768) {
      setIsMenuOpen((p) => !p);
    }
  };

  return (
    <div
      className={`group relative flex w-full ${
        isSender ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex items-start gap-3 ${
          isSender ? "flex-row-reverse" : ""
        }`}
      >
        <Link to={`/profile/${message.profiles.id}`}>
          <img
            src={
              message.profiles.avatar_url ||
              `https://avatar.vercel.sh/${message.profiles.id}.png`
            }
            alt={message.profiles.name || ""}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-5"
          />
        </Link>
        <div
          className={`flex flex-col max-w-xs md:max-w-md ${
            isSender ? "items-end" : "items-start"
          }`}
        >
          <p
            className={`text-xs text-text-muted mb-1 font-semibold flex items-center gap-1 ${
              isSender ? "mr-2" : "ml-2"
            }`}
          >
            {isSender ? "You" : message.profiles.name}
            {!isSender && <VerifiedBadge profile={message.profiles} />}
          </p>
          <div className="relative">
            {" "}
            {/* Container for bubble + menu */}
            <div
              className={`p-3 rounded-xl ${messageClasses}`}
              onClick={handleMessageClick}
            >
              {replyInfo && (
                <div
                  className={`border-l-2 pl-2 mb-2 opacity-80 ${
                    isSender ? "border-white/50" : "border-primary/50"
                  }`}
                >
                  <p className="font-bold text-xs">{replyInfo.senderName}</p>
                  <p className="text-xs break-all min-w-0">
                    {replyInfo.content}
                  </p>
                </div>
              )}
              {mainContent && (
                <p className="whitespace-pre-wrap break-all min-w-0">
                  {mainContent}
                </p>
              )}
              {message.file_url && message.file_type && (
                <FileRenderer
                  filePath={message.file_url}
                  fileType={message.file_type}
                  fromBucket="chat-files"
                  isSender={isSender}
                />
              )}
            </div>
            <div
              ref={menuRef}
              className={`absolute top-1/2 -translate-y-1/2 flex gap-1 bg-white border rounded-full shadow-md p-1 transition-all duration-200 opacity-0 md:group-hover:opacity-100 scale-90 md:group-hover:scale-100 ${
                isMenuOpen ? "!opacity-100 !scale-100" : ""
              } ${
                isSender
                  ? "left-0 -translate-x-full -ml-2 origin-left"
                  : "right-0 translate-x-full mr-2 origin-right"
              }`}
            >
              <button
                onClick={() => {
                  onReply(message);
                  setIsMenuOpen(false);
                }}
                className="p-1 rounded-full hover:bg-slate-200"
                title="Reply"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isSender && (
                <>
                  <button
                    onClick={() => {
                      onEdit(message);
                      setIsMenuOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-slate-200"
                    title="Edit"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      onDelete(message.id);
                      setIsMenuOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-slate-200"
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <p
            className={`text-xs text-text-muted mt-1 px-1 ${
              isSender ? "self-end" : "self-start"
            }`}
          >
            {formatTimestamp(message.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

const GroupChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<StudyGroupMessageWithProfile[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [typing, setTyping] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [editingMessage, setEditingMessage] =
    useState<StudyGroupMessageWithProfile | null>(null);
  const [pendingInvite, setPendingInvite] = useState<StudyGroupInvite | null>(
    null
  );
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isInitialLoad = useRef(true);
  const membersRef = useRef<Profile[]>();
  membersRef.current = members;

  const { onlineUsers } = usePresence();
  const groupId = parseInt(id!, 10);

  useEffect(() => {
    if (editingMessage) {
      setNewMessage(parseReply(editingMessage.content).mainContent);
    }
  }, [editingMessage]);

  const fetchData = useCallback(
    async (shouldReloadMessages = true) => {
      if (!user || isNaN(groupId)) return;
      if (shouldReloadMessages) setLoading(true);

      const { data: groupDataWithMembers, error: groupError } = await supabase
        .from("study_groups")
        .select("*, study_group_members(*, profiles(*))")
        .eq("id", groupId)
        .single();

      if (groupError || !groupDataWithMembers) {
        if (shouldReloadMessages) setLoading(false);
        console.error("Error fetching group details:", groupError);
        return;
      }

      const { study_group_members, ...groupDetails } = groupDataWithMembers;
      setGroup(groupDetails as StudyGroup);

      const isUserMember =
        study_group_members?.some((m) => m.user_id === user.id) ?? false;
      setIsMember(isUserMember);

      const memberProfilesRaw =
        (study_group_members
          ?.map((m) => m.profiles)
          .filter(Boolean) as Profile[]) || [];

      if (memberProfilesRaw.length > 0) {
        const memberIds = memberProfilesRaw.map((p) => p.id);
        const { data: proSubs } = await supabase
          .from("user_subscriptions")
          .select("user_id, subscriptions:subscription_id(name)")
          .in("user_id", memberIds)
          .eq("status", "active");

        const proUserIds = new Set(
          (proSubs || [])
            .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
            .map((s) => s.user_id)
        );

        const enrichedMembers = memberProfilesRaw.map((p) => ({
          ...p,
          has_pro_badge: proUserIds.has(p.id),
        }));
        setMembers(enrichedMembers);
      } else {
        setMembers([]);
      }

      let inviteData: StudyGroupInvite | null = null;
      if (!isUserMember) {
        const { data } = await supabase
          .from("study_group_invites")
          .select("*")
          .eq("group_id", groupId)
          .eq("invitee_id", user.id)
          .eq("status", "pending")
          .maybeSingle();
        inviteData = data;
        setPendingInvite(inviteData);
      } else {
        setPendingInvite(null);
      }

      if (groupDetails.type === "private" && !isUserMember && !inviteData) {
        if (shouldReloadMessages) setLoading(false);
        return;
      }

      if (
        shouldReloadMessages &&
        (isUserMember || groupDetails.type === "public")
      ) {
        const { data: messagesData } = await supabase
          .from("study_group_messages")
          .select("*, profiles(*)")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true });

        if (messagesData && messagesData.length > 0) {
          const messageUserIds = [
            ...new Set(messagesData.map((m) => m.user_id)),
          ];
          const { data: proSubs } = await supabase
            .from("user_subscriptions")
            .select("user_id, subscriptions:subscription_id(name)")
            .in("user_id", messageUserIds)
            .eq("status", "active");

          const proUserIds = new Set(
            (proSubs || [])
              .filter((s) => s.subscriptions?.name?.toUpperCase() === "PRO")
              .map((s) => s.user_id)
          );

          const enrichedMessages = messagesData.map((msg) => ({
            ...msg,
            profiles: msg.profiles
              ? {
                  ...msg.profiles,
                  has_pro_badge: proUserIds.has(msg.user_id),
                }
              : msg.profiles,
          }));
          setMessages((enrichedMessages as any) || []);
        } else {
          setMessages([]);
        }
      }

      if (shouldReloadMessages) setLoading(false);
    },
    [groupId, user]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  useEffect(() => {
    if (loading) {
      isInitialLoad.current = true;
      return;
    }
    if (isInitialLoad.current) {
      scrollToBottom("auto");
      isInitialLoad.current = false;
    } else {
      scrollToBottom("smooth");
    }
  }, [messages, typing, loading, scrollToBottom]);

  useEffect(() => {
    if (
      !user ||
      isNaN(groupId) ||
      (group?.type === "private" && !isMember && !pendingInvite)
    )
      return;

    const messageChannel = supabase
      .channel(`group-chat-${groupId}`, {
        config: { presence: { key: currentUserProfile?.name || user.id } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload: any) => {
          const newMessageData = payload.new as StudyGroupMessage;
          if (newMessageData.user_id === user?.id) return;

          let senderProfile = membersRef.current?.find(
            (m) => m.id === newMessageData.user_id
          );
          if (!senderProfile) {
            const { data: newProfile, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMessageData.user_id)
              .single();
            if (newProfile && !error) {
              senderProfile = newProfile;
            } else {
              console.error(
                `Could not fetch profile for user ${newMessageData.user_id}`,
                error
              );
              return;
            }
          }

          // Enrich the profile, whether from ref or freshly fetched
          const { data: proSub } = await supabase
            .from("user_subscriptions")
            .select("subscriptions:subscription_id(name)")
            .eq("user_id", senderProfile.id)
            .eq("status", "active")
            .maybeSingle();

          (senderProfile as any).has_pro_badge =
            proSub?.subscriptions?.name?.toUpperCase() === "PRO";

          setMembers((current) => {
            const existingIndex = current.findIndex(
              (p) => p.id === senderProfile!.id
            );
            if (existingIndex > -1) {
              const updatedMembers = [...current];
              updatedMembers[existingIndex] = senderProfile!;
              return updatedMembers;
            }
            return [...current, senderProfile!];
          });

          const newMessageWithProfile: StudyGroupMessageWithProfile = {
            ...newMessageData,
            profiles: senderProfile,
          };
          setMessages((current) =>
            current.some((m) => m.id === newMessageWithProfile.id)
              ? current
              : [...current, newMessageWithProfile]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) => {
          const updatedMessage = payload.new as StudyGroupMessage;
          setMessages((current) =>
            current.map((m) =>
              m.id === updatedMessage.id
                ? {
                    ...m,
                    content: updatedMessage.content,
                    file_url: updatedMessage.file_url,
                    file_type: updatedMessage.file_type,
                  }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "study_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) =>
          setMessages((current) =>
            current.filter((m) => m.id !== (payload.old as { id: number }).id)
          )
      )
      .on("presence", { event: "sync" }, () => {
        const presenceState = messageChannel.presenceState();
        const typingUsers = new Set<string>();
        for (const key in presenceState) {
          const presences = presenceState[key] as unknown as {
            name: string;
            is_typing: boolean;
          }[];
          if (presences.some((p) => p.is_typing)) {
            typingUsers.add(presences[0].name);
          }
        }
        setTyping(typingUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = messageChannel;
          await messageChannel.track({
            is_typing: false,
            name: currentUserProfile?.name || user.id,
          });
        }
      });

    const membersChannel = supabase
      .channel(`group-members-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchData(false); // Refetch members and group info, but not messages
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(membersChannel);
      channelRef.current = null;
    };
  }, [
    groupId,
    user,
    isMember,
    group?.type,
    currentUserProfile,
    fetchData,
    pendingInvite,
  ]);

  const resetFileInput = () => {
    setFileToSend(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert("File is too large. Max size is 10MB.");
        resetFileInput();
        return;
      }
      setFileToSend(file);
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(file.name);
      }
    }
  };

  const handleUpdateMessage = async (newContent: string) => {
    if (!editingMessage) return;
    setIsSending(true);

    const { replyInfo } = parseReply(editingMessage.content);
    let finalContent = newContent;
    if (replyInfo) {
      finalContent = formatReplyContent(replyInfo, newContent);
    }

    const { error } = await supabase
      .from("study_group_messages")
      .update({ content: finalContent })
      .eq("id", editingMessage.id);

    setNewMessage("");
    setEditingMessage(null);
    setIsSending(false);

    if (error) {
      toast.error("Failed to update message: " + error.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if ((!content && !fileToSend) || !user || !currentUserProfile) return;
    if (!isMember && group?.type !== "public") return; // Block if not member and group is private

    if (editingMessage) {
      handleUpdateMessage(content);
      return;
    }

    setIsSending(true);

    // Auto-join on first message in a public group if not already a member
    if (group?.type === "public" && !isMember) {
      const { error: joinError } = await supabase
        .from("study_group_members")
        .insert({
          group_id: groupId,
          user_id: user.id,
        });
      if (joinError && joinError.code !== "23505") {
        // 23505 = unique_violation (race condition)
        toast.error(
          "Could not join group to send message: " + joinError.message
        );
        setIsSending(false);
        return;
      }
      setIsMember(true); // Optimistically update state
    }

    let finalContent = content;
    if (replyingTo) {
      finalContent = formatReplyContent(replyingTo, content);
    }

    const tempId = Date.now();
    const optimisticMessage: StudyGroupMessageWithProfile = {
      id: tempId,
      created_at: new Date().toISOString(),
      group_id: groupId,
      user_id: user.id,
      content: finalContent,
      file_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
      file_type: fileToSend ? fileToSend.type : null,
      profiles: currentUserProfile,
    };
    setMessages((current) => [...current, optimisticMessage]);

    const tempFile = fileToSend;
    setNewMessage("");
    resetFileInput();
    setReplyingTo(null);

    if (channelRef.current && currentUserProfile.name) {
      await channelRef.current.track({
        is_typing: false,
        name: currentUserProfile.name,
      });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;

      if (tempFile) {
        const filePath = `${user.id}/group-chats/${groupId}/${Date.now()}_${
          tempFile.name
        }`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-files")
          .upload(filePath, tempFile);
        if (uploadError)
          throw new Error(`Failed to upload file. ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from("chat-files")
          .getPublicUrl(uploadData.path);
        fileUrl = urlData.publicUrl;
        fileType = tempFile.type;
      }

      const { data: insertedMessage, error } = await supabase
        .from("study_group_messages")
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: finalContent,
          file_url: fileUrl,
          file_type: fileType,
        })
        .select()
        .single();

      if (error) throw error;
      const newMessageWithProfile: StudyGroupMessageWithProfile = {
        ...(insertedMessage as StudyGroupMessage),
        profiles: currentUserProfile,
      };
      setMessages((current) =>
        current.map((m) => (m.id === tempId ? newMessageWithProfile : m))
      );
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setMessages((current) => current.filter((m) => m.id !== tempId));
      setNewMessage(content);
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!channelRef.current || !currentUserProfile?.name) return;

    if (!typingTimeoutRef.current) {
      channelRef.current.track({
        is_typing: true,
        name: currentUserProfile.name,
      });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.track({
        is_typing: false,
        name: currentUserProfile.name,
      });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm("Are you sure you want to delete this message?"))
      return;
    await supabase.from("study_group_messages").delete().eq("id", messageId);
    // State will update via realtime
  };

  const handleAcceptInvite = async () => {
    if (!pendingInvite || !user) return;
    setInviteActionLoading(true);

    const { error } = await supabase.rpc("accept_study_group_invite", {
      p_invite_id: pendingInvite.id,
    });

    if (error) {
      alert("Failed to accept invite: " + error.message);
      setInviteActionLoading(false);
    } else {
      await fetchData();
      setInviteActionLoading(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!pendingInvite || !user) return;
    setInviteActionLoading(true);

    const { error } = await supabase
      .from("study_group_invites")
      .update({ status: "declined" })
      .eq("id", pendingInvite.id);

    setInviteActionLoading(false);
    if (error) {
      alert("Failed to decline invite: " + error.message);
    } else {
      setPendingInvite(null);
      if (group?.type === "private") {
        navigate("/study-hub", { replace: true });
      }
    }
  };

  const handleGroupDeleted = () => {
    setIsEditModalOpen(false);
    alert(`Group "${group?.name}" has been deleted.`);
    navigate("/study-hub");
  };

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  if (!group || !currentUserProfile)
    return <p className="text-center p-8">Group not found.</p>;
  if (group.type === "private" && !isMember && !pendingInvite) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold">Private Group</h2>
        <p className="text-text-muted mt-2">
          You must be a member to view this group.
        </p>
        <button
          onClick={() => navigate("/study-hub")}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-lg font-semibold"
        >
          Back to Study Hub
        </button>
      </div>
    );
  }

  const isCreator = user?.id === group.creator_id;
  const typingUsers = [...typing].filter(
    (name) => name !== (currentUserProfile?.name || user?.id)
  );

  const MemberItem: React.FC<{ member: Profile }> = ({ member }) => (
    <Link
      to={`/profile/${member.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-200"
    >
      <div className="relative">
        <img
          src={member.avatar_url || `https://avatar.vercel.sh/${member.id}.png`}
          alt={member.name || ""}
          className="w-8 h-8 rounded-full"
        />
        {onlineUsers.has(member.id) && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-100"></div>
        )}
      </div>
      <span className="font-semibold text-sm truncate">{member.name}</span>
    </Link>
  );

  const TypingIndicator = () => {
    if (typingUsers.length === 0) return <div className="h-4"></div>;
    const text =
      typingUsers.length > 2
        ? `${typingUsers.length} people are typing...`
        : `${typingUsers.join(" and ")} ${
            typingUsers.length > 1 ? "are" : "is"
          } typing...`;
    return (
      <p className="text-xs text-text-muted h-4 px-4 animate-pulse">{text}</p>
    );
  };

  return (
    <div className="flex h-full max-w-6xl mx-auto">
      <div className="flex flex-col flex-1 bg-card rounded-2xl shadow-soft border border-slate-200/50 overflow-x-hidden">
        <header className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-text-muted hover:text-primary rounded-full transition-colors flex-shrink-0"
              aria-label="Back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={isCreator ? () => setIsEditModalOpen(true) : undefined}
              disabled={!isCreator}
              className={`flex items-center gap-3 text-left ${
                isCreator
                  ? "cursor-pointer group hover:bg-slate-50 p-2 rounded-lg -m-2"
                  : "cursor-default"
              } min-w-0`}
            >
              <img
                src={
                  group.avatar_url ||
                  `https://avatar.vercel.sh/${group.id}.png?text=${group.name[0]}`
                }
                alt={group.name}
                className="w-10 h-10 rounded-full object-cover bg-slate-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2
                    className={`font-bold text-text-heading truncate ${
                      isCreator ? "group-hover:underline" : ""
                    }`}
                  >
                    {group.name}
                  </h2>
                  {isCreator && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
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
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">
                  {members.length} members
                </p>
              </div>
            </button>
          </div>
          <div className="flex-shrink-0">
            {isMember && group.type === "private" && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="text-sm font-semibold text-primary whitespace-nowrap"
              >
                Invite Members
              </button>
            )}
          </div>
        </header>
        {pendingInvite && !isMember && (
          <div className="p-3 bg-blue-100 border-b border-blue-200 text-center animate-fade-in-up">
            <p className="font-semibold text-blue-800 text-sm">
              You have been invited to join this group.
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <button
                onClick={handleAcceptInvite}
                disabled={inviteActionLoading}
                className="bg-primary text-white px-5 py-1.5 rounded-lg font-semibold hover:bg-primary-focus transition-colors text-sm"
              >
                {inviteActionLoading ? <Spinner size="sm" /> : "Accept"}
              </button>
              <button
                onClick={handleDeclineInvite}
                disabled={inviteActionLoading}
                className="bg-slate-200 text-text-body px-5 py-1.5 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        )}
        {isMember || group.type === "public" ? (
          <>
            <main className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isSender={msg.user_id === user?.id}
                  onDelete={handleDeleteMessage}
                  onReply={(m) => {
                    setReplyingTo({
                      id: m.id,
                      content: parseReply(m.content).mainContent,
                      senderId: m.user_id,
                      senderName: m.profiles.name || "",
                    });
                    setEditingMessage(null);
                  }}
                  onEdit={(m) => {
                    setEditingMessage(m);
                    setReplyingTo(null);
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 border-t border-slate-200 space-y-1">
              {(replyingTo || editingMessage) && (
                <div
                  className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-sm animate-fade-in-up"
                  style={{ animationDuration: "0.3s" }}
                >
                  <div>
                    <p className="font-bold text-primary">
                      {editingMessage
                        ? "Editing Message"
                        : `Replying to ${replyingTo?.senderName}`}
                    </p>
                    <p className="text-text-body break-all min-w-0 max-w-xs">
                      {editingMessage
                        ? parseReply(editingMessage.content).mainContent
                        : replyingTo?.content}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setEditingMessage(null);
                      setNewMessage("");
                    }}
                    className="p-1.5 rounded-full hover:bg-slate-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
              )}
              {fileToSend && (
                <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                  {filePreview && fileToSend.type.startsWith("image/") ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-md"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-text-body">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="truncate max-w-xs">{filePreview}</span>
                    </div>
                  )}
                  <button
                    onClick={resetFileInput}
                    className="p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
              )}
              <TypingIndicator />
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 mt-1"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-text-muted hover:text-primary transition-colors p-3 rounded-lg flex-shrink-0"
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
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="w-full p-3 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending || (!newMessage.trim() && !fileToSend)}
                  className="text-white bg-primary disabled:bg-slate-400 hover:bg-primary-focus transition-all hover:scale-105 active:scale-95 rounded-lg p-3 flex-shrink-0"
                >
                  {isSending ? (
                    <Spinner size="sm" />
                  ) : editingMessage ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-2xl font-bold text-text-heading">
              Join the Group!
            </h2>
            <p className="text-lg text-text-muted mt-2">
              {pendingInvite
                ? "Accept the invitation above to start chatting."
                : "This is a private group."}
            </p>
          </div>
        )}
      </div>
      <aside className="w-64 flex-shrink-0 p-4 border-l border-slate-200 overflow-y-auto hidden md:block">
        <h3 className="font-bold text-lg mb-2">Members</h3>
        <div className="space-y-1">
          {members.map((m) => (
            <MemberItem key={m.id} member={m} />
          ))}
        </div>
      </aside>
      {isEditModalOpen && isCreator && (
        <EditGroupModal
          group={group}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => fetchData(false)}
          onDelete={handleGroupDeleted}
        />
      )}
      {isInviteModalOpen && isMember && (
        <InviteFriendsModal
          group={group}
          members={members}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}
    </div>
  );
};

export default GroupChatPage;
