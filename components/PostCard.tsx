import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PostWithProfile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import CommentSection from './CommentSection';
import EditPostForm from './EditPostForm';
import Spinner from './Spinner';
import VerifiedBadge from './VerifiedBadge';
import ReportModal from './ReportModal';

interface PostCardProps {
    post: PostWithProfile;
    onPostDeleted: (postId: number) => void;
    onPostUpdated: () => void;
    defaultShowComments?: boolean;
    hideOwnerControls?: boolean;
    isModerator?: boolean;
}

const GradientAvatar: React.FC<{ src?: string | null, alt: string, size?: string }> = React.memo(({ src, alt, size = 'h-11 w-11' }) => (
    <div className={`p-0.5 rounded-full bg-gradient-to-br from-primary to-secondary ${size} flex-shrink-0`}>
        <img
            src={src || `https://avatar.vercel.sh/${alt}.png?text=UV`}
            alt={alt}
            className="w-full h-full rounded-full object-cover bg-card p-0.5"
            loading="lazy"
            decoding="async"
        />
    </div>
));

const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted, onPostUpdated, defaultShowComments = false, hideOwnerControls = false, isModerator = false }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showComments, setShowComments] = useState(defaultShowComments);
    const [isReporting, setIsReporting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [likeCount, setLikeCount] = useState(post.likes.length);
    const [isLikedByUser, setIsLikedByUser] = useState(
        useMemo(() => post.likes.some(like => like.user_id === user?.id), [post.likes, user?.id])
    );
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const commentCount = post.comments[0]?.count ?? 0;

    const isOwner = user?.id === post.user_id;

    useEffect(() => {
        if (!post.id) return;

        const channel = supabase
            .channel(`post-likes-${post.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'likes',
                    filter: `post_id=eq.${post.id}`,
                },
                async () => {
                    const { count } = await supabase
                        .from('likes')
                        .select('*', { count: 'exact', head: true })
                        .eq('post_id', post.id);
                    
                    if (count !== null) setLikeCount(count);

                    if (user) {
                        const { data: userLike } = await supabase
                            .from('likes')
                            .select('id')
                            .match({ post_id: post.id, user_id: user.id })
                            .limit(1)
                            .maybeSingle();
                        setIsLikedByUser(!!userLike);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [post.id, user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleLikeToggle = async () => {
        if (!user || isLikeLoading) return;

        setIsLikeLoading(true);
        const initiallyLiked = isLikedByUser;
        
        // Optimistic update
        setIsLikedByUser(!initiallyLiked);
        setLikeCount(prev => initiallyLiked ? prev - 1 : prev + 1);
        
        const { error } = await supabase.rpc('toggle_like_and_notify', {
            p_post_id: post.id,
            p_post_owner_id: post.user_id,
        });
        
        if (error) {
            // Revert on error
            setIsLikedByUser(initiallyLiked);
            setLikeCount(prev => initiallyLiked ? prev + 1 : prev - 1);
            console.error("Error toggling like:", error);
        }
        
        setIsLikeLoading(false);
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        
        setIsDeleting(true);
        setError(null);
        
        try {
            if (post.image_url) {
                const path = post.image_url.split('/posts/')[1];
                if (path) {
                    await supabase.storage.from('posts').remove([path]);
                }
            }
            
            const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
            if (deleteError) throw deleteError;
            
            onPostDeleted(post.id);

        } catch (e: any) {
            setError(`Failed to delete post: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateSuccess = () => {
        setIsEditing(false);
        onPostUpdated();
    }
    
    const commentButtonText = commentCount === 1 ? '1 Comment' : `${commentCount} Comments`;

    const handleReportClick = () => {
        setIsMenuOpen(false);
        setIsReporting(true);
    };

    return (
        <div className="bg-card p-5 sm:p-6 rounded-2xl shadow-soft border border-border overflow-hidden">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link to={`/profile/${post.profiles?.id}`}>
                        <GradientAvatar src={post.profiles?.avatar_url} alt={post.user_id} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/profile/${post.profiles?.id}`} className="font-bold text-text-heading hover:underline">
                                {post.profiles?.name}
                            </Link>
                            {post.profiles && <VerifiedBadge profile={post.profiles} />}
                            {post.profiles?.profile_remark && (
                                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-md line-clamp-1">
                                    {post.profiles.profile_remark}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-sm text-text-muted">
                            <span>@{post.profiles.username}</span>
                            <span>&bull;</span>
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                            {post.location && (
                                <>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {post.location}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                {!isEditing && (
                    <div ref={menuRef} className="relative">
                        <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 -m-2 text-text-muted hover:text-primary rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 w-40 bg-card rounded-xl shadow-lg border border-border py-1 z-10 animate-scale-in origin-top-right" style={{animationDuration: '150ms'}}>
                                {(isOwner || isModerator) && !hideOwnerControls ? (
                                    <>
                                        <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-body hover:bg-dark-card flex items-center gap-2">Edit</button>
                                        <button onClick={handleDelete} disabled={isDeleting} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-2">
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleReportClick} className="w-full text-left px-4 py-2 text-sm text-text-body hover:bg-dark-card flex items-center gap-2">Report</button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-sm mt-2 text-right">{error}</p>}
            
            {isEditing ? (
                <EditPostForm post={post} onSuccess={handleUpdateSuccess} onCancel={() => setIsEditing(false)} />
            ) : (
                <>
                    {post.content && <p className="my-4 text-text-body whitespace-pre-wrap leading-relaxed">{post.content}</p>}

                    {post.image_url && (
                        <div className="mt-4 -mx-5 sm:-mx-6 md:mx-0 md:rounded-xl overflow-hidden">
                            <img src={post.image_url} alt="Post content" className="w-full h-auto max-h-[70vh] object-cover bg-dark-card" loading="lazy" decoding="async" />
                        </div>
                    )}

                    <div className="pt-3 mt-4 flex items-center gap-2 border-t border-border">
                        <button
                            onClick={handleLikeToggle}
                            disabled={isLikeLoading}
                            className={`flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl transition-colors active:animate-press ${
                                isLikedByUser ? 'text-red-500 bg-red-500/10' : 'text-text-body hover:bg-dark-card'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-all ${isLikedByUser ? 'fill-current' : ''}`} viewBox="0 0 20 20" fill={isLikedByUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            <span>{likeCount}</span>
                        </button>
                        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-sm font-semibold text-text-body hover:bg-dark-card p-2.5 rounded-xl transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <span>{commentCount > 0 ? commentButtonText : 'Comment'}</span>
                        </button>
                    </div>

                    {showComments && <CommentSection postId={post.id} postOwnerId={post.user_id} />}
                </>
            )}
        
            {isReporting && (
                <ReportModal
                    entityType="post"
                    entityId={post.id}
                    onClose={() => setIsReporting(false)}
                    onSuccess={() => {
                        setIsReporting(false);
                        alert('Thank you for your report. Our moderation team will review it.');
                    }}
                />
            )}
        </div>
    );
};

export default React.memo(PostCard);