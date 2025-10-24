import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { AssignmentWithPoster } from '../types';
import Spinner from './Spinner';
import { Link } from 'react-router-dom';
import PostAssignmentModal from './PostAssignmentModal';
import { format } from 'date-fns';

const AssignmentCard: React.FC<{ assignment: AssignmentWithPoster }> = ({ assignment }) => (
    <Link to={`/assignment/${assignment.id}`} className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all duration-300 transform hover:scale-[1.02]">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-text-heading line-clamp-1">{assignment.title}</h4>
                <p className="text-xs text-text-muted mt-1">from {assignment.college}</p>
            </div>
            <span className="text-sm font-bold text-green-600">
                ₹{assignment.price}
            </span>
        </div>
        <p className="text-sm text-text-body mt-2 h-10 overflow-hidden line-clamp-2">{assignment.description}</p>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-text-muted font-semibold">Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'N/A'}</p>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <img src={assignment.poster.avatar_url || `https://avatar.vercel.sh/${assignment.poster.id}.png`} alt={assignment.poster.name || 'poster'} className="w-5 h-5 rounded-full object-cover"/>
                <span>{assignment.poster.name?.split(' ')[0]}</span>
            </div>
        </div>
    </Link>
);


const AssignmentsTab: React.FC = () => {
    const [assignments, setAssignments] = useState<AssignmentWithPoster[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [collegeFilter, setCollegeFilter] = useState('');
    const [sortBy, setSortBy] = useState<'created_at' | 'price_desc' | 'price_asc' | 'due_date'>('created_at');

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedCollege, setDebouncedCollege] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedCollege(collegeFilter), 500);
        return () => clearTimeout(handler);
    }, [collegeFilter]);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('assignments')
            .select('*, poster:poster_id(*)')
            .eq('status', 'open');

        if (debouncedSearch) {
            query = query.or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
        }
    
        if (debouncedCollege) {
            query = query.ilike('college', `%${debouncedCollege}%`);
        }
    
        switch (sortBy) {
            case 'price_desc':
                query = query.order('price', { ascending: false });
                break;
            case 'price_asc':
                query = query.order('price', { ascending: true });
                break;
            case 'due_date':
                query = query.order('due_date', { ascending: true, nullsFirst: false });
                break;
            case 'created_at':
            default:
                query = query.order('created_at', { ascending: false });
                break;
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching assignments:", error);
        } else if (data) {
            setAssignments(data as any);
        }
        setLoading(false);
    }, [debouncedSearch, debouncedCollege, sortBy]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    useEffect(() => {
        const channel = supabase
            .channel('public-assignments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetchAssignments)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [fetchAssignments]);

    return (
        <div className="space-y-6 p-2">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-heading">Assignment Marketplace</h2>
                <button
                    onClick={() => setIsPostModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-soft text-sm"
                >
                    Post an Assignment
                </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <div className="grid md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search title or description..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading placeholder:text-text-muted"
                    />
                    <input
                        type="text"
                        placeholder="Filter by college..."
                        value={collegeFilter}
                        onChange={e => setCollegeFilter(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading placeholder:text-text-muted"
                    />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading"
                    >
                        <option value="created_at">Newest First</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="due_date">Due Date Soonest</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
            ) : assignments.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-xl">
                    No open assignments found for the current filters.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignments.map(assignment => <AssignmentCard key={assignment.id} assignment={assignment} />)}
                </div>
            )}

            {isPostModalOpen && (
                <PostAssignmentModal
                    onClose={() => setIsPostModalOpen(false)}
                    onSuccess={() => {
                        setIsPostModalOpen(false);
                        fetchAssignments();
                    }}
                />
            )}
        </div>
    );
};

export default AssignmentsTab;