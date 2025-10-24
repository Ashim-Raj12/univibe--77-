import React from 'react';
import { CollabPostWithProfiles } from '../types';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import VibeCoinLogo from './VibeCoinLogo';

interface CollabPostCardProps {
    post: CollabPostWithProfiles;
}

const taskTypeLabels: { [key in CollabPostWithProfiles['task_type']]: string } = {
    collaboration: 'Collaboration',
    tutoring: 'Tutoring',
    notes: 'Notes Exchange',
    project_help: 'Project Help',
};

const CollabPostCard: React.FC<CollabPostCardProps> = ({ post }) => {
    return (
        <Link to={`/vibecollab/${post.id}`} className="block p-5 rounded-2xl bg-card hover:bg-slate-50 border border-slate-200/80 transition-all duration-300 transform hover:-translate-y-1 shadow-soft hover:shadow-soft-md">
            <div className="flex justify-between items-start">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {taskTypeLabels[post.task_type]}
                </span>
                <div className="flex items-center gap-1 font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full text-xs">
                    <VibeCoinLogo className="h-4 w-4 text-yellow-500" />
                    <span>{post.reward_coins}</span>
                </div>
            </div>
            <h3 className="font-bold text-text-heading mt-3 line-clamp-2 h-12">{post.title}</h3>
            <p className="text-sm text-text-muted mt-1 font-semibold truncate">{post.subject}</p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <img src={post.poster.avatar_url || `https://avatar.vercel.sh/${post.poster.id}.png`} alt={post.poster.name || ''} className="w-8 h-8 rounded-full object-cover" />
                <div>
                    <span className="text-sm font-semibold text-text-body block">{post.poster.name}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-text-muted">@{post.poster.username}</span>
                        <VerifiedBadge profile={post.poster} size="h-3 w-3" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default CollabPostCard;