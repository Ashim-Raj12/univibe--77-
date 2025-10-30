import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import VerifiedBadge from '../components/VerifiedBadge';
import BookConsultationModal from '../components/BookConsultationModal';

interface FacultyProfile {
    id: string;
    name: string;
    avatar_url: string;
    faculty_title: string;
    department: string;
    research_interests: string[];
    education_background: {
        degree: string;
        institution: string;
        year: number;
    }[];
    publications: string[];
    office_location: string;
    profile_visibility: boolean;
    verified: boolean;
}

interface OfficeHours {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location: string;
    notes: string;
}

const FacultyProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, profile: currentUserProfile } = useAuth();
    const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null);
    const [officeHours, setOfficeHours] = useState<OfficeHours[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    const isSelf = user?.id === id;
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        const fetchFacultyProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch faculty profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .eq('role', 'faculty')
                    .single();

                if (profileError) throw profileError;

                if (!profileData) {
                    setError('Faculty profile not found');
                    setLoading(false);
                    return;
                }

                // Only show profile if it's visible or if viewing own profile
                if (!profileData.profile_visibility && !isSelf) {
                    setError('This faculty profile is not yet visible');
                    setLoading(false);
                    return;
                }

                setFacultyProfile(profileData as FacultyProfile);

                // Fetch office hours
                const { data: hoursData, error: hoursError } = await supabase
                    .from('faculty_office_hours')
                    .select('*')
                    .eq('faculty_id', id)
                    .order('day_of_week', { ascending: true })
                    .order('start_time', { ascending: true });

                if (hoursError) throw hoursError;
                setOfficeHours(hoursData);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFacultyProfile();
    }, [id, isSelf]);

    const toggleVisibility = async () => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ profile_visibility: !facultyProfile?.profile_visibility })
                .eq('id', user?.id);

            if (error) throw error;

            setFacultyProfile(prev => prev ? {
                ...prev,
                profile_visibility: !prev.profile_visibility
            } : null);
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!facultyProfile) return <div className="p-4 text-gray-600">Profile not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* Prompt banner for owners if profile is hidden or consultation details are incomplete */}
            {isSelf && (!facultyProfile.profile_visibility || !facultyProfile.consultation_available || !facultyProfile.consultation_rate) && (
                <div className="bg-yellow-50 border-l-4 border-yellow-300 p-4 rounded-md">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-yellow-800 font-medium">Your profile is not fully visible to students yet.</p>
                            <p className="text-sm text-yellow-700 mt-1">Publish your profile and add consultation pricing so students can find and book you.</p>
                        </div>
                        <div className="ml-4">
                            <button
                                onClick={() => navigate('/edit-faculty-profile')}
                                className="px-3 py-1 bg-primary text-white rounded-md text-sm"
                            >
                                Complete Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 flex items-start justify-between">
                <div className="flex items-start space-x-4">
                    <img
                        src={facultyProfile.avatar_url || '/default-avatar.png'}
                        alt={facultyProfile.name}
                        className="w-24 h-24 rounded-full object-cover"
                    />
                    <div>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl font-bold text-gray-900">{facultyProfile.name}</h1>
                            {facultyProfile.verified && <VerifiedBadge />}
                        </div>
                        <p className="text-lg text-gray-600">{facultyProfile.faculty_title}</p>
                        <p className="text-gray-600">{facultyProfile.department}</p>
                    </div>
                </div>
                {isSelf && (
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/edit-faculty-profile')}
                            className="block w-full px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark transition"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={toggleVisibility}
                            className={`block w-full px-4 py-2 text-sm rounded-md transition
                                ${facultyProfile.profile_visibility
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                        >
                            {facultyProfile.profile_visibility ? 'Profile Visible' : 'Profile Hidden'}
                        </button>
                    </div>
                )}
            </div>

            {/* Research Interests */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Research Interests</h2>
                <div className="flex flex-wrap gap-2">
                    {facultyProfile.research_interests?.map((interest, index) => (
                        <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                            {interest}
                        </span>
                    ))}
                </div>
            </div>

            {/* Education Background */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Education</h2>
                <div className="space-y-4">
                    {facultyProfile.education_background?.map((edu, index) => (
                        <div key={index} className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-gray-900">{edu.degree}</p>
                                <p className="text-gray-600">{edu.institution}</p>
                            </div>
                            <span className="text-gray-500">{edu.year}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Office Hours */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Office Hours</h2>
                <div className="space-y-3">
                    {officeHours.map((hours) => (
                        <div key={hours.id} className="flex justify-between items-start border-b border-gray-100 pb-2">
                            <div>
                                <p className="font-medium text-gray-900">{daysOfWeek[hours.day_of_week]}</p>
                                <p className="text-gray-600">
                                    {hours.start_time} - {hours.end_time}
                                </p>
                                {hours.notes && (
                                    <p className="text-sm text-gray-500 mt-1">{hours.notes}</p>
                                )}
                            </div>
                            <p className="text-gray-600">{hours.location}</p>
                        </div>
                    ))}
                    {officeHours.length === 0 && (
                        <p className="text-gray-500">No office hours specified</p>
                    )}
                </div>
            </div>

            {/* Publications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Publications</h2>
                <div className="space-y-3">
                    {facultyProfile.publications?.map((publication, index) => (
                        <p key={index} className="text-gray-700">
                            {publication}
                        </p>
                    ))}
                    {(!facultyProfile.publications || facultyProfile.publications.length === 0) && (
                        <p className="text-gray-500">No publications listed</p>
                    )}
                </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <p className="text-gray-700">
                    <span className="font-medium">Office Location:</span> {facultyProfile.office_location}
                </p>
            </div>

            {/* Consultation Section */}
            {facultyProfile.consultation_available && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Book a Consultation</h2>
                            <p className="text-gray-600">
                                Rate: ₹{facultyProfile.consultation_rate} for {facultyProfile.consultation_duration} minutes
                            </p>
                        </div>
                        {!isSelf && (
                            <button
                                onClick={() => setIsBookingModalOpen(true)}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
                            >
                                Book Now
                            </button>
                        )}
                    </div>
                    
                    <div className="mt-4">
                        <h3 className="font-medium text-gray-900 mb-2">Areas of Expertise:</h3>
                        <div className="flex flex-wrap gap-2">
                            {facultyProfile.expertise_areas?.map((area, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm"
                                >
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isBookingModalOpen && (
                <BookConsultationModal
                    facultyId={facultyProfile.id}
                    facultyName={facultyProfile.name}
                    consultationRate={facultyProfile.consultation_rate}
                    consultationDuration={facultyProfile.consultation_duration}
                    onClose={() => setIsBookingModalOpen(false)}
                    onSuccess={() => {
                        setIsBookingModalOpen(false);
                        navigate('/my-consultations');
                    }}
                />
            )}
        </div>
    );
};

export default FacultyProfilePage;