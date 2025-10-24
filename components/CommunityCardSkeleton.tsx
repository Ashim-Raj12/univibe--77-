import React from 'react';

const CommunityCardSkeleton: React.FC = () => {
    return (
        <div className="bg-card rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full shimmer-container">
            <div className="h-24 bg-slate-200"></div>
            <div className="p-4">
                <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
                <div className="mt-3 space-y-2">
                    <div className="h-3 w-full bg-slate-200 rounded"></div>
                    <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                    <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                </div>
            </div>
        </div>
    );
};

export default CommunityCardSkeleton;
