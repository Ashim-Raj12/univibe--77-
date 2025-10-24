import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';

const AdminSiteSettingsPage: React.FC = () => {
    const { settings, loading, refetchSettings } = useSiteSettings();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [websiteLogoFile, setWebsiteLogoFile] = useState<File | null>(null);
    const [websiteLogoPreview, setWebsiteLogoPreview] = useState<string | null>(null);
    const [vibecoinLogoFile, setVibecoinLogoFile] = useState<File | null>(null);
    const [vibecoinLogoPreview, setVibecoinLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (settings) {
            setWebsiteLogoPreview(settings.website_logo_url || null);
            setVibecoinLogoPreview(settings.vibecoin_logo_url || null);
        }
    }, [settings]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'website' | 'vibecoin') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 1MB limit
                setError(`File is too large. Max size is 1MB.`);
                return;
            }
            setError(null);
            const previewUrl = URL.createObjectURL(file);
            if (type === 'website') {
                setWebsiteLogoFile(file);
                setWebsiteLogoPreview(previewUrl);
            } else {
                setVibecoinLogoFile(file);
                setVibecoinLogoPreview(previewUrl);
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        
        try {
            let website_logo_url = settings?.website_logo_url;
            let vibecoin_logo_url = settings?.vibecoin_logo_url;

            if (websiteLogoFile) {
                const filePath = `site/website_logo.${websiteLogoFile.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, websiteLogoFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
                website_logo_url = `${data.publicUrl}?t=${new Date().getTime()}`;
            }

            if (vibecoinLogoFile) {
                const filePath = `site/vibecoin_logo.${vibecoinLogoFile.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, vibecoinLogoFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
                vibecoin_logo_url = `${data.publicUrl}?t=${new Date().getTime()}`;
            }
            
            const updates = {
                ...settings,
                id: 1,
                website_logo_url,
                vibecoin_logo_url,
                updated_at: new Date().toISOString(),
            };

            const { error: upsertError } = await supabase.from('payment_settings').upsert(updates);

            if (upsertError) throw upsertError;

            toast.success('Site settings updated successfully!');
            await refetchSettings();
            setWebsiteLogoFile(null);
            setVibecoinLogoFile(null);

        } catch (err: any) {
            setError(err.message);
            toast.error('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-slate-800">Site Settings</h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Website Logo</h2>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Current Logo</p>
                        <div className="p-4 bg-slate-100 rounded-lg border flex items-center justify-center h-28">
                            {websiteLogoPreview ? <img src={websiteLogoPreview} alt="Website Logo Preview" className="max-h-full max-w-full" /> : <p className="text-slate-500 text-sm">No logo set</p>}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Upload New Logo (SVG, PNG, JPG)</label>
                        <input type="file" onChange={(e) => handleFileChange(e, 'website')} accept="image/svg+xml, image/png, image/jpeg" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary"/>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">VibeCoin Logo</h2>
                 <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Current Logo</p>
                        <div className="p-4 bg-slate-100 rounded-lg border flex items-center justify-center h-28">
                            {vibecoinLogoPreview ? <img src={vibecoinLogoPreview} alt="VibeCoin Logo Preview" className="max-h-full max-w-full" /> : <p className="text-slate-500 text-sm">No logo set</p>}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Upload New Logo (SVG, PNG)</label>
                        <input type="file" onChange={(e) => handleFileChange(e, 'vibecoin')} accept="image/svg+xml, image/png" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary"/>
                    </div>
                </div>
            </div>

             {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} disabled={saving || (!websiteLogoFile && !vibecoinLogoFile)} className="bg-primary text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50">
                    {saving ? <Spinner size="sm" /> : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default AdminSiteSettingsPage;