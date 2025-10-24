import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Post, Profile, PostWithProfile, VerificationSubmission, ParentVerificationSubmission, UserSubscriptionWithPlan } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import PostCard from '../components/PostCard';
import VerifiedBadge from '../components/VerifiedBadge';
import VerificationModal from '../components/VerificationModal';
import ParentVerificationModal from '../components/ParentVerificationModal';
import IcebreakerModal from '../components/IcebreakerModal'; 
import ReportModal from '../components/ReportModal';
import { useFriendships } from '../hooks/useFriendships';
import { format } from 'date-fns';
import ProfilePageSkeleton from '../components/ProfilePageSkeleton';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from '../components/Toast';

export type UserRole = 'student' | 'parent' | 'faculty' | 'unknown';

export const getRoleFromProfile = (profile: Profile | null): UserRole => {
    if (!profile || !profile.enrollment_status) {
        return 'unknown';
    }
    const status = profile.enrollment_status;
    if (['current_student', 'incoming_student', 'passed_out', 'exploring'].includes(status)) {
        return 'student';
    }
    if (status === 'parent') {
        return 'parent';
    }
    if (status === 'faculty') {
        return 'faculty';
    }
    return 'unknown';
};

export const getHomePathForProfile = (profile: Profile | null): string => {
    const role = getRoleFromProfile(profile);
    switch (role) {
        case 'student':
            return '/home';
        case 'parent':
            return '/common-room';
        case 'faculty':
            return '/college-hub';
        default:
            return '/';
    }
};

export const getEnrollmentStatusText = (status: 'current_student' | 'incoming_student' | 'passed_out' | 'parent' | 'faculty' | null | undefined) => {
    if (status === 'current_student') return 'Current Student';
    if (status === 'incoming_student') return 'Future Student';
    if (status === 'passed_out') return 'Alumni';
    if (status === 'parent') return 'Parent';
    if (status === 'faculty') return 'Faculty / Staff';
    return '';
};

const LinkedinIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
);
const TwitterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.616 1.923 2.397 3.328 4.491 3.365-2.012 1.574-4.549 2.502-7.34 2.502-.478 0-.947-.027-1.412-.084 2.618 1.68 5.734 2.649 9.049 2.649 10.956 0 17.03-9.143 16.717-17.332z"/></svg>
);
const GithubIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);


const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, profile: currentUserProfile, refetchProfile, subscription } = useAuth();
    const { isFollowing, toggleFollow, mutatingIds } = useFriendships();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<PostWithProfile[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [studentVerificationStatus, setStudentVerificationStatus] = useState<VerificationSubmission['status'] | null>(null);
    const [parentVerificationStatus, setParentVerificationStatus] = useState<ParentVerificationSubmission['status'] | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isParentVerifying, setIsParentVerifying] = useState(false);
    const [isIcebreakerModalOpen, setIsIcebreakerModalOpen] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const isOwner = user?.id === id;
    const following = isFollowing(id!);
    const actionLoading = mutatingIds.has(id!);

    const fetchProfileAndPosts = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
                
            if (profileError || !profileData) throw profileError || new Error('Profile not found');
            
            const parentOverrideEmails = ['rituraj0gupta@gmail.com', 'sumit129@gmail.com'];
            if (profileData.email && parentOverrideEmails.includes(profileData.email)) {
                profileData.enrollment_status = 'parent';
            }

            setProfile(profileData);

            // Fetch posts, followers, etc.
            const postsPromise = supabase.from('posts').select('*, profiles!inner(*), likes(*), comments!inner(count)').eq('user_id', id).order('created_at', { ascending: false });
            const followersPromise = supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id);
            const followingPromise = supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id);
            
            const [{ data: postsData, error: postsError }, { count: followers }, { count: followingCountData }] = await Promise.all([postsPromise, followersPromise, followingPromise]);
            
            if (postsError) throw postsError;
            
            setPosts((postsData as PostWithProfile[]) || []);
            setFollowerCount(followers ?? 0);
            setFollowingCount(followingCountData ?? 0);

            if (isOwner && !profileData.is_verified) {
                if(profileData.enrollment_status === 'parent') {
                    const { data: submissionData } = await supabase.from('parent_verification_submissions').select('status, reviewer_notes').eq('user_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();
                    if (submissionData) {
                        setParentVerificationStatus(submissionData.status);
                        setRejectionNotes(submissionData.reviewer_notes);
                    } else {
                        setParentVerificationStatus(null);
                        setRejectionNotes(null);
                    }
                } else {
                    const { data: submissionData } = await supabase.from('verification_submissions').select('status, reviewer_notes').eq('user_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();
                    if (submissionData) {
                        setStudentVerificationStatus(submissionData.status);
                        setRejectionNotes(submissionData.reviewer_notes);
                    } else {
                        setStudentVerificationStatus(null);
                        setRejectionNotes(null);
                    }
                }
            }

        } catch (e: any) {
            console.error('Error fetching profile page data:', e);
            setError(e.message);
            if(e.message.includes('0 rows')) setError("Profile not found.");
        } finally {
            setLoading(false);
        }
    }, [id, isOwner]);

    useEffect(() => {
        fetchProfileAndPosts();
    }, [id, fetchProfileAndPosts]);
    
    useEffect(() => {
        if (!id) return;

        const handlePostInsert = async (payload: any) => {
            const newPost = payload.new as Post;
            // Check if post is already in the list to avoid duplicates from optimistic updates
            if (posts.some(p => p.id === newPost.id)) return;

            const { data: postWithProfile, error } = await supabase
                .from('posts')
                .select('*, profiles!inner(*), likes(*), comments!inner(count)')
                .eq('id', newPost.id)
                .single();
            if (postWithProfile && !error) {
                setPosts(current => [postWithProfile as any, ...current.filter(p => p.id !== newPost.id)]);
            }
        };

        const handlePostUpdate = async (payload: any) => {
            const updatedPost = payload.new as Post;
            const { data: postWithProfile, error } = await supabase
                .from('posts')
                .select('*, profiles!inner(*), likes(*), comments!inner(count)')
                .eq('id', updatedPost.id)
                .single();
            if (postWithProfile && !error) {
                setPosts(current => current.map(p => p.id === updatedPost.id ? (postWithProfile as any) : p));
            }
        };

        const handlePostDelete = (payload: any) => {
            setPosts(current => current.filter(p => p.id !== (payload.old as any).id));
        };

        const postsSubscription = supabase
            .channel(`profile-posts-${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `user_id=eq.${id}` }, handlePostInsert)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `user_id=eq.${id}` }, handlePostUpdate)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts', filter: `user_id=eq.${id}` }, handlePostDelete)
            .subscribe();
            
        return () => {
            supabase.removeChannel(postsSubscription);
        };
    }, [id, posts]);
    
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("File is too large. Max size is 2MB.");
            return;
        }

        setAvatarLoading(true);
        try {
            const filePath = `${user.id}/avatar`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;
            if (!uploadData?.path) throw new Error("Avatar upload failed, please try again.");

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
            const uniqueUrl = `${publicUrl}?t=${new Date().getTime()}`;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: uniqueUrl })
                .eq('id', user.id);
            
            if (updateError) throw updateError;
            
            await fetchProfileAndPosts();
            await refetchProfile();

        } catch (err: any) {
            console.error("Error uploading avatar:", err);
            alert("Failed to upload avatar: " + err.message);
        } finally {
            setAvatarLoading(false);
            if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    };


    const handlePostDeleted = useCallback((postId: number) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    }, []);
    
    const handleVerificationSuccess = () => {
        setIsVerifying(false);
        fetchProfileAndPosts();
    }
    
     const handleParentVerificationSuccess = () => {
        setIsParentVerifying(false);
        fetchProfileAndPosts();
    }

    const handleMessageClick = () => {
        if (profile) navigate(`/chat/${profile.id}`);
    };
    
    const handleSelectIcebreaker = (question: string) => {
        setIsIcebreakerModalOpen(false);
        navigate(`/chat/${id}`, { state: { prefilledMessage: question } });
    };

    const handleFollowToggle = async () => {
        if (!user || !id || isOwner || actionLoading) return;

        const wasFollowing = following;
        // Optimistically update follower count
        setFollowerCount(prev => wasFollowing ? prev - 1 : prev + 1);

        try {
            await toggleFollow(id);
        } catch (e) {
            // Revert local follower count if the global action fails
            setFollowerCount(prev => wasFollowing ? prev + 1 : prev - 1);
            // Alert is handled inside toggleFollow
        }
    };
    
    const handleEditProfileClick = () => {
        if (isOwner) {
            if (profile?.enrollment_status === 'parent') {
                navigate('/edit-parent-profile');
            } else {
                navigate('/edit-profile');
            }
        }
    };
    
    const renderActionButtons = () => {
        const baseClasses = "px-4 py-2 rounded-lg transition-colors font-semibold flex items-center justify-center min-w-[100px]";

        if (following) {
             return (
                 <>
                    <button onClick={handleFollowToggle} disabled={actionLoading} className={`${baseClasses} bg-slate-200 text-text-body hover:bg-slate-300`}>
                        {actionLoading ? <Spinner size="sm" /> : 'Following'}
                    </button>
                    <button onClick={() => setIsIcebreakerModalOpen(true)} className={`${baseClasses} bg-secondary/10 text-secondary hover:bg-secondary/20`} title="Get AI-powered icebreakers">
                         ✨
                    </button>
                    <button onClick={handleMessageClick} className={`${baseClasses} bg-secondary text-white hover:bg-sky-600`}>Message</button>
                </>
            )
        }
        
        return <button onClick={handleFollowToggle} disabled={actionLoading} className={`${baseClasses} bg-primary text-white hover:bg-primary-focus`}>{actionLoading ? <Spinner size="sm" /> : 'Follow'}</button>;
    }

    if (loading) return <ProfilePageSkeleton />;
    if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
    if (!profile) return <p className="text-center text-gray-500 p-8">Could not load profile.</p>;
    
    const isIncompleteProfile = isOwner && (!profile.username || !profile.college) && profile.enrollment_status !== 'parent';
    const isParentProfile = profile.enrollment_status === 'parent';

    const renderStudentVerification = () => {
        if (studentVerificationStatus === 'pending') {
            return <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg" role="alert"><p className="font-bold">Pending Review</p><p>Your ID submission is currently being reviewed. This usually takes 24-48 hours.</p></div>
        }
        if (studentVerificationStatus === 'rejected') {
            return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg" role="alert"><p className="font-bold">Submission Rejected</p>{rejectionNotes && <p className="mt-1"><strong>Reason:</strong> {rejectionNotes}</p>}<p className="mt-2">Please review the reason and submit your ID again.</p><button onClick={() => setIsVerifying(true)} className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold text-sm">Resubmit ID</button></div>
        }
        return <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r-lg" role="alert"><p className="font-bold">Become a Verified Student</p><p>Verify your student status to get access to exclusive campus features like Events and the College Hub.</p><button onClick={() => setIsVerifying(true)} className="mt-3 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-sky-600 font-semibold text-sm">Get Verified</button></div>
    };
    
    const renderParentVerification = () => {
        if (parentVerificationStatus === 'pending') {
            return <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg" role="alert"><p className="font-bold">Pending Review</p><p>Your ID submission is being reviewed. This usually takes 24-48 hours.</p></div>
        }
        if (parentVerificationStatus === 'rejected') {
            return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg" role="alert"><p className="font-bold">Submission Rejected</p>{rejectionNotes && <p className="mt-1"><strong>Reason:</strong> {rejectionNotes}</p>}<p className="mt-2">Please review the reason and submit again.</p><button onClick={() => setIsParentVerifying(true)} className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold text-sm">Resubmit ID</button></div>
        }
        return (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r-lg" role="alert">
                <p className="font-bold">Become a Verified Parent</p>
                <p>Verify your status to gain a verified badge and build trust within the community.</p>
                <button onClick={() => setIsParentVerifying(true)} className="mt-3 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-sky-600 font-semibold text-sm">Get Verified</button>
            </div>
        );
    };

    return (
        <>
            {isIncompleteProfile && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg shadow-soft mb-6 animate-fade-in-up">
                    <p className="font-bold">Welcome to UniVibe!</p>
                    <p>Please complete your profile to unlock all features and start exploring. Click "Edit Profile" to get started.</p>
                </div>
            )}
            <div className="bg-card p-6 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="relative group flex-shrink-0">
                        <img
                            src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                            alt={profile.name || ''}
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                            loading="lazy"
                            decoding="async"
                        />
                        {isOwner && (
                            <>
                                <div 
                                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                    onClick={() => avatarInputRef.current?.click()}
                                    title="Change avatar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    disabled={avatarLoading}
                                />
                            </>
                        )}
                        {avatarLoading && (
                             <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                <Spinner />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                             <h1 className="text-3xl font-bold text-text-heading">{profile.name}</h1>
                             <VerifiedBadge profile={profile} size="h-5 w-5" />
                             {profile.profile_remark && (
                                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-md">
                                    {profile.profile_remark}
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                             {profile.username && <p className="text-lg text-text-muted">@{profile.username}</p>}
                        </div>

                        {profile.enrollment_status && (
                            <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${profile.enrollment_status === 'current_student' ? 'bg-blue-100 text-blue-800' : (profile.enrollment_status === 'incoming_student' || profile.enrollment_status === 'passed_out') ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                {getEnrollmentStatusText(profile.enrollment_status)}
                            </span>
                        )}
                        <div className="flex items-center gap-4 justify-center sm:justify-start mt-2">
                             <Link to={`/friends?userId=${profile.id}&view=followers`} className="text-text-body hover:underline"><span className="font-bold text-text-heading">{followerCount}</span> Followers</Link>
                             <Link to={`/friends?userId=${profile.id}&view=following`} className="text-text-body hover:underline"><span className="font-bold text-text-heading">{followingCount}</span> Following</Link>
                        </div>
                         {(profile.linkedin_url || profile.twitter_url || profile.github_url) && (
                            <div className="mt-4 flex items-center gap-4 text-text-muted justify-center sm:justify-start">
                                {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" aria-label="LinkedIn" title="LinkedIn"><LinkedinIcon /></a>}
                                {profile.twitter_url && <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" aria-label="Twitter" title="Twitter (X)"><TwitterIcon /></a>}
                                {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary" aria-label="GitHub" title="GitHub"><GithubIcon /></a>}
                            </div>
                        )}
                        {profile.college && <p className="text-text-body mt-2">{profile.college} &bull; {profile.state}</p>}
                        {profile.course && <p className="text-sm text-text-muted">{profile.course} {profile.joining_year && `(Batch of ${profile.joining_year})`}</p>}
                        {profile.bio && <p className="mt-4 text-text-body">{profile.bio}</p>}
                        {profile.hobbies_interests && (
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                    {profile.hobbies_interests.split(',').map(hobby => hobby.trim()).filter(Boolean).map((hobby, index) => (
                                        <span key={index} className="bg-slate-100 text-text-body text-xs font-semibold px-2.5 py-1 rounded-full">{hobby}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0 flex items-center flex-wrap justify-center sm:justify-start gap-2">
                        {isOwner ? (
                            <button onClick={handleEditProfileClick} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold">
                                Edit Profile
                            </button>
                        ) : (
                            <>
                                {renderActionButtons()}
                                <button onClick={() => setIsReporting(true)} className="p-2 text-text-muted hover:text-red-500 rounded-full transition-colors" title="Report user">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V7a1 1 0 011-1h2a1 1 0 011 1v1H6a3 3 0 01-3-3z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                 {isOwner && (
                    <>
                        {subscription?.status === 'active' ? (
                             <div className="bg-card p-4 rounded-2xl shadow-soft border border-border flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-text-heading flex items-center gap-2">
                                        {subscription.subscriptions.name}
                                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">PRO</span>
                                    </p>
                                    <p className="text-xs text-text-body">Expires on {format(new Date(subscription.end_date), 'PP')}</p>
                                </div>
                                <Link to="/subscriptions" className="bg-slate-200 text-text-body px-4 py-2 text-sm rounded-lg hover:bg-slate-300 font-semibold">Manage</Link>
                            </div>
                        ) : (
                            <Link to="/subscriptions" className="block bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-2xl shadow-soft hover:shadow-soft-md transition-all transform hover:-translate-y-1">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-xl">✨ Go PRO!</h3>
                                        <p>Unlock exclusive features like Study Hub & Campus Tours.</p>
                                    </div>
                                    <span className="font-semibold text-lg">&rarr;</span>
                                </div>
                            </Link>
                        )}

                        {profile.is_verified ? (
                            <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg" role="alert">
                                <p className="font-bold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    You are a verified {isParentProfile ? 'parent' : 'student'}.
                                </p>
                            </div>
                        ) : isParentProfile ? (
                            renderParentVerification()
                        ) : (
                            renderStudentVerification()
                        )}
                    </>
                 )}
            </div>
            
            <h2 className="text-2xl font-bold text-text-heading mb-4 mt-8">{isOwner ? "My Posts" : `${profile.name.split(' ')[0]}'s Posts`}</h2>
            <div className="space-y-6">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} onPostUpdated={fetchProfileAndPosts} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">No posts yet.</p>
                )}
            </div>
            
            {isVerifying && isOwner && (
                <VerificationModal
                    onClose={() => setIsVerifying(false)}
                    onSuccess={handleVerificationSuccess}
                />
            )}
             {isParentVerifying && isOwner && (
                <ParentVerificationModal
                    onClose={() => setIsParentVerifying(false)}
                    onSuccess={handleParentVerificationSuccess}
                />
            )}
            {isIcebreakerModalOpen && currentUserProfile && profile && (
                <IcebreakerModal
                    currentUser={currentUserProfile}
                    targetUser={profile}
                    onClose={() => setIsIcebreakerModalOpen(false)}
                    onSelectQuestion={handleSelectIcebreaker}
                />
            )}
            {isReporting && (
                <ReportModal
                    entityType="profile"
                    entityId={profile.id}
                    onClose={() => setIsReporting(false)}
                    onSuccess={() => {
                        setIsReporting(false);
                        alert('Thank you for your report. Our moderation team will review it.');
                    }}
                />
            )}
        </>
    );
};

export default ProfilePage;
