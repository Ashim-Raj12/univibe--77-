import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { AppFile } from '../../types';
import Spinner from '../../components/Spinner';
import { format } from 'date-fns';

const AdminAppManagementPage: React.FC = () => {
    const [platform, setPlatform] = useState<'android' | 'ios'>('android');
    const [version, setVersion] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [currentFiles, setCurrentFiles] = useState<AppFile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCurrentFiles = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('app_files').select('*').order('created_at', { ascending: false });
        if (data) setCurrentFiles(data);
        if (error) setError(error.message);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCurrentFiles();
    }, [fetchCurrentFiles]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !version.trim()) {
            setError('Please provide a version and select a file.');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            const fileExtension = file.name.split('.').pop();
            const filePath = `releases/${platform}_${version}_${Date.now()}.${fileExtension}`;
            
            const { error: uploadError } = await supabase.storage
                .from('app-releases')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('app-releases').getPublicUrl(filePath);

            const { error: rpcError } = await supabase.rpc('admin_add_app_file', {
                p_platform: platform,
                p_version: version,
                p_file_url: publicUrl
            });

            if (rpcError) throw rpcError;

            setSuccess(`Version ${version} for ${platform} uploaded successfully!`);
            setVersion('');
            setFile(null);
            const fileInput = document.getElementById('app-file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = "";
            fetchCurrentFiles();

        } catch (err: any) {
            setError('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };
    
    const handleDelete = async (fileToDelete: AppFile) => {
        if (!window.confirm(`Are you sure you want to delete version ${fileToDelete.version} for ${fileToDelete.platform}? This will also remove the file from storage.`)) return;

        try {
            const { error: dbError } = await supabase.from('app_files').delete().eq('id', fileToDelete.id);
            if (dbError) throw dbError;

            const filePath = fileToDelete.file_url.split('/app-releases/')[1];
            if (filePath) {
                const { error: storageError } = await supabase.storage.from('app-releases').remove([decodeURIComponent(filePath)]);
                if (storageError) console.warn("Could not delete from storage:", storageError.message);
            }
            
            fetchCurrentFiles();

        } catch (err: any) {
            alert('Deletion failed: ' + err.message);
        }
    }

    const inputClasses = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-slate-800">App Management</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Upload New Version</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 font-semibold text-sm rounded-lg">{error}</div>}
                    {success && <div className="p-3 bg-green-100 text-green-700 font-semibold text-sm rounded-lg">{success}</div>}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Platform</label>
                            <select value={platform} onChange={e => setPlatform(e.target.value as any)} className={inputClasses}>
                                <option value="android">Android (.apk)</option>
                                <option value="ios">iOS (.ipa)</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Version</label>
                            <input type="text" value={version} onChange={e => setVersion(e.target.value)} className={inputClasses} placeholder="e.g., 1.0.1" required />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">App File</label>
                            <input id="app-file-upload" type="file" onChange={e => setFile(e.target.files?.[0] || null)} required className="text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <button type="submit" disabled={uploading} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus transition-colors disabled:bg-slate-400 flex items-center justify-center min-w-[120px] font-semibold ml-auto">
                            {uploading ? <Spinner size="sm" /> : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                <h2 className="text-lg font-semibold text-slate-700 p-4 border-b">Current App Files</h2>
                {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Platform</th>
                                <th className="px-6 py-3">Version</th>
                                <th className="px-6 py-3">File URL</th>
                                <th className="px-6 py-3">Uploaded On</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {currentFiles.map(file => (
                                <tr key={file.id}>
                                    <td className="px-6 py-4 font-medium capitalize">{file.platform}</td>
                                    <td className="px-6 py-4">{file.version}</td>
                                    <td className="px-6 py-4"><a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-xs">{file.file_url}</a></td>
                                    <td className="px-6 py-4 text-slate-600">{format(new Date(file.created_at), 'PPp')}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(file)} className="font-semibold text-red-600 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
            </div>
        </div>
    );
};

export default AdminAppManagementPage;