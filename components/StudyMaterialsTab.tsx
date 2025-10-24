import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { StudyMaterialWithUploader, MaterialRequestResponse } from '../types';
import Spinner from './Spinner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

// --- Reusable Components ---

const GenericFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const ImageFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const PdfFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111 2.586L15.414 7A1 1 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;

const FileIcon: React.FC<{ fileType: string | null }> = ({ fileType }) => {
    if (!fileType) return <GenericFileIcon />;
    if (fileType.startsWith('image/')) return <ImageFileIcon />;
    if (fileType === 'application/pdf') return <PdfFileIcon />;
    if (fileType === 'link') return <LinkIcon />;
    return <GenericFileIcon />;
};

const inputClasses = "w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300";

// --- Sub-Components for Material Exchange ---

// Form for sharing a new material/link
const ShareMaterialForm: React.FC<{ collegeName: string; onShareSuccess: () => void; }> = ({ collegeName, onShareSuccess }) => {
    const { user } = useAuth();
    const [shareType, setShareType] = useState<'file' | 'link'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        const isFileValid = shareType === 'file' && file;
        const isLinkValid = shareType === 'link' && linkUrl.trim();
        const finalTitle = shareType === 'file' ? file?.name : title.trim();

        if (!finalTitle || (!isFileValid && !isLinkValid)) {
            setError('Please provide a file or a link with a title.');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            let file_url: string;
            let file_name: string;
            let file_type: string;

            if (shareType === 'file' && file) {
                const filePath = `${collegeName}/${user!.id}/${Date.now()}_${file.name}`;
                const { data, error: uploadError } = await supabase.storage.from('study_hub_materials').upload(filePath, file);
                if (uploadError) throw uploadError;
                if (!data?.path) throw new Error("File upload failed, please try again.");
                
                const { data: { publicUrl } } = supabase.storage.from('study_hub_materials').getPublicUrl(data.path);
                file_url = publicUrl;
                file_name = file.name;
                file_type = file.type;
            } else { // Link
                file_url = linkUrl.trim();
                file_name = title.trim();
                file_type = 'link';
            }

            const { error: insertError } = await supabase.from('study_hub_materials').insert({
                user_id: user!.id,
                college_name: collegeName,
                title: finalTitle,
                file_name: file_name,
                file_url: file_url,
                file_type: file_type,
                description: description.trim() || null,
                is_request: false,
            });
            if (insertError) throw insertError;
            
            setFile(null); setTitle(''); setDescription(''); setLinkUrl('');
            if (fileInputRef.current) fileInputRef.current.value = "";
            
            setSuccess('Your resource has been shared successfully!');
            setTimeout(() => setSuccess(null), 4000);
            onShareSuccess();
        } catch (err: any) {
            setError('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <form onSubmit={handleShare} className="space-y-4">
            {success && <div className="p-3 bg-green-100 text-green-700 font-semibold text-sm rounded-lg">{success}</div>}
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="shareType" value="file" checked={shareType === 'file'} onChange={() => setShareType('file')} className="h-4 w-4 text-primary focus:ring-primary"/><span className="font-semibold">File</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="shareType" value="link" checked={shareType === 'link'} onChange={() => setShareType('link')} className="h-4 w-4 text-primary focus:ring-primary"/><span className="font-semibold">Link</span></label>
            </div>
            
            {shareType === 'file' ? (
                <div>
                    <label htmlFor="study-material-upload" className="block text-sm font-medium text-text-body mb-2">File</label>
                    <input ref={fileInputRef} id="study-material-upload" type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"/>
                </div>
            ) : (
                <>
                    <div>
                        <label htmlFor="file-title" className="block text-sm font-medium text-text-body mb-2">Title</label>
                        <input id="file-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Ultimate React Hooks Guide" className={inputClasses}/>
                    </div>
                    <div>
                        <label htmlFor="link-url" className="block text-sm font-medium text-text-body mb-2">Link URL</label>
                        <input id="link-url" type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required placeholder="https://example.com/resource" className={inputClasses}/>
                    </div>
                </>
            )}
            <div>
                <label htmlFor="file-description" className="block text-sm font-medium text-text-body mb-2">Description (Optional)</label>
                <textarea id="file-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this resource about?" className={inputClasses} rows={2}></textarea>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="text-right">
                <button type="submit" disabled={uploading} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 min-w-[120px] font-semibold">
                    {uploading ? <Spinner size="sm" /> : 'Share'}
                </button>
            </div>
        </form>
    );
};

// Form for requesting a material
const RequestMaterialForm: React.FC<{ collegeName: string; onShareSuccess: () => void; }> = ({ collegeName, onShareSuccess }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim()) return;
        
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
             const { error: insertError } = await supabase.from('study_hub_materials').insert({
                user_id: user.id,
                college_name: collegeName,
                title: title.trim(),
                description: description.trim() || null,
                is_request: true,
            });
            if (insertError) throw insertError;
            
            setTitle(''); setDescription('');
            setSuccess('Your request has been posted!');
            setTimeout(() => setSuccess(null), 4000);
            onShareSuccess();

        } catch (err: any) {
            setError('Failed to post request: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleRequest} className="space-y-4">
            {success && <div className="p-3 bg-green-100 text-green-700 font-semibold text-sm rounded-lg">{success}</div>}
            <div>
                <label className="block text-sm font-medium text-text-body mb-2">What material do you need?</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Last year's question paper for MA-101" className={inputClasses}/>
            </div>
            <div>
                <label className="block text-sm font-medium text-text-body mb-2">Description (Optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add any extra details..." className={inputClasses} rows={3}></textarea>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="text-right">
                <button type="submit" disabled={submitting} className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:opacity-50 min-w-[120px] font-semibold">
                    {submitting ? <Spinner size="sm" /> : 'Post Request'}
                </button>
            </div>
        </form>
    );
};

// Modal for fulfilling a request
const FulfillRequestModal: React.FC<{ request: StudyMaterialWithUploader; onClose: () => void; onSuccess: () => void; }> = ({ request, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [shareType, setShareType] = useState<'file' | 'link'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            let file_url: string;
            let file_name: string;
            let file_type: string;

            if (shareType === 'file' && file) {
                const filePath = `${request.college_name}/fulfillments/${user.id}/${Date.now()}_${file.name}`;
                const { data, error: uploadError } = await supabase.storage.from('study_hub_materials').upload(filePath, file);
                if (uploadError) throw uploadError;
                if (!data?.path) throw new Error("File upload failed, please try again.");

                const { data: { publicUrl } } = supabase.storage.from('study_hub_materials').getPublicUrl(data.path);
                file_url = publicUrl;
                file_name = file.name;
                file_type = file.type;
            } else if (shareType === 'link' && linkUrl.trim()) {
                file_url = linkUrl.trim();
                file_name = `Link for "${request.title}"`;
                file_type = 'link';
            } else {
                throw new Error('Please provide a file or a link.');
            }

            const { error: insertError } = await supabase.from('material_request_responses').insert({
                request_id: request.id,
                responder_id: user.id,
                file_url,
                file_name,
                file_type,
                message: message.trim() || null,
            });
            if (insertError) throw insertError;
            onSuccess();
        } catch (err: any) {
            setError('Submission failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Fulfill Request: {request.title}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="fulfillType" value="file" checked={shareType === 'file'} onChange={() => setShareType('file')} className="h-4 w-4 text-primary focus:ring-primary"/><span className="font-semibold">Upload File</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="fulfillType" value="link" checked={shareType === 'link'} onChange={() => setShareType('link')} className="h-4 w-4 text-primary focus:ring-primary"/><span className="font-semibold">Share Link</span></label>
                    </div>
                    {shareType === 'file' ? (
                        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required className="w-full text-sm"/>
                    ) : (
                        <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required placeholder="https://example.com/resource" className={inputClasses}/>
                    )}
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a message (optional)" className={inputClasses} rows={2}/>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="bg-slate-100 text-text-body px-4 py-2 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold min-w-[90px]">{loading ? <Spinner size="sm"/> : 'Submit'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Tab Component ---

const StudyMaterialsTab: React.FC = () => {
    const { user, profile } = useAuth();
    const [materials, setMaterials] = useState<StudyMaterialWithUploader[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'shared' | 'requests'>('shared');
    const [collegeFilter, setCollegeFilter] = useState('');
    
    // For fulfill modal
    const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
    const [fulfillingRequest, setFulfillingRequest] = useState<StudyMaterialWithUploader | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase.from('study_hub_materials').select('*, profiles!inner(*), material_request_responses(*, profiles:responder_id(*))');
            
            if (collegeFilter) {
                query = query.eq('college_name', collegeFilter);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setMaterials(data as any);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [collegeFilter]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('study-hub-materials-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_hub_materials' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'material_request_responses' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel) };
    }, [fetchData]);

    const handleDelete = async (fileId: number, fileUrl: string | null, fileType: string | null) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            if (fileType !== 'link' && fileUrl) {
                const path = fileUrl.split('/study_hub_materials/')[1];
                if (path) await supabase.storage.from('study_hub_materials').remove([decodeURIComponent(path)]);
            }
            const { error: dbError } = await supabase.from('study_hub_materials').delete().eq('id', fileId);
            if (dbError) throw dbError;
            fetchData();
        } catch(err: any) {
            alert("Failed to delete item: " + err.message);
        }
    };
    
    const handleMarkFulfilled = async (requestId: number) => {
        const { error } = await supabase.from('study_hub_materials').update({ status: 'fulfilled' }).eq('id', requestId);
        if (error) alert("Failed to update status: " + error.message);
        else fetchData();
    };

    const sharedMaterials = materials.filter(m => !m.is_request);
    const requestedMaterials = materials.filter(m => m.is_request && m.status === 'open');

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-8"><Spinner/></div>;
        if (error) return <p className="text-center text-red-500">{error}</p>;

        const list = activeTab === 'shared' ? sharedMaterials : requestedMaterials;
        
        if (list.length === 0) {
            return <div className="text-center text-text-muted py-10">No items found.</div>;
        }

        return (
            <div className="space-y-3">
                {list.map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-4">
                            {!item.is_request && <div className="text-text-muted flex-shrink-0 pt-1"><FileIcon fileType={item.file_type} /></div>}
                            <div className="flex-grow overflow-hidden">
                                <a href={item.file_url || '#'} target="_blank" rel="noopener noreferrer" className={`font-bold text-text-heading ${item.file_url ? 'hover:underline' : ''} truncate block`}>{item.title}</a>
                                {item.description && <p className="text-sm text-text-body mt-1">{item.description}</p>}
                                <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                                    {item.is_request ? 'Requested by' : 'Shared by'}
                                    <Link to={`/profile/${item.profiles.id}`} className="font-semibold hover:underline inline-flex items-center gap-1">{item.profiles.name} <VerifiedBadge profile={item.profiles} size="h-3 w-3" /></Link> 
                                    <span>&bull; {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                                </p>
                                <p className="text-xs font-semibold text-text-muted mt-1">{item.college_name}</p>
                            </div>
                            <div className="flex-shrink-0 text-right space-y-2">
                                {user?.id === item.user_id ? (
                                    <>
                                        <button onClick={() => handleDelete(item.id, item.file_url, item.file_type)} className="p-1.5 text-text-muted hover:text-red-500 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        {item.is_request && <button onClick={() => handleMarkFulfilled(item.id)} className="w-full text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold hover:bg-green-200">Mark Fulfilled</button>}
                                    </>
                                ) : (
                                    item.is_request && <button onClick={() => { setFulfillingRequest(item); setIsFulfillModalOpen(true); }} className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/20">Fulfill Request</button>
                                )}
                            </div>
                        </div>
                        {item.is_request && user?.id === item.user_id && item.material_request_responses && item.material_request_responses.length > 0 && (
                            <div className="mt-4 pt-3 border-t space-y-2">
                                <h4 className="text-xs font-bold text-text-muted">RESPONSES ({item.material_request_responses.length})</h4>
                                {item.material_request_responses.map(res => (
                                    <div key={res.id} className="p-2 bg-slate-50 rounded-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs">From <span className="font-semibold">{res.profiles.name}</span>: {res.message}</p>
                                                <a href={res.file_url!} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-semibold hover:underline">View Shared Material</a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-text-heading">Material Exchange</h2>
                    <div className="flex gap-2 p-1 bg-slate-200 rounded-lg">
                        <button onClick={() => setActiveTab('shared')} className={`px-3 py-1 text-sm font-semibold rounded-md ${activeTab === 'shared' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}>Shared</button>
                        <button onClick={() => setActiveTab('requests')} className={`px-3 py-1 text-sm font-semibold rounded-md ${activeTab === 'requests' ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}>Requests</button>
                    </div>
                </div>
                {activeTab === 'shared' ? <ShareMaterialForm collegeName={profile?.college || ''} onShareSuccess={fetchData} /> : <RequestMaterialForm collegeName={profile?.college || ''} onShareSuccess={fetchData} />}
            </div>
            
            <div>
                <input type="text" value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} placeholder="Filter by college..." className="w-full md:w-1/3 p-2 border rounded-lg mb-4 text-sm"/>
                {renderContent()}
            </div>

            {isFulfillModalOpen && fulfillingRequest && (
                <FulfillRequestModal 
                    request={fulfillingRequest} 
                    onClose={() => setIsFulfillModalOpen(false)} 
                    onSuccess={() => { setIsFulfillModalOpen(false); fetchData(); }} 
                />
            )}
        </div>
    );
};

export default StudyMaterialsTab;