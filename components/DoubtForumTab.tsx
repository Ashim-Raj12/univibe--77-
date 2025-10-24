import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { DoubtPostWithProfile, DoubtSession, Profile } from '../types';
import Spinner from './Spinner';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

const DoubtPostForm: React.FC<{ college: string; onSuccess: () => void }> = ({ college, onSuccess }) => {
    const { user } = useAuth();
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || !description.trim() || !user) return;
        setLoading(true);
        setError('');
        const { error: insertError } = await supabase.from('doubt_posts').insert({
            user_id: user.id,
            college,
            topic,
            description
        });
        if (insertError) {
            setError(insertError.message);
        } else {
            setTopic('');
            setDescription('');
            onSuccess();
        }
        setLoading(false);
    };
    
    const inputClasses = "w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

    return (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50 space-y-4">
            <h3 className="text-lg font-bold text-text-heading">Ask a Question</h3>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
                <label className="block text-sm font-medium text-text-body mb-2">Topic / Subject</label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., React Hooks, Thermodynamics" className={inputClasses} required/>
            </div>
             <div>
                <label className="block text-sm font-medium text-text-body mb-2">Describe your doubt</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain your problem in detail..." className={inputClasses} rows={4} required/>
            </div>
            <div className="text-right">
                <button type="submit" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 min-w-[120px] font-semibold">
                    {loading ? <Spinner size="sm" /> : 'Post Doubt'}
                </button>
            </div>
        </form>
    );
};

const DoubtForumTab: React.FC = () => {
    const { profile } = useAuth();
    const [doubts, setDoubts] = useState<DoubtPostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTopic, setFilterTopic] = useState('');
    const [debouncedFilter, setDebouncedFilter] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilter(filterTopic);
        }, 500);
        return () => clearTimeout(handler);
    }, [filterTopic]);

    const fetchDoubts = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('doubt_posts')
            .select('*, profiles(*)')
            .eq('status', 'open')
            .order('created_at', { ascending: false });
        
        if (debouncedFilter.trim()) {
            query = query.ilike('topic', `%${debouncedFilter.trim()}%`);
        }
        
        const { data, error } = await query;
        
        if (data) {
            const userIds = [...new Set(data.map(d => d.user_id))];
            let enrichedDoubts = data;

            if (userIds.length > 0) {
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', userIds)
                    .eq('status', 'active');
                
                const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));

                enrichedDoubts = data.map(d => ({
                    ...d,
                    profiles: { ...d.profiles, has_pro_badge: proUserIds.has(d.user_id) }
                }));
            }

            setDoubts(enrichedDoubts as any);
        }
        setLoading(false);
    }, [debouncedFilter]);

    useEffect(() => {
        fetchDoubts();
        const channel = supabase.channel('doubt-posts-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'doubt_posts' }, fetchDoubts)
            .subscribe();
        return () => { supabase.removeChannel(channel) };
    }, [fetchDoubts]);

    return (
        <div className="space-y-6 p-2">
            {profile?.college && <DoubtPostForm college={profile.college} onSuccess={fetchDoubts} />}
            
            <div className="flex justify-between items-center pt-4">
                <h2 className="text-xl font-bold text-text-heading">Open Doubts</h2>
                <div className="relative w-full max-w-xs">
                    <input 
                        type="text" 
                        value={filterTopic}
                        onChange={e => setFilterTopic(e.target.value)}
                        placeholder="Filter by topic..."
                        className="w-full p-2 pl-8 border border-slate-300 rounded-lg text-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><Spinner/></div> :
             doubts.length === 0 ? <p className="text-center text-text-muted py-10">No open doubts found. Feeling sharp? Help others when they post!</p> :
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {doubts.map(doubt => <DoubtCard key={doubt.id} doubt={doubt} />)}
             </div>
            }
        </div>
    );
};

const DoubtCard: React.FC<{ doubt: DoubtPostWithProfile }> = ({ doubt }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [actionLoading, setActionLoading] = useState(false);
    const [sessions, setSessions] = useState<(DoubtSession & { profiles: Profile })[]>([]);
    
    useEffect(() => {
        const fetchSessions = async () => {
            const { data } = await supabase.from('doubt_sessions').select('*, profiles:helper_id(*)').eq('doubt_post_id', doubt.id);
            
            let sessionsData = (data as (DoubtSession & { profiles: Profile })[]) || [];

            if (sessionsData.length > 0) {
                const helperIds = sessionsData.map(s => s.helper_id);
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', helperIds)
                    .eq('status', 'active');
                
                const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                
                sessionsData = sessionsData.map(s => ({
                    ...s,
                    profiles: { ...s.profiles, has_pro_badge: proUserIds.has(s.helper_id) }
                }));
            }
            setSessions(sessionsData);
        };
        fetchSessions();
        const channel = supabase.channel(`doubt-sessions-for-${doubt.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'doubt_sessions', filter: `doubt_post_id=eq.${doubt.id}` }, fetchSessions)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [doubt.id]);

    const handleHelp = async () => {
        if (!user || user.id === doubt.user_id || actionLoading) return;
        setActionLoading(true);
        const { error } = await supabase.from('doubt_sessions').insert({
            doubt_post_id: doubt.id,
            requester_id: doubt.user_id,
            helper_id: user.id,
            status: 'pending'
        });
        if (error) {
            alert("Could not offer help. Another helper might have already been accepted, or an error occurred.");
        }
        setActionLoading(false);
    };
    
    const handleSessionAction = async (sessionId: number, status: 'accepted' | 'declined') => {
        setActionLoading(true);
        const { error: sessionUpdateError } = await supabase.from('doubt_sessions').update({ status }).eq('id', sessionId);
        if (sessionUpdateError) {
            alert('Failed to update session status.');
            setActionLoading(false);
            return;
        }

        if (status === 'accepted') {
            const otherPendingOffers = sessions.filter(s => s.status === 'pending' && s.id !== sessionId);
            const otherOfferIds = otherPendingOffers.map(s => s.id);
            if (otherOfferIds.length > 0) {
                await supabase.from('doubt_sessions').update({ status: 'declined' }).in('id', otherOfferIds);
            }
            navigate(`/doubt-session/${sessionId}`);
        }
        setActionLoading(false);
    };
    
    const handleMarkAsSolved = async () => {
        if (!window.confirm("Are you sure you want to mark this doubt as solved? This will close it for everyone.")) return;
        setActionLoading(true);
        const { error } = await supabase.from('doubt_posts').update({ status: 'resolved' }).eq('id', doubt.id);
        if (error) {
            alert("Failed to mark as solved: " + error.message);
        }
        setActionLoading(false);
    };
    
    const isOwner = user?.id === doubt.user_id;
    const userSession = sessions.find(s => s.helper_id === user?.id);
    const acceptedSession = sessions.find(s => s.status === 'accepted');

    const renderActionArea = () => {
        // --- VIEW FOR THE PERSON WHO POSTED THE DOUBT ---
        if (isOwner) {
            if (acceptedSession) {
                return (
                    <div className="p-2 bg-white rounded-md flex justify-between items-center">
                        <Link to={`/profile/${acceptedSession.profiles.id}`} className="flex items-center gap-2 font-semibold text-sm hover:underline">
                            <img src={acceptedSession.profiles.avatar_url || ''} className="w-6 h-6 rounded-full" alt="" />
                            {acceptedSession.profiles.name}
                        </Link>
                        <div className="flex items-center gap-2">
                             <button onClick={() => navigate(`/doubt-session/${acceptedSession.id}`)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-200">
                                Go to Chat
                            </button>
                             <button onClick={handleMarkAsSolved} disabled={actionLoading} className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200">
                                {actionLoading ? <Spinner size="sm"/> : 'Mark as Solved'}
                            </button>
                        </div>
                    </div>
                );
            }
            const pendingOffers = sessions.filter(s => s.status === 'pending');
            if (pendingOffers.length === 0) {
                 return <p className="text-xs text-text-muted">No one has offered to help yet.</p>
            }
            return (
                <div className="space-y-2">
                    {pendingOffers.map(s => (
                        <div key={s.id} className="p-2 bg-white rounded-md flex justify-between items-center">
                            <Link to={`/profile/${s.profiles.id}`} className="flex items-center gap-2 font-semibold text-sm hover:underline">
                                <img src={s.profiles.avatar_url || ''} className="w-6 h-6 rounded-full" alt="" />
                                {s.profiles.name}
                            </Link>
                            <button onClick={() => handleSessionAction(s.id, 'accepted')} disabled={actionLoading} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold hover:bg-green-200">Accept</button>
                        </div>
                    ))}
                </div>
            );
        }
        
        // --- VIEW FOR EVERYONE ELSE ---
        if (acceptedSession) {
            if (acceptedSession.helper_id === user?.id) {
                return (
                    <div className="mt-4 text-right">
                        <button onClick={() => navigate(`/doubt-session/${acceptedSession.id}`)} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-focus">
                            Go to Chat
                        </button>
                    </div>
                );
            }
            return (
                <div className="mt-4 text-right">
                    <button disabled className="bg-slate-200 text-slate-500 text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed">
                        Helper Assigned
                    </button>
                </div>
            );
        }

        if (userSession?.status === 'pending') {
            return (
                <div className="mt-4 text-right">
                    <button disabled className="bg-slate-200 text-slate-500 text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed">
                        Offer Sent
                    </button>
                </div>
            );
        }

        // Only show "I can help" if not the owner
        if (!isOwner) {
            return (
                <div className="mt-4 text-right">
                    <button onClick={handleHelp} disabled={actionLoading} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-focus">
                        {actionLoading ? <Spinner size="sm" /> : 'I can help!'}
                    </button>
                </div>
            );
        }

        return null; // Fallback for owner if no other conditions met
    }


    return (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div>
                <h4 className="font-bold text-text-heading">{doubt.topic}</h4>
                <p className="text-sm text-text-body mt-2 whitespace-pre-wrap">{doubt.description}</p>
                 <p className="text-xs text-text-muted mt-2 font-semibold">{doubt.college}</p>
            </div>
            <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center text-xs text-text-muted">
                    <Link to={`/profile/${doubt.profiles.id}`} className="flex items-center gap-1.5 font-semibold hover:underline">
                        <img src={doubt.profiles.avatar_url || `https://avatar.vercel.sh/${doubt.profiles.id}.png`} alt={doubt.profiles.name || ''} className="w-5 h-5 rounded-full" />
                        {doubt.profiles.name}
                        <VerifiedBadge profile={doubt.profiles} />
                    </Link>
                    <span>{formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })}</span>
                </div>
                <div className="mt-3">
                    {isOwner && !acceptedSession && <h5 className="text-xs font-bold text-text-muted mb-2">HELP OFFERS ({sessions.filter(s => s.status === 'pending').length})</h5>}
                    {renderActionArea()}
                </div>
            </div>
        </div>
    )
};

export default DoubtForumTab;