import { useContext } from 'react';
import { SiteSettingsContext } from '../contexts/SiteSettingsContext';

export const useSiteSettings = () => {
    const context = useContext(SiteSettingsContext);
    if (context === undefined) {
        throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
    }
    return context;
};
