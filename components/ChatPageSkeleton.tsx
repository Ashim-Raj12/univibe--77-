import React from 'react';

const ChatPageSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto bg-card sm:rounded-2xl shadow-soft sm:border border-slate-200/50 shimmer-container">
            {/* Header */}
            <header className="p-4 border-b border-slate-200 flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-slate-200"></div>
                <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                <div>
                    <div className="h-5 w-32 bg-slate-200 rounded"></div>
                    <div className="h-3 w-20 bg-slate-200 rounded mt-1"></div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 p-4 overflow-y-auto space-y-6">
                <div className="flex items-end gap-2 justify-start">
                    <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                    <div className="h-12 w-48 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="flex items-end gap-2 justify-end">
                    <div className="h-16 w-56 bg-slate-300 rounded-lg"></div>
                </div>
                <div className="flex items-end gap-2 justify-start">
                    <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                    <div className="h-8 w-32 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="flex items-end gap-2 justify-end">
                    <div className="h-12 w-40 bg-slate-300 rounded-lg"></div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="h-12 w-12 bg-slate-100 rounded-lg flex-shrink-0"></div>
                    <div className="h-12 w-full bg-slate-100 rounded-lg"></div>
                    <div className="h-12 w-12 bg-slate-200 rounded-lg flex-shrink-0"></div>
                </div>
            </footer>
        </div>
    );
};

export default ChatPageSkeleton;
