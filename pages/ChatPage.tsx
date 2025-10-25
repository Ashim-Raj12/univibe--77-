import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { Profile, Message, ReplyInfo } from "../types";
import Spinner from "../components/Spinner";
import {
  format,
  isToday,
  isYesterday,
  formatDistanceToNowStrict,
} from "date-fns";
import { usePresence } from "../contexts/PresenceContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import VerifiedBadge from "../components/VerifiedBadge";
import IcebreakerModal from "../components/IcebreakerModal";
import FileRenderer from "../components/FileRenderer";
import ChatPageSkeleton from "../components/ChatPageSkeleton";
import { toast } from "../components/Toast";

// --- Helper Functions for Reply ---
const REPLY_PREFIX = "[REPLY::";
const REPLY_SUFFIX = "::REPLY]";
const REPLY_REGEX = /^\[REPLY::(.*?)::REPLY\](.*)$/s;

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
  message: Message;
  isSender: boolean;
  recipientProfile: Profile;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: number) => void;
}> = ({ message, isSender, recipientProfile, onReply, onEdit, onDelete }) => {
  const { replyInfo, mainContent } = parseReply(message.content);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return `Yesterday at ${format(date, "p")}`;
    return format(date, "MMM d, p");
  };

  const bubbleTailClasses = isSender
    ? 'bg-primary text-white relative before:content-[""] before:absolute before:bottom-0 before:right-[-7px] before:w-0 before:h-0 before:border-[8px] before:border-transparent before:border-l-primary'
    : 'bg-slate-200 text-text-heading relative before:content-[""] before:absolute before:bottom-0 before:left-[-7px] before:w-0 before:h-0 before:border-[8px] before:border-transparent before:border-r-slate-200';

  const isVoiceNoteOnly =
    message.file_type?.startsWith("audio/") && !mainContent && !replyInfo;
  const bubblePadding = isVoiceNoteOnly ? "p-1" : "p-3";

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
        {!isSender && (
          <Link to={`/profile/${recipientProfile.id}`}>
            <img
              src={
                recipientProfile.avatar_url ||
                `https://avatar.vercel.sh/${recipientProfile.id}.png`
              }
              alt={recipientProfile.name || ""}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
            />
          </Link>
        )}
        <div
          className={`flex flex-col max-w-xs md:max-w-md ${
            isSender ? "items-end" : "items-start"
          }`}
        >
          <div className="relative">
            <div
              className={`rounded-xl shadow-sm ${bubbleTailClasses} ${bubblePadding}`}
              onClick={handleMessageClick}
            >
              {replyInfo && (
                <div
                  className={`border-l-2 pl-2 mb-2 opacity-80 ${
                    isSender ? "border-white/50" : "border-primary/50"
                  }`}
                >
                  <p className="font-bold text-xs">{replyInfo.senderName}</p>
                  <p className="text-xs truncate">{replyInfo.content}</p>
                </div>
              )}
              {mainContent && (
                <p className="whitespace-pre-wrap break-words">{mainContent}</p>
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

const MESSAGES_PER_PAGE = 50;

const ChatPage: React.FC = () => {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const prefilledMessage = location.state?.prefilledMessage;

  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState(prefilledMessage || "");
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isIcebreakerModalOpen, setIsIcebreakerModalOpen] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);

  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // State for pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCancelZone, setIsCancelZone] = useState(false);
  const recordingStartXRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRecordingRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const oldScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const { onlineUsers } = usePresence();
  const isRecipientOnline = recipientId ? onlineUsers.has(recipientId) : false;

  useEffect(() => {
    if (editingMessage) {
      setNewMessage(parseReply(editingMessage.content).mainContent);
    }
  }, [editingMessage]);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      if (mainContainerRef.current) {
        mainContainerRef.current.scrollTo({
          top: mainContainerRef.current.scrollHeight,
          behavior,
        });
      }
    },
    []
  );

  useEffect(() => {
    if (prefilledMessage) {
      window.history.replaceState({}, document.title);
    }
  }, [prefilledMessage]);

  const markMessagesAsSeen = useCallback(async () => {
    if (!user || !recipientId || document.hidden) return;
    const { error: updateError } = await supabase
      .from("messages")
      .update({ is_seen: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", recipientId)
      .eq("is_seen", false);
    if (updateError)
      console.error("Error marking messages as seen:", updateError);
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("actor_id", recipientId)
      .eq("type", "new_message");
    if (deleteError)
      console.error("Error deleting new message notification:", deleteError);
  }, [user, recipientId]);

  const fetchChatData = useCallback(async () => {
    if (!recipientId || !user) return;
    setLoading(true);
    setError(null);
    isInitialLoadRef.current = true;

    try {
      const { data: recipientData, error: recipientError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", recipientId)
        .single();

      if (recipientError) throw recipientError;

      setRecipientProfile(recipientData);

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: false })
        .range(0, MESSAGES_PER_PAGE - 1);

      if (messagesError) throw messagesError;

      setMessages((messagesData as Message[]).reverse());

      if (messagesData.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      setPage(1);
    } catch (e: any) {
      setError(e.message.includes("0 rows") ? "User not found." : e.message);
    } finally {
      setLoading(false);
    }
  }, [recipientId, user]);

  useEffect(() => {
    fetchChatData();
  }, [fetchChatData]);

  // --- START: Infinite Scroll Logic ---
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !user || !recipientId) return;

    setLoadingMore(true);
    oldScrollHeightRef.current = mainContainerRef.current?.scrollHeight || 0;

    const from = page * MESSAGES_PER_PAGE;
    const to = from + MESSAGES_PER_PAGE - 1;

    const { data: olderMessages } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (olderMessages && olderMessages.length > 0) {
      setMessages((prev) => [...olderMessages.reverse(), ...prev]);
      setPage((prev) => prev + 1);
      if (olderMessages.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }
    } else {
      setHasMore(false);
    }
    // setLoadingMore(false) is handled by useLayoutEffect after scroll adjustment
  }, [loadingMore, hasMore, user, recipientId, page]);

  useEffect(() => {
    const container = mainContainerRef.current;
    const handleScroll = () => {
      if (container?.scrollTop === 0) {
        loadMoreMessages();
      }
    };
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, [loadMoreMessages]);

  useLayoutEffect(() => {
    if (loadingMore) {
      const container = mainContainerRef.current;
      if (container) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - oldScrollHeightRef.current;
      }
      setLoadingMore(false);
    }
  }, [messages, loadingMore]);

  useEffect(() => {
    // On initial load, scroll to bottom
    if (!loading && messages.length > 0 && isInitialLoadRef.current) {
      scrollToBottom("auto");
      isInitialLoadRef.current = false;
    }
  }, [loading, messages.length, scrollToBottom]);
  // --- END: Infinite Scroll Logic ---

  useEffect(() => {
    markMessagesAsSeen();
    const handleVisibilityChange = () => {
      !document.hidden && markMessagesAsSeen();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [messages, markMessagesAsSeen]);

  useEffect(() => {
    if (!user || !recipientId) return;

    const messageChannelName = [user.id, recipientId].sort().join("-");
    // Subscribe to any message involving the current user, then filter client-side to
    // the exact conversation. This avoids potential server-side filter edge-cases.
    const conversationFilter = `or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})`;

    const messageChannel = supabase
      .channel(`messages-chat-${messageChannelName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          const newMessage = payload.new as Message;

          const isForThisConversation =
            (newMessage.sender_id === user.id &&
              newMessage.receiver_id === recipientId) ||
            (newMessage.sender_id === recipientId &&
              newMessage.receiver_id === user.id);

          if (!isForThisConversation) return;

          // Ignore messages sent by self, as they are handled optimistically
          if (newMessage.sender_id === user.id) return;

          setMessages((currentMessages) => {
            if (currentMessages.some((m) => m.id === newMessage.id))
              return currentMessages;
            return [...currentMessages, newMessage];
          });
          setTimeout(() => scrollToBottom("smooth"), 50);
          if (newMessage.receiver_id === user.id) {
            markMessagesAsSeen();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          const updatedMessage = payload.new as Message;
          if (!updatedMessage?.id) return;

          const isForThisConversation =
            (updatedMessage.sender_id === user.id &&
              updatedMessage.receiver_id === recipientId) ||
            (updatedMessage.sender_id === recipientId &&
              updatedMessage.receiver_id === user.id);
          if (!isForThisConversation) return;

          setMessages((currentMessages) =>
            currentMessages.map((m) =>
              m.id === updatedMessage.id ? updatedMessage : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          const oldMessage = payload.old as { id: number } | null;
          if (!oldMessage) return;

          setMessages((currentMessages) =>
            currentMessages.filter((m) => m.id !== oldMessage.id)
          );
        }
      )
      .subscribe((status) => {
        // Ensure the channel is active before relying on it. Save ref so we can remove it later.
        if (status === "SUBSCRIBED") {
          messageChannelRef.current = messageChannel;
        }
      });

    // Typing presence channel (unchanged)
    const typingChannelName = `typing-${[user.id, recipientId]
      .sort()
      .join("-")}`;
    const typingChannel = supabase.channel(typingChannelName, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = typingChannel;

    typingChannel.on("presence", { event: "sync" }, () => {
      const presenceState = typingChannel.presenceState();
      const recipientPresence = presenceState[recipientId!];
      setIsRecipientTyping(
        recipientPresence && (recipientPresence[0] as any)?.is_typing
      );
    });

    typingChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED")
        await typingChannel.track({ is_typing: false });
    });

    let debugChannel: RealtimeChannel | null = null;
    if (process.env.NODE_ENV === "development") {
      debugChannel = supabase
        .channel("messages-debug")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: any) => {
            console.warn("DEBUG ALL MESSAGES payload:", payload);
          }
        )
        .subscribe((status) => console.debug("debug channel status:", status));
    }

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      if (debugChannel) supabase.removeChannel(debugChannel);
      channelRef.current = null;
    };
  }, [recipientId, user, markMessagesAsSeen, scrollToBottom]);

  const handleTyping = (isTyping: boolean) => {
    channelRef.current?.track({ is_typing: isTyping });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!typingTimeoutRef.current) handleTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

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

  const sendBlob = async (blob: Blob, mimeType: string) => {
    if (!user || !recipientId) return;

    setIsSending(true);

    const tempId = Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: recipientId,
      content: "",
      is_seen: false,
      file_url: URL.createObjectURL(blob),
      file_type: mimeType,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    try {
      const filePath = `${user.id}/voice-notes/${Date.now()}_audio.webm`;
      const { data, error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, blob, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(data.path);

      const { data: insertedMessage, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: recipientId,
          content: "",
          file_url: urlData.publicUrl,
          file_type: mimeType,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((current) =>
        current.map((msg) =>
          msg.id === tempId ? { ...msg, ...insertedMessage } : msg
        )
      );
    } catch (err: any) {
      toast.error("Failed to send voice note: " + err.message);
      setMessages((current) => current.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const deltaX = recordingStartXRef.current - e.clientX;
    setIsCancelZone(deltaX > 80);
  };

  const stopRecording = (cancel = false) => {
    document.removeEventListener("pointermove", handlePointerMove);
    cancelRecordingRef.current = cancel;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsCancelZone(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handlePointerUp = () => stopRecording(isCancelZone);

  const startRecording = async (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isRecording) return;
    recordingStartXRef.current = e.clientX;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cancelRecordingRef.current = false;
      setIsRecording(true);
      setRecordingTime(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );

      const options = { mimeType: "audio/webm;codecs=opus" };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelRecordingRef.current) return;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: options.mimeType,
        });
        sendBlob(audioBlob, options.mimeType);
      };
      recorder.start();

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp, { once: true });
    } catch (error) {
      alert(
        "Microphone access is required. Please enable it in browser settings."
      );
      setIsRecording(false);
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
      .from("messages")
      .update({ content: finalContent })
      .eq("id", editingMessage.id);

    setNewMessage("");
    setEditingMessage(null);
    setIsSending(false);

    if (error) {
      alert("Failed to update message. Please try again.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if ((!content && !fileToSend) || !user || !recipientId) return;

    if (editingMessage) {
      handleUpdateMessage(content);
      return;
    }

    setIsSending(true);

    let finalContent = content;
    if (replyingTo) {
      finalContent = formatReplyContent(replyingTo, content);
    }

    const tempId = Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: recipientId,
      content: finalContent,
      is_seen: false,
      file_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
      file_type: fileToSend ? fileToSend.type : null,
    };

    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    const tempFile = fileToSend;
    setNewMessage("");
    resetFileInput();
    setReplyingTo(null);
    handleTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;

      if (tempFile) {
        const filePath = `${user.id}/${recipientId}/${Date.now()}_${
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
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: recipientId,
          content: finalContent,
          file_url: fileUrl,
          file_type: fileType,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((current) =>
        current.map((msg) =>
          msg.id === tempId ? { ...msg, ...insertedMessage } : msg
        )
      );
    } catch (err: any) {
      toast.error("Failed to send message. Please try again.");
      setMessages((currentMessages) =>
        currentMessages.filter((msg) => msg.id !== tempId)
      );
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm("Are you sure you want to delete this message?"))
      return;
    await supabase.from("messages").delete().eq("id", messageId);
  };

  const handleSelectIcebreaker = (question: string) => {
    setNewMessage(question);
    setIsIcebreakerModalOpen(false);
  };

  if (loading) return <ChatPageSkeleton />;
  if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
  if (!recipientProfile)
    return (
      <p className="text-center text-gray-500 p-8">
        Could not load user profile.
      </p>
    );

  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;
  const isLastMessageSeen =
    lastMessage && lastMessage.sender_id === user?.id && lastMessage.is_seen;

  const getStatusText = () => {
    if (isRecipientTyping) return "typing...";
    if (isRecipientOnline) return "Online";
    if (recipientProfile.last_seen)
      return `Last seen ${formatDistanceToNowStrict(
        new Date(recipientProfile.last_seen)
      )} ago`;
    return "Offline";
  };

  const formatRecordingTime = (time: number) =>
    `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto bg-card sm:rounded-2xl shadow-soft sm:border border-slate-200/50">
      <header className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            to="/chat"
            className="p-2 -ml-2 text-text-muted hover:text-primary rounded-full transition-colors flex-shrink-0"
            aria-label="Back to messages"
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
          </Link>
          <Link to={`/profile/${recipientProfile.id}`}>
            <img
              src={
                recipientProfile.avatar_url ||
                `https://avatar.vercel.sh/${recipientProfile.id}.png`
              }
              alt={recipientProfile.name || ""}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${recipientProfile.id}`}
                className="font-bold text-text-heading hover:underline truncate"
              >
                {recipientProfile.name}
              </Link>
              <VerifiedBadge profile={recipientProfile} />
              <div
                className={`h-2.5 w-2.5 rounded-full transition-colors flex-shrink-0 ${
                  isRecipientOnline ? "bg-green-500" : "bg-slate-400"
                }`}
              ></div>
            </div>
            <p className="text-xs text-text-muted h-4">{getStatusText()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2"></div>
      </header>

      <main
        ref={mainContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-4"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isSender={msg.sender_id === user?.id}
            recipientProfile={recipientProfile}
            onReply={(m) => {
              setReplyingTo({
                id: m.id,
                content: parseReply(m.content).mainContent,
                senderId: m.sender_id,
                senderName:
                  m.sender_id === user?.id
                    ? "You"
                    : recipientProfile.name || "",
              });
              setEditingMessage(null);
            }}
            onEdit={(m) => {
              setEditingMessage(m);
              setReplyingTo(null);
            }}
            onDelete={handleDeleteMessage}
          />
        ))}
        {isRecipientTyping && (
          <div className="flex items-start gap-2">
            <div className="bg-slate-200 text-text-heading self-start rounded-t-xl rounded-br-xl p-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        {isLastMessageSeen && (
          <p className="text-right text-xs text-text-muted pr-1">Seen</p>
        )}
      </main>

      <footer className="p-4 border-t border-slate-200 space-y-2">
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
              <p className="text-text-body truncate max-w-xs">
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
        {isRecording ? (
          <div className="flex items-center gap-2 h-[52px] w-full animate-fade-in-up px-3">
            <div
              className={`transition-transform duration-300 ${
                isCancelZone ? "scale-125" : "scale-100"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 transition-colors ${
                  isCancelZone ? "text-red-600" : "text-slate-500"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div className="flex-1 bg-slate-100 rounded-full p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-sm text-text-heading">
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
              <div className="text-sm text-text-muted animate-pulse flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Slide to cancel
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 relative"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-text-muted hover:text-primary transition-all p-3 rounded-lg flex-shrink-0 transform hover:scale-110 active:scale-95"
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
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="w-full flex-1 min-w-0 p-3 pr-24 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-colors"
            />
            <button
              type="button"
              onClick={() => setIsIcebreakerModalOpen(true)}
              className="absolute right-20 top-1/2 -translate-y-1/2 text-text-muted hover:text-secondary transition-all p-2 rounded-full transform hover:scale-110 active:scale-95 flex-shrink-0"
              title="Generate AI Icebreaker"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
            {newMessage.trim() || fileToSend ? (
              <button
                type="submit"
                disabled={isSending}
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
            ) : (
              <button
                type="button"
                onPointerDown={startRecording}
                className="p-3 rounded-lg flex-shrink-0 transition-colors text-white bg-primary hover:bg-primary-focus active:scale-95"
                title="Hold to record voice note"
                style={{ touchAction: "none" }}
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            )}
          </form>
        )}
      </footer>
      {isIcebreakerModalOpen && currentUserProfile && recipientProfile && (
        <IcebreakerModal
          currentUser={currentUserProfile}
          targetUser={recipientProfile}
          onClose={() => setIsIcebreakerModalOpen(false)}
          onSelectQuestion={handleSelectIcebreaker}
        />
      )}
    </div>
  );
};

export default ChatPage;
