import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { CollabPostWithProfiles, CollabTaskType } from '../types';
import Spinner from '../components/Spinner';
import CollabPostCard from '../components/CollabPostCard';
import { toast } from '../components/Toast';

// --- PostCollabModal Component ---
const PostCollabModal: React.FC<{ onClose: () => void; onSuccess: () => void; }> = ({ onClose, onSuccess }) => {
    const { user, wallet, refetchWallet } = useAuth();
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [taskType, setTaskType] = useState<CollabTaskType>('collaboration');
    const [reward, setReward] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputClasses = "w-full px-4 py-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!user) {
            setError("You must be logged in to post a task.");
            return;
        }
        if (!agreed) {
            setError("You must agree to the academic integrity policy.");
            return;
        }
        const rewardAmount = parseFloat(reward);
        if (isNaN(rewardAmount) || rewardAmount <= 0) {
            setError("Please enter a valid, positive reward amount.");
            return;
        }
        if (wallet && wallet.balance < rewardAmount) {
            setError(`Insufficient VibeCoins. Your balance is ${wallet.balance}, but you need ${rewardAmount}. Please top up your wallet.`);
            return;
        }

        setLoading(true);
        try {
            const { error: rpcError } = await supabase.rpc('create_collab_and_escrow', {
                p_title: title,
                p_subject: subject,
                p_description: description,
                p_task_type: taskType,
                p_reward_coins: rewardAmount
            });

            if (rpcError) throw rpcError;

            await refetchWallet();
            toast.success('Your collaboration post is live!');
            onSuccess();
            onClose();

        } catch (err: any) {
            console.error("Error creating collab post:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0 bg-slate-50/50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-text-heading">Post a Collaboration</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-text-muted hover:bg-slate-100 hover:text-text-heading">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} id="collab-form" className="p-6 overflow-y-auto">
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-text-body mb-2" htmlFor="collab-title">Title</label>
                        <input id="collab-title" type="text" placeholder="e.g., 'Need help with Python project'" value={title} onChange={e => setTitle(e.target.value)} required className={inputClasses} maxLength={100} />
                    </div>
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-text-body mb-2" htmlFor="collab-subject">Subject</label>
                        <input id="collab-subject" type="text" placeholder="e.g., 'Computer Science'" value={subject} onChange={e => setSubject(e.target.value)} required className={inputClasses} maxLength={50}/>
                    </div>
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-text-body mb-2" htmlFor="collab-description">Description</label>
                        <textarea id="collab-description" placeholder="Describe the task in detail..." value={description} onChange={e => setDescription(e.target.value)} required className={inputClasses} rows={4} maxLength={1000}></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="collab-task-type">Task Type</label>
                            <select id="collab-task-type" value={taskType} onChange={e => setTaskType(e.target.value as CollabTaskType)} className={inputClasses}>
                                <option value="collaboration">Collaboration</option>
                                <option value="tutoring">Tutoring</option>
                                <option value="notes">Notes Exchange</option>
                                <option value="project_help">Project Help</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="collab-reward">Reward (VibeCoins)</label>
                            <div className="relative">
                                <input id="collab-reward" type="number" placeholder="e.g., 500" value={reward} onChange={e => setReward(e.target.value)} required min="1" className={inputClasses} />
                                {reward && parseFloat(reward) > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-green-600">
                                        (₹{(parseFloat(reward) / 10).toFixed(2)})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-5">
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-lg">
                            <p className="font-bold">Academic Integrity Policy</p>
                            <p>This platform is for peer learning and collaboration only. Posting or completing graded assignments, exams, or quizzes for others is strictly forbidden.</p>
                        </div>
                    </div>

                    <div className="mb-5">
                        <label className="flex items-center gap-2 cursor-pointer p-2 -ml-2 rounded-lg hover:bg-slate-100">
                            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-5 w-5 rounded text-primary focus:ring-primary border-slate-300"/>
                            <span className="text-sm font-medium text-text-body">I confirm this is NOT for a graded assignment, exam, or quiz.</span>
                        </label>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
                </form>
                <div className="p-4 border-t border-border flex justify-end gap-3 flex-shrink-0 bg-slate-50/50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-text-body bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" form="collab-form" disabled={loading} className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-focus rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                        {loading ? <Spinner size="sm" /> : 'Post Task'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MarketplaceView: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    const [posts, setPosts] = useState<CollabPostWithProfiles[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOpenPosts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('collab_posts')
                .select('*, poster:poster_id(*)')
                .eq('status', 'open')
                .order('created_at', { ascending: false });

            if (data) {
                const posterIds = [...new Set(data.map(p => p.poster_id))];
                if (posterIds.length > 0) {
                    const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', posterIds).eq('status', 'active');
                    const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                    const enrichedPosts = data.map(p => ({
                        ...p,
                        poster: { ...p.poster, has_pro_badge: proUserIds.has(p.poster_id) }
                    }));
                    setPosts(enrichedPosts as any);
                } else {
                    setPosts(data as any);
                }
            }
            setLoading(false);
        };
        fetchOpenPosts();
    }, [onUpdate]);

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (posts.length === 0) return <p className="text-center text-text-muted py-10 bg-card rounded-xl border border-border">No open collaboration tasks right now. Be the first to post one!</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => <CollabPostCard key={post.id} post={post} />)}
        </div>
    );
};

const MyPostingsView: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<CollabPostWithProfiles[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('open');

    useEffect(() => {
        if (!user) return;
        const fetchMyPosts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('collab_posts')
                .select('*, poster:poster_id(*), helper:helper_id(*)')
                .eq('poster_id', user.id)
                .order('created_at', { ascending: false });
            if (data) {
                 const userIds = [...new Set(data.map(p => p.helper_id).filter(Boolean) as string[])];
                 if (userIds.length > 0) {
                     const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', userIds).eq('status', 'active');
                     const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                     const enrichedPosts = data.map(p => ({
                         ...p,
                         helper: p.helper ? { ...p.helper, has_pro_badge: proUserIds.has(p.helper_id!) } : null
                     }));
                     setPosts(enrichedPosts as any);
                 } else {
                    setPosts(data as any);
                 }
            }
            setLoading(false);
        };
        fetchMyPosts();
    }, [user]);

    const filteredPosts = posts.filter(p => p.status === activeTab);
    const tabs = ['open', 'in_progress', 'completed', 'cancelled', 'disputed'];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg">
                {tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}>{tab.replace('_', ' ')}</button>)}
            </div>
            {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
             filteredPosts.length === 0 ? <p className="text-center text-text-muted py-10">No posts in this category.</p> :
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredPosts.map(post => <CollabPostCard key={post.id} post={post} />)}
             </div>
            }
        </div>
    );
};

const MyWorkView: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<CollabPostWithProfiles[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('in_progress');

    useEffect(() => {
        if (!user) return;
        const fetchMyWork = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('collab_posts')
                .select('*, poster:poster_id(*), helper:helper_id(*)')
                .eq('helper_id', user.id)
                .order('created_at', { ascending: false });
            if (data) {
                const userIds = [...new Set(data.map(p => p.poster_id))];
                 if (userIds.length > 0) {
                     const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', userIds).eq('status', 'active');
                     const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                     const enrichedPosts = data.map(p => ({
                         ...p,
                         poster: { ...p.poster, has_pro_badge: proUserIds.has(p.poster_id) }
                     }));
                     setPosts(enrichedPosts as any);
                 } else {
                    setPosts(data as any);
                 }
            }
            setLoading(false);
        };
        fetchMyWork();
    }, [user]);
    
    const filteredPosts = posts.filter(p => p.status === activeTab);
    const tabs = ['in_progress', 'completed'];

    return (
         <div className="space-y-4">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg">
                {tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}>{tab.replace('_', ' ')}</button>)}
            </div>
            {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
             filteredPosts.length === 0 ? <p className="text-center text-text-muted py-10">No tasks in this category.</p> :
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredPosts.map(post => <CollabPostCard key={post.id} post={post} />)}
             </div>
            }
        </div>
    );
};


// --- Main Page Component ---
const VibeCollabPage = () => {
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'marketplace' | 'my-postings' | 'my-work'>('marketplace');
    const [key, setKey] = useState(0); // Used to force re-fetch in marketplace

    const handleSuccess = () => {
        setKey(prev => prev + 1); // Trigger re-fetch for marketplace
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-heading">VibeCollab</h1>
                        <p className="text-text-muted mt-1">Find peers for tutoring, collaboration, and project help.</p>
                    </div>
                    <button onClick={() => setIsPostModalOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold shadow-soft hover:bg-primary-focus transition-all transform hover:-translate-y-0.5 active:scale-95 flex-shrink-0">
                        Post a Collaboration
                    </button>
                </div>
                
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('marketplace')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'marketplace' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>Marketplace</button>
                        <button onClick={() => setActiveTab('my-postings')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'my-postings' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>My Postings</button>
                        <button onClick={() => setActiveTab('my-work')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'my-work' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>My Work</button>
                    </nav>
                </div>
                
                 <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-lg">
                    <p className="font-bold">Peer Learning & Tutoring Only — Not for Exam Submissions.</p>
                </div>
                
                {activeTab === 'marketplace' && <MarketplaceView key={key} onUpdate={handleSuccess} />}
                {activeTab === 'my-postings' && <MyPostingsView />}
                {activeTab === 'my-work' && <MyWorkView />}

            </div>

            {isPostModalOpen && (
                <PostCollabModal
                    onClose={() => setIsPostModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
};

export default VibeCollabPage;