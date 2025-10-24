import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { PaymentSettings } from '../../types';
import Spinner from '../../components/Spinner';

const AdminPaymentSettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<Partial<PaymentSettings>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('payment_settings')
                .select('*')
                .eq('id', 1)
                .single();
            
            if (data) {
                setSettings(data);
                setQrPreview(data.upi_qr_code_url);
            } else if (error && error.code !== 'PGRST116') { // Ignore 'range not satisfiable' error for no rows
                setError(error.message);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setQrFile(file);
            setQrPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        let qrCodeUrl = settings.upi_qr_code_url;

        try {
            // Upload new QR code if it exists
            if (qrFile) {
                // Using 'banners' as a general public bucket
                const filePath = `payment/upi_qr_code_${Date.now()}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('banners')
                    .upload(filePath, qrFile, {
                        upsert: true,
                    });
                
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(data.path);
                qrCodeUrl = publicUrl;
            }

            const updates = {
                ...settings,
                id: 1, // Always upsert the single settings row
                upi_qr_code_url: qrCodeUrl,
                updated_at: new Date().toISOString(),
            };

            const { error: upsertError } = await supabase
                .from('payment_settings')
                .upsert(updates);
            
            if (upsertError) throw upsertError;
            
            setSuccess('Settings saved successfully!');
            setTimeout(() => setSuccess(null), 3000);

        } catch (err: any) {
            setError('Failed to save settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };
    
    const inputClasses = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Payment Settings</h1>
            <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
                {error && <div className="p-3 bg-red-100 text-red-700 font-semibold text-sm rounded-lg">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 font-semibold text-sm rounded-lg">{success}</div>}

                {/* UPI/QR Settings */}
                <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-700">UPI / QR Code Payments</h2>
                         <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={settings.is_upi_enabled ?? false} onChange={e => setSettings({...settings, is_upi_enabled: e.target.checked})}/>
                                <div className="block bg-slate-300 w-11 h-6 rounded-full"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                            </div>
                            <div className="ml-3 text-sm font-medium">Enable</div>
                        </label>
                    </div>
                    <div className={`mt-4 space-y-4 transition-opacity ${settings.is_upi_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">UPI ID</label>
                            <input type="text" value={settings.upi_id || ''} onChange={e => setSettings({...settings, upi_id: e.target.value})} className={inputClasses} placeholder="your-upi@bank"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">UPI QR Code</label>
                            {qrPreview && <img src={qrPreview} alt="QR Code Preview" className="w-32 h-32 rounded-md border p-1 bg-white mb-2"/>}
                            <input type="file" onChange={handleFileChange} accept="image/*" className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-primary"/>
                        </div>
                    </div>
                </div>

                {/* Razorpay Settings */}
                <div className="p-4 border rounded-lg">
                     <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-700">Razorpay Payments</h2>
                         <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input type="checkbox" className="sr-only" checked={settings.is_razorpay_enabled ?? false} onChange={e => setSettings({...settings, is_razorpay_enabled: e.target.checked})}/>
                                <div className="block bg-slate-300 w-11 h-6 rounded-full"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                            </div>
                            <div className="ml-3 text-sm font-medium">Enable</div>
                        </label>
                    </div>
                    <div className={`mt-4 space-y-4 transition-opacity ${settings.is_razorpay_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Razorpay Key ID</label>
                            <input type="text" value={settings.razorpay_key_id || ''} onChange={e => setSettings({...settings, razorpay_key_id: e.target.value})} className={inputClasses} placeholder="rzp_test_..."/>
                            <p className="text-xs text-slate-500 mt-1">
                                Note: The Key Secret must be stored securely on a backend server (e.g., Supabase Edge Function) and should not be entered here.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold">
                        {saving ? <Spinner size="sm" /> : 'Save Settings'}
                    </button>
                </div>
            </form>
            <style>{`
                input[type="checkbox"]:checked ~ .dot {
                    transform: translateX(100%);
                }
                input[type="checkbox"]:checked ~ .block {
                    background-color: rgb(var(--color-primary));
                }
            `}</style>
        </div>
    );
};

export default AdminPaymentSettingsPage;