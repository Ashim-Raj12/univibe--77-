import { Profile } from './types';

export interface FacultyPost {
    id: number;
    author_id: string;
    title: string;
    content: string;
    attachments?: Array<{
        url: string;
        type: string;
        name: string;
    }>;
    pinned: boolean;
    created_at: string;
    updated_at: string;
    // Joined fields
    author?: Profile;
    reaction_counts?: Record<string, number>;
    user_reactions?: Record<string, boolean>;
    comment_count?: number;
}

export interface FacultyPostComment {
    id: number;
    post_id: number;
    author_id: string;
    content: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    author?: Profile;
    replies?: FacultyPostComment[];
}

export interface FacultyPostReaction {
    id: number;
    post_id: number;
    user_id: string;
    reaction_type: 'like' | 'heart' | 'celebrate' | 'insightful' | 'support';
    created_at: string;
}