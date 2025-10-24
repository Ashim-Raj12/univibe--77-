import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { CommunityWithCreator, PostWithProfile, CommunityMember, Profile } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import PostCard from '../components/PostCard';
import PostForm from '../components/PostForm';
import VerifyCommunityModal from '../components/VerifyCommunityModal';
import CommunityMembersModal from '../components/CommunityMembersModal';
import StudyMaterials from '../components/StudyMaterials';
import VerifiedBadge from '../components/VerifiedBadge';
import CommunityPageSkeleton from '../components/CommunityPageSkeleton';

const CommunityPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile } = useAuth();
    const [community, setCommunity] = useState<CommunityWithCreator | null>(null);
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [memberInfo, setMemberInfo] = useState<CommunityMember | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [isJoinLoading, setIsJoinLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'files'>('posts');
    const [checkingPermissions, setCheckingPermissions] = useState(true);

    const isAdmin = profile?.id === '00000000-0000-0000-0000-000000000000';

    const fetchCommunityData = useCallback(async () => {
        if (!id || !user) return;
        setLoading(true);
        setError(null);
        setCheckingPermissions(true);

        try {
            const communityId = parseInt(id, 10);
            if (isNaN(communityId)) throw new Error("Invalid community ID.");

            const communityPromise = supabase
                .from('communities')
                .select('*, profiles:creator_id(*)')
                .eq('id', communityId)
                .single();

            const postsPromise = supabase
                .from('posts')
                .select('id, created_at, content, image_url, user_id, community_id, location, profiles!inner(*), likes(*), comments!inner(count)')
                .eq('community_id', communityId)
                .order('created_at', { ascending: false });

            const [{ data: communityData, error: communityError }, { data: postsData, error: postsError }] = await Promise.all([communityPromise, postsPromise]);

            if (communityError) throw communityError;
            if (postsError) throw postsError;

            let finalCommunity = communityData as CommunityWithCreator;
            let finalPosts = (postsData as PostWithProfile[]) || [];

            const userIds = new Set<string>();
            if (finalCommunity?.profiles?.id) {
                userIds.add(finalCommunity.profiles.id);
            }
            finalPosts.forEach(post => userIds.add(post.user_id));

            if (userIds.size > 0) {
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', Array.from(userIds))
                    .eq('status', 'active');
                
                const proUserIds = new Set(
                    proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id)
                );

                if (finalCommunity?.profiles) {
                    (finalCommunity.profiles as Profile).has_pro_badge = proUserIds.has(finalCommunity.profiles.id);
                }
                
                finalPosts = finalPosts.map(post => ({
                    ...post,
                    profiles: {
                        ...post.profiles,
                        has_pro_badge: proUserIds.has(post.user_id),
                    }
                }));
            }

            setCommunity(finalCommunity);
            setPosts(finalPosts);
            
            // Fetch membership status and count
            const { count: memberCountData } = await supabase
                .from('community_members')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', communityId);
            setMemberCount(memberCountData ?? 0);

            const { data: memberData } = await supabase
                .from('community_members')
                .select('*')
                .eq('community_id', communityId)
                .eq('user_id', user.id)
                .maybeSingle();
            setMemberInfo(memberData);

        } catch (e: any) {
             setError(e.message.includes('0 rows') ? "Community not found." : e.message);
        } finally {
            setLoading(false);
            setCheckingPermissions(false);
        }
    }, [id, user]);

    useEffect(() => {
        fetchCommunityData();
    }, [fetchCommunityData]);
    
    const handlePostDeleted = useCallback((postId: number) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    }, []);
    
    const handleNewPost = useCallback(() => {
        fetchCommunityData(); // Refetch to see new post
    }, [fetchCommunityData]);

    const handleMembershipToggle = async () => {
        if (!user || !id || isJoinLoading) return;
        setIsJoinLoading(true);

        const communityId = parseInt(id, 10);
        const isMember = !!memberInfo;

        if (isMember) {
            // Leave community
            const { error } = await supabase
                .from('community_members')
                .delete()
                .match({ community_id: communityId, user_id: user.id });
            if (!error) {
                setMemberInfo(null);
                setMemberCount(prev => prev - 1);
            }
        } else {
            // Join community
             const { data, error } = await supabase
                .from('community_members')
                .insert({ community_id: communityId, user_id: user.id })
                .select()
                .single();
             if (!error) {
                setMemberInfo(data);
                setMemberCount(prev => prev + 1);
            }
        }
        setIsJoinLoading(false);
    }

    if (loading) {
        return <CommunityPageSkeleton />;
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    if (!community) {
        return <p className="text-center text-gray-500 p-8">Could not load community.</p>;
    }
    
    const isMember = !!memberInfo;
    const isCreator = community.creator_id === user?.id;
    const canViewContent = true; // All communities are public by default as 'type' column is missing.
    
    const canPost = isCreator || (isMember && !!memberInfo?.can_post);
    const isPostingRestricted = !canPost;
    const canModerate = isCreator;

    const shouldShowPostArea = !checkingPermissions && (isMember || canViewContent);

    const joinButtonClasses = `px-4 py-2 rounded-xl transition-all duration-300 font-semibold text-sm disabled:opacity-50 shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5
        ${isMember ? 'bg-slate-100 text-text-body hover:bg-slate-200' : 'bg-primary text-white hover:bg-primary-focus'}`;

    return (
        <>
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 mb-6 overflow-hidden">
                <div className="relative h-48 bg-slate-200">
                    {community.banner_url ? (
                        <img
                            src={community.banner_url}
                            alt={`${community.name} banner`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-text-heading">{community.name}</h1>
                                {community.is_verified && (
                                    <div className="flex items-center gap-1 text-sm font-semibold text-green-600" title="Verified Community">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-x-4 mt-2">
                                <button onClick={() => setIsMembersModalOpen(true)} className="text-sm text-text-muted hover:underline">
                                    <span className="font-bold text-text-body">{memberCount}</span> {memberCount === 1 ? 'member' : 'members'}
                                </button>
                                <span className="text-sm text-text-muted">
                                    Created by <Link to={`/profile/${community.profiles.id}`} className="font-semibold text-text-body hover:underline inline-flex items-center gap-1">{community.profiles.name} <VerifiedBadge profile={community.profiles} size="h-4 w-4" /></Link>
                                </span>
                            </div>
                            {community.description && <p className="mt-4 text-text-body max-w-2xl">{community.description}</p>}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                            {!isCreator && (
                                <button onClick={handleMembershipToggle} disabled={isJoinLoading} className={joinButtonClasses}>
                                    {isJoinLoading ? <Spinner size="sm" /> : (isMember ? 'Joined' : 'Join')}
                                </button>
                            )}
                            {(isAdmin && !community.is_verified) && <button onClick={() => setIsVerifyModalOpen(true)} className="px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-semibold text-sm">Verify</button>}
                        </div>
                    </div>
                </div>

                {canViewContent && (
                     <div className="border-t border-slate-200/80">
                        <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('posts')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>Posts</button>
                            <button onClick={() => setActiveTab('files')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'files' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>Files</button>
                        </nav>
                    </div>
                )}
            </div>
            
            {canViewContent ? (
                <div className="space-y-6">
                    {activeTab === 'posts' && (
                        <>
                            {shouldShowPostArea && (
                                <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                                    <PostForm onNewPost={handleNewPost} communityId={community.id} isPostingRestricted={isPostingRestricted} />
                                </div>
                            )}
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} onPostUpdated={fetchCommunityData} isModerator={canModerate} />
                                ))
                            ) : (
                                <p className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/50">No posts in this community yet.</p>
                            )}
                        </>
                    )}
                    {activeTab === 'files' && <StudyMaterials communityId={community.id} isMember={isMember} />}
                </div>
            ) : (
                 <div className="text-center bg-card p-10 rounded-2xl border border-slate-200/50">
                    <h2 className="text-xl font-bold text-text-heading">This is a private community</h2>
                    <p className="text-text-body mt-2">Join the community to view its posts and files.</p>
                </div>
            )}
            
            {isVerifyModalOpen && <VerifyCommunityModal community={community} onClose={() => setIsVerifyModalOpen(false)} onSuccess={() => { setIsVerifyModalOpen(false); fetchCommunityData(); }} />}
            {isMembersModalOpen && <CommunityMembersModal communityId={community.id} communityName={community.name} creatorId={community.creator_id} onClose={() => setIsMembersModalOpen(false)} />}
        </>
    );
};

export default CommunityPage;