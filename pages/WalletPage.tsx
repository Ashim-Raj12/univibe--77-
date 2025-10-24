import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { VibeCoinTransaction, Profile, PaymentSettings, Voucher, VoucherWithdrawalRequestWithDetails } from '../types';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import ConfirmationModal from '../components/ConfirmationModal';
import { Link } from 'react-router-dom';
import VerifiedBadge from '../components/VerifiedBadge';
import VibeCoinLogo from '../components/VibeCoinLogo';

// --- Reusable Components ---
const StatCard: React.FC<{ title: string; value: number | undefined; icon: React.ReactNode; color: string; loading: boolean }> = ({ title, value, icon, color, loading }) => (
    <div className="bg-dark-card p-4 rounded-xl flex items-center gap-4 border border-border">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-text-muted font-medium">{title}</p>
            {loading ? <div className="h-6 w-16 bg-slate-200 rounded-md mt-1 shimmer-container"></div> : <p className="text-xl font-bold text-text-heading">{value?.toLocaleString() ?? 0}</p>}
        </div>
    </div>
);

// --- Modals ---
const AddCoinsModal: React.FC<{ onClose: () => void; onPaymentSuccess: () => void; }> = ({ onClose, onPaymentSuccess }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [customAmount, setCustomAmount] = useState(''); // New state for custom coins

    useEffect(() => {
        const fetchSettings = async () => {
            setSettingsLoading(true);
            const { data, error: fetchError } = await supabase
                .from('payment_settings')
                .select('*')
                .eq('id', 1)
                .single();
            if (data) {
                setSettings(data);
            } else {
                console.error("Could not load payment settings:", fetchError);
                setError("Payment gateway is not configured by the admin.");
            }
            setSettingsLoading(false);
        };
        fetchSettings();
    }, []);

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only non-negative integers
        if (/^\d*$/.test(value)) {
            setCustomAmount(value);
        }
    };
    
    const customPrice = customAmount ? parseFloat(customAmount) / 10 : 0;

    const handlePayment = (amount: number, coins: number) => {
        setLoading(true);

        const razorpayKey = settings?.razorpay_key_id;
        if (!razorpayKey || !settings?.is_razorpay_enabled) {
            toast.error("Payments are currently disabled. Please contact support.");
            setLoading(false);
            return;
        }

        const options = {
            key: razorpayKey,
            amount: amount * 100, // Amount in paise
            currency: "INR",
            name: "UniVibe - VibeCoins",
            description: `Top-up ${coins} VibeCoins`,
            handler: async (response: any) => {
                try {
                    const { error } = await supabase.rpc('confirm_payment_and_top_up', {
                        p_amount: coins,
                        p_payment_id: response.razorpay_payment_id,
                        p_metadata: { provider: 'razorpay' }
                    });
                    if (error) throw error;
                    toast.success(`${coins} VibeCoins added successfully!`);
                    onPaymentSuccess();
                } catch (err: any) {
                    toast.error(`Payment confirmation failed: ${err.message}`);
                } finally {
                    onClose();
                }
            },
            prefill: { name: profile?.name, email: profile?.email },
            theme: { color: "#1767DA" },
            modal: {
                ondismiss: () => setLoading(false)
            }
        };

        if (!(window as any).Razorpay) {
            toast.error("Payment gateway could not be loaded. Please check your connection and try again.");
            setLoading(false);
            return;
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any){
            toast.error(`Oops! Something went wrong.\nPayment Failed`);
            console.error("Razorpay payment failed:", response.error);
            setLoading(false);
        });
        rzp.open();
    };
    
    const packages = [
        { coins: 500, price: 50 },
        { coins: 1200, price: 100 },
        { coins: 3000, price: 250 },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-2xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="font-bold text-lg">Add VibeCoins</h2>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    {settingsLoading ? (
                        <div className="flex justify-center"><Spinner /></div>
                    ) : error || !settings?.is_razorpay_enabled ? (
                        <p className="text-center text-red-500">{error || "Payments are currently disabled."}</p>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {packages.map(p => (
                                    <button key={p.coins} onClick={() => handlePayment(p.price, p.coins)} disabled={loading} className="w-full flex justify-between items-center p-4 rounded-lg border hover:bg-dark-card transition-colors disabled:opacity-50">
                                        <div className="text-left">
                                            <span className="font-bold text-lg">{p.coins.toLocaleString()} VibeCoins</span>
                                            {p.coins / 10 > p.price && <span className="text-xs font-semibold text-green-600 block">Save ₹{(p.coins / 10 - p.price).toFixed(2)}!</span>}
                                        </div>
                                        <span className="bg-primary text-white font-semibold px-4 py-2 rounded-lg">₹{p.price}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="relative text-center my-4">
                                <hr className="border-border" />
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-sm text-text-muted">OR</span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-body mb-2 text-center">Buy a custom amount</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={customAmount}
                                        onChange={handleCustomAmountChange}
                                        placeholder="Enter VibeCoins"
                                        className="w-full p-3 border rounded-lg bg-dark-card border-border focus:ring-primary focus:border-primary text-center font-bold text-lg"
                                    />
                                    <button 
                                        onClick={() => handlePayment(customPrice, parseFloat(customAmount))}
                                        disabled={loading || !/^\d+$/.test(customAmount) || customPrice < 50}
                                        className="bg-primary text-white font-semibold px-4 py-3 rounded-lg disabled:opacity-50 whitespace-nowrap"
                                    >
                                        Buy for ₹{customPrice.toFixed(2)}
                                    </button>
                                </div>
                                <p className="text-xs text-text-muted mt-2 text-center">10 VibeCoins = ₹1. Minimum custom purchase is ₹50 (500 coins).</p>
                            </div>
                        </>
                    )}
                    {loading && <div className="flex justify-center pt-2"><Spinner /></div>}
                </div>
            </div>
        </div>
    );
};

const SendCoinsModal: React.FC<{ onClose: () => void; onSendSuccess: () => void; }> = ({ onClose, onSendSuccess }) => {
    const { user, wallet } = useAuth();
    const [recipient, setRecipient] = useState<Profile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!searchTerm.trim() || !user) {
            setSearchResults([]);
            return;
        }
        const handler = setTimeout(async () => {
            const term = `%${searchTerm.trim()}%`;
            const { data } = await supabase.from('profiles')
                .select('*')
                .or(`name.ilike.${term},username.ilike.${term}`)
                .neq('id', user.id)
                .limit(5);
            setSearchResults(data || []);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const sendAmount = parseFloat(amount);
        if (!recipient || isNaN(sendAmount) || sendAmount <= 0) {
            setError("Invalid recipient or amount.");
            return;
        }
        if (wallet && wallet.balance < sendAmount) {
            setError("Insufficient balance.");
            return;
        }
        
        setLoading(true);
        try {
            const { error: rpcError } = await supabase.rpc('transfer_p2p_coins', {
                p_to_user_id: recipient.id,
                p_amount: sendAmount
            });
            if (rpcError) throw rpcError;

            toast.success(`Sent ${sendAmount} coins to ${recipient.name}!`);
            onSendSuccess();
            onClose();
        } catch(err: any) {
            if (err.message && err.message.includes('violates foreign key constraint "vibecoin_transactions_to_user_id_fkey"')) {
                setError(`Transfer failed. The user account for @${recipient.username} might be invalid or no longer active. Please select a different user.`);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-background rounded-2xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="font-bold text-lg">Send VibeCoins</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    {recipient ? (
                        <div className="p-2 bg-dark-card rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src={recipient.avatar_url || `https://avatar.vercel.sh/${recipient.id}.png`} alt={recipient.name || ''} className="w-8 h-8 rounded-full" />
                                <span>{recipient.name} (@{recipient.username})</span>
                            </div>
                            <button type="button" onClick={() => { setRecipient(null); setSearchTerm('') }} className="font-bold text-lg">&times;</button>
                        </div>
                    ) : (
                        <div>
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or username..." className="w-full p-3 border rounded-lg bg-dark-card border-border focus:ring-primary focus:border-primary"/>
                            {searchResults.length > 0 && (
                                <div className="border rounded-b-lg -mt-1 max-h-40 overflow-y-auto">
                                    {searchResults.map(p => <div key={p.id} onClick={() => setRecipient(p)} className="p-2 hover:bg-slate-100 cursor-pointer">{p.name} (@{p.username})</div>)}
                                </div>
                            )}
                        </div>
                    )}
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" min="1" className="w-full p-3 border rounded-lg bg-dark-card border-border focus:ring-primary focus:border-primary"/>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <p className="text-xs text-text-muted">Weekly transfer limits may apply to prevent abuse.</p>
                </div>
                 <div className="p-4 border-t flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="bg-slate-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold min-w-[80px]">
                        {loading ? <Spinner size="sm" /> : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const VoucherCodeModal: React.FC<{ name: string; details: string; onClose: () => void }> = ({ name, details, onClose }) => {
    const [copied, setCopied] = useState(false);
    const copyDetails = () => {
        navigator.clipboard.writeText(details);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const isUrl = details.startsWith('http');

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-2xl w-full max-w-sm text-center p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
                <svg className="mx-auto h-16 w-16 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h2 className="text-xl font-bold mt-4">Redemption Completed!</h2>
                <p className="text-sm text-text-muted mt-2">Here are your details for the <strong>{name}</strong>.</p>
                <div className="my-6 p-4 bg-dark-card border-2 border-dashed border-border rounded-lg">
                    {isUrl ? (
                        <a href={details} target="_blank" rel="noopener noreferrer" className="font-mono text-lg font-bold text-primary tracking-widest break-all hover:underline">{details}</a>
                    ) : (
                         <p className="font-mono text-lg font-bold text-primary tracking-widest">{details}</p>
                    )}
                </div>
                <button onClick={copyDetails} className="w-full bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary/20 transition-colors">
                    {copied ? 'Copied!' : (isUrl ? 'Copy Link' : 'Copy Code')}
                </button>
                <button onClick={onClose} className="mt-4 text-sm font-semibold text-text-muted hover:underline">
                    Close
                </button>
            </div>
        </div>
    );
};

const RedeemView: React.FC<{ onRedeem: (voucher: Voucher) => void, actionLoading: boolean }> = ({ onRedeem, actionLoading }) => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVouchers = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('vouchers')
                .select('*')
                .eq('is_active', true)
                .order('coins_cost', { ascending: true });
            if (data) setVouchers(data);
            if (error) console.error("Could not load vouchers", error);
            setLoading(false);
        };
        fetchVouchers();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }

    if (vouchers.length === 0) {
        return (
            <div className="text-center p-8 bg-slate-50 rounded-lg">
                <p className="text-text-muted">No vouchers are available for redemption at this time. Check back later!</p>
            </div>
        )
    }

    return (
        <div className="animate-fade-in-up">
            <p className="text-sm text-text-muted mb-6">Convert your VibeCoins into gift cards from your favorite brands. An admin will review your request. All redemptions are final.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vouchers.map(voucher => (
                    <div key={voucher.id} className="bg-white border rounded-xl p-5 flex flex-col items-center text-center shadow-soft">
                        <img src={voucher.logo_url || `https://avatar.vercel.sh/${voucher.name}.png`} alt={`${voucher.name} logo`} className="h-16 w-16 object-contain mb-4"/>
                        <h3 className="font-bold text-lg text-text-heading">{voucher.name}</h3>
                        {voucher.value_inr && <p className="text-xl font-bold text-primary my-2">₹{voucher.value_inr}</p>}
                        <div className="flex items-center gap-2 font-semibold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full text-sm">
                            <VibeCoinLogo className="h-4 w-4 text-yellow-500" />
                            <span>{voucher.coins_cost.toLocaleString()}</span>
                        </div>
                        <button 
                            onClick={() => onRedeem(voucher)} 
                            disabled={actionLoading}
                            className="mt-6 w-full bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                            Redeem
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


const TransactionItem: React.FC<{ tx: VibeCoinTransaction; userId: string }> = ({ tx, userId }) => {
    const isCredit = tx.to_user_id === userId && tx.type !== 'task_payment';
    const otherUser = isCredit ? tx.from_profile : tx.to_profile;

    let title = 'Transaction';
    let Icon: React.ReactNode;
    const iconWrapperClasses = "w-10 h-10 rounded-full flex items-center justify-center";

    const iconMap = {
        credit: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>,
        debit: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
        task: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>,
        referral: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>,
        admin: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>,
    };

    switch (tx.type) {
        case 'top_up':
            title = 'Wallet Top-up';
            Icon = <div className={`${iconWrapperClasses} bg-green-100 text-green-600`}>{iconMap.credit}</div>;
            break;
        case 'p2p_transfer':
            title = isCredit ? `Received from ${otherUser?.name}` : `Sent to ${otherUser?.name}`;
            Icon = otherUser ? <img src={otherUser.avatar_url || `https://avatar.vercel.sh/${otherUser.id}.png`} alt={otherUser.name || ''} className="w-10 h-10 rounded-full object-cover" /> : <div className={`${iconWrapperClasses} bg-slate-200`}></div>;
            break;
        case 'task_reward':
            title = `Task Reward`;
            Icon = <div className={`${iconWrapperClasses} bg-blue-100 text-blue-600`}>{iconMap.task}</div>;
            break;
        case 'task_payment':
            title = `Task Payment to ${otherUser?.name}`;
            Icon = <div className={`${iconWrapperClasses} bg-red-100 text-red-600`}>{iconMap.task}</div>;
            break;
        case 'referral_bonus':
            title = `Referral Bonus`;
            Icon = <div className={`${iconWrapperClasses} bg-purple-100 text-purple-600`}>{iconMap.referral}</div>;
            break;
        case 'admin_adjustment':
            title = `Admin Adjustment`;
            Icon = <div className={`${iconWrapperClasses} bg-slate-200 text-slate-600`}>{iconMap.admin}</div>;
            break;
        case 'refund':
            title = `Refund`;
            Icon = <div className={`${iconWrapperClasses} bg-green-100 text-green-600`}>{iconMap.credit}</div>;
            break;
        default:
            title = tx.type.replace(/_/g, ' ');
            Icon = <div className={`${iconWrapperClasses} bg-slate-200`}><VibeCoinLogo className="h-5 w-5"/></div>;
    }

    return (
        <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                {Icon}
                <div>
                    <p className="font-semibold text-text-heading capitalize">{title}</p>
                    <p className="text-xs text-text-muted">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
                </div>
            </div>
            <div className={`font-bold text-lg flex items-center gap-1 ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                <span>{isCredit ? '+' : '-'} {tx.amount.toLocaleString()}</span>
                <VibeCoinLogo className="h-4 w-4 opacity-70"/>
            </div>
        </div>
    );
};


// --- Main Wallet Page ---
const WalletPage = () => {
    const { wallet, user, loading: authLoading, refetchWallet } = useAuth();
    const [transactions, setTransactions] = useState<VibeCoinTransaction[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<VoucherWithdrawalRequestWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddCoinsOpen, setIsAddCoinsOpen] = useState(false);
    const [isSendCoinsOpen, setIsSendCoinsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'redeem'>('history');
    const [historyTab, setHistoryTab] = useState<'general' | 'vouchers'>('general');
    const [error, setError] = useState<string | null>(null);
    
    // Redeem modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Voucher code display state
    const [viewingDetails, setViewingDetails] = useState<{ name: string; details: string } | null>(null);
    
    const referralLink = `${window.location.origin}/#/register?ref=${user?.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        toast.info('Referral link copied to clipboard!');
    };

    const fetchWalletData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const txPromise = supabase.rpc('get_my_transactions');
        const withdrawalPromise = supabase.from('voucher_withdrawal_requests').select('*, vouchers!inner(*), profiles:user_id!inner(*)').eq('user_id', user.id).order('created_at', { ascending: false });

        const [{ data: txData, error: txError }, { data: withdrawalData, error: withdrawalError }] = await Promise.all([txPromise, withdrawalPromise]);

        if (txError) {
            console.error("Error fetching transactions:", txError);
            toast.error("Could not load transaction history.");
        } else if (txData) {
            const txs: VibeCoinTransaction[] = txData;
            const userIds = new Set<string>();
            txs.forEach(tx => {
                if (tx.from_user_id) userIds.add(tx.from_user_id);
                if (tx.to_user_id) userIds.add(tx.to_user_id);
            });

            if (userIds.size > 0) {
                const { data: profilesData } = await supabase.from('profiles').select('*').in('id', Array.from(userIds));
                const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
                const enrichedTxs = txs.map(tx => ({
                    ...tx,
                    from_profile: tx.from_user_id ? profilesMap.get(tx.from_user_id) : undefined,
                    to_profile: tx.to_user_id ? profilesMap.get(tx.to_user_id) : undefined,
                }));
                setTransactions(enrichedTxs);
            } else {
                setTransactions(txs);
            }
        }
        
        if (withdrawalError) {
             console.error("Error fetching withdrawal requests:", withdrawalError);
        } else {
            setWithdrawalRequests((withdrawalData as any) || []);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchWalletData();
        }
    }, [fetchWalletData, user]);
    
    const handleRefresh = useCallback(async () => {
        await Promise.all([refetchWallet(), fetchWalletData()]);
    }, [refetchWallet, fetchWalletData]);

    const handleRedeemClick = (voucher: Voucher) => {
        if (!wallet || wallet.balance < voucher.coins_cost) {
            toast.error("You don't have enough VibeCoins for this voucher.");
            return;
        }
        setSelectedVoucher(voucher);
        setShowConfirmModal(true);
    };

    const handleConfirmRedeem = async () => {
        if (!selectedVoucher || !user) return;
        setActionLoading(true);
        setShowConfirmModal(false);
        setError(null);
        try {
            const { error: rpcError } = await supabase.rpc('request_voucher_withdrawal', {
                p_voucher_id: selectedVoucher.id,
                p_coins_spent: selectedVoucher.coins_cost
            });
            if (rpcError) throw rpcError;

            toast.success("Redemption request submitted! It will be reviewed by an admin.");
            await handleRefresh();

        } catch (err: any) {
            toast.error(err.message || "An error occurred during redemption request.");
            setError(err.message);
        } finally {
            setActionLoading(false);
            setSelectedVoucher(null);
        }
    };


    if (authLoading) {
        return (
            <div className="space-y-8 animate-fade-in-up">
                <div className="h-8 w-48 bg-slate-200 rounded-md shimmer-container"></div>
                <div className="h-4 w-96 bg-slate-200 rounded-md shimmer-container"></div>
                <div className="bg-card p-6 rounded-2xl shadow-soft border h-48 shimmer-container"></div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-dark-card p-4 rounded-xl h-24 border border-border shimmer-container"></div>
                    <div className="bg-dark-card p-4 rounded-xl h-24 border border-border shimmer-container"></div>
                </div>
            </div>
        );
    }
    if (!wallet || !user) {
         return (
            <div className="text-center p-8 bg-red-50 text-red-700 rounded-lg">
                <h2 className="font-bold">Could not load wallet!</h2>
                <p>There was an error loading your VibeCoin wallet. Please try refreshing the page.</p>
            </div>
        );
    }

    const filteredTransactions = transactions.filter(tx => tx.type !== 'voucher_withdrawal');
    const withdrawalStatusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };

    return (
        <>
            <div className="space-y-8 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold">My Wallet</h1>
                    <p className="text-text-muted mt-1">VibeCoin — for peer learning, collaboration, and appreciation only.</p>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-soft" role="alert">
                        <p className="font-bold">An Error Occurred</p>
                        <p>{error}</p>
                    </div>
                )}

                <div className="bg-card p-6 rounded-2xl shadow-soft border border-border">
                    <p className="text-sm font-semibold text-text-muted">AVAILABLE BALANCE</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-5xl font-extrabold text-text-heading">{wallet.balance.toLocaleString()}</span>
                        <span className="font-bold text-yellow-500">VibeCoins</span>
                    </div>
                     {wallet.pending_balance > 0 && (
                        <p className="text-sm text-text-muted mt-2">
                           You have <span className="font-bold text-text-heading">{wallet.pending_balance.toLocaleString()}</span> coins pending for withdrawals or tasks.
                        </p>
                    )}
                    <div className="mt-6 flex flex-wrap gap-4">
                        <button onClick={() => setIsAddCoinsOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold shadow-soft hover:bg-primary-focus">Add Coins</button>
                        <button onClick={() => setIsSendCoinsOpen(true)} className="bg-dark-card text-text-body px-5 py-2.5 rounded-xl font-semibold hover:bg-border">Send Coins</button>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-2xl shadow-soft border border-border">
                    <h2 className="text-xl font-bold text-text-heading mb-3">Share & Earn</h2>
                    <p className="text-text-body mb-4">Invite friends to UniVibe! You and your friend will both receive <span className="font-bold text-yellow-600">100 VibeCoins</span> when they sign up and get verified.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                            type="text" 
                            value={referralLink} 
                            readOnly 
                            className="w-full px-4 py-2 bg-dark-card border border-border rounded-lg font-mono text-sm text-text-muted"
                        />
                        <button 
                            onClick={handleCopy}
                            className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary/20 transition-colors flex-shrink-0"
                        >
                            Copy Link
                        </button>
                    </div>
                </div>

                 <div className="grid md:grid-cols-2 gap-6">
                    <StatCard title="Total Earned" value={wallet.total_earned} color="bg-green-100 text-green-600" icon={<VibeCoinLogo className="h-5 w-5"/>} loading={authLoading} />
                    <StatCard title="Total Spent" value={wallet.total_spent} color="bg-red-100 text-red-600" icon={<VibeCoinLogo className="h-5 w-5"/>} loading={authLoading}/>
                </div>

                <div>
                    <div className="border-b border-border mb-4">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>
                                History
                            </button>
                            <button onClick={() => setActiveTab('redeem')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'redeem' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}>
                                Redeem Coins
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'history' ? (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="border-b border-border">
                                <nav className="-mb-px flex space-x-6" aria-label="History Tabs">
                                    <button
                                        onClick={() => setHistoryTab('general')}
                                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${historyTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}
                                    >
                                        General Transactions
                                    </button>
                                    <button
                                        onClick={() => setHistoryTab('vouchers')}
                                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${historyTab === 'vouchers' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-body'}`}
                                    >
                                        Voucher Withdrawals
                                    </button>
                                </nav>
                            </div>

                            {historyTab === 'general' && (
                                <div className="bg-card rounded-2xl shadow-soft border animate-fade-in-up">
                                    <h3 className="text-lg font-bold p-4">General Transactions</h3>
                                    {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : filteredTransactions.length === 0 ? <p className="p-4 text-center text-sm text-text-muted">No other transactions found.</p> : (
                                        <div className="divide-y divide-border">
                                            {filteredTransactions.map(tx => (
                                                <TransactionItem key={tx.id} tx={tx} userId={user.id} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {historyTab === 'vouchers' && (
                                <div className="bg-card rounded-2xl shadow-soft border animate-fade-in-up">
                                    <h3 className="text-lg font-bold p-4">Voucher Withdrawals</h3>
                                    {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : withdrawalRequests.length === 0 ? <p className="p-4 text-center text-sm text-text-muted">No withdrawal requests yet.</p> : (
                                        <div className="divide-y divide-border">
                                            {withdrawalRequests.map(req => (
                                                <div key={req.id} className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold">{req.vouchers.name}</p>
                                                            <p className="text-xs text-text-muted">{format(new Date(req.created_at), 'PPp')}</p>
                                                            {req.status === 'rejected' && req.admin_notes && <p className="text-xs text-red-600 mt-1">Reason: {req.admin_notes}</p>}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-red-600">- {req.coins_spent}</p>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${withdrawalStatusColors[req.status]}`}>{req.status}</span>
                                                        </div>
                                                    </div>
                                                    {req.status === 'completed' && req.fulfillment_details && (
                                                        <div className="mt-2 text-right">
                                                             <button onClick={() => setViewingDetails({ name: req.vouchers.name, details: req.fulfillment_details! })} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-lg hover:bg-primary/20">View Details</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <RedeemView onRedeem={handleRedeemClick} actionLoading={actionLoading} />
                    )}
                </div>
            </div>

            {isAddCoinsOpen && <AddCoinsModal onClose={() => setIsAddCoinsOpen(false)} onPaymentSuccess={handleRefresh} />}
            {isSendCoinsOpen && <SendCoinsModal onClose={() => setIsSendCoinsOpen(false)} onSendSuccess={handleRefresh} />}
            {showConfirmModal && selectedVoucher && (
                <ConfirmationModal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    onConfirm={handleConfirmRedeem}
                    title="Confirm Redemption Request"
                    message={`Are you sure you want to request a ₹${selectedVoucher.value_inr} ${selectedVoucher.name} for ${selectedVoucher.coins_cost.toLocaleString()} VibeCoins? The coins will be held until an admin processes your request.`}
                    confirmText="Yes, Submit Request"
                    confirmButtonClass="bg-primary hover:bg-primary-focus"
                    isLoading={actionLoading}
                />
            )}
            {viewingDetails && (
                <VoucherCodeModal
                    name={viewingDetails.name}
                    details={viewingDetails.details}
                    onClose={() => setViewingDetails(null)}
                />
            )}
        </>
    );
};

export default WalletPage;