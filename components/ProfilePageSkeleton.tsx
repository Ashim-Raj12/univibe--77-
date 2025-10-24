import React from 'react';

const ProfilePageSkeleton: React.FC = () => {
    return (
        <div className="shimmer-container">
            <div className="bg-card p-6 rounded-lg shadow-sm border border-slate-200/80 mb-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="bg-slate-200 w-32 h-32 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 w-full text-center sm:text-left">
                        <div className="bg-slate-200 h-8 w-48 rounded mb-2 mx-auto sm:mx-0"></div>
                        <div className="bg-slate-200 h-6 w-32 rounded mb-4 mx-auto sm:mx-0"></div>
                        <div className="flex items-center gap-4 justify-center sm:justify-start">
                            <div className="bg-slate-200 h-5 w-20 rounded"></div>
                            <div className="bg-slate-200 h-5 w-20 rounded"></div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="bg-slate-200 h-4 w-full rounded"></div>
                            <div className="bg-slate-200 h-4 w-5/6 rounded"></div>
                        </div>
                    </div>
                    <div className="bg-slate-200 h-10 w-28 rounded-lg flex-shrink-0"></div>
                </div>
            </div>

            <div className="h-6 w-40 bg-slate-200 rounded mb-4"></div>
            <div className="space-y-6">
                <div className="bg-card p-5 sm:p-6 rounded-2xl shadow-soft border border-slate-200/50">
                    <div className="flex items-start gap-4 w-full">
                        <div className="bg-slate-200 h-11 w-11 rounded-full flex-shrink-0"></div>
                        <div className="w-full mt-1 space-y-2">
                            <div className="bg-slate-200 h-4 w-1/3 rounded"></div>
                            <div className="bg-slate-200 h-3 w-1/4 rounded"></div>
                        </div>
                    </div>
                </div>
                <div className="bg-card p-5 sm:p-6 rounded-2xl shadow-soft border border-slate-200/50">
                    <div className="flex items-start gap-4 w-full">
                        <div className="bg-slate-200 h-11 w-11 rounded-full flex-shrink-0"></div>
                        <div className="w-full mt-1 space-y-2">
                            <div className="bg-slate-200 h-4 w-1/3 rounded"></div>
                            <div className="bg-slate-200 h-3 w-1/4 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePageSkeleton;
