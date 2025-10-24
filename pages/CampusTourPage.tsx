import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Profile, TourGuideApplication } from '../types';
import Spinner from '../components/Spinner';
import UserCard from '../components/UserCard';
import { MagicGrid } from '../components/MagicGrid';
import UserCardSkeleton from '../components/UserCardSkeleton';

// --- Student View: Application Form & Status ---
const StudentTourGuideView: React.FC = () => {
    const { user, profile } = useAuth();
    const [application, setApplication] = useState<TourGuideApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEligible, setIsEligible] = useState(false);
    
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [campusDetails, setCampusDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.joining_year) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth(); // 0-11
            const yearsElapsed = currentYear - profile.joining_year;
            // Eligible if they are in their second year or beyond, OR
            // if it's their first year but it's now January or later (i.e., second semester).
            if (yearsElapsed > 0 || (yearsElapsed === 0 && currentMonth >= 0)) {
                setIsEligible(true);
            }
        }
    }, [profile]);

    useEffect(() => {
        if (!user) return;
        const fetchApplication = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('tour_guide_applications')
                .select('*')
                .eq('user_id', user.id)
                .single();
            setApplication(data);
            setLoading(false);
        };
        fetchApplication();
    }, [user]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                setError('Video file is too large. Max size is 50MB.');
                return;
            }
            setError(null);
            setVideoFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !videoFile) {
            setError('Please upload an introduction video.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const filePath = `${user.id}/${Date.now()}_${videoFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('tour-guide-videos')
                .upload(filePath, videoFile);

            if (uploadError) throw uploadError;
            if (!uploadData?.path) throw new Error("File upload failed, please try again.");

            const { data: { publicUrl } } = supabase.storage.from('tour-guide-videos').getPublicUrl(uploadData.path);
            
            const { data: newApplication, error: insertError } = await supabase
                .from('tour_guide_applications')
                .upsert({
                    user_id: user.id,
                    intro_video_url: publicUrl,
                    campus_details: campusDetails,
                    status: 'pending',
                }, { onConflict: 'user_id' })
                .select()
                .single();
            
            if (insertError) throw insertError;
            
            setApplication(newApplication);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }
    
    if (!isEligible) {
        return (
            <div className="text-center p-8 bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <h2 className="text-2xl font-bold text-text-heading">Become a Tour Guide</h2>
                <p className="mt-4 text-text-body">This feature is available for students who have completed their first semester. Please check back later!</p>
            </div>
        );
    }

    if (application) {
        if (application.status === 'approved') {
            return (
                <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-200">
                    <h2 className="text-2xl font-bold text-green-800">Congratulations!</h2>
                    <p className="mt-4 text-green-700">Your application has been approved. You are now a verified Tour Guide! Parents can now find and hire you for virtual campus tours.</p>
                </div>
            );
        }
        if (application.status === 'pending') {
            return (
                <div className="text-center p-8 bg-yellow-50 rounded-2xl border border-yellow-200">
                    <h2 className="text-2xl font-bold text-yellow-800">Application Submitted</h2>
                    <p className="mt-4 text-yellow-700">Your application is under review. Our team will verify your details and you'll be notified of the outcome. This usually takes 24-48 hours.</p>
                </div>
            );
        }
        if (application.status === 'rejected') {
             return (
                <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
                    <h2 className="text-2xl font-bold text-red-800">Application Status</h2>
                    <p className="mt-4 text-red-700">Unfortunately, your recent application was not approved.</p>
                    {application.reviewer_notes && <p className="mt-2 font-semibold">Reason: {application.reviewer_notes}</p>}
                    <p className="mt-4 text-text-body">You can update your details and submit a new application below.</p>
                </div>
            );
        }
    }

    // Application form
    return (
        <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50">
            <h2 className="text-3xl font-bold text-text-heading text-center">Become a Tour Guide</h2>
            <p className="text-text-body mt-2 text-center max-w-2xl mx-auto">Share your campus experience with prospective students and their parents, and earn while you do it! Submit a short video to introduce yourself.</p>
            
            <form onSubmit={handleSubmit} className="mt-8 max-w-xl mx-auto space-y-6">
                <div>
                    <label htmlFor="intro-video" className="block text-sm font-medium text-text-body mb-2">1. Your Introduction Video (Max 50MB)</label>
                    <input id="intro-video" type="file" onChange={handleFileChange} accept="video/*" required className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"/>
                </div>
                <div>
                    <label htmlFor="campus-details" className="block text-sm font-medium text-text-body mb-2">2. About Your Campus (Optional)</label>
                    <textarea id="campus-details" value={campusDetails} onChange={e => setCampusDetails(e.target.value)} rows={4} placeholder="Tell us what makes your campus special. What are the best spots, hidden gems, or things a new student should know?" className="w-full p-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading"></textarea>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="text-center pt-2">
                    <button type="submit" disabled={submitting} className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-focus transition-transform hover:scale-105 transform font-semibold shadow-soft hover:shadow-soft-md active:scale-100 disabled:opacity-50 min-w-[180px]">
                        {submitting ? <Spinner /> : 'Submit Application'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- Parent View: Browse Guides ---
const ParentTourGuideView: React.FC = () => {
    const { subscription } = useAuth();
    const [guides, setGuides] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    const hasProAccess = subscription?.status === 'active' && subscription.subscriptions.name?.toUpperCase() === 'PRO';

    const fetchGuides = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_tour_guide', true);
        
        if (data) {
            setGuides(data);
        }
        if (error) {
            console.error(error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (hasProAccess) {
            fetchGuides();
        } else {
            setLoading(false);
        }
    }, [fetchGuides, hasProAccess]);

    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (!hasProAccess) {
        return (
             <div className="text-center p-8 bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <h1 className="text-3xl font-bold text-text-heading">Find a Campus Guide</h1>
                <p className="text-text-body mt-2">This is a PRO feature. Upgrade your plan to connect with verified student guides.</p>
                {/* Upgrade button can be added here */}
            </div>
        )
    }

    return (
         <div>
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-text-heading">Find a Campus Guide</h1>
                <p className="text-text-body mt-2">Connect with verified students for a virtual tour of their campus.</p>
            </div>
            
            {guides.length === 0 ? (
                 <p className="text-center text-gray-500 bg-card p-10 rounded-lg border border-slate-200/80">
                    No tour guides are available yet. Please check back later!
                </p>
            ) : (
                <MagicGrid>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {guides.map(guide => (
                            <UserCard 
                                key={guide.id} 
                                profile={guide}
                            />
                        ))}
                    </div>
                </MagicGrid>
            )}
        </div>
    );
};

const CampusTourPage: React.FC = () => {
    const { profile, loading } = useAuth();
    
    if (loading) {
        return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    }

    if (!profile) {
        return <p>Could not load your profile.</p>;
    }

    return (
        <div className="animate-fade-in-up">
            {profile.enrollment_status === 'parent' ? <ParentTourGuideView /> : <StudentTourGuideView />}
        </div>
    );
};

export default CampusTourPage;
