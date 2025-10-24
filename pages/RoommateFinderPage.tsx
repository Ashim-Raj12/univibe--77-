import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Profile, RoommatePreference } from '../types';
import Spinner from '../components/Spinner';
import UserCard from '../components/UserCard';
import { MagicGrid } from '../components/MagicGrid';
import RoommatePreferencesForm from '../components/RoommatePreferencesForm';
import UserCardSkeleton from '../components/UserCardSkeleton';

interface Match extends Profile {
    match_score: number;
    matching_reasons: { type: string; value: string }[];
}

const RoommateFinderPage: React.FC = () => {
    const { user, profile } = useAuth();
    const [preferences, setPreferences] = useState<RoommatePreference | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPreferences = useCallback(async () => {
        if (!user) return;
        setLoadingPrefs(true);
        const { data } = await supabase
            .from('roommate_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();
        setPreferences(data);
        setLoadingPrefs(false);
    }, [user]);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    const findMatches = useCallback(async () => {
        if (!preferences) return;

        setLoadingMatches(true);
        setError(null);
        setMatches([]);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('get-roommate-matches');

            if (functionError) {
                // Try to parse a more specific error message from the function response
                let message = functionError.message;
                try {
                    const parsed = JSON.parse(functionError.context.body);
                    if (parsed.error) {
                        message = parsed.error;
                    }
                } catch (e) {
                    // Ignore parsing error, use original message
                }
                throw new Error(message);
            }

            setMatches(data as Match[]);

        } catch (err: any) {
            console.error("Error finding matches:", err);
            setError(err.message || "An unexpected error occurred while finding matches.");
        } finally {
            setLoadingMatches(false);
        }
    }, [preferences]);

    useEffect(() => {
        if (!loadingPrefs && preferences) {
            findMatches();
        }
    }, [loadingPrefs, preferences, findMatches]);

    if (loadingPrefs) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (!preferences) {
        return <RoommatePreferencesForm onSuccess={(newPrefs) => setPreferences(newPrefs)} initialPreferences={null} />;
    }

    return (
        <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold text-text-heading mb-6">Roommate Finder</h1>

            {error && <p className="text-center text-red-500 bg-red-50 p-4 rounded-lg border border-red-200 mb-6">{error}</p>}

            {loadingMatches ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            ) : matches.length === 0 ? (
                <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/50">
                    <p className="font-semibold">No compatible roommates found yet.</p>
                    <p className="mt-2">Check back later as more students from your college set their preferences!</p>
                </div>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {matches.map(match => (
                            <UserCard 
                                key={match.id} 
                                profile={match}
                                matchDetails={{ score: match.match_score, reasons: match.matching_reasons }}
                            />
                        ))}
                    </div>
                </MagicGrid>
            )}
        </div>
    );
};

export default RoommateFinderPage;