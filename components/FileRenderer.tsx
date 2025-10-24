import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import Spinner from './Spinner';

// --- VoiceNotePlayer Component ---

const PlayIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);

const formatTime = (time: number) => {
  if (isNaN(time) || time === Infinity) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VoiceNotePlayer: React.FC<{ src: string, isSender: boolean }> = React.memo(({ src, isSender }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    }

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => console.error("Audio play failed:", error));
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const progressBar = progressBarRef.current;
    const audio = audioRef.current;
    if (!progressBar || !audio || duration === 0 || !isFinite(duration)) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    audio.currentTime = duration * percentage;
    setCurrentTime(duration * percentage);
  };
  
  const progress = duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  const progressBg = isSender ? 'bg-white/30' : 'bg-slate-400/50';
  const progressFg = isSender ? 'bg-white' : 'bg-primary';
  const thumbBorder = isSender ? 'border-white' : 'border-primary';
  const buttonBg = isSender ? 'bg-white/20 hover:bg-white/30' : 'bg-black/10 hover:bg-black/20';

  return (
    <div className="flex items-center gap-3 w-60" onClick={e => e.stopPropagation()}>
      <audio ref={audioRef} src={src} preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
      <button type="button" onClick={togglePlayPause} className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-transform active:scale-90 ${buttonBg}`}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="flex-grow flex items-center gap-2">
        <div 
          ref={progressBarRef}
          onClick={handleProgressClick}
          className={`w-full h-1 ${progressBg} rounded-full cursor-pointer group`}
        >
          <div 
            style={{ width: `${progress}%` }} 
            className={`h-full ${progressFg} rounded-full relative transition-all duration-75 ease-linear`}
          >
             <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${thumbBorder}`}></div>
          </div>
        </div>
        <span className="text-xs font-mono w-12 text-right opacity-80">{formatTime(duration)}</span>
      </div>
    </div>
  );
});

// --- End of VoiceNotePlayer ---

interface FileRendererProps {
    filePath: string;
    fileType: string;
    fileName?: string | null;
    fromBucket: 'chat-files' | 'community-files';
    isSender?: boolean;
}

const FileRenderer: React.FC<FileRendererProps> = ({ filePath, fileType, fileName, fromBucket, isSender = false }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!filePath) {
            setLoading(false);
            return;
        }

        // If the path is already a full URL (e.g., optimistic blob URL), use it directly.
        if (filePath.startsWith('http') || filePath.startsWith('blob:')) {
            setUrl(filePath);
            setLoading(false);
            return;
        }

        // For Supabase storage paths, construct the public URL.
        // This assumes the bucket is public.
        setLoading(true);
        const { data } = supabase.storage
            .from(fromBucket)
            .getPublicUrl(filePath);

        if (data?.publicUrl) {
            setUrl(data.publicUrl);
        } else {
            console.error('Could not get public URL for:', filePath);
            setUrl(null);
        }
        setLoading(false);
        
    }, [filePath, fromBucket]);

    if (loading) {
        return <div className="mt-2 flex justify-center items-center h-24 w-48 bg-slate-100 rounded-lg"><Spinner size="sm" /></div>;
    }

    if (!url) {
        return <div className="mt-2 text-red-600 text-xs p-2 bg-red-100 rounded-lg">Could not load file.</div>;
    }

    if (fileType.startsWith('image/')) {
        return <img src={url} alt="Shared content" className="mt-2 rounded-lg max-w-full h-auto max-h-64 object-contain" />;
    }

    if (fileType.startsWith('audio/')) {
        return <VoiceNotePlayer src={url} isSender={isSender} />;
    }
    
    const displayFileName = fileName || filePath.split('/').pop()?.split('_').slice(1).join('_') || 'Download File';
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" download={displayFileName} title={displayFileName} className="mt-2 flex items-center gap-2 bg-slate-300/50 p-2 rounded-lg hover:bg-slate-300/80 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="truncate text-sm">{displayFileName}</span>
        </a>
    );
};

export default FileRenderer;
