import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import WebsiteLogo from '../components/WebsiteLogo';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const { session, loading: authLoading } = useAuth();

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setIsSuccess(false);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
             redirectTo: `${window.location.origin}/#/update-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setIsSuccess(true);
        }
        setLoading(false);
    };
    
    const inputClasses = "w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-colors";

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
            {!authLoading && session && (
                <Link to="/home" className="absolute top-4 right-4 bg-slate-100 text-text-body px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors z-10">
                    &larr; Back to App
                </Link>
            )}
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-text-heading">
                        <WebsiteLogo />
                        <span>UniVibe</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-text-heading mt-4">Reset Your Password</h1>
                    <p className="text-text-body">
                        {isSuccess 
                            ? `Instructions have been sent to ${email}`
                            : 'Enter your email to receive a password reset link.'
                        }
                    </p>
                </div>
                <div className="bg-card p-8 rounded-lg shadow-lg border border-slate-200">
                    {isSuccess ? (
                        <div className="text-center">
                            <p className="text-text-body">Please check your email inbox (and spam folder) for the link to create a new password.</p>
                             <Link to="/login" className="inline-block mt-6 bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-focus transition-transform hover:scale-105 transform font-semibold shadow-lg active:scale-100">
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordReset} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-body mb-1" htmlFor="email">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClasses}
                                    required
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <div>
                                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center font-semibold">
                                    {loading ? <Spinner size="sm" /> : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                 <p className="mt-6 text-center text-sm text-text-body">
                    Remember your password?{' '}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;