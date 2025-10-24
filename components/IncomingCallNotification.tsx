import React, { useEffect, useRef } from 'react';
import { Profile } from '../types';

interface IncomingCallNotificationProps {
    call: {
        callerId: string;
        callerProfile: Profile;
        offer: any;
    };
    onAccept: () => void;
    onDecline: () => void;
}

const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({ call, onAccept, onDecline }) => {
    
    useEffect(() => {
        // Simple ringing sound using Web Audio API to avoid external files
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(941.0, audioContext.currentTime); // DTMF tone frequency
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

        let isPlaying = false;
        const playSound = () => {
            if (isPlaying) return;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(941.0, audioContext.currentTime);
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            osc.start(0);
            isPlaying = true;
            setTimeout(() => {
                osc.stop(0);
                isPlaying = false;
            }, 800);
        };
        
        const interval = setInterval(playSound, 2000); // Play every 2 seconds
        
        return () => {
            clearInterval(interval);
            try {
                oscillator.stop();
            } catch (e) {
                // Oscillator might already be stopped
            }
            audioContext.close();
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 z-[10002] flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in-up">
                <img
                    src={call.callerProfile.avatar_url || `https://avatar.vercel.sh/${call.callerId}.png`}
                    alt={call.callerProfile.name || ''}
                    className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                />
                <h2 className="text-2xl font-bold text-text-heading">{call.callerProfile.name}</h2>
                <p className="text-text-muted mt-1">is calling...</p>

                <div className="flex justify-center gap-6 mt-8">
                    <button
                        onClick={onDecline}
                        className="flex flex-col items-center gap-2 text-red-600 font-semibold"
                        aria-label="Decline call"
                        title="Decline call"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center transform hover:scale-105 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2 2m-2-2v4m0 0l-2 2m-2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex flex-col items-center gap-2 text-green-600 font-semibold"
                        aria-label="Accept call"
                        title="Accept call"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center transform hover:scale-105 transition-transform">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallNotification;
