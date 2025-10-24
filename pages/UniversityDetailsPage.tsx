import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import UniversityDetailsPageSkeleton from '../components/UniversityDetailsPageSkeleton';

// Simple markdown-to-JSX renderer for Gemini's output
const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const sections = text.split('\n\n'); // Split by double newlines into sections

    return (
        <div className="prose max-w-none text-text-body">
            {sections.map((section, index) => {
                let content = section.trim();

                // Handle headings (e.g., # Section Title)
                if (content.startsWith('# ')) {
                    content = content.substring(2);
                    return <h2 key={index} className="text-2xl font-bold text-text-heading mt-6 mb-2 first:mt-0">{content}</h2>;
                }

                // Handle list items (e.g., * Item)
                if (content.startsWith('* ')) {
                    const items = content.split('\n').map(item => item.replace(/^\*\s*/, '').trim());
                    return (
                        <ul key={index} className="list-disc list-inside space-y-1 my-4">
                            {items.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    );
                }
                
                // Handle bold text within paragraphs (e.g., **bold text**)
                const parts = content.split(/\*\*(.*?)\*\*/g);

                return (
                    <p key={index}>
                        {parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
                    </p>
                );
            })}
        </div>
    );
};


const UniversityDetailsPage: React.FC = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const [details, setDetails] = useState<string | null>(null);
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const universityName = name ? decodeURIComponent(name) : '';

    useEffect(() => {
        if (!universityName) {
            setError('University name not provided.');
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            setError(null);

            if (!process.env.API_KEY) {
                setError("This feature is currently unavailable. An API key is not configured.");
                setLoading(false);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Give me some key facts and interesting information about ${universityName}. Include things like its location, recent rankings, notable programs, and a fun fact. Format the response with markdown headings for sections.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        tools: [{ googleSearch: {} }],
                    },
                });

                setDetails(response.text);

                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks) {
                    setSources(groundingChunks);
                }

            } catch (err: any) {
                console.error("Gemini API error:", err);
                setError("Could not fetch university details. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [universityName]);
    
    if (loading) {
        return <UniversityDetailsPageSkeleton />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h1 className="text-3xl font-bold text-text-heading">{universityName}</h1>
            </div>
            
            {error ? (
                <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
                    <h2 className="font-bold">An Error Occurred</h2>
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50">
                        {details ? (
                            <SimpleMarkdownRenderer text={details} />
                        ) : (
                            <p>No details could be found for this university.</p>
                        )}
                    </div>
                    
                    {sources.length > 0 && (
                        <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50">
                            <h2 className="text-xl font-bold text-text-heading mb-4">Sources from Google Search</h2>
                            <ul className="space-y-3">
                                {sources.map((source, index) => {
                                    const webSource = source.web;
                                    if (!webSource || !webSource.uri) return null;
                                    return (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="w-5 h-5 flex-shrink-0 mt-1 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</div>
                                            <div>
                                                <a href={webSource.uri} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                                                    {webSource.title || webSource.uri}
                                                </a>
                                                <p className="text-xs text-text-muted truncate">{webSource.uri}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default UniversityDetailsPage;
