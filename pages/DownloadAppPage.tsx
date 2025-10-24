import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { AppFile } from '../types';
import Spinner from '../components/Spinner';

const DownloadCard: React.FC<{ app: AppFile | null, platformName: string }> = ({ app, platformName }) => {
    if (!app) {
        return (
            <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 text-center opacity-60">
                <h3 className="text-2xl font-bold text-text-heading mb-4">UniVibe for {platformName}</h3>
                <p className="text-text-muted">Coming soon!</p>
                <div className="mt-6 w-full py-3 rounded-lg font-semibold bg-slate-200 text-slate-500 cursor-not-allowed">
                    Download
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 text-center transform hover:-translate-y-2 transition-transform duration-300">
            <h3 className="text-2xl font-bold text-text-heading mb-4">UniVibe for {platformName}</h3>
            <p className="text-text-muted">Version {app.version}</p>
            <a 
                href={app.file_url}
                download
                className="mt-6 w-full block bg-primary text-white py-3 rounded-lg font-semibold transition-colors hover:bg-primary-focus"
            >
                Download
            </a>
        </div>
    );
};

const DownloadAppPage: React.FC = () => {
    const [androidApp, setAndroidApp] = useState<AppFile | null>(null);
    const [iosApp, setIosApp] = useState<AppFile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAppFiles = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('app_files')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                
                if (data) {
                    const latestAndroid = data.find(f => f.platform === 'android') || null;
                    const latestIos = data.find(f => f.platform === 'ios') || null;
                    setAndroidApp(latestAndroid);
                    setIosApp(latestIos);
                }
            } catch (err: any) {
                setError("Could not load app files. Please try again later.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppFiles();
    }, []);

    return (
        <div className="animate-fade-in-up">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-text-heading">Get UniVibe on the Go</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-text-body">
                    Take your campus community with you wherever you are. Download the official UniVibe app for the best mobile experience.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Spinner size="lg" /></div>
            ) : error ? (
                <p className="text-center text-red-500 bg-red-50 p-4 rounded-lg">{error}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <DownloadCard app={androidApp} platformName="Android" />
                    <DownloadCard app={iosApp} platformName="iOS" />
                </div>
            )}
        </div>
    );
};

export default DownloadAppPage;