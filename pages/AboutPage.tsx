import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { TeamMember } from '../types';
import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';

const LinkedinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
);

const TwitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.616 1.923 2.397 3.328 4.491 3.365-2.012 1.574-4.549 2.502-7.34 2.502-.478 0-.947-.027-1.412-.084 2.618 1.68 5.734 2.649 9.049 2.649 10.956 0 17.03-9.143 16.717-17.332z"/></svg>
);

const GithubIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

const TeamMemberCard: React.FC<{ member: TeamMember }> = React.memo(({ member }) => {
    return (
        <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/50 text-center transform hover:-translate-y-2 transition-transform duration-300">
            <img src={member.avatar_url || `https://avatar.vercel.sh/${member.name}.png?text=${member.name.split(' ').map(n => n[0]).join('')}`} alt={member.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-slate-100 shadow-sm" loading="lazy" decoding="async" />
            <h3 className="font-bold text-lg text-text-heading">{member.name}</h3>
            <p className="text-sm text-primary font-semibold">{member.role}</p>
            <p className="text-sm text-text-body mt-2 h-16">{member.bio}</p>
            <div className="flex justify-center gap-4 mt-4 text-text-muted">
                {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><LinkedinIcon /></a>}
                {member.twitter_url && <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><TwitterIcon /></a>}
                {member.github_url && <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><GithubIcon /></a>}
            </div>
        </div>
    );
});


const AboutPage: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [termsContent, setTermsContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            const teamPromise = supabase
                .from('team_members')
                .select('*')
                .order('id', { ascending: true });
            
            const termsPromise = supabase
                .from('terms_and_conditions')
                .select('content')
                .eq('id', 1)
                .single();

            const [
                { data: teamData, error: teamError },
                { data: termsData, error: termsError }
            ] = await Promise.all([teamPromise, termsPromise]);
            
            if (teamData) setTeam(teamData);
            if (termsData) setTermsContent(termsData.content || '');

            if (teamError) {
                console.error("Error fetching team:", teamError);
                setError(teamError.message);
            }
            if (termsError && termsError.code !== 'PGRST116') { // Ignore if terms table is empty
                 console.error("Error fetching terms:", termsError);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-12 animate-fade-in-up">
            <div className="text-center p-8 bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <h1 className="text-4xl font-extrabold text-text-heading">About UniVibe</h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-text-body">
                    Connecting the next generation of students, before day one.
                </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50">
                <h2 className="text-3xl font-bold text-text-heading text-center">Our Mission</h2>
                <p className="mt-4 max-w-3xl mx-auto text-center text-text-body leading-relaxed">
                    UniVibe was born from a simple idea: the college journey should start with excitement, not anxiety. We believe that finding your people—future classmates, compatible roommates, and lifelong friends—should be easy and fun. Our mission is to bridge the gap between acceptance letters and the first day of class, creating a supportive network where students can build meaningful connections and feel a sense of belonging before they even step on campus.
                </p>
            </div>

            <div>
                <h2 className="text-3xl font-bold text-text-heading text-center mb-8">Meet Our Team</h2>
                 {loading ? (
                    <div className="flex justify-center"><Spinner size="lg" /></div>
                ) : error ? (
                    <p className="text-center text-red-500 bg-red-50 p-4 rounded-lg">Could not load team members: {error}</p>
                ) : team.length === 0 ? (
                    <p className="text-center text-text-muted bg-slate-50 p-4 rounded-lg">Team information is not available at the moment.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {team.map(member => (
                            <TeamMemberCard key={member.id} member={member} />
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-soft border border-slate-200/50">
                 <Link to="/advertisers" className="block group">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <h2 className="text-3xl font-bold text-text-heading">Our Advertisers</h2>
                            <p className="mt-2 text-text-body">Meet our partners and sponsors who support the UniVibe community.</p>
                        </div>
                        <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                 </Link>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50">
                <h2 className="text-3xl font-bold text-text-heading text-center">Terms & Conditions</h2>
                {loading ? <div className="flex justify-center mt-4"><Spinner /></div> : (
                     <div 
                        className="prose max-w-none mt-6"
                        dangerouslySetInnerHTML={{ __html: termsContent || '<p>Terms and conditions could not be loaded.</p>' }}
                    />
                )}
            </div>
        </div>
    );
};

export default AboutPage;