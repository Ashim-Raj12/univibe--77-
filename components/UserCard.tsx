import React from 'react';
import { Profile } from '../types';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';
import { getEnrollmentStatusText } from '../pages/ProfilePage';
import MagicCard from './MagicCard';
import VerifiedBadge from './VerifiedBadge';
import { useAuth } from '../hooks/useAuth';
import { useFriendships } from '../hooks/useFriendships';

export type FriendshipStatus = 'not_friends' | 'friends';

interface UserCardProps {
    profile: Profile;
    matchDetails?: { score: number; reasons: { type: string; value: string }[] };
}

const UserCard: React.FC<UserCardProps> = ({ profile, matchDetails }) => {
    const { user } = useAuth();
    const { isFollowing, toggleFollow, mutatingIds } = useFriendships();
    
    const following = isFollowing(profile.id);
    const isLoading = mutatingIds.has(profile.id);

    const handleAction = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleFollow(profile.id);
    };
    
    const renderInteractionButton = () => {
        const baseClasses = "w-full px-4 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm flex-shrink-0 flex items-center justify-center min-h-[40px] shadow-soft hover:shadow-soft-md active:animate-press";
        
        if (following) {
            return (
                <button onClick={handleAction} disabled={isLoading} className={`${baseClasses} mt-4 bg-dark-card text-text-body hover:bg-border disabled:opacity-50`}>
                    {isLoading ? <Spinner size="sm" /> : 'Following'}
                </button>
            );
        }
        
        return (
            <button onClick={handleAction} disabled={isLoading} className={`${baseClasses} mt-4 bg-primary text-white hover:bg-primary-focus disabled:opacity-50`}>
                {isLoading ? <Spinner size="sm" /> : 'Follow'}
            </button>
        );
    };

    if (user?.id === profile.id) {
        return (
            <MagicCard>
                <div className="bg-card p-5 rounded-2xl shadow-soft border border-border flex flex-col justify-between h-full">
                    <div className="flex flex-col flex-grow">
                        <Link to={`/profile/${profile.id}`} className="block text-center flex-grow">
                            <img
                                src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                                alt={profile.name || ''}
                                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100 shadow-sm"
                                loading="lazy"
                            />
                            <div className="flex items-center justify-center gap-1">
                                <h3 className="font-bold text-lg text-text-heading truncate">{profile.name}</h3>
                                <VerifiedBadge profile={profile} />
                            </div>
                            {profile.username && <p className="text-sm text-text-muted truncate">@{profile.username}</p>}
                            {profile.enrollment_status && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-2 ${profile.enrollment_status === 'current_student' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                    {getEnrollmentStatusText(profile.enrollment_status)}
                                </span>
                            )}
                             {profile.is_tour_guide && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 inline-block mt-2 ml-1">
                                    Tour Guide
                                </span>
                            )}
                            <p className="text-sm text-text-body truncate mt-1">{profile.college}</p>
                            <p className="text-xs text-text-muted">{profile.state}</p>
                        
                        </Link>
                        <div>
                             <div className="w-full px-4 py-2.5 rounded-xl mt-4 bg-dark-card text-text-body font-semibold text-sm text-center">
                                It's You
                            </div>
                        </div>
                    </div>
                </div>
            </MagicCard>
        );
    }

    return (
        <MagicCard>
            <div className="bg-card p-5 rounded-2xl shadow-soft border border-border flex flex-col justify-between h-full">
                <div className="flex flex-col flex-grow">
                    <Link to={`/profile/${profile.id}`} className="block text-center flex-grow">
                        <img
                            src={profile.avatar_url || `https://avatar.vercel.sh/${profile.id}.png`}
                            alt={profile.name || ''}
                            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100 shadow-sm"
                            loading="lazy"
                        />
                        <div className="flex items-center justify-center gap-1">
                            <h3 className="font-bold text-lg text-text-heading truncate">{profile.name}</h3>
                            <VerifiedBadge profile={profile} />
                        </div>
                        {profile.username && <p className="text-sm text-text-muted truncate">@{profile.username}</p>}
                        <div className="mt-2 space-x-1">
                            {profile.enrollment_status && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${profile.enrollment_status === 'current_student' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                    {getEnrollmentStatusText(profile.enrollment_status)}
                                </span>
                            )}
                            {profile.is_tour_guide && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 inline-block">
                                    Tour Guide
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-text-body truncate mt-1">{profile.college}</p>
                        <p className="text-xs text-text-muted">{profile.state}</p>
                    
                        {matchDetails && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-left text-xs border border-slate-200/80">
                                <p className="font-bold text-center text-sm text-primary">{matchDetails.score}% Match</p>
                                <ul className="mt-2 list-disc list-inside space-y-1 text-text-body">
                                    {matchDetails.reasons.slice(0, 2).map((r, i) => <li key={i}>{r.value}</li>)}
                                </ul>
                            </div>
                        )}
                    </Link>

                    <div>
                        {renderInteractionButton()}
                    </div>
                </div>
            </div>
        </MagicCard>
    );
};

export default UserCard;