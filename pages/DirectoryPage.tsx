import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import UserCard from '../components/UserCard';
import { useAuth } from '../hooks/useAuth';
import UserCardSkeleton from '../components/UserCardSkeleton';
import { MagicGrid } from '../components/MagicGrid';
import Spinner from '../components/Spinner';

const PROFILES_PER_PAGE = 20;

const DirectoryPage: React.FC = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [collegeFilter, setCollegeFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedCollege, setDebouncedCollege] = useState('');
    const [debouncedState, setDebouncedState] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);
    
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedCollege(collegeFilter), 500);
        return () => clearTimeout(handler);
    }, [collegeFilter]);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedState(stateFilter), 500);
        return () => clearTimeout(handler);
    }, [stateFilter]);

    const fetchProfiles = useCallback(async (isNewSearch = false) => {
        if (!user) return;
        
        if (isNewSearch) {
            setLoading(true);
            setPage(0);
        } else {
            setLoadingMore(true);
        }
        setError(null);
        
        const currentPage = isNewSearch ? 0 : page;
        const from = currentPage * PROFILES_PER_PAGE;
        const to = from + PROFILES_PER_PAGE - 1;

        let query = supabase.from('profiles').select('*').neq('id', user.id);

        if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
        if (debouncedCollege) query = query.ilike('college', `%${debouncedCollege}%`);
        if (debouncedState) query = query.ilike('state', `%${debouncedState}%`);

        const { data, error } = await query.order('name', { ascending: true }).range(from, to);

        if (error) {
            console.error('Error fetching profiles:', error);
            setError(error.message);
        } else if (data) {
            if (isNewSearch) {
                setProfiles(data);
            } else {
                setProfiles(prev => [...prev, ...data]);
            }

            if (data.length < PROFILES_PER_PAGE) {
                setHasMore(false);
            } else {
                setHasMore(true);
                setPage(prev => prev + 1);
            }
        }
        setLoading(false);
        setLoadingMore(false);
    }, [debouncedSearch, debouncedCollege, debouncedState, user, page]);

    useEffect(() => {
        fetchProfiles(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, debouncedCollege, debouncedState]);


    const filterInputClasses = "w-full p-3 bg-dark-card border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted";

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-heading mb-6">Find Fellows</h1>
            <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="grid md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={filterInputClasses}
                    />
                    <input
                        type="text"
                        placeholder="Filter by college..."
                        value={collegeFilter}
                        onChange={e => setCollegeFilter(e.target.value)}
                        className={filterInputClasses}
                    />
                    <input
                        type="text"
                        placeholder="Filter by state..."
                        value={stateFilter}
                        onChange={e => setStateFilter(e.target.value)}
                        className={filterInputClasses}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <UserCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : profiles.length === 0 ? (
                <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">No users found matching your criteria.</p>
            ) : (
                <>
                    <MagicGrid>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {profiles.map(profile => (
                                <UserCard 
                                    key={profile.id} 
                                    profile={profile}
                                />
                            ))}
                        </div>
                    </MagicGrid>
                    {!loading && profiles.length > 0 && hasMore && (
                        <div className="text-center mt-8">
                            <button
                                onClick={() => fetchProfiles()}
                                disabled={loadingMore}
                                className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[150px] font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 mx-auto active:scale-95"
                            >
                                {loadingMore ? <Spinner size="sm" /> : 'Load More'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DirectoryPage;
