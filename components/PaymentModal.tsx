import React, { useState } from 'react';
import { Subscription, PaymentSettings } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface PaymentModalProps {
    isOpen: boolean;
    plan: Subscription | null;
    settings: PaymentSettings | null;
    onClose: () => void;
    onConfirm: (planId: number, paymentId: string) => void;
    isConfirming: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, plan, settings, onClose, onConfirm, isConfirming }) => {
    const { profile } = useAuth();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'upi' | 'razorpay' | null>(null);
    const [paymentId, setPaymentId] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            // Reset state on open
            setPaymentId('');
            // Set default tab based on what's enabled
            if (settings?.is_razorpay_enabled) {
                setActiveTab('razorpay');
            } else if (settings?.is_upi_enabled) {
                setActiveTab('upi');
            } else {
                setActiveTab(null);
            }
        }
    }, [isOpen, settings]);

    if (!isOpen || !plan) return null;

    const upiId = settings?.upi_id || 'univibe@superbank';
    const qrCodeUrl = settings?.upi_qr_code_url;
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(upiId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleRazorpayPayment = () => {
        if (!settings?.razorpay_key_id || !profile) {
            alert('Razorpay is not configured correctly. Please contact support.');
            return;
        }

        const options = {
            key: settings.razorpay_key_id,
            amount: plan.price * 100, // Amount in paise
            currency: "INR",
            name: "UniVibe",
            description: `Subscription: ${plan.name}`,
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563EB'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22V20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4V2Z' /%3E%3Cpath d='M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17V15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9V7Z' /%3E%3C/svg%3E",
            handler: function (response: any) {
                onConfirm(plan.id, response.razorpay_payment_id);
            },
            prefill: {
                name: profile.name,
                email: profile.email,
            },
            notes: {
                plan_id: plan.id,
                user_id: profile.id,
            },
            theme: {
                color: "#2563EB"
            },
            modal: {
                ondismiss: function() {
                    console.log('Razorpay checkout form closed');
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    };
    
    const TabButton: React.FC<{ tabName: 'upi' | 'razorpay'; children: React.ReactNode }> = ({ tabName, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === tabName ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-body'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-2xl shadow-xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-text-heading">Complete Payment</h2>
                    <p className="text-text-body mt-2">You're subscribing to <strong>{plan.name}</strong> for <strong>₹{plan.price}/60 days</strong>.</p>
                </div>
                
                {(settings?.is_upi_enabled && settings?.is_razorpay_enabled) && (
                    <div className="flex border-b border-slate-200 mx-6">
                        <TabButton tabName="razorpay">Card, UPI & More</TabButton>
                        <TabButton tabName="upi">Scan QR Code</TabButton>
                    </div>
                )}

                <div className="p-6">
                    {activeTab === 'upi' && settings?.is_upi_enabled && (
                        <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDuration: '0.3s'}}>
                            {qrCodeUrl ? (
                                <div className="bg-white p-4 rounded-lg border shadow-sm">
                                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48" />
                                </div>
                            ) : <p className="text-sm text-text-muted">QR code not available.</p>}
                            
                            <p className="mt-4 font-semibold text-text-body">Or pay to UPI ID:</p>
                            <div className="mt-2 flex items-center gap-2 p-2 bg-slate-100 rounded-lg border">
                                <span className="font-mono text-primary">{upiId}</span>
                                <button onClick={copyToClipboard} className="text-sm font-semibold text-primary hover:underline">
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                             <div className="w-full mt-4">
                                <label className="block text-sm font-medium text-text-body mb-2 text-center">Transaction ID</label>
                                <input 
                                    type="text" 
                                    value={paymentId} 
                                    onChange={(e) => setPaymentId(e.target.value)} 
                                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Enter your UPI transaction ID"
                                    required
                                />
                            </div>
                             <p className="text-xs text-text-muted mt-4">After payment, enter the transaction ID and click confirm.</p>
                             <button 
                                onClick={() => onConfirm(plan.id, paymentId)} 
                                disabled={isConfirming || !paymentId.trim()}
                                className="mt-4 w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center font-semibold"
                            >
                                {isConfirming ? <Spinner size="sm" /> : 'Confirm Payment'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'razorpay' && settings?.is_razorpay_enabled && (
                        <div className="text-center animate-fade-in-up" style={{ animationDuration: '0.3s'}}>
                            <p className="text-text-body mb-6">Pay securely with Razorpay. Supports Credit/Debit Cards, Netbanking, UPI, and Wallets.</p>
                            <button
                                onClick={handleRazorpayPayment}
                                disabled={isConfirming}
                                className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center font-semibold"
                            >
                                {isConfirming ? <Spinner size="sm" /> : `Pay ₹${plan.price} Securely`}
                            </button>
                        </div>
                    )}
                    
                    {!settings?.is_upi_enabled && !settings?.is_razorpay_enabled && (
                        <div className="text-center text-text-muted p-4">
                            No payment methods are currently configured. Please contact support.
                        </div>
                    )}

                </div>
                 <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end">
                    <button type="button" onClick={onClose} className="bg-slate-200 text-text-body px-6 py-2 rounded-lg hover:bg-slate-300 transition font-semibold">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;