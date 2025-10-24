import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import UserCardSkeleton from '../components/UserCardSkeleton';

const LiveAcademyPage: React.FC = () => {
    const { subscription, loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    const hasProAccess = subscription?.status === 'active' && subscription.subscriptions.name?.toUpperCase() === 'PRO';

    if (!hasProAccess) {
        return (
            <div className="text-center p-8 bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-text-heading">Unlock Live Academy</h1>
                <p className="mt-4 max-w-xl mx-auto text-lg text-text-body">
                    Upgrade to a PRO subscription to connect with experienced students for live guidance, mock interviews, and academic tours.
                </p>
                <Link to="/subscriptions" className="mt-8 inline-block bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-focus transition-transform hover:scale-105 transform font-semibold shadow-soft hover:shadow-soft-md active:scale-100">
                    ✨ Go Pro
                </Link>
            </div>
        );
    }
    
    // Placeholder for when user has a PRO subscription
    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-text-heading">Live Academy</h1>
                <p className="text-text-body mt-2">Connect with top students for guidance and mentorship.</p>
            </div>
            
            <div className="p-6 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-lg mb-8">
                <p className="font-bold">Feature Coming Soon!</p>
                <p className="text-sm">The ability to book video calls and interact live with students is under development. Below is a preview of how it might look.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card p-5 rounded-2xl shadow-soft border border-slate-200/50">
                        <div className="flex flex-col items-center text-center">
                            <UserCardSkeleton />
                            <div className="w-full mt-4">
                                <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto mb-2"></div>
                                <div className="h-3 bg-slate-200 rounded w-1/4 mx-auto"></div>
                                <div className="h-10 bg-primary/20 rounded-lg mt-4"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveAcademyPage;