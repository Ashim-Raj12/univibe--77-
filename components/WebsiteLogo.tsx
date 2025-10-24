import React from 'react';
import { useSiteSettings } from '../hooks/useSiteSettings';

const DefaultLogo: React.FC<{ size?: string }> = ({ size = 'h-8 w-8' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-primary ${size}`}>
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 12C22 9.24 19.76 7 17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 17C19.76 17 22 14.76 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

interface WebsiteLogoProps {
    size?: string;
}

const WebsiteLogo: React.FC<WebsiteLogoProps> = ({ size = 'h-8 w-8' }) => {
    const { settings } = useSiteSettings();
    const logoUrl = settings?.website_logo_url;

    if (logoUrl) {
        return <img src={logoUrl} alt="UniVibe Logo" className={size} />;
    }

    return <DefaultLogo size={size} />;
};

export default WebsiteLogo;
