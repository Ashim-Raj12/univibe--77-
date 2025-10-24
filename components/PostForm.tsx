import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';
import { Post, PostWithProfile } from '../types';

const GradientAvatar: React.FC<{ src?: string | null, alt: string, size?: string }> = React.memo(({ src, alt, size = 'h-11 w-11' }) => (
    <div className={`p-0.5 rounded-full bg-gradient-to-br from-primary to-secondary ${size} flex-shrink-0`}>
        <img
            src={src || `https://avatar.vercel.sh/${alt}.png?text=UV`}
            alt={alt}
            className="w-full h-full rounded-full object-cover bg-card p-0.5"
            loading="lazy"
            decoding="async"
        />
    </div>
));

interface PostFormProps {
    onNewPost: () => void;
    communityId?: number;
    isPostingRestricted?: boolean;
    isModeratorPostWithoutCommunity?: boolean;
}

const PostForm: React.FC<PostFormProps> = ({ onNewPost, communityId, isPostingRestricted = false, isModeratorPostWithoutCommunity = false }) => {
    const { user, profile } = useAuth();
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const removeImage = () => {
        setImageFile(null);
        setPreview(null);
        const fileInput = document.getElementById('post-image-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = "";
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !imageFile) return;
        if (!user || isPostingRestricted) return;

        setLoading(true);
        setError(null);

        try {
            let imageUrl: string | null = null;

            if (imageFile) {
                const filePath = `${user.id}/${Date.now()}_${imageFile.name}`;
                const { data, error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;
                if (!data?.path) throw new Error("File upload failed, please try again.");
                
                const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path);
                imageUrl = publicUrl;
            }
            
            const postData = {
                content: content.trim(),
                image_url: imageUrl,
                user_id: user.id,
                community_id: communityId || null,
                location: location.trim() || null,
            };

            const { data: newPostData, error: insertError } = await supabase
                .from('posts')
                .insert(postData)
                .select()
                .single();

            if (insertError) throw insertError;

            // Dispatch a global event with the new post data for any listening component (e.g., HomePage)
            if (profile) {
                const optimisticPost: PostWithProfile = {
                    ...newPostData,
                    profiles: profile,
                    likes: [],
                    comments: [{ count: 0 }],
                };
                window.dispatchEvent(new CustomEvent('new-post-created', { detail: optimisticPost }));
            }
            
            setContent('');
            setImageFile(null);
            setPreview(null);
            setLocation('');
            onNewPost();

        } catch (err: any) {
            console.error("Error creating post:", err);
            let message = "Could not create post. Please check your connection and try again.";
            if (err.message && err.message.includes('file size')) {
                message = "File is too large. Please upload a smaller image.";
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (isPostingRestricted) {
        return (
            <div className="p-4 text-center bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                <p className="font-bold">Posting Restricted</p>
                <p className="text-sm">You do not have permission to post in this community.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-4">
            {isModeratorPostWithoutCommunity && (
                <div className="mb-3 pl-16 text-sm font-semibold text-primary bg-primary/10 p-2 rounded-lg">
                    Note: Your college's official hub isn't set up. This announcement will be posted to the global Common Room.
                </div>
            )}
            <div className="flex items-start gap-4">
                <GradientAvatar src={profile?.avatar_url} alt={user?.id || 'user'} />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`What's on your mind, ${profile?.name ? profile.name.split(' ')[0] : 'User'}?`}
                    className="w-full p-3 bg-dark-card border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted text-base resize-none transition-all"
                    rows={3}
                />
            </div>
            {preview && (
                 <div className="mt-4 pl-16 relative">
                    <img src={preview} alt="Preview" className="max-h-80 rounded-xl object-cover w-full" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/75 transition-colors" title="Remove image">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            {error && <p className="text-red-500 text-sm mt-2 text-right">{error}</p>}
            <div className="flex justify-between items-center mt-3 pl-16">
                <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-text-muted hover:text-primary transition-colors p-2 -ml-2 rounded-full" title="Upload image">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <input id="post-image-upload" type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add location..."
                            className="w-full text-sm p-2 pl-8 bg-dark-card border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading placeholder:text-text-muted transition-all"
                        />
                         <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={loading || (!content.trim() && !imageFile)} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 flex items-center justify-center min-w-[100px] font-semibold shadow-soft hover:shadow-soft-md active:animate-press">
                    {loading ? <Spinner size="sm" /> : 'Post'}
                </button>
            </div>
        </form>
    );
};

export default React.memo(PostForm);