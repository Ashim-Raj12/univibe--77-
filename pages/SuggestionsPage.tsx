import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard from '../components/UserCard';
import { useAuth } from '../hooks/useAuth';
import UserCardSkeleton from '../components/UserCardSkeleton';
import { Link } from 'react-router-dom';
import { MagicGrid } from '../components/MagicGrid';

interface Suggestion {
    profile: Profile;
    score: number;
    reasons: { type: string; value: string }[];
}

const calculateCompatibility = (currentUser: Profile, otherUser: Profile): Suggestion | null => {
    let score = 0;
    const reasons: { type: string; value: string }[] = [];

    if (currentUser.college && otherUser.college && currentUser.college.toLowerCase() === otherUser.college.toLowerCase()) {
        score += 50;
        reasons.push({ type: 'college', value: `Same college: ${currentUser.college}` });
    }
    if (currentUser.state && otherUser.state && currentUser.state.toLowerCase() === otherUser.state.toLowerCase()) {
        score += 15;
        reasons.push({ type: 'state', value: `Same state: ${currentUser.state}` });
    }
    if (currentUser.course && otherUser.course && currentUser.course.toLowerCase() === otherUser.course.toLowerCase()) {
        score += 25;
        reasons.push({ type: 'course', value: `Same course: ${currentUser.course}` });
    }
    if (currentUser.enrollment_status && otherUser.enrollment_status && currentUser.enrollment_status === otherUser.enrollment_status) {
        score += 10;
        reasons.push({ type: 'status', value: `Both are ${currentUser.enrollment_status === 'incoming_student' ? 'future students' : 'current students'}` });
    }

    if (currentUser.hobbies_interests && otherUser.hobbies_interests) {
        const currentUserHobbies = new Set(currentUser.hobbies_interests.split(',').map(h => h.trim().toLowerCase()));
        const otherUserHobbies = new Set(otherUser.hobbies_interests.split(',').map(h => h.trim().toLowerCase()));
        
        currentUserHobbies.forEach(hobby => {
            if (hobby && otherUserHobbies.has(hobby)) {
                score += 5;
                reasons.push({ type: 'hobby', value: `Shared interest: ${hobby}` });
            }
        });
    }

    if (score === 0) return null;

    return { profile: otherUser, score, reasons };
};

const SuggestionsPage: React.FC = () => {
    const { user, profile } = useAuth();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [parentProfiles, setParentProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isParent = profile?.enrollment_status === 'parent';

    const fetchData = useCallback(async () => {
        if (!user || !profile) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            if (isParent) {
                // Fetch other parents
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('enrollment_status', 'parent')
                    .neq('id', user.id);
                if (fetchError) throw fetchError;
                
                const userIds = data?.map(p => p.id) || [];
                let enrichedProfiles = data || [];
                if (userIds.length > 0) {
                     const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', userIds).eq('status', 'active');
                     const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                     enrichedProfiles = enrichedProfiles.map(p => ({ ...p, has_pro_badge: proUserIds.has(p.id) }));
                }
                setParentProfiles(enrichedProfiles);

            } else {
                // Fetch student suggestions
                if (!profile.college) {
                    setSuggestions([]);
                    setLoading(false);
                    return;
                }
                
                const formatFilterValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

                const filters = [
                    profile.college ? `college.eq.${formatFilterValue(profile.college)}` : null,
                    profile.state ? `state.eq.${formatFilterValue(profile.state)}` : null,
                    profile.course ? `course.eq.${formatFilterValue(profile.course)}` : null,
                ].filter((f): f is string => f !== null).join(',');

                if (!filters) {
                    setSuggestions([]);
                    setLoading(false);
                    return;
                }

                const { data: potentialMatches, error: fetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', user.id)
                    .neq('enrollment_status', 'parent')
                    .or(filters);
                
                if (fetchError) throw fetchError;
                
                const matches = potentialMatches || [];
                const userIds = matches.map(p => p.id);
                let enrichedMatches = matches;
                if (userIds.length > 0) {
                     const { data: proSubs } = await supabase.from('user_subscriptions').select('user_id, subscriptions:subscription_id(name)').in('user_id', userIds).eq('status', 'active');
                     const proUserIds = new Set((proSubs || []).filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id));
                     enrichedMatches = enrichedMatches.map(p => ({ ...p, has_pro_badge: proUserIds.has(p.id) }));
                }

                const calculatedSuggestions = enrichedMatches
                    .map(p => calculateCompatibility(profile, p))
                    .filter((s): s is Suggestion => s !== null && s.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 20);
                setSuggestions(calculatedSuggestions);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [user, profile, isParent]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-text-heading mb-6">{isParent ? "Finding Other Parents" : "Suggestions For You"}</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    if (error) return <p className="text-center text-red-500 p-8">{error}</p>;
    
    if (isParent) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-text-heading mb-6">Connect with Other Parents</h1>
                {parentProfiles.length === 0 ? (
                    <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                        No other parents have joined yet. Check back soon!
                    </p>
                ) : (
                    <MagicGrid>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {parentProfiles.map(p => (
                                <UserCard 
                                    key={p.id} 
                                    profile={p}
                                />
                            ))}
                        </div>
                    </MagicGrid>
                )}
            </div>
        );
    }
    
    if (!profile || !profile.college) {
        return (
            <div className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                <p>Complete your profile with your college, course, and interests to get personalized suggestions!</p>
                <Link to={`/profile/${user?.id}`} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold">
                    Go to Profile
                </Link>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-heading mb-6">Suggestions For You</h1>
            {suggestions.length === 0 ? (
                 <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    No great matches found right now. We'll keep looking as more users join!
                </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {suggestions.map(({ profile, score, reasons }) => (
                            <UserCard 
                                key={profile.id} 
                                profile={profile}
                            />
                        ))}
                    </div>
                </MagicGrid>
            )}
        </div>
    );
};

export default SuggestionsPage;