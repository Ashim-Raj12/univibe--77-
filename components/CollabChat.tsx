import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Profile, CollabMessage, CollabMessageWithSender } from '../types';
import Spinner from './Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from './Toast';

interface CollabChatProps {
    postId: number;
    currentUser: Profile;
    otherUser: Profile;
}

const ChatMessage: React.FC<{ message: CollabMessageWithSender; isSender: boolean; }> = ({ message, isSender }) => {
    return (
        <div className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
            {!isSender && (
                <Link to={`/profile/${message.sender.id}`}>
                    <img src={message.sender.avatar_url || `https://avatar.vercel.sh/${message.sender.id}.png`} alt={message.sender.name || ''} className="w-6 h-6 rounded-full"/>
                </Link>
            )}
            <div className={`max-w-xs p-3 rounded-xl ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-slate-200 text-text-heading rounded-bl-none'}`}>
                <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${isSender ? 'text-blue-200' : 'text-text-muted'} text-right`}>{format(new Date(message.created_at), 'p')}</p>
            </div>
        </div>
    );
};

const CollabChat: React.FC<CollabChatProps> = ({ postId, currentUser, otherUser }) => {
    const [messages, setMessages] = useState<CollabMessageWithSender[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        const { data, error } = await supabase
            .from('collab_messages')
            .select('*, sender:sender_id(*)')
            .eq('post_id', postId)
            .order('created_at');
        if (error) {
            console.error("Error fetching chat messages:", error);
            toast.error("Could not load chat history.");
        } else {
            setMessages((data as any) || []);
        }
    }, [postId]);

    useEffect(() => {
        fetchMessages();
        const channel = supabase.channel(`collab-chat-${postId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collab_messages', filter: `post_id=eq.${postId}` }, payload => {
                const newMessage = payload.new as CollabMessage;
                // Avoid duplicating optimistic update
                if (newMessage.sender_id === currentUser.id) return;
                
                const senderProfile = newMessage.sender_id === otherUser.id ? otherUser : currentUser;
                const messageWithSender: CollabMessageWithSender = { ...newMessage, sender: senderProfile };
                setMessages(current => [...current, messageWithSender]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel) };
    }, [postId, fetchMessages, currentUser, otherUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || !currentUser) return;

        setIsSending(true);
        const tempId = Date.now();
        const optimisticMessage: CollabMessageWithSender = {
            id: tempId,
            post_id: postId,
            sender_id: currentUser.id,
            content,
            file_url: null,
            file_type: null,
            created_at: new Date().toISOString(),
            sender: currentUser,
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');

        const { error } = await supabase.from('collab_messages').insert({
            post_id: postId,
            sender_id: currentUser.id,
            content: content,
        });

        if (error) {
            toast.error(error.message);
            setMessages(prev => prev.filter(m => m.id !== tempId)); // remove optimistic message on error
            setNewMessage(content); // restore input
        }
        setIsSending(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                {messages.map(msg => (
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
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border rounded-full bg-slate-100 focus:ring-primary focus:border-primary transition-colors"
                />
                <button type="submit" disabled={isSending} className="bg-primary text-white rounded-full p-2.5 flex-shrink-0 hover:bg-primary-focus disabled:opacity-50 transition-colors">
                    {isSending ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                </button>
            </form>
        </div>
    );
};

export default CollabChat;
