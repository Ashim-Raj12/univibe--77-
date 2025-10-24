import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { FlaggedCollabPost, VibeCoinWallet, Profile } from '../../types';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';

const FlaggedPostCard: React.FC<{ post: FlaggedCollabPost; onUpdate: () => void }> = ({ post, onUpdate }) => {
    const handleDismiss = async () => {
        // This would be an RPC call in a real app to handle all logic atomically
        const { error } = await supabase.from('collab_posts').update({ is_flagged: false }).eq('id', post.id);
        if (error) toast.error(error.message);
        else {
            toast.success("Flags dismissed.");
            onUpdate();
        }
    };
    
    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        // This should also refund the user's escrowed coins via an RPC call
        const { error } = await supabase.from('collab_posts').delete().eq('id', post.id);
        if (error) toast.error(error.message);
        else {
            toast.success("Post deleted.");
            onUpdate();
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border">
            <h3 className="font-bold">{post.title}</h3>
            <p className="text-sm text-text-muted">by {post.poster.name}</p>
            <div className="my-2 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="font-semibold text-xs">Flags ({post.collab_flags.length}):</p>
                <ul className="list-disc list-inside text-sm">
                    {post.collab_flags.map(f => <li key={f.id}>{f.reason}</li>)}
                </ul>
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={handleDismiss} className="bg-slate-200 text-xs px-3 py-1 rounded font-semibold">Dismiss Flags</button>
                <button onClick={handleDelete} className="bg-red-500 text-white text-xs px-3 py-1 rounded font-semibold">Delete Post</button>
            </div>
        </div>
    );
};

const WalletRow: React.FC<{ wallet: VibeCoinWallet & { profile: Profile } }> = ({ wallet }) => {
    const handleFreeze = async () => {
        // Simulated RPC call
        toast.info(`Simulated freezing wallet for ${wallet.profile.name}`);
    };
    
    const handleAdjust = () => {
        const amount = prompt(`Enter amount to adjust for ${wallet.profile.name} (use negative for deduction):`);
        if (amount) {
             // Simulated RPC call
            toast.info(`Simulated adjusting wallet for ${wallet.profile.name} by ${amount}`);
        }
    };

    return (
        <tr>
            <td className="p-2">{wallet.profile.name}</td>
            <td className="p-2">{wallet.balance}</td>
            <td className="p-2">{wallet.pending_balance}</td>
            <td className="p-2">{wallet.total_earned}</td>
            <td className="p-2">{wallet.total_spent}</td>
            <td className="p-2 space-x-2">
                <button onClick={handleFreeze} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Freeze</button>
                <button onClick={handleAdjust} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Adjust</button>
            </td>
        </tr>
    );
};

const VibeCollabModerationPage = () => {
    const [flaggedPosts, setFlaggedPosts] = useState<FlaggedCollabPost[]>([]);
    const [wallets, setWallets] = useState<(VibeCoinWallet & { profile: Profile })[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const postsPromise = supabase
            .from('collab_posts')
            .select('*, poster:poster_id(*), collab_flags(*)')
            .eq('is_flagged', true);
        
        const walletsPromise = supabase
            .from('vibecoin_wallets')
            .select('*, profile:profiles(*)');

        const [{ data: postsData }, { data: walletsData }] = await Promise.all([postsPromise, walletsPromise]);

        setFlaggedPosts((postsData as any) || []);
        setWallets((walletsData as any) || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">VibeCollab Moderation</h1>
            
            <div>
                <h2 className="text-xl font-semibold mb-4">Flagged Posts</h2>
                {loading ? <Spinner /> : flaggedPosts.length === 0 ? <p>No flagged posts.</p> : (
                    <div className="space-y-4">
                        {flaggedPosts.map(p => <FlaggedPostCard key={p.id} post={p} onUpdate={fetchData} />)}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">User Wallets</h2>
                {loading ? <Spinner /> : (
                    <div className="bg-white rounded-lg border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left">
                                <tr>
                                    <th className="p-2">User</th>
                                    <th className="p-2">Balance</th>
                                    <th className="p-2">Pending</th>
                                    <th className="p-2">Earned</th>
                                    <th className="p-2">Spent</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {wallets.map(w => <WalletRow key={w.user_id} wallet={w} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VibeCollabModerationPage;