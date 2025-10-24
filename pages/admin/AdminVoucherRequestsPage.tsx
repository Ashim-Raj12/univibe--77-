import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { VoucherWithdrawalRequestWithDetails } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from '../../components/Toast';
import { useAuth } from '../../hooks/useAuth';

// --- Modals for Actions ---
interface FulfillModalProps {
    request: VoucherWithdrawalRequestWithDetails;
    onClose: () => void;
    onSuccess: () => void;
}
const FulfillModal: React.FC<FulfillModalProps> = ({ request, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!details.trim() || !user) return;
        setLoading(true);
        const { error } = await supabase.rpc('admin_fulfill_voucher_request', {
            p_request_id: request.id,
            p_fulfillment_details: details.trim()
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Request fulfilled successfully.");
            onSuccess();
        }
        setLoading(false);
    };
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="p-4 border-b font-bold">Fulfill Request for {request.profiles.name}</h3>
                <div className="p-6 space-y-4">
                    <p className="text-sm">Enter the voucher code or a link to the payment proof (e.g., UPI screenshot URL) below. The user will be notified with these details.</p>
                    <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="Enter voucher code or proof link..." className="w-full p-2 border rounded"/>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="bg-slate-200 px-4 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold min-w-[90px]">{loading ? <Spinner size="sm"/> : 'Confirm'}</button>
                </div>
            </div>
        </div>
    );
};

interface RejectModalProps {
    request: VoucherWithdrawalRequestWithDetails;
    onClose: () => void;
    onSuccess: () => void;
}
const RejectModal: React.FC<RejectModalProps> = ({ request, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async () => {
        if (!reason.trim() || !user) return;
        setLoading(true);
        const { error } = await supabase.rpc('admin_reject_voucher_request', {
            p_request_id: request.id,
            p_admin_notes: reason.trim()
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.info("Request has been rejected.");
            onSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="p-4 border-b font-bold">Reject Request for {request.profiles.name}</h3>
                <div className="p-6 space-y-4">
                    <p className="text-sm">Provide a reason for rejecting this request. The user will be notified and their coins will be refunded.</p>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason..." className="w-full p-2 border rounded" required/>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="bg-slate-200 px-4 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold min-w-[90px]">{loading ? <Spinner size="sm"/> : 'Reject'}</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const AdminVoucherRequestsPage: React.FC = () => {
    const [requests, setRequests] = useState<VoucherWithdrawalRequestWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');
    
    const [processingRequest, setProcessingRequest] = useState<VoucherWithdrawalRequestWithDetails | null>(null);
    const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('voucher_withdrawal_requests')
                .select('*, profiles:user_id(*), vouchers:voucher_id(*), admin:admin_id(name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests((data as any) || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('voucher-requests-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'voucher_withdrawal_requests' }, fetchData).subscribe();
        return () => { supabase.removeChannel(channel) };
    }, [fetchData]);

    const filteredRequests = requests.filter(r => r.status === activeTab);

    const handleOpenModal = (request: VoucherWithdrawalRequestWithDetails, type: 'fulfill' | 'reject') => {
        setProcessingRequest(request);
        if (type === 'fulfill') setIsFulfillModalOpen(true);
        else setIsRejectModalOpen(true);
    };
    
    const handleCloseModals = () => {
        setProcessingRequest(null);
        setIsFulfillModalOpen(false);
        setIsRejectModalOpen(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Voucher Withdrawal Requests</h1>

            <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                    {(['pending', 'completed', 'rejected'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${activeTab === tab ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'}`}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             filteredRequests.length === 0 ? <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No requests in this category.</p> :
                <div className="space-y-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <p className="font-bold">{req.vouchers.name}</p>
                                    <p className="text-sm">User: <Link to={`/profile/${req.user_id}`} className="font-semibold hover:underline" target="_blank">{req.profiles.name}</Link></p>
                                    <p className="text-xs text-slate-500">{format(new Date(req.created_at), 'PPp')}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">{req.coins_spent} coins</p>
                                    <p className="text-sm">Value: ₹{req.vouchers.value_inr}</p>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    {req.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleOpenModal(req, 'reject')} className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-semibold hover:bg-red-200">Reject</button>
                                            <button onClick={() => handleOpenModal(req, 'fulfill')} className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-semibold hover:bg-green-200">Fulfill</button>
                                        </>
                                    )}
                                    {req.status === 'completed' && (
                                        <div className="text-right text-sm">
                                            <p className="font-semibold">Fulfilled by {req.admin?.name || 'Admin'}</p>
                                            <p className="text-xs text-slate-500">Code/Proof: <span className="font-mono">{req.fulfillment_details}</span></p>
                                        </div>
                                    )}
                                     {req.status === 'rejected' && (
                                        <div className="text-right text-sm">
                                            <p className="font-semibold text-red-600">Rejected</p>
                                            <p className="text-xs text-slate-500">Reason: {req.admin_notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            }
            {isFulfillModalOpen && processingRequest && <FulfillModal request={processingRequest} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); fetchData(); }} />}
            {isRejectModalOpen && processingRequest && <RejectModal request={processingRequest} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); fetchData(); }} />}
        </div>
    );
};

export default AdminVoucherRequestsPage;