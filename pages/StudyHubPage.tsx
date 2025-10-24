import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import StudyMaterialsTab from '../components/StudyMaterialsTab';
import StudyGroupsTab from '../components/StudyGroupsTab';
import UpgradeToPro from '../components/UpgradeToPro';
import DoubtForumTab from '../components/DoubtForumTab'; 

type ActiveTab = 'doubt-forum' | 'materials' | 'groups';

const StudyHubPage: React.FC = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('doubt-forum');

    const TabButton: React.FC<{ tabName: ActiveTab; icon: React.ReactNode; children: React.ReactNode }> = ({ tabName, icon, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 whitespace-nowrap py-4 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none ${
                activeTab === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
            }`}
        >
            {icon}
            {children}
        </button>
    );

    const icons = {
        materials: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z" /><path d="M4 12a2 2 0 012-2h10a2 2 0 110 4H6a2 2 0 01-2-2z" /></svg>,
        groups: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>,
        doubtForum: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-heading">Study Hub</h1>
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <div className="border-b border-slate-200/80">
                    <nav className="-mb-px flex space-x-2 sm:space-x-6 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                        <TabButton tabName="doubt-forum" icon={icons.doubtForum}>Doubt Forum</TabButton>
                        <TabButton tabName="materials" icon={icons.materials}>Material Exchange</TabButton>
                        <TabButton tabName="groups" icon={icons.groups}>Study Groups</TabButton>
                    </nav>
                </div>

                <div className="p-2 sm:p-4">
                    {
                        (activeTab === 'doubt-forum' && <DoubtForumTab />) ||
                        (activeTab === 'materials' && <StudyMaterialsTab />) ||
                        (activeTab === 'groups' && <StudyGroupsTab />)
                    }
                </div>
            </div>
        </div>
    );
};

export default StudyHubPage;