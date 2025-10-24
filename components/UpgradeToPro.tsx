import React from 'react';
import { Link } from 'react-router-dom';

interface UpgradeToProProps {
    featureName: string;
}

const UpgradeToPro: React.FC<UpgradeToProProps> = ({ featureName }) => {
    return (
        <div className="text-center p-8 bg-card rounded-2xl shadow-soft border border-slate-200/50 max-w-2xl mx-auto animate-fade-in-up">
            <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-text-heading">Unlock {featureName}</h1>
            <p className="mt-4 max-w-xl mx-auto text-lg text-text-body">
                Upgrade to a PRO subscription to get full access to the Study Hub, including private study groups, shared materials, and collaborating on assignments.
            </p>
            <Link to="/subscriptions" className="mt-8 inline-block bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-focus transition-transform hover:scale-105 transform font-semibold shadow-soft hover:shadow-soft-md active:scale-100">
                ✨ Go Pro
            </Link>
        </div>
    );
};

export default UpgradeToPro;
