import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { DoubtPost, DoubtSession, DoubtSessionMessage, Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import { format } from 'date-fns';
import VerifiedBadge from '../components/VerifiedBadge';
import FileRenderer from '../components/FileRenderer';
import { RealtimeChannel } from '@supabase/supabase-js';

const ChatMessage: React.FC<{ message: DoubtSessionMessage; sender: Profile; isSender: boolean; }> = ({ message, sender, isSender }) => {
    return (
        <div className={`flex flex-col gap-1 ${isSender ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-end gap-2 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isSender && <img src={sender.avatar_url || `https://avatar.vercel.sh/${sender.id}.png`} alt={sender.name || ''} className="w-6 h-6 rounded-full"/>}
                <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-slate-200 text-text-heading rounded-bl-none'}`}>
                    {message.content && <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>}
                    {message.file_url && message.file_type && (
                        <FileRenderer 
                            filePath={message.file_url}
                            fileType={message.file_type}
                            fromBucket="chat-files"
                            isSender={isSender}
                        />
                    )}
                </div>
            </div>
            <p className={`text-xs text-text-muted ${isSender ? 'mr-8' : 'ml-8'}`}>{format(new Date(message.created_at), 'p')}</p>
        </div>
    );
};


const DoubtSessionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile: currentUserProfile } = useAuth();
    const navigate = useNavigate();
    const [session, setSession] = useState<DoubtSession | null>(null);
    const [doubtPost, setDoubtPost] = useState<DoubtPost | null>(null);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<DoubtSessionMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const [fileToSend, setFileToSend] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isCancelZone, setIsCancelZone] = useState(false);
    const recordingStartXRef = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cancelRecordingRef = useRef(false);

    const [typing, setTyping] = useState<Set<string>>(new Set());
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const sessionId = parseInt(id!, 10);

    const fetchData = useCallback(async () => {
        if (isNaN(sessionId) || !user) return;
        setLoading(true);

        const { data: sessionData, error: sessionError } = await supabase.from('doubt_sessions').select('*, doubt_posts:doubt_post_id(*)').eq('id', sessionId).single();
        if (sessionError || !sessionData || (user.id !== sessionData.requester_id && user.id !== sessionData.helper_id)) {
            navigate('/study-hub', { replace: true });
            return;
        }
        setSession(sessionData);
        setDoubtPost(sessionData.doubt_posts as DoubtPost);

        const otherUserId = user.id === sessionData.requester_id ? sessionData.helper_id : sessionData.requester_id;
        const { data: otherUserData } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
        if (otherUserData) {
            const { data: proSub } = await supabase
                .from('user_subscriptions')
                .select('subscriptions:subscription_id(name)')
                .eq('user_id', otherUserData.id)
                .eq('status', 'active')
                .maybeSingle();
            
            (otherUserData as any).has_pro_badge = proSub?.subscriptions?.name?.toUpperCase() === 'PRO';
            setOtherUser(otherUserData);
        }

        const { data: messagesData } = await supabase.from('doubt_session_messages').select('*').eq('session_id', sessionId).order('created_at');
        setMessages(messagesData || []);
        setLoading(false);
    }, [sessionId, user, navigate]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel(`doubt-session-${sessionId}`, { config: { presence: { key: currentUserProfile?.name || user?.id } } })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doubt_session_messages', filter: `session_id=eq.${sessionId}`}, 
                (payload) => {
                    const newMessage = payload.new as DoubtSessionMessage;
                    if (newMessage.sender_id === user?.id) return; // Ignore self-sent messages handled optimistically
                    setMessages(current => {
                        if (current.some(m => m.id === newMessage.id)) return current;
                        return [...current, newMessage];
                    });
                })
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
                    await channel.track({ is_typing: false, name: currentUserProfile?.name || user?.id });
                }
            });

        return () => { supabase.removeChannel(channel); channelRef.current = null;};
    }, [fetchData, sessionId, user?.id, currentUserProfile]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isRecording, typing]);
    
    const resetFileInput = () => {
        setFileToSend(null);
        setFilePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileToSend(file);
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(file.name);
            }
        }
    };
    
    const sendBlob = async (blob: Blob, mimeType: string) => {
        if (!user || !session) return;
        setIsSending(true);

        const tempId = Date.now();
        const optimisticMessage: DoubtSessionMessage = {
            id: tempId,
            created_at: new Date().toISOString(),
            session_id: sessionId,
            sender_id: user.id,
            content: null,
            file_url: URL.createObjectURL(blob),
            file_type: mimeType,
        };
        setMessages(current => [...current, optimisticMessage]);

        try {
            const filePath = `doubt-sessions/${session.id}/${user.id}/${Date.now()}_audio.webm`;
            const { data, error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, blob, { contentType: mimeType });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);

            const { data: insertedMessage, error } = await supabase.from('doubt_session_messages').insert({
                session_id: sessionId,
                sender_id: user.id,
                content: null,
                file_url: urlData.publicUrl,
                file_type: mimeType
            }).select().single();
            if (error) throw error;
            setMessages(current => current.map(msg => msg.id === tempId ? (insertedMessage as DoubtSessionMessage) : msg));
        } catch (err: any) {
            console.error("Error sending voice note:", err);
            setMessages(current => current.filter(m => m.id !== tempId));
            alert("Failed to send voice note: " + err.message);
        } finally {
            setIsSending(false);
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        const deltaX = recordingStartXRef.current - e.clientX;
        if (deltaX > 80) setIsCancelZone(true);
        else setIsCancelZone(false);
    };

    const stopRecording = (cancel = false) => {
        document.removeEventListener('pointermove', handlePointerMove);
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
            recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

            const options = { mimeType: 'audio/webm;codecs=opus' };
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (cancelRecordingRef.current) return;
                const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
                sendBlob(audioBlob, options.mimeType);
            };
            recorder.start();
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp, { once: true });
        } catch (error) {
            alert("Microphone access is required. Please enable it in browser settings.");
            setIsRecording(false);
        }
    };
    
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!channelRef.current || !currentUserProfile?.name) return;

        if (!typingTimeoutRef.current) {
            channelRef.current.track({ is_typing: true, name: currentUserProfile.name });
        } else {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            channelRef.current?.track({ is_typing: false, name: currentUserProfile.name });
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if ((!content && !fileToSend) || !user) return;
        setIsSending(true);
        
        const tempId = Date.now();
        const optimisticMessage: DoubtSessionMessage = {
            id: tempId,
            created_at: new Date().toISOString(),
            session_id: sessionId,
            sender_id: user.id,
            content: content || null,
            file_url: fileToSend ? URL.createObjectURL(fileToSend) : null,
            file_type: fileToSend ? fileToSend.type : null,
        };
        setMessages(current => [...current, optimisticMessage]);

        const tempFile = fileToSend;
        setNewMessage('');
        resetFileInput();

        try {
            let file_url: string | null = null;
            let file_type: string | null = null;

            if (tempFile) {
                const filePath = `doubt-sessions/${sessionId}/${user.id}/${Date.now()}_${tempFile.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, tempFile);
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(uploadData.path);
                file_url = urlData.publicUrl;
                file_type = tempFile.type;
            }

            const { data: insertedMessage, error } = await supabase.from('doubt_session_messages').insert({
                session_id: sessionId,
                sender_id: user.id,
                content: content || null,
                file_url,
                file_type,
            }).select().single();
            if (error) throw error;
            setMessages(current => current.map(msg => msg.id === tempId ? (insertedMessage as DoubtSessionMessage) : msg));
        } catch (err: any) {
            console.error(err);
            setMessages(current => current.filter(m => m.id !== tempId)); // Remove optimistic message on failure
            alert("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };
    
    const handleMarkSolved = async () => {
        if (!session) return;
        if (!window.confirm("Are you sure you want to mark this doubt as solved?")) return;
        const { error } = await supabase.from('doubt_posts').update({ status: 'resolved' }).eq('id', session.doubt_post_id);
        if (error) {
            alert("Failed to mark as solved.");
        } else {
            alert("Doubt marked as resolved!");
            navigate('/study-hub');
        }
    }

    const formatRecordingTime = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;

    if (loading || !otherUser || !currentUserProfile) return <div className="flex h-full items-center justify-center"><Spinner size="lg" /></div>;

    const typingUsers = [...typing].filter(name => name !== (currentUserProfile?.name || user?.id));
    const TypingIndicator = () => {
        if (typingUsers.length === 0) return <div className="h-4"></div>;
        const text = typingUsers.length > 2 ? `${typingUsers.length} people are typing...` : `${typingUsers.join(' and ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
        return <p className="text-xs text-text-muted h-4 px-4 animate-pulse">{text}</p>;
    };

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto bg-card sm:rounded-2xl shadow-soft sm:border border-slate-200/50">
            <header className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link to="/study-hub" className="p-2 -ml-2 text-text-muted hover:text-primary rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></Link>
                    <img src={otherUser.avatar_url || `https://avatar.vercel.sh/${otherUser.id}.png`} alt={otherUser.name || ''} className="w-10 h-10 rounded-full"/>
                    <div>
                        <h2 className="font-bold text-text-heading flex items-center gap-1">{otherUser.name} <VerifiedBadge profile={otherUser} /></h2>
                        <p className="text-xs text-text-muted truncate">Topic: {doubtPost?.topic}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {user?.id === session?.requester_id && (
                        <button onClick={handleMarkSolved} className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200">
                            Mark as Solved
                        </button>
                    )}
                </div>
            </header>
            <main className="flex-1 p-3 space-y-4 overflow-y-auto">
                {messages.map(msg => {
                    const isSender = msg.sender_id === user?.id;
                    const sender = isSender ? currentUserProfile : otherUser;
                    return <ChatMessage key={msg.id} message={msg} sender={sender} isSender={isSender} />;
                })}
                <div ref={messagesEndRef}/>
            </main>
            <footer className="p-3 border-t space-y-2">
                 <TypingIndicator />
                {fileToSend && (
                     <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                        {filePreview && fileToSend.type.startsWith('image/') ? (<img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-md" />) : (<div className="flex items-center gap-2 text-sm text-text-body"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="truncate max-w-xs">{filePreview}</span></div>)}
                        <button onClick={resetFileInput} className="p-1.5 rounded-full hover:bg-slate-200 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}
                {isRecording ? (
                     <div className="flex items-center gap-2 h-[44px] w-full animate-fade-in-up px-3">
                        <div className={`transition-transform duration-300 ${isCancelZone ? 'scale-125' : 'scale-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isCancelZone ? 'text-red-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="font-mono text-sm text-text-heading">{formatRecordingTime(recordingTime)}</span>
                            </div>
                            <div className="text-sm text-text-muted animate-pulse flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Slide to cancel
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-text-muted hover:text-primary transition-colors p-2.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /></button>
                        <input type="text" value={newMessage} onChange={handleTyping} placeholder="Type a message..." className="w-full px-4 py-2 border rounded-full bg-slate-100 focus:ring-primary focus:border-primary"/>
                        {newMessage.trim() || fileToSend ? (
                             <button type="submit" disabled={isSending} className="bg-primary text-white rounded-full p-2.5 flex-shrink-0 hover:bg-primary-focus disabled:opacity-50">
                                {isSending ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
                            </button>
                        ) : (
                             <button type="button" onPointerDown={startRecording} className="bg-primary text-white rounded-full p-2.5 flex-shrink-0 hover:bg-primary-focus active:scale-90 transition-transform" style={{ touchAction: 'none' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </button>
                        )}
                    </form>
                )}
            </footer>
        </div>
    );
};

export default DoubtSessionPage;