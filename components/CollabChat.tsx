import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import { Profile, CollabMessage, CollabMessageWithSender } from "../types";
import Spinner from "./Spinner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "./Toast";
import FileRenderer from "./FileRenderer";

interface CollabChatProps {
  postId: number;
  currentUser: Profile;
  otherUser: Profile;
}

// Linkify function to detect and make URLs clickable
const linkify = (text: string, isSender: boolean) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isSender
              ? "text-white underline hover:text-blue-200"
              : "text-black underline hover:text-blue-800"
          }
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const ChatMessage: React.FC<{
  message: CollabMessageWithSender;
  isSender: boolean;
}> = ({ message, isSender }) => {
  return (
    <div
      className={`flex items-end gap-2 ${
        isSender ? "justify-end" : "justify-start"
      }`}
    >
      {!isSender && (
        <Link to={`/profile/${message.sender.id}`}>
          <img
            src={
              message.sender.avatar_url ||
              `https://avatar.vercel.sh/${message.sender.id}.png`
            }
            alt={message.sender.name || ""}
            className="w-6 h-6 rounded-full"
          />
        </Link>
      )}
      <div
        className={`max-w-xs md:max-w-md p-3 rounded-xl ${
          isSender
            ? "bg-primary text-white rounded-br-none"
            : "bg-slate-200 text-text-heading rounded-bl-none"
        }`}
      >
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-all min-w-0">
            {linkify(message.content, isSender)}
          </p>
        )}
        {message.file_url && message.file_type && (
          <FileRenderer
            filePath={message.file_url}
            fileType={message.file_type}
            fileName={message.file_name}
            fromBucket="chat-files"
            isSender={isSender}
            allowCustomDownload={true}
          />
        )}
        <p
          className={`text-xs mt-1 ${
            isSender ? "text-blue-200" : "text-text-muted"
          } text-right`}
        >
          {format(new Date(message.created_at), "p")}
        </p>
      </div>
    </div>
  );
};

const CollabChat: React.FC<CollabChatProps> = ({
  postId,
  currentUser,
  otherUser,
}) => {
  const [messages, setMessages] = useState<CollabMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("collab_messages")
      .select("*, sender:sender_id(*)")
      .eq("post_id", postId)
      .order("created_at");
    if (error) {
      console.error("Error fetching chat messages:", error);
      toast.error("Could not load chat history.");
    } else {
      setMessages((data as any) || []);
    }
  }, [postId]);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`collab-chat-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collab_messages",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const newMessage = payload.new as CollabMessage;
          // Avoid duplicating optimistic update
          if (newMessage.sender_id === currentUser.id) return;

          const senderProfile =
            newMessage.sender_id === otherUser.id ? otherUser : currentUser;
          const messageWithSender: CollabMessageWithSender = {
            ...newMessage,
            sender: senderProfile,
          };
          setMessages((current) => [...current, messageWithSender]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchMessages, currentUser, otherUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if ((!content && !selectedFile) || !currentUser) return;

    setIsSending(true);
    const tempId = Date.now();
    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    // Upload file if selected
    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `collab-${postId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, selectedFile);

      if (uploadError) {
        toast.error("Failed to upload file: " + uploadError.message);
        setIsSending(false);
        return;
      }

      fileUrl = filePath;
      fileType = selectedFile.type;
      fileName = selectedFile.name;
    }

    const optimisticMessage: CollabMessageWithSender = {
      id: tempId,
      post_id: postId,
      sender_id: currentUser.id,
      content: content || null,
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
      created_at: new Date().toISOString(),
      sender: currentUser,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const { error } = await supabase.from("collab_messages").insert({
      post_id: postId,
      sender_id: currentUser.id,
      content: content || null,
      file_url: fileUrl,
      file_type: fileType,
      file_name: fileName,
    });

    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId)); // remove optimistic message on error
      setNewMessage(content); // restore input
      setSelectedFile(selectedFile); // restore file
    }
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isSender={msg.sender_id === currentUser?.id}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.mp4,.avi,.mov,.zip,.rar"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-200 text-text-body rounded-full p-2.5 flex-shrink-0 hover:bg-slate-300 transition-colors"
          title="Attach file"
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
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full px-4 py-2 border rounded-full bg-slate-100 focus:ring-primary focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={isSending}
          className="bg-primary text-white rounded-full p-2.5 flex-shrink-0 hover:bg-primary-focus disabled:opacity-50 transition-colors"
        >
          {isSending ? (
            <Spinner size="sm" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </form>
      {selectedFile && (
        <div className="px-3 pb-2 text-sm text-text-muted">
          File selected: {selectedFile.name}
        </div>
      )}
    </div>
  );
};

export default CollabChat;
