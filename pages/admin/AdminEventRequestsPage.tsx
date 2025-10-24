
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Event, Profile } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from '../../components/Toast';
import CreateEventModal from '../../components/CreateEventModal';

interface EventRequest extends Event {
    profiles: Profile;
}

const AdminEventRequestsPage: React.FC = () => {
    const [allEvents, setAllEvents] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'college' | 'global'>('pending');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*, profiles:creator_id(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllEvents((data as any) || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleAction = async (eventId: number, newStatus: 'approved' | 'rejected') => {
        try {
            if (newStatus === 'rejected') {
                if (!window.confirm('Are you sure you want to reject and delete this event request?')) return;
                const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId);
                if (deleteError) throw deleteError;
                toast.success('Event request rejected and deleted.');
            } else { // approved
                const { error: updateError } = await supabase.from('events').update({ status: 'approved' }).eq('id', eventId);
                if (updateError) throw updateError;
                toast.success('Event approved and is now live.');
            }
            fetchEvents();
        } catch (err: any) {
            toast.error('Action failed: ' + err.message);
        }
    };
    
    const handleDelete = async (event: EventRequest) => {
        if (!window.confirm(`Are you sure you want to permanently delete the event "${event.name}"?`)) return;
         try {
            const { error: deleteError } = await supabase.from('events').delete().eq('id', event.id);
            if (deleteError) throw deleteError;
            toast.success('Event deleted.');
            fetchEvents();
        } catch (err: any) {
            toast.error('Deletion failed: ' + err.message);
        }
    }

    const pendingRequests = allEvents.filter(e => e.status === 'pending_approval');
    const collegeEvents = allEvents.filter(e => e.college !== null);
    const globalEvents = allEvents.filter(e => e.college === null);

    const renderList = (list: EventRequest[]) => {
        if (list.length === 0) {
            return <p className="p-8 bg-white rounded-lg text-center text-slate-500">No events in this category.</p>;
        }

        return (
            <div className="space-y-4">
                {list.map(req => (
                    <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm border">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-bold">{req.name}</h3>
                                <p className="text-sm text-slate-600">{req.college || 'Global Event'} &bull; {req.location}</p>
                                <p className="text-xs text-slate-500">{format(new Date(req.event_date), 'PPpp')}</p>
                             </div>
                             <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {req.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-sm my-2 p-2 bg-slate-50 rounded border">{req.description}</p>
                        
                        {req.college === null && (req.requirements || req.budget) && (
                            <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                                {req.requirements && <div><strong className="block text-xs uppercase text-blue-800">Requirements:</strong><p>{req.requirements}</p></div>}
                                {req.budget && <div><strong className="block text-xs uppercase text-blue-800">Proposed Budget:</strong><p className="font-semibold">₹{req.budget}</p></div>}
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-2 pt-2 border-t">
                            <Link to={`/profile/${req.profiles.id}`} className="text-sm font-semibold flex items-center gap-2 hover:underline">
                                <img src={req.profiles.avatar_url || ''} alt={req.profiles.name || ''} className="w-6 h-6 rounded-full" />
                                {req.profiles.name}
                            </Link>
                            <div className="flex gap-2">
                                {req.status === 'pending_approval' && (
                                    <>
                                        <button onClick={() => handleAction(req.id, 'rejected')} className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-200">Reject</button>
                                        <button onClick={() => handleAction(req.id, 'approved')} className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-semibold hover:bg-green-200">Approve</button>
                                    </>
                                )}
                                {req.status === 'approved' && (
                                     <button onClick={() => handleDelete(req)} className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-semibold hover:bg-red-200">Delete</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    
    const tabClasses = (tabName: 'pending' | 'college' | 'global') => 
        `${activeTab === tabName ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Event Management</h1>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow-sm">
                    Create Event
                </button>
            </div>
             <div className="border-b border-slate-200 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('pending')} className={tabClasses('pending')}>
                        Pending Requests <span className="ml-1 bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">{pendingRequests.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('college')} className={tabClasses('college')}>
                        College Events
                    </button>
                    <button onClick={() => setActiveTab('global')} className={tabClasses('global')}>
                        Global Events
                    </button>
                </nav>
            </div>
            
            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
             error ? <p className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</p> :
             activeTab === 'pending' ? renderList(pendingRequests) :
             activeTab === 'college' ? renderList(collegeEvents) :
             renderList(globalEvents)
            }
            
            {isCreateModalOpen && (
                <CreateEventModal 
                    isModerator={false} // This can be anything as isAdminCreator will override
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchEvents();
                    }}
                    isAdminCreator={true}
                />
            )}
        </div>
    );
};

export default AdminEventRequestsPage;
