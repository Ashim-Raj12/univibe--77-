import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { RoommatePreference } from '../types';
import Spinner from './Spinner';

interface RoommatePreferencesFormProps {
    onSuccess: (prefs: RoommatePreference) => void;
    initialPreferences: Partial<RoommatePreference> | null;
}

const preferenceOptions = {
    smoking_habits: { title: 'Smoking Habits', options: { never: 'Never', occasionally: 'Occasionally', frequently: 'Frequently' } },
    sleep_schedule: { title: 'Sleep Schedule', options: { early_bird: 'Early Bird (before 11 PM)', night_owl: 'Night Owl (after 1 AM)', flexible: 'Flexible' } },
    cleanliness: { title: 'Cleanliness Level', options: { very_tidy: 'Very Tidy', moderately_clean: 'Moderately Clean', relaxed: 'Relaxed' } },
    social_habits: { title: 'Social Habits at Home', options: { prefers_quiet: 'Prefers quiet/alone time', likes_hosting: 'Enjoys hosting friends', mix_of_both: 'A mix of both' } },
    guests_policy: { title: 'Having Guests Over', options: { rarely_over: 'Rarely', sometimes_over: 'Sometimes', often_over: 'Often' } },
};

const PreferenceQuestion: React.FC<{
    prefKey: keyof typeof preferenceOptions;
    value: string | null | undefined;
    onChange: (key: keyof typeof preferenceOptions, value: string) => void;
}> = ({ prefKey, value, onChange }) => {
    const { title, options } = preferenceOptions[prefKey];

    return (
        <div>
            <label className="block text-lg font-semibold text-text-heading mb-3">{title}</label>
            <div className="flex flex-wrap gap-3">
                {Object.entries(options).map(([key, label]) => (
                    <label key={key} className={`relative flex items-center p-3 rounded-xl cursor-pointer border-2 transition-all ${value === key ? 'bg-primary/10 border-primary shadow-soft' : 'bg-transparent border-border hover:border-slate-300'}`}>
                        <input
                            type="radio"
                            name={prefKey}
                            value={key}
                            checked={value === key}
                            onChange={() => onChange(prefKey, key)}
                            className="absolute opacity-0 h-0 w-0"
                        />
                        <span className="text-sm font-medium text-text-body">{label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

const RoommatePreferencesForm: React.FC<RoommatePreferencesFormProps> = ({ onSuccess, initialPreferences }) => {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<Partial<RoommatePreference>>({
        smoking_habits: null,
        sleep_schedule: null,
        cleanliness: null,
        social_habits: null,
        guests_policy: null,
        ...initialPreferences,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (key: keyof typeof preferenceOptions, value: string) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const allAnswered = Object.values(preferences).every(v => v !== null);
        if (!allAnswered) {
            setError('Please answer all questions to find the best matches.');
            return;
        }

        setLoading(true);
        setError(null);
        
        const upsertData = {
            user_id: user.id,
            ...preferences,
            updated_at: new Date().toISOString(),
        };

        const { data, error: upsertError } = await supabase
            .from('roommate_preferences')
            .upsert(upsertData, { onConflict: 'user_id' })
            .select()
            .single();

        if (upsertError) {
            setError(upsertError.message);
        } else if (data) {
            onSuccess(data as RoommatePreference);
        }
        setLoading(false);
    };

    return (
        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-soft border border-slate-200/50 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-text-heading mb-2">My Roommate Preferences</h2>
            <p className="text-text-body mb-8">Answer a few questions about your living style to find compatible roommates.</p>

            <form onSubmit={handleSubmit} className="space-y-8">
                {Object.keys(preferenceOptions).map(key => (
                    <PreferenceQuestion
                        key={key}
                        prefKey={key as keyof typeof preferenceOptions}
                        value={preferences[key as keyof typeof preferenceOptions]}
                        onChange={handleChange}
                    />
                ))}
                
                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <div className="pt-4 text-right">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-w-[160px] font-semibold shadow-soft hover:shadow-soft-md active:animate-press ml-auto"
                    >
                        {loading ? <Spinner size="sm" /> : 'Save & Find Matches'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RoommatePreferencesForm;
