import React from 'react';

const CommunityPageSkeleton: React.FC = () => {
    return (
        <div className="shimmer-container">
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50 mb-6 overflow-hidden">
                <div className="h-48 bg-slate-200"></div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <div className="h-9 w-64 bg-slate-200 rounded"></div>
                            <div className="flex items-center gap-x-4 mt-3">
                                <div className="h-5 w-24 bg-slate-200 rounded"></div>
                                <div className="h-5 w-24 bg-slate-200 rounded"></div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="h-4 w-full max-w-lg bg-slate-200 rounded"></div>
                                <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                        <div className="h-10 w-24 bg-slate-200 rounded-xl flex-shrink-0"></div>
                    </div>
                </div>
            </div>
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

export default CommunityPageSkeleton;
