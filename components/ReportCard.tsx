import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { ReportWithReporter, Report } from '../types';
import Spinner from './Spinner';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const getEntityLink = (entityType: Report['entity_type'], entityId: string) => {
    switch (entityType) {
        case 'profile':
            return `/#/profile/${entityId}`;
        case 'post':
            return `/#/post/${entityId}`;
        case 'comment':
             // Comments don't have their own page, link to the post.
             // This might require a more complex lookup if we want to be precise.
            return `/#/post/${entityId}`;
        case 'message':
            // Cannot link to private messages
            return '#';
        default:
            return '#';
    }
}

const ReportCard: React.FC<{ report: ReportWithReporter; onUpdate: () => void; }> = ({ report, onUpdate }) => {
    const { user: adminUser } = useAuth();
    const [isReplying, setIsReplying] = useState(false);
    const [reply, setReply] = useState(report.admin_reply || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUpdate = async () => {
        if (!adminUser) return;
        setLoading(true);
        setError('');
        
        const { error: rpcError } = await supabase.rpc('admin_resolve_report', {
            p_report_id: report.id,
            p_admin_reply: reply.trim() || null,
        });
        
        if (rpcError) {
            setError('Failed to update: ' + rpcError.message);
        } else {
            setIsReplying(false);
            onUpdate();
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Reported Item</p>
                        <a href={getEntityLink(report.entity_type, report.entity_id)} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline capitalize text-primary">
                            {report.entity_type} <span className="font-normal text-slate-600">#{report.entity_id}</span>
                        </a>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Reporter</p>
                        <Link to={`/profile/${report.profiles.id}`} target="_blank" className="font-semibold hover:underline">{report.profiles.name}</Link>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Date</p>
                        <p className="text-sm" title={format(new Date(report.created_at), 'PPpp')}>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</p>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Reason</p>
                        <p className="text-sm bg-slate-50 p-2 rounded-md">{report.reason}</p>
                    </div>
                    
                    {isReplying ? (
                        <div className="space-y-3 pt-3 border-t">
                            <div>
                                <label className="text-xs font-semibold text-slate-500">Admin Reply (optional, sent as notification)</label>
                                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md text-sm" placeholder="Explain the action taken..."></textarea>
                            </div>
                            {error && <p className="text-red-500 text-xs">{error}</p>}
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsReplying(false)} className="px-4 py-1.5 rounded text-sm font-semibold bg-slate-100 hover:bg-slate-200">Cancel</button>
                                <button onClick={handleUpdate} disabled={loading} className="px-4 py-1.5 rounded text-sm font-semibold bg-primary text-white hover:bg-primary-focus disabled:opacity-50 min-w-[120px]">
                                    {loading ? <Spinner size="sm"/> : 'Save & Resolve'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-3 border-t">
                            {report.admin_reply && (
                                <div className="mb-3">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Admin Reply</p>
                                    <p className="text-sm bg-slate-50 p-2 rounded-md italic">"{report.admin_reply}"</p>
                                </div>
                            )}
                            <div className="mt-3 flex justify-between items-center">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    {report.status}
                                </span>
                                <button onClick={() => setIsReplying(true)} className="px-4 py-1.5 rounded text-sm font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200">
                                    {report.admin_reply ? 'Update' : 'Resolve'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportCard;