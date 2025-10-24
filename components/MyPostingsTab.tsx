import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { AssignmentWithPoster } from '../types';
import Spinner from './Spinner';
import AssignmentHistoryCard from './AssignmentHistoryCard';

type FilterStatus = 'open' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';

const MyPostingsTab: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<AssignmentWithPoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('open');

    const fetchMyPostings = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('assignments')
            .select('*, poster:poster_id(*), assignee:assignee_id(*)')
            .eq('poster_id', user.id)
            .order('created_at', { ascending: false });
        
        if (data) {
            const assigneeIds = [...new Set(data.map(a => a.assignee_id).filter(Boolean))];
            let enrichedAssignments = data;

            if (assigneeIds.length > 0) {
                const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', assigneeIds).eq('status', 'active');
                const proUserIds = new Set(proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                
                enrichedAssignments = data.map(a => ({
                    ...a,
                    assignee: a.assignee ? {
                        ...a.assignee,
                        has_pro_badge: proUserIds.has(a.assignee_id!)
                    } : null
                }));
            }
            setAssignments(enrichedAssignments as any);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchMyPostings();
    }, [fetchMyPostings]);

    useEffect(() => {
        if(!user) return;

        const channel = supabase
            .channel(`my-postings-assignments-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `poster_id=eq.${user.id}` }, fetchMyPostings)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [fetchMyPostings, user]);

    const filteredAssignments = assignments.filter(a => a.status === filter);
    
    const TabButton: React.FC<{ tabName: FilterStatus; children: React.ReactNode }> = ({ tabName, children }) => (
        <button
            onClick={() => setFilter(tabName)}
            className={`flex-1 sm:flex-none whitespace-nowrap py-2 px-4 rounded-md font-semibold text-sm transition-colors focus:outline-none ${
                filter === tabName
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-transparent text-text-muted hover:text-text-body'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-4 p-2">
            <h2 className="text-xl font-bold text-text-heading">My Posted Assignments</h2>
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 rounded-lg">
                <TabButton tabName="open">Open</TabButton>
                <TabButton tabName="in_progress">In Progress</TabButton>
                <TabButton tabName="submitted">Submitted</TabButton>
                <TabButton tabName="completed">Completed</TabButton>
                <TabButton tabName="cancelled">Cancelled</TabButton>
            </div>
            
            {loading ? <div className="flex justify-center p-8"><Spinner /></div> :
             filteredAssignments.length === 0 ? <p className="text-center text-text-muted py-10">No assignments found in this category.</p> :
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {filteredAssignments.map(assignment => <AssignmentHistoryCard key={assignment.id} assignment={assignment} />)}
             </div>
            }
        </div>
    );
};

export default MyPostingsTab;