import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import Spinner from '../../components/Spinner';
import { toast } from '../../components/Toast';

const AdminTermsPage: React.FC = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTerms = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('terms_and_conditions')
            .select('content')
            .eq('id', 1)
            .single();
        
        if (data) {
            setContent(data.content || '');
        } else if (error && error.code !== 'PGRST116') { // Ignore if table is empty
            setError(error.message);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTerms();
    }, [fetchTerms]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const { error: upsertError } = await supabase
                .from('terms_and_conditions')
                .upsert({ id: 1, content, updated_at: new Date().toISOString() });

            if (upsertError) throw upsertError;
            
            toast.success('Terms & Conditions updated successfully!');
        } catch (err: any) {
            setError('Failed to save: ' + err.message);
            toast.error('Failed to save terms.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Terms & Conditions</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Edit Content</h2>
                {loading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> :
                 error ? <p className="text-center text-red-500 p-4">{error}</p> :
                 <>
                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full h-96 p-3 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono"
                        placeholder="Write your terms and conditions here. Basic HTML like <p>, <ul>, <strong> is supported."
                    />
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold"
                        >
                            {saving ? <Spinner size="sm" /> : 'Save Changes'}
                        </button>
                    </div>
                </>
                }
            </div>
        </div>
    );
};

export default AdminTermsPage;
