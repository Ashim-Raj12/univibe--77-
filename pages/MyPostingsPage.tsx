import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { AssignmentWithPoster } from '../types';
import Spinner from '../components/Spinner';
import AssignmentHistoryCard from '../components/AssignmentHistoryCard';

type FilterStatus = 'open' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';

const MyPostingsPage: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<AssignmentWithPoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>('open');

    const fetchMyPostings = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
            .from('assignments')
            .select('*, poster:poster_id(*), assignee:assignee_id(*)')
            .eq('poster_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setAssignments(data as any);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchMyPostings();
    }, [fetchMyPostings]);

    const filteredAssignments = assignments.filter(a => a.status === filter);

    const TabButton: React.FC<{ tabName: FilterStatus; children: React.ReactNode }> = ({ tabName, children }) => (
        <button
            onClick={() => setFilter(tabName)}
            className={`flex-1 sm:flex-none whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none ${
                filter === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-text-heading">My Postings</h1>
            
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <div className="border-b border-slate-200/80">
                    <nav className="-mb-px flex space-x-2 sm:space-x-6 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                        <TabButton tabName="open">Open</TabButton>
                        <TabButton tabName="in_progress">In Progress</TabButton>
                        <TabButton tabName="submitted">Submitted</TabButton>
                        <TabButton tabName="completed">Completed</TabButton>
                        <TabButton tabName="cancelled">Cancelled</TabButton>
                    </nav>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Spinner /></div>
                    ) : error ? (
                        <p className="text-center text-red-500">{error}</p>
                    ) : filteredAssignments.length === 0 ? (
                        <p className="text-center text-text-muted py-10">No assignments found in this category.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredAssignments.map(assignment => (
                                <AssignmentHistoryCard 
                                    key={assignment.id} 
                                    assignment={assignment} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyPostingsPage;
