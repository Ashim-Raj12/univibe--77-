import React from 'react';

const ConversationItemSkeleton: React.FC = () => {
    return (
        <div className="flex items-center gap-4 p-3 shimmer-container">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0"></div>
            <div className="flex-1 overflow-hidden space-y-2">
                <div className="flex justify-between items-center">
                    <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                    <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                </div>
                <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
            </div>
        </div>
    );
};

export default ConversationItemSkeleton;
