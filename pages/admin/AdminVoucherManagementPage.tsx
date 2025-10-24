import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { VibeCoinTransaction, Profile, Voucher } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';
import { toast } from '../../components/Toast';

// --- MODAL FOR ADD/EDIT VOUCHER ---
interface VoucherFormModalProps {
    voucher: Voucher | null;
    onClose: () => void;
    onSuccess: () => void;
}
const VoucherFormModal: React.FC<VoucherFormModalProps> = ({ voucher, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: voucher?.name || '',
        description: voucher?.description || '',
        logo_url: voucher?.logo_url || '',
        coins_cost: voucher?.coins_cost || '',
        value_inr: voucher?.value_inr || '',
        stock: voucher?.stock ?? '',
        is_active: voucher?.is_active ?? true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const upsertData = {
                ...formData,
                coins_cost: Number(formData.coins_cost),
                value_inr: formData.value_inr ? Number(formData.value_inr) : null,
                stock: formData.stock === '' ? null : Number(formData.stock),
            };
            if (voucher) {
                const { error } = await supabase.from('vouchers').update(upsertData).eq('id', voucher.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('vouchers').insert(upsertData);
                if (error) throw error;
            }
            toast.success(`Voucher ${voucher ? 'updated' : 'created'} successfully!`);
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="p-4 border-b font-bold">{voucher ? 'Edit' : 'Add'} Voucher</h3>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Name (e.g., Amazon Gift Card)" required />
                    <input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description (e.g., ₹100 Gift Card)" />
                    <input value={formData.logo_url || ''} onChange={e => setFormData({...formData, logo_url: e.target.value})} placeholder="Logo URL" />
                    <input type="number" value={formData.coins_cost} onChange={e => setFormData({...formData, coins_cost: e.target.value})} placeholder="Cost in VibeCoins" required />
                    <input type="number" value={formData.value_inr || ''} onChange={e => setFormData({...formData, value_inr: e.target.value})} placeholder="Value in INR (e.g., 100)" />
                    <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} placeholder="Stock (leave blank for infinite)" />
                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} /> Active</label>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit" disabled={loading}>{loading ? <Spinner size="sm"/> : 'Save'}</button>
                </div>
            </form>
        </div>
    );
};


interface RedemptionTransaction {
    id: number;
    amount: number;
    metadata: { name?: string; value?: number; code?: string } | null;
    created_at: string;
    profile: Profile;
}

const AdminVoucherManagementPage: React.FC = () => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [transactions, setTransactions] = useState<RedemptionTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const vouchersPromise = supabase.from('vouchers').select('*').order('created_at', { ascending: false });
            const redemptionsPromise = supabase.rpc('get_voucher_redemptions');

            const [{ data: vouchersData, error: vouchersError }, { data: redemptionsData, error: redemptionsError }] = await Promise.all([vouchersPromise, redemptionsPromise]);
            
            if (vouchersError) throw vouchersError;
            if (redemptionsError) throw redemptionsError;
            
            setVouchers(vouchersData || []);
            setTransactions((redemptionsData as any) || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (voucher: Voucher | null) => {
        setEditingVoucher(voucher);
        setIsModalOpen(true);
    };

    const handleDelete = async (voucherId: number) => {
        if (!window.confirm("Are you sure? This may affect users trying to redeem it.")) return;
        const { error } = await supabase.from('vouchers').delete().eq('id', voucherId);
        if (error) toast.error(error.message);
        else fetchData();
    };

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-slate-800">Voucher Management</h1>
            
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Available Vouchers</h2>
                    <button onClick={() => handleOpenModal(null)} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm">Add Voucher</button>
                </div>
                 <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Cost</th>
                                <th className="px-4 py-2">Value (INR)</th>
                                <th className="px-4 py-2">Stock</th>
                                <th className="px-4 py-2">Active</th>
                                <th className="px-4 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vouchers.map(v => (
                                <tr key={v.id}>
                                    <td className="p-4 font-semibold">{v.name}</td>
                                    <td className="p-4">{v.coins_cost}</td>
                                    <td className="p-4">{v.value_inr || 'N/A'}</td>
                                    <td className="p-4">{v.stock ?? '∞'}</td>
                                    <td className="p-4">{v.is_active ? 'Yes' : 'No'}</td>
                                    <td className="p-4 space-x-2">
                                        <button onClick={() => handleOpenModal(v)}>Edit</button>
                                        <button onClick={() => handleDelete(v.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Redemption History</h2>
                 <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
                    ) : error ? (
                        <p className="text-center text-red-500 p-8">{error}</p>
                    ) : transactions.length === 0 ? (
                        <p className="text-center text-gray-500 p-10">No vouchers have been redeemed yet.</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Voucher</th>
                                    <th className="px-6 py-3">Cost (Coins)</th>
                                    <th className="px-6 py-3">Voucher Code</th>
                                    <th className="px-6 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map(tx => {
                                    const metadata = tx.metadata;
                                    return (
                                        <tr key={tx.id}>
                                            <td className="px-6 py-4 font-medium">{tx.profile?.name || 'Unknown User'}</td>
                                            <td className="px-6 py-4">{metadata?.name || 'N/A'} (₹{metadata?.value || 'N/A'})</td>
                                            <td className="px-6 py-4">{tx.amount}</td>
                                            <td className="px-6 py-4 font-mono text-primary">{metadata?.code || 'N/A'}</td>
                                            <td className="px-6 py-4 text-slate-500">{format(new Date(tx.created_at), 'PPp')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {isModalOpen && <VoucherFormModal voucher={editingVoucher} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />}
        </div>
    );
};

export default AdminVoucherManagementPage;