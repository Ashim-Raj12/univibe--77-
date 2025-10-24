import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import Spinner from '../../components/Spinner';
import { Subscription } from '../../types';
import { format } from 'date-fns';

interface SubscriptionFormModalProps {
    subscription: Subscription | null;
    onClose: () => void;
    onSuccess: () => void;
    targetAudienceForNewPlan?: 'student' | 'parent' | 'faculty';
}

const SubscriptionFormModal: React.FC<SubscriptionFormModalProps> = ({ subscription, onClose, onSuccess, targetAudienceForNewPlan }) => {
    const [name, setName] = useState(subscription?.name || '');
    const [description, setDescription] = useState(subscription?.description || '');
    const [price, setPrice] = useState(subscription?.price || '');
    const [features, setFeatures] = useState(subscription?.features?.join('\n') || '');
    const [targetAudience] = useState<'student' | 'parent' | 'faculty'>(subscription?.target_audience || targetAudienceForNewPlan || 'student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const upsertData = {
                name,
                description,
                price: Number(price),
                features: features.split('\n').map(f => f.trim()).filter(Boolean),
                target_audience: targetAudience,
            };

            if (subscription) {
                const { error } = await supabase.from('subscriptions').update(upsertData).eq('id', subscription.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('subscriptions').insert(upsertData);
                if (error) throw error;
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">{subscription ? 'Edit' : 'Create'} Subscription Plan</h2>
                </div>
                <form id="subscription-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium mb-1">Target Audience</label>
                        <input type="text" value={targetAudience.charAt(0).toUpperCase() + targetAudience.slice(1)} className={`${inputClasses} bg-slate-200 cursor-not-allowed`} readOnly />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Plan Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Price (per 60 days)</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className={inputClasses} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                        <textarea value={features} onChange={e => setFeatures(e.target.value)} className={inputClasses} rows={5} required />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </form>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="bg-slate-100 px-4 py-2 rounded-lg font-semibold">Cancel</button>
                    <button type="submit" form="subscription-form" disabled={loading} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold min-w-[80px]">
                        {loading ? <Spinner size="sm"/> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminSubscriptionsPage: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<Subscription | null>(null);
    const [activeTab, setActiveTab] = useState<'student' | 'parent' | 'faculty'>('student');

    const fetchSubscriptions = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .order('price', { ascending: true });
        
        if (error) setError(error.message);
        else setSubscriptions(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    const handleOpenModal = (sub: Subscription | null = null) => {
        setEditingSub(sub);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        setEditingSub(null);
        fetchSubscriptions();
    };
    
    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this subscription plan?")) return;
        
        const { error } = await supabase.from('subscriptions').delete().eq('id', id);
        if(error) {
            alert("Error deleting plan: " + error.message)
        } else {
            fetchSubscriptions();
        }
    }
    
    const filteredSubscriptions = subscriptions.filter(s => s.target_audience === activeTab);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Manage Subscriptions</h1>
                <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold">
                    Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Plan
                </button>
            </div>
            
             <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-slate-200 p-1">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                            activeTab === 'student' ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'
                        }`}
                    >
                        Student Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('parent')}
                        className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                            activeTab === 'parent' ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'
                        }`}
                    >
                        Parent Plans
                    </button>
                     <button
                        onClick={() => setActiveTab('faculty')}
                        className={`w-full rounded-md py-2 text-sm font-medium transition-colors focus:outline-none ${
                            activeTab === 'faculty' ? 'bg-white text-primary shadow' : 'text-slate-600 hover:bg-white/50'
                        }`}
                    >
                        Faculty Plans
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                {loading ? <div className="p-8 flex justify-center"><Spinner size="lg" /></div> :
                 error ? <p className="p-8 text-center text-red-500">{error}</p> :
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Plan</th>
                            <th className="px-6 py-3">Price</th>
                            <th className="px-6 py-3">Features</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredSubscriptions.map(sub => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4 font-medium">
                                    {sub.name}
                                </td>
                                <td className="px-6 py-4">₹{sub.price}/60 days</td>
                                <td className="px-6 py-4 text-slate-600">{sub.features.join(', ')}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleOpenModal(sub)} className="font-semibold text-primary hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(sub.id)} className="font-semibold text-red-600 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                }
            </div>

            {isModalOpen && <SubscriptionFormModal subscription={editingSub} onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} targetAudienceForNewPlan={activeTab} />}
        </div>
    );
};

export default AdminSubscriptionsPage;