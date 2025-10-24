import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { ReportWithReporter, Report } from '../../types';
import Spinner from '../../components/Spinner';
import ReportCard from '../../components/ReportCard';

const AdminReportsPage: React.FC = () => {
    const [reports, setReports] = useState<ReportWithReporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        let query = supabase
            .from('reports')
            .select('*, profiles:reporter_id(*)')
            .order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query;
        if (error) {
            setError(error.message);
        } else {
            const reportsData = data as ReportWithReporter[] || [];
            const userIds = [...new Set(reportsData.map(r => r.reporter_id))];
            if (userIds.length > 0) {
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', userIds)
                    .eq('status', 'active');
                
                const proUserIds = new Set(proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));

                const enrichedReports = reportsData.map(report => ({
                    ...report,
                    profiles: { ...report.profiles, has_pro_badge: proUserIds.has(report.reporter_id) }
                }));
                setReports(enrichedReports as any);
            } else {
                setReports(reportsData as any);
            }
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">User Reports</h1>
            
            <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                    {(['pending', 'resolved', 'all'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                                filter === tab ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="text-center text-red-500 p-8">{error}</p> :
             reports.length === 0 ? <p className="text-center text-gray-500 bg-white p-10 rounded-lg border">No reports found for this filter.</p> :
                <div className="space-y-4">
                    {reports.map(report => (
                        <ReportCard key={report.id} report={report} onUpdate={fetchReports} />
                    ))}
                </div>
            }
        </div>
    );
};

export default AdminReportsPage;