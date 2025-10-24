

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { EventWithCreatorAndAttendees, Profile } from '../types';
import EventCard from '../components/EventCard';
import Spinner from '../components/Spinner';
import CreateEventModal from '../components/CreateEventModal';
import { MagicGrid } from '../components/MagicGrid';
import EventCardSkeleton from '../components/EventCardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

interface EventsListPageProps {
    isHubView?: boolean;
    isModerator?: boolean;
}

const EventsListPage: React.FC<EventsListPageProps> = ({ isHubView = false, isModerator = false }) => {
    const { user, profile, subscription } = useAuth();
    const [events, setEvents] = useState<EventWithCreatorAndAttendees[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const hasProAccess = subscription?.status === 'active' && subscription.subscriptions.name?.toUpperCase() === 'PRO';

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('events')
                .select('*, profiles:creator_id(*), event_attendees(user_id, profiles(id, name, avatar_url))')
                .eq('status', 'approved')
                .order('event_date', { ascending: true });

            if (isHubView) {
                if (!profile?.college) {
                    setLoading(false);
                    setEvents([]);
                    return;
                }
                query = query.eq('college', profile.college);
            } else {
                query = query.is('college', null);
            }
            
            if (debouncedSearch) {
                query = query.ilike('name', `%${debouncedSearch}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            let finalEvents = (data as EventWithCreatorAndAttendees[]) || [];

            const userIds = new Set<string>();
            finalEvents.forEach(event => {
                if (event.profiles) userIds.add(event.creator_id);
                event.event_attendees.forEach(attendee => userIds.add(attendee.user_id));
            });

            if (userIds.size > 0) {
                const { data: proSubs } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, subscriptions:subscription_id(name)')
                    .in('user_id', Array.from(userIds))
                    .eq('status', 'active');
                
                const proUserIds = new Set(
                    proSubs?.filter(s => s.subscriptions?.name?.toUpperCase() === 'PRO').map(s => s.user_id)
                );

                finalEvents = finalEvents.map(event => ({
                    ...event,
                    profiles: event.profiles ? { ...event.profiles, has_pro_badge: proUserIds.has(event.creator_id) } : event.profiles,
                    event_attendees: event.event_attendees.map(attendee => ({
                        ...attendee,
                        profiles: attendee.profiles ? { ...attendee.profiles, has_pro_badge: proUserIds.has(attendee.user_id) } : attendee.profiles
                    }))
                }));
            }
            
            setEvents(finalEvents);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, profile, isHubView]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const channelId = isHubView ? `events-for-${profile?.college}` : 'global-events';
        const channel = supabase.channel(channelId)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'events', 
                filter: isHubView ? `college=eq.${profile?.college}` : 'college=is.null'
            }, fetchEvents)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees' }, fetchEvents)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [fetchEvents, profile?.college, isHubView]);
    
    const renderRequestButton = () => {
        if (!profile?.is_verified) {
            return null;
        }

        const buttonClasses = "bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-all duration-300 font-semibold shadow-soft hover:shadow-soft-md transform hover:-translate-y-0.5 active:scale-95";

        if (isHubView) { // College events
            return (
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className={buttonClasses}
                >
                    {isModerator ? 'Create Event' : 'Request Event'}
                </button>
            );
        }

        // Global events
        if (hasProAccess) {
            return (
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className={buttonClasses}
                >
                    Request Event
                </button>
            );
        } else {
            return (
                <Link to="/subscriptions" className={`${buttonClasses} bg-yellow-500 hover:bg-yellow-600`}>
                    ✨ Upgrade to PRO to Request
                </Link>
            );
        }
    };


    const filterInputClasses = "w-full p-3 bg-dark-card border-none rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-on-dark placeholder:text-text-muted";
    
    if (isHubView && !profile?.college && !loading) {
        return (
            <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/80">
                <p>Please set your college in your profile to see relevant events.</p>
                <Link to={`/profile/${user?.id}`} className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold">
                    Go to Profile
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                 {isHubView ? (
                    <h1 className="text-3xl font-bold text-text-heading">Events at {profile?.college}</h1>
                ) : (
                    <h1 className="text-3xl font-bold text-text-heading">Global Events</h1>
                )}
                {renderRequestButton()}
            </div>

             <div className="bg-card p-4 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="grid md:grid-cols-1 gap-4">
                    <input
                        type="text"
                        placeholder="Search by event name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={filterInputClasses}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <EventCardSkeleton key={i} />)}
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : events.length === 0 ? (
                 <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    No upcoming events found.
                 </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} onRsvpChange={fetchEvents} />
                        ))}
                    </div>
                </MagicGrid>
            )}

            {isCreateModalOpen && (
                <CreateEventModal
                    isModerator={isModerator}
                    isGlobalRequest={!isHubView}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchEvents();
                    }}
                />
            )}
        </>
    );
};

export default EventsListPage;