import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard from '../components/UserCard';
import UserCardSkeleton from '../components/UserCardSkeleton';
import { MagicGrid } from '../components/MagicGrid';
import { Link } from 'react-router-dom';

const AdvertisersPage: React.FC = () => {
    const [advertisers, setAdvertisers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAdvertisers = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_advertiser', true)
            .order('name', { ascending: true });

        if (fetchError) {
            console.error('Error fetching advertisers:', fetchError);
            setError(fetchError.message);
        } else if (data) {
            setAdvertisers(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAdvertisers();
    }, [fetchAdvertisers]);

    return (
        <div className="animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
                 <Link to="/about" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-text-heading">Our Advertisers</h1>
                    <p className="text-text-body mt-1">Meet our partners and sponsors who support the UniVibe community.</p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : advertisers.length === 0 ? (
                <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    Our advertiser team is currently being assembled. Check back soon!
                </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {advertisers.map(profile => (
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

export default AdvertisersPage;