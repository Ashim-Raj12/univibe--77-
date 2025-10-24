import React from 'react';
import { useNavigate } from 'react-router-dom';
import PostForm from '../components/PostForm';

const CreatePostPage: React.FC = () => {
    const navigate = useNavigate();

    const handleNewPost = () => {
        // The realtime subscription on HomePage/CommonRoomPage will show the new post.
        // Just navigate back.
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/home');
        }
    };

    return (
        <div className="flex flex-col h-full bg-card md:bg-transparent -mx-4 sm:-mx-6 lg:-mx-8 md:mx-0">
            <header className="p-4 border-b border-border flex items-center gap-4 sticky top-16 md:top-0 bg-card/80 backdrop-blur-sm z-10 md:hidden">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary rounded-full transition-colors" aria-label="Back">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-text-heading">Create Post</h1>
            </header>
            <div className="flex-1 overflow-y-auto">
                 <div className="md:bg-card md:rounded-2xl md:shadow-soft md:border md:border-border md:mt-8">
                    <PostForm onNewPost={handleNewPost} />
                </div>
            </div>
        </div>
    );
};

export default CreatePostPage;
