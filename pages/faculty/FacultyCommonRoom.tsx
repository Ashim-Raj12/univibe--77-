import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { FacultyPost } from '../../types/faculty';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';

const FacultyCommonRoom: React.FC = () => {
    const { profile } = useAuth();
    const [posts, setPosts] = useState<FacultyPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Restrict non-faculty users
    if (profile?.enrollment_status !== 'faculty') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Faculty Access Only</h2>
                <p className="text-gray-600">This area is restricted to faculty members.</p>
            </div>
        );
    }

    const fetchPosts = async () => {
        try {
            // 1️⃣ Fetch main posts with author + comment count
            const { data: postsData, error } = await supabase
                .from('faculty_posts')
                .select(`
                    *,
                    author:profiles!faculty_posts_author_id_fkey(*),
                    comments:faculty_post_comments(count)
                `)
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 2️⃣ For each post, fetch reaction counts & user reactions via RPC
            const postsWithExtras = await Promise.all(
                (postsData || []).map(async (post) => {
                    const { data: reactionCounts } = await supabase.rpc(
                        'get_faculty_post_reaction_counts',
                        { post_id: post.id }
                    );

                    const { data: userReactions } = await supabase.rpc(
                        'has_faculty_reacted',
                        { post_id: post.id, user_id: profile.id }
                    );

                    return {
                        ...post,
                        reaction_counts: reactionCounts || {},
                        user_reactions: userReactions || {},
                    };
                })
            );

            setPosts(postsWithExtras);
        } catch (err) {
            console.error('Error fetching faculty posts:', err);
            setError('Failed to load faculty posts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostTitle.trim() || !newPostContent.trim()) {
            toast.error('Please fill in both title and content');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('faculty_posts').insert({
                title: newPostTitle.trim(),
                content: newPostContent.trim(),
                author_id: profile.id,
            });

            if (error) throw error;

            toast.success('Post created successfully');
            setNewPostTitle('');
            setNewPostContent('');
            setIsCreateModalOpen(false);
            fetchPosts();
        } catch (err) {
            console.error('Error creating post:', err);
            toast.error('Failed to create post');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReaction = async (postId: number, reactionType: string) => {
        try {
            const existingReaction = posts.find(p => p.id === postId)?.user_reactions?.[reactionType];

            if (existingReaction) {
                const { error } = await supabase
                    .from('faculty_post_reactions')
                    .delete()
                    .match({ post_id: postId, user_id: profile.id, reaction_type: reactionType });

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('faculty_post_reactions')
                    .insert({
                        post_id: postId,
                        user_id: profile.id,
                        reaction_type: reactionType,
                    });

                if (error) throw error;
            }

            fetchPosts();
        } catch (err) {
            console.error('Error toggling reaction:', err);
            toast.error('Failed to update reaction');
        }
    };

    const reactionTypes = [
        { type: 'like', emoji: '👍' },
        { type: 'heart', emoji: '❤️' },
        { type: 'celebrate', emoji: '🎉' },
        { type: 'insightful', emoji: '💡' },
        { type: 'support', emoji: '🤝' },
    ];

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Faculty Common Room</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                    Create Post
                </button>
            </div>

            <div className="space-y-6">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className={`bg-white rounded-lg shadow-sm p-6 ${
                            post.pinned ? 'border-2 border-primary' : 'border border-gray-200'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <img
                                    src={post.author?.avatar_url || '/default-avatar.png'}
                                    alt={post.author?.name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <h3 className="font-bold text-gray-900">{post.author?.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {format(new Date(post.created_at), 'PPp')}
                                    </p>
                                </div>
                            </div>
                            {post.pinned && (
                                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                                    📌 Pinned
                                </span>
                            )}
                        </div>

                        <h2 className="text-xl font-semibold mt-4 mb-2">{post.title}</h2>
                        <div className="prose prose-sm max-w-none">
                            {post.content.split('\n').map((paragraph, idx) => (
                                <p key={idx} className="mb-4">
                                    {paragraph}
                                </p>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <div className="flex flex-wrap gap-2">
                                {reactionTypes.map(({ type, emoji }) => (
                                    <button
                                        key={type}
                                        onClick={() => handleReaction(post.id, type)}
                                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm ${
                                            post.user_reactions?.[type]
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span>{emoji}</span>
                                        <span>{post.reaction_counts?.[type] || 0}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Post Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Create New Post</h2>
                        <form onSubmit={handleCreatePost} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Post title"
                                    value={newPostTitle}
                                    onChange={(e) => setNewPostTitle(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                />
                            </div>
                            <div>
                                <textarea
                                    placeholder="Write your post content..."
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                                >
                                    {submitting ? 'Creating...' : 'Create Post'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyCommonRoom;
