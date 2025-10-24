import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { StudyGroup } from '../types';
import Spinner from './Spinner';
import { useAuth } from '../hooks/useAuth';

interface EditGroupModalProps {
    group: StudyGroup;
    onClose: () => void;
    onSuccess: () => void;
    onDelete: () => void;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ group, onClose, onSuccess, onDelete }) => {
    const { user } = useAuth();
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(group.avatar_url);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            let newAvatarUrl = group.avatar_url;
            if (avatarFile) {
                const filePath = `${user.id}/group-avatars/${group.id}/${Date.now()}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
                newAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`;
            }

            const { error: updateError } = await supabase.from('study_groups')
                .update({ name, description, avatar_url: newAvatarUrl })
                .eq('id', group.id);

            if (updateError) throw updateError;
            
            onSuccess();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to permanently delete the group "${group.name}"? This will remove all members and messages.`)) {
            return;
        }
        setIsDeleting(true);
        setError(null);
        try {
            const { error: rpcError } = await supabase.rpc('delete_study_group', {
                group_id_to_delete: group.id
            });
            if (rpcError) throw rpcError;
            onDelete();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const inputClasses = "w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-heading";
    const labelClasses = "block text-sm font-medium text-text-body mb-1";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-text-heading">Edit Group Details</h2>
                     <button onClick={onClose} className="text-text-muted hover:text-text-heading" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="overflow-y-auto">
                    <form id="edit-group-form" onSubmit={handleUpdate} className="p-6 space-y-4">
                        <div className="flex flex-col items-center">
                            <img src={preview || `https://avatar.vercel.sh/${group.id}.png?text=${group.name[0]}`} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover mb-2"/>
                            <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                                Change Group Photo
                                <input type="file" onChange={handleFileChange} accept="image/*" className="hidden"/>
                            </label>
                        </div>
                        <div>
                            <label className={labelClasses}>Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required/>
                        </div>
                        <div>
                            <label className={labelClasses}>Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className={inputClasses} rows={3} />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </form>
                    
                    <div className="px-6 pb-6">
                        <div className="pt-4 mt-4 border-t border-red-200">
                            <h3 className="font-semibold text-red-700">Danger Zone</h3>
                            <p className="text-sm text-red-600 mt-1">Deleting the group will remove all members and messages permanently.</p>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm disabled:opacity-50"
                            >
                                {isDeleting ? <Spinner size="sm" /> : 'Delete this group'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-6 py-2 rounded-lg hover:bg-slate-200 transition font-semibold">Cancel</button>
                    <button type="submit" form="edit-group-form" disabled={loading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[90px] font-semibold">
                        {loading ? <Spinner size="sm"/> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditGroupModal;
