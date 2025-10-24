import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Profile, Message, Conversation } from '../types';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { usePresence } from '../contexts/PresenceContext';
import VerifiedBadge from '../components/VerifiedBadge';
import ConversationItemSkeleton from '../components/ConversationItemSkeleton';

// New type to include unread count
interface ConversationWithUnread extends Conversation {
    unread_count: number;
}

const ConversationItem: React.FC<{ conversation: ConversationWithUnread, isOnline: boolean }> = React.memo(({ conversation, isOnline }) => {
    const { user } = useAuth();
    const isSender = conversation.last_message.sender_id === user?.id;

    const getDisplayContent = () => {
        const { content, file_url, file_type } = conversation.last_message;
        const textContent = content || '';
        
        const match = textContent.match(/^\[REPLY::.*?::REPLY\](.*)$/s);
        const mainContent = match ? match[1].trim() : textContent;

        let displayMessage = mainContent;
        if (!mainContent && file_url) {
            if (file_url.startsWith('blob:')) {
                displayMessage = 'Sending a file...';
            } else if (file_type?.startsWith('audio/')) {
                 displayMessage = 'Sent a voice note';
            } else if (file_type?.startsWith('image/')) {
                 displayMessage = 'Sent an image';
            } else {
                displayMessage = 'Sent a file';
            }
        }
        
        if (isSender) {
            return `You: ${displayMessage}`;
        }
        return displayMessage;
    };

    return (
        <Link 
            to={`/chat/${conversation.profile.id}`} 
            className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-slate-100"
        >
            <div className="relative flex-shrink-0">
                <img 
                    src={conversation.profile.avatar_url || `https://avatar.vercel.sh/${conversation.profile.id}.png`}
                    alt={conversation.profile.name || ''}
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white transition-colors ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <h3 className="font-bold truncate text-text-body">{conversation.profile.name}</h3>
                        <VerifiedBadge profile={conversation.profile} />
                    </div>
                    <p className="text-xs text-text-muted flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
                    </p>
                </div>
                <div className="flex justify-between items-start mt-1">
                     <p className={`text-sm pr-2 truncate ${conversation.unread_count > 0 ? 'font-bold text-text-heading' : 'text-text-body'}`}>
                        {getDisplayContent()}
                    </p>
                    {conversation.unread_count > 0 && (
                        <span className="bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                            {conversation.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
});

const ChatListPage: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ConversationWithUnread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { onlineUsers } = usePresence();

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setError(null);
        
        try {
            const { data, error: rpcError } = await supabase.rpc('get_conversations');

            if (rpcError) throw rpcError;

            const conversationsData = (data as any[]).map((convo: any) => ({
                profile: convo.profile as Profile,
                last_message: convo.last_message as Message,
                unread_count: convo.unread_count,
            }));
            
            setConversations(conversationsData);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);
    
    useEffect(() => {
        if (!user) return;

        const handleNewMessage = async () => {
            fetchConversations();
        };

        const channel = supabase
            .channel(`messages-for-${user.id}-list`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages', 
                filter: `or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})` 
            }, handleNewMessage)
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'messages'
            }, handleNewMessage)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchConversations]);

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-text-heading mb-6">Messages</h1>
            <div className="bg-card rounded-2xl shadow-soft border border-border">
                {loading ? (
                    <div className="divide-y divide-slate-100">
                        {[...Array(5)].map((_, i) => <ConversationItemSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <p className="text-center text-red-500 p-8">{error}</p>
                ) : conversations.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">No messages yet. Find fellows and start a conversation!</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {conversations.map(convo => (
                            <ConversationItem key={convo.profile.id} conversation={convo} isOnline={onlineUsers.has(convo.profile.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatListPage;
