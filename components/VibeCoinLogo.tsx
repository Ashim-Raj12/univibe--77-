import React from 'react';
import { useSiteSettings } from '../hooks/useSiteSettings';

const DefaultVibeCoinLogo: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V5z" clipRule="evenodd" />
    </svg>
);

interface VibeCoinLogoProps {
    className?: string;
}

const VibeCoinLogo: React.FC<VibeCoinLogoProps> = ({ className = 'h-5 w-5' }) => {
    const { settings } = useSiteSettings();
    const logoUrl = settings?.vibecoin_logo_url;

    if (logoUrl) {
        return <img src={logoUrl} alt="VibeCoin Logo" className={className} />;
    }

    return <DefaultVibeCoinLogo className={className} />;
};

export default VibeCoinLogo;
