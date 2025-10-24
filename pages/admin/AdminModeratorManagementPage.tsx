import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { College, CollegeModeratorWithProfile, Profile, Community } from '../../types';
import Spinner from '../../components/Spinner';
import { Link } from 'react-router-dom';
import { toast } from '../../components/Toast';
import { useAuth } from '../../hooks/useAuth';

const AdminModeratorManagementPage: React.FC = () => {
    const { user } = useAuth();
    const [colleges, setColleges] = useState<College[]>([]);
    const [moderators, setModerators] = useState<CollegeModeratorWithProfile[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [selectedCollege, setSelectedCollege] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isCreatingHub, setIsCreatingHub] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const collegePromise = supabase.from('colleges').select('*').order('name');
            const moderatorPromise = supabase.from('college_moderators').select('*');
            const communityPromise = supabase.from('communities').select('name, is_verified');
            
            const [
                { data: collegeData, error: collegeError },
                { data: moderatorData, error: moderatorError },
                { data: communityData, error: communityError }
            ] = await Promise.all([collegePromise, moderatorPromise, communityPromise]);

            if (collegeError) throw collegeError;
            if (moderatorError) throw moderatorError;
            if (communityError) throw communityError;
            
            setColleges(collegeData || []);
            setCommunities(communityData || []);
            
            if (moderatorData) {
                const userIds = moderatorData.map(m => m.user_id);
                if (userIds.length > 0) {
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('id', userIds);
                    
                    if (profilesError) throw profilesError;

                    const proUserIds = new Set<string>();
                    if (profilesData && profilesData.length > 0) {
                        const { data: proSubs } = await supabase
                            .from('user_subscriptions')
                            .select('user_id, subscriptions:subscription_id(name)')
                            .in('user_id', userIds)
                            .eq('status', 'active');
                        
                        (proSubs || []).forEach(sub => {
                            if (sub.subscriptions?.name?.toUpperCase() === 'PRO') {
                                proUserIds.add(sub.user_id);
                            }
                        });
                    }

                    const profilesMap = new Map(profilesData.map(p => [p.id, { ...p, has_pro_badge: proUserIds.has(p.id) }]));
                    const moderatorsWithProfiles = moderatorData.map(mod => ({
                        ...mod,
                        profiles: profilesMap.get(mod.user_id) || null
                    }));
                    setModerators((moderatorsWithProfiles as any) || []);
                } else {
                    setModerators([]);
                }
            } else {
                setModerators([]);
            }

            if (collegeData && collegeData.length > 0 && !selectedCollege) {
                setSelectedCollege(collegeData[0].name);
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [selectedCollege]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddModerator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCollege || !userEmail.trim()) {
            setFormError('Please select a college and enter an email.');
            return;
        }
        setIsSubmitting(true);
        setFormError(null);

        const { error: rpcError } = await supabase.rpc('admin_add_college_moderator', {
            p_college_name: selectedCollege,
            p_user_email: userEmail.trim().toLowerCase(),
        });

        if (rpcError) {
            setFormError(rpcError.message);
        } else {
            toast.success('Moderator added successfully!');
            setUserEmail('');
            await fetchData();
        }
        setIsSubmitting(false);
    };

    const handleRemoveModerator = async (moderatorId: number, moderatorName: string) => {
        if (!window.confirm(`Are you sure you want to remove ${moderatorName} as a moderator?`)) return;

        const { error } = await supabase.from('college_moderators').delete().eq('id', moderatorId);

        if (error) {
            toast.error('Failed to remove moderator: ' + error.message);
        } else {
            toast.success('Moderator removed.');
            await fetchData();
        }
    };
    
    const handleEnableHub = async (collegeName: string) => {
        if (!user?.email) {
            toast.error("Could not identify admin user. Please log in again.");
            return;
        }
        setIsCreatingHub(collegeName);
        try {
            const { error: rpcError } = await supabase.rpc('admin_create_community', {
                community_name: collegeName,
                community_description: `The official announcements hub for ${collegeName}.`,
                banner_url: null,
                college: collegeName,
                is_verified: true,
                creator_email: user.email,
            });
            if (rpcError) throw rpcError;
            toast.success(`Official hub for ${collegeName} created!`);
            await fetchData();
        } catch (e: any) {
            toast.error(`Failed to create hub: ${e.message}`);
        } finally {
            setIsCreatingHub(null);
        }
    };

    const modsByCollege = moderators.reduce<Record<string, CollegeModeratorWithProfile[]>>((acc, mod) => {
        if (mod.college_name) {
            if (!acc[mod.college_name]) {
                acc[mod.college_name] = [];
            }
            acc[mod.college_name].push(mod);
        }
        return acc;
    }, {});
    
    const collegesWithHub = new Set(
        communities.filter(c => c.is_verified && colleges.some(col => col.name === c.name)).map(c => c.name)
    );

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">College Moderator Management</h1>
            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Add Moderator</h3>
                    <form onSubmit={handleAddModerator} className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">College</label>
                            <select
                                value={selectedCollege}
                                onChange={(e) => setSelectedCollege(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                            >
                                {colleges.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">User Email</label>
                            <input
                                type="email"
                                value={userEmail}
                                onChange={e => setUserEmail(e.target.value)}
                                placeholder="moderator@example.com"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md"
                                required
                            />
                        </div>
                        {formError && <p className="text-red-500 text-sm">{formError}</p>}
                        <div className="text-right">
                            <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold min-w-[100px]">
                                {isSubmitting ? <Spinner size="sm" /> : 'Add'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Current Moderators</h3>
                    {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
                     error ? <p className="p-4 text-red-500 bg-red-50 rounded-lg">{error}</p> :
                     Object.keys(modsByCollege).length === 0 ? <p className="p-4 bg-white rounded-lg border text-center text-slate-500">No moderators assigned.</p> :
                     <div className="space-y-4">
                         {Object.keys(modsByCollege).map(collegeName => {
                            const hasHub = collegesWithHub.has(collegeName);
                            return (
                                <div key={collegeName} className="bg-white p-4 rounded-lg shadow-sm border">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold">{collegeName}</h4>
                                        {!hasHub && (
                                            <button 
                                                onClick={() => handleEnableHub(collegeName)}
                                                disabled={isCreatingHub === collegeName}
                                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200 disabled:opacity-50 min-w-[80px]"
                                            >
                                                {isCreatingHub === collegeName ? <Spinner size="sm" /> : 'Enable Hub'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y mt-2">
                                        {modsByCollege[collegeName].map(mod => (
                                            <div key={mod.id} className="flex items-center justify-between py-2">
                                                {mod.profiles ? (
                                                    <Link to={`/profile/${mod.user_id}`} target="_blank" className="flex items-center gap-2 hover:underline">
                                                        <img src={mod.profiles.avatar_url || ''} alt={mod.profiles.name || ''} className="w-8 h-8 rounded-full" />
                                                        <div>
                                                            <p className="font-semibold text-sm">{mod.profiles.name}</p>
                                                            <p className="text-xs text-slate-500">{mod.profiles.email}</p>
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    <div className="text-sm text-slate-500">Profile not found for this user.</div>
                                                )}
                                                <button onClick={() => handleRemoveModerator(mod.id, mod.profiles?.name || 'user')} className="text-xs font-semibold text-red-600 hover:text-red-800">
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                         })}
                     </div>
                    }
                </div>
            </div>
        </div>
    );
};

export default AdminModeratorManagementPage;