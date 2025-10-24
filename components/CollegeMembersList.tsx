import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard from './UserCard';
import UserCardSkeleton from './UserCardSkeleton';

interface CollegeMembersListProps {
    collegeName: string;
}

const CollegeMembersList: React.FC<CollegeMembersListProps> = ({ collegeName }) => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('college', collegeName)
            .order('name', { ascending: true });
        
        if (error) {
            setError(error.message);
        } else if (data) {
            const userIds = data.map(p => p.id);
            if (userIds.length > 0) {
                const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', userIds).eq('status', 'active');
                const proUserIds = new Set(proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                const enrichedProfiles = data.map(p => ({ ...p, has_pro_badge: proUserIds.has(p.id) }));
                setMembers(enrichedProfiles);
            } else {
                setMembers(data);
            }
        }
        setLoading(false);
    }, [collegeName]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-2">
                {[...Array(6)].map((_, i) => <UserCardSkeleton key={i} />)}
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    if (members.length === 0) {
        return <p className="text-center text-gray-500 p-8">No members from this college found yet.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-2">
            {members.map(profile => (
                <UserCard
                    key={profile.id}
                    profile={profile}
                />
            ))}
        </div>
    );
};

export default CollegeMembersList;