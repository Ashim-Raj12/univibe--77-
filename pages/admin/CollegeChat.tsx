import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Profile, CollegeGroupMessage, CollegeGroupMessageWithProfile } from '../types';
import Spinner from '../components/Spinner';
import { format, isToday, isYesterday } from 'date-fns';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import { usePresence } from '../contexts/PresenceContext';
import FileRenderer from './FileRenderer';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CollegeChatProps {
    collegeName: string;
    profile: Profile;
    isModerator: boolean;
}

const ChatMessage: React.FC<{ message: CollegeGroupMessageWithProfile; isSender: boolean; onDelete: (messageId: number) => void; isOnline: boolean; isModerator: boolean; }> = ({ message, isSender, onDelete, isOnline, isModerator }) => {
    const messageClasses = isSender
        ? 'bg-primary text-white self-end rounded-l-lg rounded-br-lg'
        : 'bg-slate-200 text-text-heading self-start rounded-r-lg rounded-bl-lg';

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        if (isToday(date)) return format(date, 'p');
        if (isYesterday(date)) return `Yesterday ${format(date, 'p')}`;
        return format(date, 'MMM d, p');
    };

    return (
        <div className={`group relative flex items-start gap-3 w-full ${isSender ? 'flex-row-reverse' : ''}`}>
            <Link to={`/profile/${message.profiles.id}`}>
                <img
                    src={message.profiles.avatar_url || `https://avatar.vercel.sh/${message.profiles.id}.png`}
                    alt={message.profiles.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-5"
                />
            </Link>
            <div className={`flex flex-col max-w-xs md:max-w-md ${isSender ? 'items-end' : 'items-start'}`}>
                <p className={`text-xs text-text-muted mb-1 font-semibold flex items-center gap-1 ${isSender ? 'mr-2' : 'ml-2'}`}>
                     {isSender ? 'You' : (
                        <span className="flex items-center gap-1.5">
                            {message.profiles.name}
                            <div title={isOnline ? 'Online' : 'Offline'} className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                        </span>
                    )}
                    {!isSender && <VerifiedBadge profile={message.profiles} />}
                </p>
                <div className={`p-3 ${messageClasses}`}>
                    {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                    {message.file_url && message.file_type && (
                        <FileRenderer
                            filePath={message.file_url}
                            fileType={message.file_type}
                            fromBucket="chat-files"
                            isSender={isSender}
                        />
                    )}
                </div>
                <p className="text-xs text-text-muted mt-1 px-1">{formatTimestamp(message.created_at)}</p>
            </div>
             {(isSender || isModerator) && (
                <button
                    onClick={() => onDelete(message.id)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted hover:text-red-500"
                    aria-label="Delete message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            )}
        </div>
    );
};

const CollegeChat: React.FC<CollegeChatProps> = ({ collegeName, profile, isModerator }) => {
    const [messages, setMessages] = useState<CollegeGroupMessageWithProfile[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [fileToSend, setFileToSend] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [typing, setTyping] = useState<Set<string>>(new Set());
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const isInitialLoad = useRef(true);
    const membersRef = useRef<Profile[]>();
    membersRef.current = members;

    const { onlineUsers } = usePresence();

    const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: membersData, error: membersError } = await supabase
            .from('profiles')
            .select('*')
            .eq('college', collegeName);

        if (membersError) {
            console.error(membersError);
            setLoading(false);
            return;
        }
        
        if (membersData && membersData.length > 0) {
            const userIds = membersData.map(p => p.id);
            const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', userIds).eq('status', 'active');
            const proUserIds = new Set(proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
            const enrichedMembers = membersData.map(p => ({ ...p, has_pro_badge: proUserIds.has(p.id) }));
            setMembers(enrichedMembers);
        } else {
            setMembers(membersData || []);
        }

        const { data, error } = await supabase
            .from('college_group_chats')
            .select('*, profiles(*)')
            .eq('college', collegeName)
            .order('created_at', { ascending: true })
            .limit(100);

        if (data) {
            const messageUserIds = [...new Set(data.map(m => m.user_id))];
            let enrichedMessages = data;
            if (messageUserIds.length > 0) {
                const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', messageUserIds).eq('status', 'active');
                const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                enrichedMessages = data.map(msg => ({
                    ...msg,
                    profiles: msg.profiles ? { ...msg.profiles, has_pro_badge: proUserIds.has(msg.user_id) } : null
                }));
            }
            setMessages(enrichedMessages as any);
        }
        setLoading(false);
    }, [collegeName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
     useEffect(() => {
        if (loading) {
            isInitialLoad.current = true;
            return;
        }
        if (isInitialLoad.current) {
            scrollToBottom('auto');
            isInitialLoad.current = false;
        } else {
            scrollToBottom('smooth');
        }
    }, [messages, typing, loading, scrollToBottom]);

    useEffect(() => {
        const channel = supabase.channel(`college-chat-${collegeName}`, { config: { presence: { key: profile.name || profile.id } } })
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'college_group_chats', filter: `college=eq.${collegeName}` },
                async (payload: any) => {
                    const newMessageData = payload.new as CollegeGroupMessage;
                    if (newMessageData.user_id === profile.id) {
                        return;
                    }
    
                    let senderProfile = membersRef.current?.find(m => m.id === newMessageData.user_id);
                    if (!senderProfile) {
                        const { data: newProfile, error } = await supabase.from('profiles').select('*').eq('id', newMessageData.user_id).single();
                        if (newProfile && !error) {
                            senderProfile = newProfile;
                            setMembers(current => {
                                if (current.some(p => p.id === newProfile.id)) return current;
                                return [...current, newProfile];
                            });
                        } else {
                            console.error('Could not fetch profile for new message', error);
                            return;
                        }
                    }

                     // Enrich profile with PRO status
                    const { data: proSub } = await supabase
                        .from('user_subscriptions')
                        .select('subscriptions:subscription_id(name)')
                        .eq('user_id', senderProfile.id)
                        .eq('status', 'active')
                        .maybeSingle();
                    (senderProfile as any).has_pro_badge = proSub?.subscriptions?.name?.toUpperCase() === 'PRO';
    
                    const newMessageWithProfile: CollegeGroupMessageWithProfile = { ...newMessageData, profiles: senderProfile };
                    setMessages(current => {
                        if (current.some(m => m.id === newMessageWithProfile.id)) return current;
                        return [...current, newMessageWithProfile];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'college_group_chats', filter: `college=eq.${collegeName}` },
                (payload: any) => {
                    const updatedMessage = payload.new as CollegeGroupMessage;
                    setMessages(current => current.map(m => 
                        m.id === updatedMessage.id 
                        ? { ...m, content: updatedMessage.content, file_url: updatedMessage.file_url, file_type: updatedMessage.file_type }
                        : m
                    ));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'college_group_chats', filter: `college=eq.${collegeName}` },
                (payload: any) => {
                    setMessages(current => current.filter(m => m.id !== (payload.old as { id: number }).id));
                }
            )
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();
                const typingUsers = new Set<string>();
                for (const key in presenceState) {
                    const presences = presenceState[key] as unknown as { name: string, is_typing: boolean }[];
                    if (presences.some(p => p.is_typing)) {
                        typingUsers.add(presences[0].name);
                    }
                }
                setTyping(typingUsers);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    channelRef.current = channel;
                    await channel.track({ is_typing: false, name: profile.name || profile.id });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [collegeName, fetchData, profile]);

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!channelRef.current || !profile.name) return;

        if (!typingTimeoutRef.current) {
            channelRef.current.track({ is_typing: true, name: profile.name });
        } else {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            channelRef.current?.track({ is_typing: false, name: profile.name });
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const resetFileInput = () => {
        setFileToSend(null);
        setFilePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if(file.size > 10 * 1024 * 1024) { // 10MB limit
                alert("File is too large. Max size is 10MB.");
                resetFileInput();
                return;
            }
            setFileToSend(file);
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(file.name);
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if ((!content && !fileToSend) || !profile) return;

        setIsSending(true);
        
        const tempId = Date.now();
        const optimisticMessage: CollegeGroupMessageWithProfile = {
            id: tempId,
            created_at: new Date().toISOString(),
            user_id: profile.id,
            college: collegeName,
            content: content,
            file_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
            file_type: fileToSend ? fileToSend.type : null,
            profiles: profile,
        };
        
        setMessages(current => [...current, optimisticMessage]);

        const tempFile = fileToSend;
        setNewMessage('');
        resetFileInput();
        
        try {
            let fileUrl: string | null = null;
            let fileType: string | null = null;

            if (tempFile) {
                const filePath = `${profile.id}/college-chats/${collegeName}/${Date.now()}_${tempFile.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, tempFile);
                if (uploadError) throw new Error(`Failed to upload file. ${uploadError.message}`);
                
                const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(uploadData.path);
                fileUrl = urlData.publicUrl;
                fileType = tempFile.type;
            }

            const { data: insertedMessage, error } = await supabase.from('college_group_chats').insert({
                user_id: profile.id,
                college: collegeName,
                content: content,
                file_url: fileUrl,
                file_type: fileType,
            }).select().single();
            
            if (error) throw error;
            
            setMessages(current => current.map(m => 
                m.id === tempId ? { ...optimisticMessage, ...insertedMessage } : m
            ));

        } catch(error: any) {
            console.error(error);
            alert("Failed to send message.");
            setMessages(current => current.filter(m => m.id !== tempId));
            setNewMessage(content);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleDeleteMessage = async (messageId: number) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        
        const { error } = await supabase.from('college_group_chats').delete().eq('id', messageId);
        if (error) {
            console.error("Failed to delete message:", error);
            fetchData(); 
            alert("Could not delete message.");
        }
    };
    
    const typingUsers = [...typing].filter(name => name !== (profile.name || profile.id));
    const TypingIndicator = () => {
        if (typingUsers.length === 0) return <div className="h-4"></div>;
        const text = typingUsers.length > 2 ? `${typingUsers.length} people are typing...` : `${typingUsers.join(' and ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
        return <p className="text-xs text-text-muted h-4 px-4 animate-pulse">{text}</p>;
    };

    return (
        <div className="flex flex-col h-[70vh]">
            <main className="flex-1 p-4 overflow-y-auto space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center h-full"><Spinner /></div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <ChatMessage 
                                key={msg.id} 
                                message={msg} 
                                isSender={msg.user_id === profile.id} 
                                onDelete={handleDeleteMessage}
                                isOnline={onlineUsers.has(msg.profiles.id)}
                                isModerator={isModerator}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </main>

            <footer className="p-4 border-t border-slate-200 space-y-2">
                 <TypingIndicator />
                {fileToSend && (
                    <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                        {filePreview && fileToSend.type.startsWith('image/') ? (<img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-md" />) : (<div className="flex items-center gap-2 text-sm text-text-body"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="truncate max-w-xs">{filePreview}</span></div>)}
                        <button onClick={resetFileInput} className="p-1.5 rounded-full hover:bg-slate-200 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="text-text-muted hover:text-primary transition-colors p-3 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /></button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder="Type a message..."
                        className="w-full p-3 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-colors"
                        disabled={isSending}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button type="submit" disabled={isSending || (!newMessage.trim() && !fileToSend)} className="text-white bg-primary disabled:bg-slate-400 hover:bg-primary-focus transition-colors rounded-lg p-3 flex-shrink-0">
                        {isSending ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default CollegeChat;