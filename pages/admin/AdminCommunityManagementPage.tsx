import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Community, College } from '../../types';
import Spinner from '../../components/Spinner';
import AdminCreateCommunityForm from '../../components/AdminCreateCommunityForm';
import { Link } from 'react-router-dom';
import VerifyCommunityModal from '../../components/VerifyCommunityModal';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/Toast';

const AdminCommunityManagementPage: React.FC = () => {
    const { user } = useAuth();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [verifyingCommunity, setVerifyingCommunity] = useState<Community | null>(null);
    const [creatingOfficialCommunity, setCreatingOfficialCommunity] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const communitiesPromise = supabase
                .from('communities')
                .select('*')
                .order('created_at', { ascending: false });
            
            const collegesPromise = supabase
                .from('colleges')
                .select('*')
                .order('name', { ascending: true });

            const [{ data: communitiesData, error: communitiesError }, { data: collegesData, error: collegesError }] = await Promise.all([communitiesPromise, collegesPromise]);

            if (communitiesError) throw communitiesError;
            if (collegesError) throw collegesError;
            
            setCommunities(communitiesData || []);
            setColleges(collegesData || []);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (communityId: number, communityName: string) => {
        if (!window.confirm(`Are you sure you want to delete the community "${communityName}"? This action is permanent and will delete all associated posts.`)) return;

        const { error } = await supabase.rpc('admin_delete_community', { community_id_to_delete: communityId });

        if (error) {
            alert(`Failed to delete community: ${error.message}`);
        } else {
            fetchData();
        }
    };
    
    const handleVerifyClick = (community: Community) => {
        setVerifyingCommunity(community);
        setIsVerifyModalOpen(true);
    };

    const handleCreateOfficialCommunity = async (collegeName: string) => {
        if (!user?.email) {
            toast.error("Could not identify admin user. Please log in again.");
            return;
        }
        setCreatingOfficialCommunity(collegeName);
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
            toast.success(`Official community for ${collegeName} created!`);
            await fetchData();
        } catch (e: any) {
            toast.error(`Failed to create community: ${e.message}`);
        } finally {
            setCreatingOfficialCommunity(null);
        }
    };

    const verifiedCommunityNames = useMemo(() => new Set(communities.filter(c => c.is_verified).map(c => c.name)), [communities]);
    const collegesWithoutOfficialCommunity = useMemo(() => colleges.filter(c => !verifiedCommunityNames.has(c.name)), [colleges, verifiedCommunityNames]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Community Management</h1>
            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Create New Community</h3>
                    <AdminCreateCommunityForm onSuccess={fetchData} />
                </div>
                <div className="md:col-span-2 space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Official College Hubs</h3>
                        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
                            <p className="text-sm text-slate-600">Create verified communities for colleges that don't have an official announcements hub yet. This enables the 'Announcements' tab in the College Hub for that college.</p>
                            {loading ? <div className="flex justify-center py-4"><Spinner /></div> : 
                             collegesWithoutOfficialCommunity.length === 0 ? <p className="text-sm text-center text-green-600 font-semibold py-4">All colleges have an official hub!</p> :
                             <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {collegesWithoutOfficialCommunity.map(college => (
                                    <div key={college.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                                        <span className="font-semibold text-sm">{college.name}</span>
                                        <button onClick={() => handleCreateOfficialCommunity(college.name)} disabled={creatingOfficialCommunity === college.name} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200 disabled:opacity-50 min-w-[80px]">
                                            {creatingOfficialCommunity === college.name ? <Spinner size="sm" /> : 'Create Hub'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            }
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Existing Communities</h3>
                        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                            {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
                             error ? <p className="text-center text-red-500 p-8">{error}</p> :
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">College</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {communities.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-4 font-medium"><Link to={`/community/${c.id}`} className="hover:underline">{c.name}</Link></td>
                                            <td className="px-6 py-4">{c.college}</td>
                                            <td className="px-6 py-4">
                                                {c.is_verified 
                                                    ? <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Verified</span> 
                                                    : <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Not Verified</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {!c.is_verified && (
                                                    <button
                                                        onClick={() => handleVerifyClick(c)}
                                                        className="px-3 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200"
                                                    >
                                                        Verify
                                                    </button>
                                                )}
                                                 <button
                                                    onClick={() => handleDelete(c.id, c.name)}
                                                    className="px-3 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            }
                        </div>
                    </div>
                </div>
            </div>
            {isVerifyModalOpen && verifyingCommunity && (
                <VerifyCommunityModal
                    community={verifyingCommunity}
                    onClose={() => setIsVerifyModalOpen(false)}
                    onSuccess={() => {
                        setIsVerifyModalOpen(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default AdminCommunityManagementPage;
