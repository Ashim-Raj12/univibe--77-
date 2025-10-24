import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PaymentSettings as SiteSettings } from '../types';
import { supabase } from '../services/supabase';

interface SiteSettingsContextType {
    settings: SiteSettings | null;
    loading: boolean;
    refetchSettings: () => Promise<void>;
}

export const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('payment_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore "range not satisfiable" for empty table
            console.error("Error fetching site settings:", error);
        } else {
            setSettings(data as SiteSettings | null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();

        const channel = supabase
            .channel('public:payment_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_settings', filter: 'id=eq.1' }, () => {
                fetchSettings();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchSettings]);

    const value = useMemo(() => ({
        settings,
        loading,
        refetchSettings: fetchSettings,
    }), [settings, loading, fetchSettings]);

    return (
        <SiteSettingsContext.Provider value={value}>
            {children}
        </SiteSettingsContext.Provider>
    );
};