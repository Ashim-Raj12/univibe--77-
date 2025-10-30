import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import VerifiedBadge from '../components/VerifiedBadge';

interface FacultyProfile {
    id: string;
    name: string;
    avatar_url: string | null;
    faculty_title: string;
    department: string;
    profile_visibility: boolean;
    verified: boolean;
}

const FacultyListPage: React.FC = () => {
    const [faculty, setFaculty] = useState<FacultyProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        const fetchFaculty = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'faculty')
                    .eq('profile_visibility', true);

                if (error) throw error;

                // Extract unique departments
                const uniqueDepartments = [...new Set(data
                    .map(f => f.department)
                    .filter(Boolean))] as string[];
                setDepartments(uniqueDepartments);
                setFaculty(data as FacultyProfile[]);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFaculty();
    }, []);

    const filteredFaculty = faculty.filter(f => {
        const matchesSearch = f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.faculty_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.department?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDepartment = selectedDepartment === 'all' || f.department === selectedDepartment;

        return matchesSearch && matchesDepartment;
    });

    if (loading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Faculty Directory</h1>

            {/* Search and Filter */}
            <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search faculty by name, title, or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div className="w-full md:w-64">
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Faculty Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFaculty.map((faculty) => (
                    <Link
                        key={faculty.id}
                        to={`/faculty/${faculty.id}`}
                        className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                    >
                        <div className="p-6">
                            <div className="flex items-start space-x-4">
                                <img
                                    src={faculty.avatar_url || '/default-avatar.png'}
                                    alt={faculty.name}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-lg font-semibold text-gray-900">{faculty.name}</h2>
                                        {faculty.verified && <VerifiedBadge />}
                                    </div>
                                    <p className="text-gray-600">{faculty.faculty_title}</p>
                                    <p className="text-sm text-gray-500">{faculty.department}</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {filteredFaculty.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                    No faculty members found matching your search criteria.
                </p>
            )}
        </div>
    );
};

export default FacultyListPage;