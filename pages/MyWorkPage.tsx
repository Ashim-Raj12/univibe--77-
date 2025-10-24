import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { AssignmentWithPoster } from '../types';
import Spinner from '../components/Spinner';
import AssignmentHistoryCard from '../components/AssignmentHistoryCard';
import ConfirmationModal from '../components/ConfirmationModal';

type ActiveTab = 'in_progress' | 'submitted' | 'completed';

const MyWorkPage: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<AssignmentWithPoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('in_progress');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // New state for confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [assignmentToQuit, setAssignmentToQuit] = useState<number | null>(null);


    const fetchMyWork = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
            .from('assignments')
            .select('*, poster:poster_id(*), assignee:assignee_id(*)')
            .eq('assignee_id', user.id)
            .in('status', ['in_progress', 'submitted', 'completed'])
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else if (data) {
            const posterIds = [...new Set(data.map(a => a.poster_id).filter(Boolean))];
            let enrichedAssignments = data;

            if (posterIds.length > 0) {
                const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', posterIds).eq('status', 'active');
                const proUserIds = new Set(proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                
                enrichedAssignments = data.map(a => ({
                    ...a,
                    poster: a.poster ? {
                        ...a.poster,
                        has_pro_badge: proUserIds.has(a.poster_id)
                    } : null
                }));
            }
            setAssignments(enrichedAssignments as any);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchMyWork();
    }, [fetchMyWork]);
    
    // This function now just opens the modal
    const handleQuitAssignment = (assignmentId: number) => {
        setAssignmentToQuit(assignmentId);
        setIsConfirmModalOpen(true);
    };

    // This function contains the actual logic
    const confirmQuitAssignment = async () => {
        if (!assignmentToQuit) return;
        
        setActionLoading(assignmentToQuit);
        const { error } = await supabase
            .from('assignments')
            .update({ 
                assignee_id: null, 
                status: 'open',
                submitted_at: null,
                submitted_file_name: null,
                submitted_file_url: null,
            })
            .eq('id', assignmentToQuit);
        
        setActionLoading(null);
        setIsConfirmModalOpen(false);

        if (error) {
            alert("Failed to quit assignment: " + error.message);
        } else {
            setAssignments(prev => prev.filter(a => a.id !== assignmentToQuit));
        }
        setAssignmentToQuit(null);
    };


    const filteredAssignments = assignments.filter(a => {
        if (activeTab === 'in_progress') return a.status === 'in_progress';
        if (activeTab === 'submitted') return a.status === 'submitted';
        if (activeTab === 'completed') return a.status === 'completed';
        return false;
    });

    const TabButton: React.FC<{ tabName: ActiveTab; children: React.ReactNode }> = ({ tabName, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex-1 sm:flex-none whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none ${
                activeTab === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
            }`}
        >
            {children}
        </button>
    );

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-text-heading">My Work</h1>
                
                <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                    <div className="border-b border-slate-200/80">
                        <nav className="-mb-px flex space-x-2 sm:space-x-6 px-4 sm:px-6" aria-label="Tabs">
                            <TabButton tabName="in_progress">Work In Progress</TabButton>
                            <TabButton tabName="submitted">Submitted for Review</TabButton>
                            <TabButton tabName="completed">Completed</TabButton>
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
                                        onQuit={handleQuitAssignment} 
                                        isQuitting={actionLoading === assignment.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmQuitAssignment}
                title="Quit Assignment"
                message="Are you sure you want to quit this assignment? This will remove it from your work and make it available for others again."
                confirmText="Yes, Quit"
                isLoading={!!actionLoading}
            />
        </>
    );
};

export default MyWorkPage;