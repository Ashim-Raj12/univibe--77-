import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { ParentVerificationSubmissionWithProfile, Profile } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import VerifiedBadge from '../../components/VerifiedBadge';

// --- Reusable Card Component ---
interface ParentVerificationCardProps {
    submission: ParentVerificationSubmissionWithProfile;
    onReviewed: () => void;
}

const ParentVerificationCard: React.FC<ParentVerificationCardProps> = ({ submission, onReviewed }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSignedUrl = async () => {
            setImageLoading(true);
            const { data, error } = await supabase.storage
                .from('parent-id-cards')
                .createSignedUrl(submission.id_card_url, 3600); // URL valid for 1 hour

            if (error) {
                console.error("Error creating signed URL:", error);
            } else {
                setImageUrl(data.signedUrl);
            }
            setImageLoading(false);
        };
        fetchSignedUrl();
    }, [submission.id_card_url]);

    const handleApprove = async () => {
        if (!window.confirm(`Are you sure you want to verify ${submission.profiles.name}?`)) return;
        setIsProcessing(true);
        setActionError(null);

        const { error } = await supabase.rpc('admin_approve_parent_verification', { p_submission_id: submission.id });
        
        if (error) {
            setActionError("Approval failed: " + error.message);
        } else {
            onReviewed();
        }
        setIsProcessing(false);
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setActionError("Please provide a reason for rejection.");
            return;
        }
        setIsProcessing(true);
        setActionError(null);
        
        const { error } = await supabase.rpc('admin_reject_parent_verification', { p_submission_id: submission.id, rejection_reason: rejectionReason });
        
        if (error) {
            setActionError("Rejection failed: " + error.message);
        } else {
            onReviewed();
        }
        setIsProcessing(false);
        setIsRejecting(false);
    };

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <h3 className="font-bold text-lg text-text-heading">User Details</h3>
                    <div className="flex items-center gap-3 mt-2">
                         <img src={submission.profiles.avatar_url || `https://avatar.vercel.sh/${submission.profiles.id}.png`} alt={submission.profiles.name || ''} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                             <div className="flex items-center gap-1">
                                <Link to={`/profile/${submission.profiles.id}`} className="font-semibold text-text-heading hover:underline" target="_blank">{submission.profiles.name}</Link>
                                <VerifiedBadge profile={submission.profiles} />
                            </div>
                            <p className="text-sm text-text-muted">@{submission.profiles.username}</p>
                        </div>
                    </div>
                    <p className="text-sm mt-2"><strong>Role:</strong> Parent</p>
                    <p className="text-sm"><strong>State:</strong> {submission.profiles.state}</p>
                    <p className="text-sm"><strong>Submitted:</strong> {format(new Date(submission.created_at), 'PPp')}</p>
                </div>

                <div className="md:col-span-1 flex flex-col items-center justify-center">
                     <h3 className="font-bold text-lg text-text-heading mb-2">Government ID</h3>
                    {imageLoading ? <Spinner /> : (
                        <a href={imageUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <img src={imageUrl || ''} alt="ID Card" className="max-w-full h-auto max-h-48 rounded-md border shadow-sm object-contain" />
                        </a>
                    )}
                </div>

                <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
                    {actionError && <p className="text-red-500 text-sm w-full text-center mb-2">{actionError}</p>}
                    {isRejecting ? (
                        <div className="w-full">
                            <textarea
                                placeholder="Reason for rejection..."
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                                rows={2}
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setIsRejecting(false)} className="bg-slate-200 text-text-body px-4 py-2 rounded-lg text-sm font-semibold flex-1">Cancel</button>
                                <button onClick={handleReject} disabled={isProcessing} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex-1 disabled:opacity-50">
                                    {isProcessing ? <Spinner size="sm"/> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    ) : (
                         <>
                            <button onClick={handleApprove} disabled={isProcessing} className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50">
                                {isProcessing ? <Spinner size="sm"/> : 'Approve'}
                            </button>
                             <button onClick={() => setIsRejecting(true)} disabled={isProcessing} className="w-full bg-slate-200 text-text-body px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold disabled:opacity-50">
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Main Page Component ---
const AdminParentVerificationPage: React.FC = () => {
    const [submissions, setSubmissions] = useState<ParentVerificationSubmissionWithProfile[]>([]);
    const [history, setHistory] = useState<ParentVerificationSubmissionWithProfile[]>([]);
    const [verifiedParents, setVerifiedParents] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'verified'>('queue');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queuePromise = supabase
                .from('parent_verification_submissions')
                .select('*, profiles:user_id(*)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            const historyPromise = supabase
                .from('parent_verification_submissions')
                .select('*, profiles:user_id(*), reviewer:reviewer_id(id, name, avatar_url)')
                .neq('status', 'pending')
                .order('reviewed_at', { ascending: false })
                .limit(50);
            
            const verifiedPromise = supabase
                .from('profiles')
                .select('*')
                .eq('enrollment_status', 'parent')
                .eq('is_verified', true)
                .order('name', { ascending: true });
            
            const [
                { data: queueData, error: queueError }, 
                { data: historyData, error: historyError },
                { data: verifiedData, error: verifiedError }
            ] = await Promise.all([queuePromise, historyPromise, verifiedPromise]);

            if (queueError) throw queueError;
            if (historyError) throw historyError;
            if (verifiedError) throw verifiedError;
            
            const allUserIds = new Set<string>();
            (queueData as ParentVerificationSubmissionWithProfile[] || []).forEach(item => item.profiles && allUserIds.add(item.user_id));
            (historyData as ParentVerificationSubmissionWithProfile[] || []).forEach(item => item.profiles && allUserIds.add(item.user_id));
            (verifiedData || []).forEach(item => allUserIds.add(item.id));

            let proUserIds = new Set<string>();
            if (allUserIds.size > 0) {
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', Array.from(allUserIds))
                    .eq('status', 'active');
                
                proUserIds = new Set(
                    proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id)
                );
            }

            const enrichProfile = (profile: Profile) => ({
                ...profile,
                has_pro_badge: proUserIds.has(profile.id),
            });

            const enrichedQueue = (queueData as ParentVerificationSubmissionWithProfile[] || []).map(item => ({
                ...item,
                profiles: item.profiles ? enrichProfile(item.profiles) : item.profiles,
            }));

            const enrichedHistory = (historyData as ParentVerificationSubmissionWithProfile[] || []).map(item => ({
                ...item,
                profiles: item.profiles ? enrichProfile(item.profiles) : item.profiles,
            }));

            const enrichedVerified = (verifiedData || []).map(enrichProfile);
            
            setSubmissions(enrichedQueue as any);
            setHistory(enrichedHistory as any);
            setVerifiedParents(enrichedVerified);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderQueue = () => {
        if (submissions.length === 0) {
            return <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">The parent verification queue is empty.</p>;
        }
        return (
            <div className="space-y-4">
                {submissions.map(submission => (
                    <ParentVerificationCard key={submission.id} submission={submission} onReviewed={fetchData} />
                ))}
            </div>
        );
    };

    // Render history and verified parents list... (similar to AdminVerificationPage)
    // ...

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Parent Verification</h1>
            <div className="border-b border-slate-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('queue')} className={`${activeTab === 'queue' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                        Queue <span className="ml-1 bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">{submissions.length}</span>
                    </button>
                    {/* Placeholder for other tabs */}
                </nav>
            </div>
            
            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : 
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             activeTab === 'queue' ? renderQueue() : null
            }
        </div>
    );
};

export default AdminParentVerificationPage;