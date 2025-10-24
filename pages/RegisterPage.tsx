import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '../components/Spinner';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { indianStatesAndUTs } from '../data/states';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/Toast';
import WebsiteLogo from '../components/WebsiteLogo';

const UserTypeButton: React.FC<{
    onClick: () => void;
    selected: boolean;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}> = ({ onClick, selected, icon, title, subtitle }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 flex items-center gap-4 ${selected ? 'bg-primary/10 border-primary shadow-soft' : 'bg-transparent border-border hover:border-slate-300'}`}
    >
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-dark-card text-text-muted'}`}>
            {icon}
        </div>
        <div>
            <p className={`font-semibold ${selected ? 'text-primary' : 'text-text-heading'}`}>{title}</p>
            <p className="text-xs text-text-body">{subtitle}</p>
        </div>
    </button>
);

const performUsernameCheck = async (username: string): Promise<string | null> => {
    if (!username) return null;
    if (!/^[a-z0-9_]{3,15}$/.test(username)) {
        return '3-15 lowercase letters, numbers, or underscores.';
    }
    const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
    return data ? 'Username is already taken.' : null;
};

const RegisterPage: React.FC = () => {
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [formData, setFormData] = useState({
        userType: 'admitted' as 'admitted' | 'exploring' | 'parent',
        email: '',
        password: '',
        name: '',
        username: '',
        college: '',
        state: '',
        enrollmentStatus: '' as 'current_student' | 'incoming_student' | 'passed_out' | 'exploring' | '',
        joiningYear: '',
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [usernameLoading, setUsernameLoading] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    
    // State for college combobox
    const [allColleges, setAllColleges] = useState<string[]>([]);
    const [collegesLoading, setCollegesLoading] = useState(true);
    const [collegeSearch, setCollegeSearch] = useState('');
    const [filteredColleges, setFilteredColleges] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const collegeDropdownRef = useRef<HTMLDivElement>(null);

    const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!authLoading && session) {
            navigate('/home', { replace: true });
        }
    }, [session, authLoading, navigate]);

    // Fetch all colleges from DB on mount
    useEffect(() => {
        const fetchColleges = async () => {
            setCollegesLoading(true);
            const { data, error } = await supabase.from('colleges').select('name').order('name', { ascending: true });
            if (data) {
                setAllColleges(data.map(c => c.name));
            }
            setCollegesLoading(false);
        };
        fetchColleges();
    }, []);

    // Filter colleges based on input
    useEffect(() => {
        if (!isDropdownOpen) {
            setFilteredColleges([]);
            return;
        }
        if (collegeSearch) {
            const filtered = allColleges.filter(c =>
                c.toLowerCase().includes(collegeSearch.toLowerCase())
            );
            setFilteredColleges(filtered.slice(0, 100));
        } else {
            setFilteredColleges(allColleges.slice(0, 100));
        }
    }, [collegeSearch, allColleges, isDropdownOpen]);

    // Handle clicking outside the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (collegeDropdownRef.current && !collegeDropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCollegeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setCollegeSearch(value);
        if (!isDropdownOpen) {
            setIsDropdownOpen(true);
        }
    };

    const handleCollegeSelect = (collegeName: string) => {
        setFormData(prev => ({ ...prev, college: collegeName }));
        setCollegeSearch(collegeName);
        setIsDropdownOpen(false);
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setFormData(prev => ({ ...prev, username: value }));

        if (usernameCheckTimeout.current) {
            clearTimeout(usernameCheckTimeout.current);
        }

        setUsernameLoading(true);
        usernameCheckTimeout.current = setTimeout(async () => {
            const error = await performUsernameCheck(value);
            setUsernameError(error);
            setUsernameLoading(false);
        }, 500);
    };

    const isStudent = formData.userType !== 'parent';

    const derivedEnrollmentStatus = useMemo(() => {
        if (formData.userType === 'parent') return 'parent';
        if (formData.userType === 'exploring') return 'exploring';
        return formData.enrollmentStatus;
    }, [formData.userType, formData.enrollmentStatus]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isStudent && !formData.college.trim()) {
            setError("Please select or add your college.");
            return;
        }
        
        if (usernameError || usernameLoading) {
            setError("Please resolve issues with your username.");
            return;
        }

        setLoading(true);
        setError(null);
        
        const referrerId = searchParams.get('ref');

        // Step 1: Create the authentication user. This is the most critical step.
        // The backend trigger for this MUST be simple and infallible.
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    referrer_id: referrerId || null,
                }
            }
        });

        if (signUpError) {
            let friendlyMessage = 'Registration failed. Please double-check your details and try again.';
            if (signUpError.message.includes('User already registered')) {
                friendlyMessage = 'An account with this email already exists.';
            } else if (signUpError.message.includes('Database error saving new user')) {
                // This is a specific, common Supabase error that needs a more helpful message.
                friendlyMessage = "Unable to create account. A server configuration error is preventing new user profiles from being saved. Please contact support and report a 'database trigger' issue.";
            } else if (signUpError.message) {
                friendlyMessage = signUpError.message;
            }
            setError(friendlyMessage);
            setLoading(false);
            return;
        }

        if (!user) {
            setError('Registration failed unexpectedly. The user was not created. Please try again.');
            setLoading(false);
            return;
        }

        // Step 2: Populate the profile. If this fails, the account still exists,
        // and the user can complete their profile later.
        try {
            const yearValue = formData.joiningYear.trim();
            const joiningYearNumber = yearValue ? parseInt(yearValue, 10) : null;

            if (yearValue && isNaN(joiningYearNumber!)) {
                 // Although the DB can handle this, it's good practice to validate here.
                throw new Error("The joining year is not a valid number.");
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    name: formData.name.trim(),
                    username: formData.username.trim(),
                    college: formData.college.trim(),
                    state: formData.state,
                    enrollment_status: derivedEnrollmentStatus,
                    joining_year: joiningYearNumber,
                })
                .eq('id', user.id);

            if (updateError) {
                // Log this error for debugging, but don't block the user.
                console.error("Profile update failed after signup:", updateError);
                toast.error("Could not save all profile details. Please complete your profile later.");
            }

            // Success is based on account creation, which is now guaranteed if we reach here.
            setIsSuccess(true);

        } catch (err: any) {
            // This catch block is for unexpected JS errors during the update.
            console.error("Critical error during profile update:", err);
            toast.error("An error occurred saving profile details.");
            setIsSuccess(true); // Still show success, as the account exists.
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

    if (isSuccess) {
        return (
             <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-border">
                    <h1 className="text-2xl font-bold text-text-heading">Almost there!</h1>
                    <p className="text-text-body mt-2">We've sent a verification link to <strong>{formData.email}</strong>.</p>
                    <p className="text-text-body mt-2">Please check your inbox to complete your registration.</p>
                     <Link to="/login" className="inline-block mt-6 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold">
                        Back to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
             <div className="w-full max-w-lg">
                 <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-text-heading">
                        <WebsiteLogo />
                        <span>UniVibe</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-text-heading mt-4">Create Your Account</h1>
                    <p className="text-text-body">Join your campus community today.</p>
                </div>
                <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-border">
                    <form onSubmit={handleRegister} className="space-y-6">
                         <div className="space-y-3">
                            <UserTypeButton 
                                onClick={() => setFormData(p => ({...p, userType: 'admitted'}))} 
                                selected={formData.userType === 'admitted'} 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" /></svg>} 
                                title="Admitted Student"
                                subtitle="You have an offer letter from a college."
                            />
                             <UserTypeButton 
                                onClick={() => setFormData(p => ({...p, userType: 'exploring'}))} 
                                selected={formData.userType === 'exploring'} 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>} 
                                title="Exploring Colleges"
                                subtitle="You're a student preparing for admissions."
                            />
                             <UserTypeButton 
                                onClick={() => setFormData(p => ({...p, userType: 'parent'}))} 
                                selected={formData.userType === 'parent'} 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>} 
                                title="Parent / Guardian"
                                subtitle="You're a parent supporting your child."
                            />
                        </div>
                        <hr className="border-border"/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className={inputClasses} required />
                            <div>
                                <div className="relative">
                                     <input type="text" name="username" value={formData.username} onChange={handleUsernameChange} placeholder="Username" className={inputClasses} required maxLength={15} />
                                      {usernameLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
                                </div>
                                {usernameError ? <p className="text-red-500 text-xs mt-1">{usernameError}</p> : formData.username.length > 2 && !usernameLoading ? <p className="text-green-600 text-xs mt-1">Username available!</p> : null}
                            </div>
                        </div>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className={inputClasses} required />
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Password" className={`${inputClasses} pr-12`} required />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-4 flex items-center text-text-muted hover:text-text-body"
                            >
                                {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>}
                            </button>
                        </div>
                        <PasswordStrengthMeter password={formData.password} />

                        {isStudent && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div ref={collegeDropdownRef} className="relative">
                                    <input 
                                        type="text" 
                                        name="college" 
                                        value={collegeSearch} 
                                        onChange={handleCollegeChange} 
                                        onFocus={() => setIsDropdownOpen(true)}
                                        placeholder={collegesLoading ? 'Loading colleges...' : 'College / University'} 
                                        className={inputClasses}
                                        required={isStudent}
                                        autoComplete="off"
                                    />
                                    {isDropdownOpen && (
                                        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredColleges.length > 0 ? (
                                                filteredColleges.map(c => <button type="button" key={c} onMouseDown={() => handleCollegeSelect(c)} className="w-full text-left px-4 py-2 text-sm hover:bg-dark-card">{c}</button>)
                                            ) : !collegesLoading && collegeSearch.length > 2 && !allColleges.some(c => c.toLowerCase() === collegeSearch.toLowerCase()) ? (
                                                <button type="button" onMouseDown={() => handleCollegeSelect(collegeSearch)} className="w-full text-left px-4 py-2 text-sm hover:bg-dark-card">
                                                    Add "<strong className="text-primary">{collegeSearch}</strong>" as a new college
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <select name="state" value={formData.state} onChange={handleChange} className={inputClasses} required={isStudent}>
                                    <option value="" disabled>Select State</option>
                                    {indianStatesAndUTs.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </div>
                        )}

                        {formData.userType === 'admitted' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <select name="enrollmentStatus" value={formData.enrollmentStatus} onChange={handleChange} className={inputClasses} required>
                                    <option value="" disabled>Enrollment Status</option>
                                    <option value="incoming_student">Future Student (Joining Soon)</option>
                                    <option value="current_student">Current Student</option>
                                    <option value="passed_out">Alumni / Passed Out</option>
                                </select>
                                <div>
                                    <label htmlFor="joiningYear" className="sr-only">Joining Year</label>
                                    <input id="joiningYear" type="number" name="joiningYear" value={formData.joiningYear} onChange={handleChange} placeholder="Joining Year (e.g., 2024)" className={inputClasses} min="1900" max="2100" />
                                </div>
                            </div>
                        )}
                        
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <div>
                             <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center font-semibold shadow-soft hover:shadow-soft-md active:animate-press">
                                {loading ? <Spinner size="sm" /> : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>
                <p className="mt-8 text-center text-sm text-text-body">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </p>
             </div>
        </div>
    );
};

export default RegisterPage;