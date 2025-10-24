import React from 'react';
import { AssignmentWithPoster } from '../types';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import Spinner from './Spinner';

const StatusBadge: React.FC<{ status: AssignmentWithPoster['status'] }> = ({ status }) => {
    const styles: { [key: string]: string } = {
        in_progress: 'bg-yellow-100 text-yellow-800',
        submitted: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

interface AssignmentHistoryCardProps {
    assignment: AssignmentWithPoster;
    onQuit?: (assignmentId: number) => void;
    isQuitting?: boolean;
}

const AssignmentHistoryCard: React.FC<AssignmentHistoryCardProps> = ({ assignment, onQuit, isQuitting }) => {
    const isQuittable = onQuit && (assignment.status === 'in_progress' || assignment.status === 'submitted');

    const handleQuitClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onQuit && !isQuitting) {
            onQuit(assignment.id);
        }
    };

    return (
        <Link to={`/assignment/${assignment.id}`} className="block p-4 rounded-xl bg-card hover:bg-slate-50 border border-slate-200/80 transition-all duration-300 transform hover:-translate-y-1 shadow-soft hover:shadow-soft-md">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-text-heading line-clamp-1">{assignment.title}</h4>
                    <p className="text-xs text-text-muted mt-1">From: {assignment.poster.name}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold text-green-600">₹{assignment.price}</p>
                    <StatusBadge status={assignment.status} />
                </div>
            </div>
            <p className="text-sm text-text-body mt-2 h-10 overflow-hidden line-clamp-2">{assignment.description}</p>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                <p className="text-xs text-text-muted font-semibold">Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'N/A'}</p>
                <div className="flex items-center gap-4">
                    {isQuittable && (
                         <button onClick={handleQuitClick} disabled={isQuitting} className="text-xs text-red-600 font-semibold hover:underline z-10 relative disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] h-5 flex justify-center items-center">
                            {isQuitting ? <Spinner size="sm" /> : 'Quit Task'}
                        </button>
                    )}
                    <p className="text-xs text-primary font-semibold">View Details &rarr;</p>
                </div>
            </div>
        </Link>
    );
};

export default AssignmentHistoryCard;