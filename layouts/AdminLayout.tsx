

import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';

const AdminLayout: React.FC = () => {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const adminEmails = ['sumitkumar050921@gmail.com', 'admin.univibe@example.com'];

    React.useEffect(() => {
        if (!loading && (!user?.email || !adminEmails.includes(user.email))) {
            navigate('/home', { replace: true });
        }
    }, [loading, user, navigate, adminEmails]);

    if (loading || !user?.email || !adminEmails.includes(user.email)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Spinner size="lg" />
            </div>
        );
    }

    const handleSignOut = async () => {
        setIsMobileMenuOpen(false);
        await signOut();
        navigate('/login', { replace: true });
    };

    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100'
        }`;
    
    const NavSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div>
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">{title}</h3>
            <div className="space-y-1">{children}</div>
        </div>
    );

    const renderNavLinks = () => (
        <nav className="flex-grow space-y-1">
             <NavLink to="/admin/dashboard" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</NavLink>
             
             <NavSection title="User Management">
                <NavLink to="/admin/users" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>User Management</NavLink>
                <NavLink to="/admin/verification" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Student Verification</NavLink>
                <NavLink to="/admin/parent-verification" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Parent Verification</NavLink>
                 <NavLink to="/admin/tour-applications" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Tour Applications</NavLink>
                <NavLink to="/admin/moderators" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Moderator Management</NavLink>
             </NavSection>

             <NavSection title="Content & Moderation">
                <NavLink to="/admin/posts" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Post Moderation</NavLink>
                <NavLink to="/admin/communities" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Communities</NavLink>
                <NavLink to="/admin/events" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Event Management</NavLink>
                <NavLink to="/admin/reports" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Reports</NavLink>
                <NavLink to="/admin/feedback" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Feedback</NavLink>
             </NavSection>
             
              <NavSection title="Monetization">
                <NavLink to="/admin/subscriptions" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Subscriptions</NavLink>
                <NavLink to="/admin/subscription-review" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Subscription Review</NavLink>
                <NavLink to="/admin/payment-settings" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Payment Settings</NavLink>
                <NavLink to="/admin/vibecollab-moderation" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>VibeCollab</NavLink>
                <NavLink to="/admin/vouchers" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Voucher Management</NavLink>
                <NavLink to="/admin/voucher-requests" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Voucher Requests</NavLink>
             </NavSection>

             <NavSection title="Site Settings">
                <NavLink to="/admin/colleges" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>College Management</NavLink>
                <NavLink to="/admin/team" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Team Management</NavLink>
                <NavLink to="/admin/app-management" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>App Management</NavLink>
                <NavLink to="/admin/terms" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Terms & Conditions</NavLink>
                <NavLink to="/admin/site-settings" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>Site Settings</NavLink>
             </NavSection>
        </nav>
    );
    
    const icons = {
        logout: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
        back: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>,
    };

    return (
        <div className="min-h-screen bg-slate-100 md:flex">
            <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
                <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600" title="Open menu">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </header>
            
            <aside className={`fixed inset-0 z-30 bg-black/40 md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} onClick={() => setIsMobileMenuOpen(false)}></aside>

            <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-40 flex flex-col p-4`}>
                <h1 className="text-xl font-bold text-slate-800 px-3 py-2 mb-4">Admin Panel</h1>
                {renderNavLinks()}
                <div className="mt-auto space-y-2 pt-4 border-t">
                    <NavLink to="/home" className={navLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>
                        {icons.back}
                        Back to App
                    </NavLink>
                     <button onClick={handleSignOut} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-red-600 hover:bg-red-100">
                         {icons.logout}
                        Sign Out
                    </button>
                </div>
            </aside>
            <main className="md:ml-64 flex-1 p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;