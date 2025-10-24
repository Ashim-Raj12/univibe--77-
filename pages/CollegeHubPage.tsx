
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { PostWithProfile, Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';
import HelpDesk from '../components/HelpDesk';
import { usePresence } from '../contexts/PresenceContext';
import CollegeMembersList from '../components/CollegeMembersList';
import CollegeChat from '../components/CollegeChat';
import PostForm from '../components/PostForm';
import PostCard from '../components/PostCard';
import PostCardSkeleton from '../components/PostCardSkeleton';
import EventsListPage from './EventsListPage';

const CollegeHubPage: React.FC = () => {
    const { profile, user } = useAuth();
    const { onlineUsers } = usePresence();
    const [totalMembers, setTotalMembers] = useState(0);
    const [onlineMembers, setOnlineMembers] = useState(0);
    const [isModerator, setIsModerator] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'announcements' | 'members' | 'chat' | 'help' | 'events'>('announcements');
    
    const [officialCommunityId, setOfficialCommunityId] = useState<number | null>(null);
    const [announcements, setAnnouncements] = useState<PostWithProfile[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);

    const collegeName = profile?.college;

    const fetchAnnouncements = useCallback(async (communityId: number) => {
        setAnnouncementsLoading(true);
        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*, profiles!inner(*), likes(*), comments!inner(count)')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false });
        
        if (postsError) {
            setError(postsError.message);
        } else if (postsData) {
             const authorIds = [...new Set((postsData as PostWithProfile[]).map(p => p.user_id))];
            let postsWithProStatus = postsData as PostWithProfile[];

            if (authorIds.length > 0) {
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', authorIds)
                    .eq('status', 'active');
                
                const proUserIds = new Set(
                    proSubs
                        ?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO')
                        .map(s => s.user_id)
                );

                postsWithProStatus = (postsData as PostWithProfile[]).map(post => ({
                    ...post,
                    profiles: {
                        ...post.profiles,
                        has_pro_badge: proUserIds.has(post.user_id),
                    },
                }));
            }
            setAnnouncements(postsWithProStatus as any);
        }
        setAnnouncementsLoading(false);
    }, []);

    const fetchData = useCallback(async () => {
        if (!collegeName || !user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const profilesPromise = supabase
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('college', collegeName);

            const officialCommunityPromise = supabase
                .from('communities')
                .select('id')
                .eq('name', collegeName)
                .eq('is_verified', true)
                .maybeSingle();
            
            const moderatorCheckPromise = supabase
                .from('college_moderators')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('college_name', collegeName);

            const [
                { data: profilesData, error: profilesError, count: profilesCount },
                { data: officialCommunityData, error: officialCommunityError },
                { error: moderatorError, count: moderatorCount },
            ] = await Promise.all([profilesPromise, officialCommunityPromise, moderatorCheckPromise]);

            if (profilesError) throw profilesError;
            if (officialCommunityError) throw officialCommunityError;
            if (moderatorError) throw moderatorError;
            
            setIsModerator((moderatorCount ?? 0) > 0);

            setTotalMembers(profilesCount || 0);

            if (profilesData) {
                const collegeMemberIds = new Set(profilesData.map(p => p.id));
                const onlineCount = [...onlineUsers].filter(id => collegeMemberIds.has(id)).length;
                setOnlineMembers(onlineCount);
            }

            if (officialCommunityData) {
                setOfficialCommunityId(officialCommunityData.id);
                fetchAnnouncements(officialCommunityData.id);
            } else {
                setAnnouncementsLoading(false);
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [collegeName, onlineUsers, user, fetchAnnouncements]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (officialCommunityId) {
            const postsChannel = supabase
                .channel(`posts-for-community-${officialCommunityId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'posts', filter: `community_id=eq.${officialCommunityId}` },
                    () => fetchAnnouncements(officialCommunityId)
                )
                .subscribe();

            return () => {
                supabase.removeChannel(postsChannel);
            };
        }
    }, [officialCommunityId, fetchAnnouncements]);
    
    const handleAnnouncementDeleted = (postId: number) => {
        setAnnouncements(prev => prev.filter(p => p.id !== postId));
    };

    if (!collegeName && !loading) {
        return (
            <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/80">
                <p>Please complete your profile with your college to access the College Hub!</p>
                <Link to={`/profile/${user?.id}`} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold">
                    Go to Profile
                </Link>
            </div>
        );
    }
    
    const TabButton: React.FC<{ tabName: 'announcements' | 'members' | 'chat' | 'help' | 'events'; icon: React.ReactNode; children: React.ReactNode }> = ({ tabName, icon, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 whitespace-nowrap py-4 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none ${
                activeTab === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
            }`}
        >
            {icon}
            {children}
        </button>
    );

    const icons = {
        announcements: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>,
        members: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>,
        chat: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>,
        help: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
        events: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
    };

    return (
        <div className="space-y-8">
            <div className="relative bg-card rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
                 <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-3xl opacity-50 z-10"></div>
                <div className="relative z-20 p-6 md:p-8">
                    <p className="text-primary font-semibold">Welcome to the</p>
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-4xl font-extrabold text-text-heading mt-1">{collegeName} Hub</h1>
                        {collegeName && (
                            <Link 
                                to={`/university/${encodeURIComponent(collegeName)}`}
                                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                                title="Learn more about this university"
                            >
                                View Details
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-4 text-text-body">
                         <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="font-semibold">{totalMembers} Members</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="font-semibold">{onlineMembers} Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <div className="border-b border-slate-200/80">
                    <nav className="-mb-px flex space-x-2 sm:space-x-6 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                        <TabButton tabName="announcements" icon={icons.announcements}>Announcements</TabButton>
                        <TabButton tabName="events" icon={icons.events}>Events</TabButton>
                        <TabButton tabName="members" icon={icons.members}>Members</TabButton>
                        <TabButton tabName="chat" icon={icons.chat}>Chat</TabButton>
                        <TabButton tabName="help" icon={icons.help}>Help Desk</TabButton>
                    </nav>
                </div>
                <div className="p-2 sm:p-4 min-h-[60vh] relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-b-2xl z-10"><Spinner /></div>
                    )}
                    {activeTab === 'announcements' && (
                        <div className="space-y-6">
                            {isModerator && (
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/80">
                                    <PostForm 
                                        communityId={officialCommunityId || undefined}
                                        onNewPost={() => { if (officialCommunityId) fetchAnnouncements(officialCommunityId) }}
                                        isModeratorPostWithoutCommunity={!officialCommunityId}
                                    />
                                </div>
                            )}
                            {announcementsLoading ? (
                                <div className="space-y-6">
                                    <PostCardSkeleton />
                                </div>
                            ) : !officialCommunityId ? (
                                !isModerator && (
                                    <p className="text-center text-gray-500 py-8">
                                        The announcements section has not been set up for this college.
                                        An administrator needs to create a verified community named "{collegeName}".
                                    </p>
                                )
                            ) : announcements.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No announcements yet.</p>
                            ) : (
                                announcements.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        onPostDeleted={handleAnnouncementDeleted} 
                                        onPostUpdated={() => { if (officialCommunityId) fetchAnnouncements(officialCommunityId); }}
                                        isModerator={isModerator}
                                    />
                                ))
                            )}
                        </div>
                    )}
                    {activeTab === 'events' && <EventsListPage isHubView={true} isModerator={isModerator} />}
                    {activeTab === 'members' && collegeName && <CollegeMembersList collegeName={collegeName} />}
                    {activeTab === 'chat' && collegeName && profile && <CollegeChat collegeName={collegeName} profile={profile} isModerator={isModerator} />}
                    {activeTab === 'help' && collegeName && <HelpDesk collegeName={collegeName} isModerator={isModerator} />}
                </div>
            </div>
        </div>
    );
};

export default CollegeHubPage;
