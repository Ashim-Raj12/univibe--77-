import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/Spinner';
import { toast } from '../components/Toast';

interface OfficeHours {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location: string;
    notes: string;
}

const EditFacultyProfilePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [officeLocation, setOfficeLocation] = useState('');
    const [researchInterests, setResearchInterests] = useState<string[]>([]);
    const [newResearchInterest, setNewResearchInterest] = useState('');
    const [education, setEducation] = useState<{ degree: string; institution: string; year: number; }[]>([]);
    const [publications, setPublications] = useState<string[]>([]);
    const [newPublication, setNewPublication] = useState('');
    const [officeHours, setOfficeHours] = useState<OfficeHours[]>([]);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user?.id)
                    .single();

                if (error) throw error;

                // Set form values
                setTitle(data.faculty_title || '');
                setDepartment(data.department || '');
                setOfficeLocation(data.office_location || '');
                setResearchInterests(data.research_interests || []);
                setEducation(data.education_background || []);
                setPublications(data.publications || []);
                setAvatarUrl(data.avatar_url || '');

                // Fetch office hours
                const { data: hoursData, error: hoursError } = await supabase
                    .from('faculty_office_hours')
                    .select('*')
                    .eq('faculty_id', user?.id);

                if (hoursError) throw hoursError;
                setOfficeHours(hoursData || []);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchProfile();
    }, [user]);

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setAvatarFile(event.target.files[0]);
        }
    };

    const uploadAvatar = async () => {
        if (!avatarFile) return null;

        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user?.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        return `https://your-supabase-url.supabase.co/storage/v1/object/public/avatars/${filePath}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            // Upload new avatar if selected
            let newAvatarUrl = avatarUrl;
            if (avatarFile) {
                newAvatarUrl = await uploadAvatar() || avatarUrl;
            }

            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    faculty_title: title,
                    department,
                    office_location: officeLocation,
                    research_interests: researchInterests,
                    education_background: education,
                    publications,
                    avatar_url: newAvatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Update office hours
            // First delete existing hours
            await supabase
                .from('faculty_office_hours')
                .delete()
                .eq('faculty_id', user.id);

            // Then insert new hours
            if (officeHours.length > 0) {
                const { error: hoursError } = await supabase
                    .from('faculty_office_hours')
                    .insert(officeHours.map(hours => ({
                        ...hours,
                        faculty_id: user.id
                    })));

                if (hoursError) throw hoursError;
            }

            toast.success('Profile updated successfully!');
            navigate(`/faculty/${user.id}`);

        } catch (err: any) {
            setError(err.message);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Faculty Profile</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Profile Picture
                            </label>
                            <div className="mt-2 flex items-center space-x-4">
                                <img
                                    src={avatarFile ? URL.createObjectURL(avatarFile) : (avatarUrl || '/default-avatar.png')}
                                    alt="Profile"
                                    className="w-20 h-20 rounded-full object-cover"
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                placeholder="e.g., Professor of Computer Science"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Department
                            </label>
                            <input
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Office Location
                            </label>
                            <input
                                type="text"
                                value={officeLocation}
                                onChange={(e) => setOfficeLocation(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Research Interests */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Research Interests</h2>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newResearchInterest}
                                onChange={(e) => setNewResearchInterest(e.target.value)}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                placeholder="Add a research interest"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (newResearchInterest.trim()) {
                                        setResearchInterests([...researchInterests, newResearchInterest.trim()]);
                                        setNewResearchInterest('');
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {researchInterests.map((interest, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center"
                                >
                                    {interest}
                                    <button
                                        type="button"
                                        onClick={() => setResearchInterests(researchInterests.filter((_, i) => i !== index))}
                                        className="ml-2 text-gray-500 hover:text-red-500"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Education Background */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Education Background</h2>
                    <div className="space-y-4">
                        {education.map((edu, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={edu.degree}
                                        onChange={(e) => {
                                            const newEducation = [...education];
                                            newEducation[index].degree = e.target.value;
                                            setEducation(newEducation);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                        placeholder="Degree"
                                    />
                                    <input
                                        type="text"
                                        value={edu.institution}
                                        onChange={(e) => {
                                            const newEducation = [...education];
                                            newEducation[index].institution = e.target.value;
                                            setEducation(newEducation);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                        placeholder="Institution"
                                    />
                                    <input
                                        type="number"
                                        value={edu.year}
                                        onChange={(e) => {
                                            const newEducation = [...education];
                                            newEducation[index].year = parseInt(e.target.value);
                                            setEducation(newEducation);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                        placeholder="Year"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEducation(education.filter((_, i) => i !== index))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setEducation([...education, { degree: '', institution: '', year: new Date().getFullYear() }])}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Add Education
                        </button>
                    </div>
                </div>

                {/* Publications */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Publications</h2>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPublication}
                                onChange={(e) => setNewPublication(e.target.value)}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                placeholder="Add a publication"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (newPublication.trim()) {
                                        setPublications([...publications, newPublication.trim()]);
                                        setNewPublication('');
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                            >
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {publications.map((pub, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <p className="text-gray-700">{pub}</p>
                                    <button
                                        type="button"
                                        onClick={() => setPublications(publications.filter((_, i) => i !== index))}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Office Hours */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Office Hours</h2>
                    <div className="space-y-4">
                        {officeHours.map((hours, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <select
                                        value={hours.day_of_week}
                                        onChange={(e) => {
                                            const newHours = [...officeHours];
                                            newHours[index].day_of_week = parseInt(e.target.value);
                                            setOfficeHours(newHours);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                    >
                                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                                            <option key={i} value={i}>{day}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="time"
                                        value={hours.start_time}
                                        onChange={(e) => {
                                            const newHours = [...officeHours];
                                            newHours[index].start_time = e.target.value;
                                            setOfficeHours(newHours);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                    <input
                                        type="time"
                                        value={hours.end_time}
                                        onChange={(e) => {
                                            const newHours = [...officeHours];
                                            newHours[index].end_time = e.target.value;
                                            setOfficeHours(newHours);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                    />
                                    <input
                                        type="text"
                                        value={hours.location}
                                        onChange={(e) => {
                                            const newHours = [...officeHours];
                                            newHours[index].location = e.target.value;
                                            setOfficeHours(newHours);
                                        }}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                        placeholder="Location"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOfficeHours(officeHours.filter((_, i) => i !== index))}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setOfficeHours([...officeHours, {
                                day_of_week: 1,
                                start_time: '09:00',
                                end_time: '10:00',
                                location: '',
                                notes: ''
                            }])}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                            Add Office Hours
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditFacultyProfilePage;