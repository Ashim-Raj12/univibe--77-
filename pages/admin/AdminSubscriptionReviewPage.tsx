import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { UserSubscriptionWithPlan, Profile, Subscription } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface PendingSubscription extends UserSubscriptionWithPlan {
    profiles: Profile;
}

const AdminSubscriptionReviewPage: React.FC = () => {
    const [pending, setPending] = useState<PendingSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchPendingSubscriptions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: subsData, error: subsError } = await supabase
                .from('user_subscriptions')
                .select('*, subscriptions(*)')
                .eq('status', 'pending_review')
                .order('created_at', { ascending: true });
            
            if (subsError) throw subsError;

            if (!subsData || subsData.length === 0) {
                setPending([]);
                setLoading(false);
                return;
            }

            const userIds = subsData.map(s => s.user_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);
            
            if (profilesError) throw profilesError;

            const profilesMap = new Map(profilesData.map(p => [p.id, p]));

            const combinedData = subsData.map(sub => ({
                ...sub,
                profiles: profilesMap.get(sub.user_id)
            })).filter(sub => sub.profiles); // Filter out any subs where profile was not found

            setPending(combinedData as any);

        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingSubscriptions();
    }, [fetchPendingSubscriptions]);

    const handleApprove = async (userSubscriptionId: number) => {
        setActionLoading(userSubscriptionId);
        const { error } = await supabase.rpc('admin_approve_subscription', {
            p_user_subscription_id: userSubscriptionId
        });
        
        if (error) {
            alert("Failed to approve subscription: " + error.message);
        } else {
            // Optimistically remove from list, or just refetch
            fetchPendingSubscriptions();
        }
        setActionLoading(null);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Subscription Review Queue</h1>
            
            {loading ? (
                <div className="flex justify-center p-8"><Spinner size="lg" /></div>
            ) : error ? (
                <p className="text-center text-red-500 p-8">{error}</p>
            ) : pending.length === 0 ? (
                <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">The review queue is empty.</p>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Plan</th>
                                <th className="px-6 py-3">Payment ID</th>
                                <th className="px-6 py-3">Requested On</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {pending.map(sub => (
                                <tr key={sub.id}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={sub.profiles.avatar_url || `https://avatar.vercel.sh/${sub.user_id}.png`} alt={sub.profiles.name || ''} className="w-8 h-8 rounded-full object-cover"/>
                                            <div>
                                                <Link to={`/profile/${sub.user_id}`} target="_blank" className="font-semibold hover:underline">{sub.profiles.name}</Link>
                                                <p className="text-xs text-slate-500">{sub.profiles.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold">{sub.subscriptions.name}</p>
                                        <p className="text-xs text-slate-500">₹{sub.subscriptions.price}/month</p>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{sub.payment_transaction_id || 'N/A'}</td>
                                    <td className="px-6 py-4 text-slate-500" title={format(new Date(sub.created_at), 'PPpp')}>
                                        {format(new Date(sub.created_at), 'PP')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleApprove(sub.id)}
                                            disabled={actionLoading === sub.id}
                                            className="bg-green-500 text-white px-4 py-1.5 text-xs rounded-md font-semibold hover:bg-green-600 disabled:opacity-50 min-w-[80px]"
                                        >
                                            {actionLoading === sub.id ? <Spinner size="sm"/> : 'Approve'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptionReviewPage;