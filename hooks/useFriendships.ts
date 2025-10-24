import { useAuth } from './useAuth';

// This hook is now a lightweight wrapper around the global AuthContext 
// to provide friendship status and actions, ensuring a single source of truth.
export const useFriendships = () => {
    const { isFollowing, toggleFollow, mutatingFriendshipIds, friendshipsLoading } = useAuth();
    return { 
        isFollowing, 
        toggleFollow, 
        mutatingIds: mutatingFriendshipIds, 
        loading: friendshipsLoading 
    };
};