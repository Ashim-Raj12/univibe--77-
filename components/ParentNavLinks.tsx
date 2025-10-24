

import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserSubscriptionWithPlan, Profile } from '../types';

interface ParentNavLinksProps {
    isMobile: boolean;
    navLinkClasses: (props: { isActive: boolean }) => string;
    closeMobileMenu: () => void;
    subscription: UserSubscriptionWithPlan | null;
    profile: Profile | null;
    onSignOut: () => void;
}

const ParentNavLinks: React.FC<ParentNavLinksProps> = ({
    isMobile,
    navLinkClasses,
    closeMobileMenu,
    subscription,
    profile,
    onSignOut
}) => {
    const idSuffix = isMobile ? '-mobile' : '-desktop';
    const isPro = subscription?.status === 'active' && subscription.subscriptions.name === 'PRO';

    return (
        <nav className={`items-start gap-1 ${isMobile ? 'flex flex-col w-full' : 'flex flex-col'}`}>
            <NavLink to="/common-room" id={`tour-common-room${idSuffix}`} className={navLinkClasses} onClick={closeMobileMenu}>Common Room</NavLink>
            <NavLink to="/suggestions" className={navLinkClasses} onClick={closeMobileMenu}>Find Parents</NavLink>
            <NavLink to="/global-events" className={navLinkClasses} onClick={closeMobileMenu}>
                 <span className="flex items-center gap-2">
                    Global Events
                    {!isPro && (
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">PRO</span>
                    )}
                </span>
            </NavLink>
            
            {isPro && (
                <>
                    <NavLink to="/live-academy" className={navLinkClasses} onClick={closeMobileMenu}>
                       ✨ Live Academy
                    </NavLink>
                    <NavLink to="/campus-tour" className={navLinkClasses} onClick={closeMobileMenu}>
                        <span className="flex items-center gap-2">
                           🗺️ Campus Tour
                        </span>
                    </NavLink>
                </>
            )}

            <hr className="my-3 border-slate-200/60" />
            <NavLink to="/chat" id={`tour-messages${idSuffix}`} className={navLinkClasses} onClick={closeMobileMenu}>
                Messages
            </NavLink>
            <NavLink to="/subscriptions" className={navLinkClasses} onClick={closeMobileMenu}>
                {subscription ? 'Manage Subscription' : '✨ Go Pro'}
            </NavLink>
            <NavLink to="/about" className={navLinkClasses} onClick={closeMobileMenu}>About Us</NavLink>
            <NavLink to="/download-app" className={navLinkClasses} onClick={closeMobileMenu}>Download App</NavLink>
            <NavLink to="/feedback" id={`tour-feedback${idSuffix}`} className={navLinkClasses} onClick={closeMobileMenu}>Feedback</NavLink>

            <hr className="my-3 border-slate-200/60" />

            <div className="bg-white rounded-lg p-1 border border-slate-200/80 w-full">
                {profile && (
                    <NavLink to={`/profile/${profile.id}`} className={navLinkClasses} onClick={closeMobileMenu}>My Profile</NavLink>
                )}
                 <button onClick={() => { closeMobileMenu(); onSignOut(); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-base font-semibold transition-colors text-red-600 hover:bg-red-50">Sign Out</button>
            </div>
        </nav>
    );
};

export default ParentNavLinks;