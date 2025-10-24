import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { getHomePathForProfile } from './ProfilePage';
import { Profile } from '../types';
import WebsiteLogo from '../components/WebsiteLogo';

const LoginPage: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { session, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && session) {
            navigate('/home', { replace: true });
        }
    }, [session, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let emailToLogin = identifier.trim();

            // If it doesn't look like an email, treat it as a username and fetch the associated email.
            if (!emailToLogin.includes('@')) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', emailToLogin)
                    .single();

                if (profileError || !profile?.email) {
                    // Use a generic error to prevent username enumeration
                    throw new Error('Invalid login credentials'); 
                }
                emailToLogin = profile.email;
            }

            const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                email: emailToLogin,
                password,
            });

            if (signInError) {
                // Supabase returns 'Invalid login credentials' by default, which is good.
                throw signInError;
            }
            
            if (user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profileError) {
                    await supabase.auth.signOut();
                    throw new Error('Your user profile could not be loaded. Please contact support.');
                }

                if (profile?.is_banned) {
                    await supabase.auth.signOut();
                    throw new Error('This account has been suspended.');
                }
                
                const homePath = getHomePathForProfile(profile as Profile);
                navigate(homePath, { replace: true });
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputClasses = "w-full px-4 py-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

    if (authLoading || (!authLoading && session)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
         <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
             <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-text-heading">
                        <WebsiteLogo />
                        <span>UniVibe</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-text-heading mt-4">Welcome Back!</h1>
                    <p className="text-text-body">Sign in to continue your journey.</p>
                </div>
                <div className="bg-card p-8 rounded-2xl shadow-soft-md border border-border">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-body mb-2" htmlFor="login-identifier">
                                Email or Username
                            </label>
                            <input
                                id="login-identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className={inputClasses}
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-text-body" htmlFor="password">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`${inputClasses} pr-12`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-text-muted hover:text-text-body rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div>
                             <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center font-semibold shadow-soft hover:shadow-soft-md active:animate-press">
                                {loading ? <Spinner size="sm" /> : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
                <p className="mt-8 text-center text-sm text-text-body">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-primary hover:underline">
                        Sign up
                    </Link>
                </p>
             </div>
        </div>
    );
};

export default LoginPage;