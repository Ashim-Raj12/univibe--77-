import React from 'react';

const UniversityDetailsPageSkeleton: React.FC = () => {
    return (
        <div className="shimmer-container max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                <div className="h-8 w-1/2 bg-slate-200 rounded"></div>
            </div>
            
            <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 space-y-6">
                <div className="h-7 w-1/3 bg-slate-200 rounded"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
                </div>
                <div className="h-7 w-1/4 bg-slate-200 rounded mt-8"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                </div>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 space-y-4">
                <div className="h-6 w-1/4 bg-slate-200 rounded"></div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-5 bg-slate-200 rounded-full"></div>
                        <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-5 bg-slate-200 rounded-full"></div>
                        <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UniversityDetailsPageSkeleton;
