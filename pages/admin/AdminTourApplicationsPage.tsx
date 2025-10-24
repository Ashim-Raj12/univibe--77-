import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { TourGuideApplicationWithProfile } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const ApplicationCard: React.FC<{ application: TourGuideApplicationWithProfile; onReviewed: () => void; }> = ({ application, onReviewed }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState('');

    const handleApprove = async () => {
        if (!window.confirm(`Approve ${application.profiles.name} as a tour guide?`)) return;
        setIsProcessing(true);
        setError('');
        const { error } = await supabase.rpc('admin_approve_tour_guide', { p_application_id: application.id });
        if (error) setError(error.message);
        else onReviewed();
        setIsProcessing(false);
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Please provide a reason for rejection.');
            return;
        }
        setIsProcessing(true);
        setError('');
        const { error } = await supabase.rpc('admin_reject_tour_guide', { p_application_id: application.id, p_rejection_notes: rejectionReason });
        if (error) setError(error.message);
        else onReviewed();
        setIsProcessing(false);
    };

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-3">
                    <h3 className="font-bold text-lg text-text-heading">Applicant</h3>
                     <div className="flex items-center gap-3">
                        <img src={application.profiles.avatar_url || `https://avatar.vercel.sh/${application.profiles.id}.png`} alt={application.profiles.name || ''} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                            <Link to={`/profile/${application.profiles.id}`} className="font-semibold hover:underline" target="_blank">{application.profiles.name}</Link>
                            <p className="text-sm text-text-muted">@{application.profiles.username}</p>
                        </div>
                    </div>
                    <p className="text-sm"><strong>College:</strong> {application.profiles.college}</p>
                    <p className="text-sm"><strong>Submitted:</strong> {format(new Date(application.created_at), 'PPp')}</p>
                    {application.campus_details && (
                        <div>
                            <p className="font-semibold text-sm">Campus Details:</p>
                            <p className="text-sm bg-slate-50 p-2 rounded border max-h-24 overflow-y-auto">{application.campus_details}</p>
                        </div>
                    )}
                </div>

                <div className="md:col-span-1">
                     <h3 className="font-bold text-lg text-text-heading mb-2">Intro Video</h3>
                    <video src={application.intro_video_url} controls className="w-full rounded-lg bg-black"></video>
                </div>

                <div className="md:col-span-1 flex flex-col justify-center gap-2">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {isRejecting ? (
                         <div className="w-full">
                            <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." className="w-full p-2 border rounded-md text-sm" rows={2}/>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setIsRejecting(false)} className="bg-slate-200 text-text-body px-4 py-2 rounded-lg text-sm font-semibold flex-1">Cancel</button>
                                <button onClick={handleReject} disabled={isProcessing} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex-1 disabled:opacity-50">
                                    {isProcessing ? <Spinner size="sm"/> : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                           <button onClick={handleApprove} disabled={isProcessing} className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-semibold disabled:opacity-50">
                                {isProcessing ? <Spinner size="sm"/> : 'Approve'}
                            </button>
                            <button onClick={() => setIsRejecting(true)} disabled={isProcessing} className="w-full bg-slate-200 text-text-body px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminTourApplicationsPage: React.FC = () => {
    const [applications, setApplications] = useState<TourGuideApplicationWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tour_guide_applications')
            .select('*, profiles:user_id(*)')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
        
        if (error) setError(error.message);
        else setApplications((data as any) || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Tour Guide Applications ({applications.length})</h1>
            
            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="text-red-500 text-center p-4">{error}</p> :
             applications.length === 0 ? (
                <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">The application queue is empty.</p>
             ) : (
                <div className="space-y-4">
                    {applications.map(app => (
                        <ApplicationCard key={app.id} application={app} onReviewed={fetchApplications} />
                    ))}
                </div>
             )
            }
        </div>
    );
};

export default AdminTourApplicationsPage;
