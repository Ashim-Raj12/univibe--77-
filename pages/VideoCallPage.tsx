import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

const MicOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const MicOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.083A7.002 7.002 0 0118 11c0 3.771-2.946 6.846-6.702 6.995l-1.298 1.298m-2.828-2.828l-2.61-2.61A7.002 7.002 0 014 11c0-1.77.642-3.412 1.732-4.661m1.414 1.414A5.002 5.002 0 006 11c0 2.761 2.239 5 5 5m-2.646-2.646l.228.228m1.292-1.292l-2.828 2.828m0 0l-1.298 1.298A7.002 7.002 0 014 11" /></svg>;
const CamOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const CamOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M1 18h12a2 2 0 002-2V8a2 2 0 00-2-2H1a2 2 0 00-2 2v8a2 2 0 002 2zM1 10h.01M1 14h.01" /></svg>;
const EndCallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2 2m-2-2v4m0 0l-2 2m-2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const VideoCallPage: React.FC = () => {
    const { recipientId } = useParams<{ recipientId: string }>();
    const { user, profile: currentUserProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [recipient, setRecipient] = useState<Profile | null>(null);
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    
    const isCaller = !location.state?.offer;

    const cleanup = useCallback(() => {
        console.log('Cleaning up call...');
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        if (channelRef.current) supabase.removeChannel(channelRef.current);
    }, []);

    useEffect(() => {
        // Fetch recipient profile on load
        const fetchRecipient = async () => {
            if (!recipientId) return;
            const { data } = await supabase.from('profiles').select('*').eq('id', recipientId).single();
            if (data) setRecipient(data);
            else navigate('/home', { replace: true });
        };
        fetchRecipient();
    }, [recipientId, navigate]);

    useEffect(() => {
        if (!user || !currentUserProfile || !recipientId) return;

        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                peerConnectionRef.current = pc;

                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                pc.onicecandidate = event => {
                    if (event.candidate) {
                        channelRef.current?.send({
                            type: 'broadcast',
                            event: 'webrtc-ice-candidate',
                            payload: { candidate: event.candidate },
                        });
                    }
                };

                pc.ontrack = event => {
                    if (event.streams && event.streams[0]) {
                        remoteStreamRef.current = event.streams[0];
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = event.streams[0];
                        }
                    } else {
                        if (!remoteStreamRef.current) {
                            remoteStreamRef.current = new MediaStream();
                            if (remoteVideoRef.current) {
                                remoteVideoRef.current.srcObject = remoteStreamRef.current;
                            }
                        }
                        remoteStreamRef.current.addTrack(event.track);
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    if (pc.iceConnectionState === 'connected') {
                        setCallStatus('connected');
                    } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        handleEndCall();
                    }
                };
                
                // Channel for SENDING signals to the other user
                const channel = supabase.channel(`video-call-${recipientId}`);
                channelRef.current = channel;

                // Channel for LISTENING to signals from the other user
                const signalingChannel = supabase.channel(`video-call-${user.id}`);
                
                signalingChannel.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
                    if (pc.signalingState !== 'have-local-offer') return;
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                });
                
                signalingChannel.on('broadcast', { event: 'webrtc-ice-candidate' }, async ({ payload }) => {
                    if (payload.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    }
                });

                signalingChannel.on('broadcast', { event: 'call-accepted' }, () => {
                    if (isCaller) setCallStatus('connected');
                });
                
                signalingChannel.on('broadcast', { event: 'call-declined' }, handleEndCall);
                signalingChannel.on('broadcast', { event: 'call-ended' }, handleEndCall);
                
                signalingChannel.subscribe();

                if (isCaller) {
                    setCallStatus('calling');
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    
                    channel.send({
                        type: 'broadcast',
                        event: 'webrtc-offer',
                        payload: { offer, callerProfile: currentUserProfile }
                    });
                } else { // Callee
                    const offer = location.state.offer;
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    const answerChannel = supabase.channel(`video-call-${recipientId}`);
                    answerChannel.send({
                        type: 'broadcast',
                        event: 'webrtc-answer',
                        payload: { answer }
                    }).then(() => supabase.removeChannel(answerChannel));
                    
                    const acceptChannel = supabase.channel(`video-call-${recipientId}`);
                     acceptChannel.send({
                        type: 'broadcast',
                        event: 'call-accepted',
                        payload: {}
                    }).then(() => supabase.removeChannel(acceptChannel));

                    setCallStatus('connected');
                }
            } catch (err) {
                console.error("Error setting up call:", err);
                alert("Could not start video call. Please check permissions and try again.");
                handleEndCall();
            }
        };

        init();
        return cleanup;
    }, [user, recipientId, isCaller, location.state, navigate, currentUserProfile, cleanup]);
    
    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) };
    }, [callStatus]);

    const toggleMic = () => {
        localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
        setIsMicMuted(prev => !prev);
    };

    const toggleCam = () => {
        localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
        setIsCamOff(prev => !prev);
    };

    const handleEndCall = () => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'call-ended',
            payload: {}
        });
        cleanup();
        setCallStatus('ended');
        navigate(-1);
    };
    
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (!recipient) {
        return <div className="fixed inset-0 bg-gray-900 flex items-center justify-center"><Spinner size="lg" /></div>;
    }

    return (
        <div className="fixed inset-0 bg-gray-800 text-white flex flex-col items-center justify-center z-50 animate-fade-in-up">
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover bg-gray-900"></video>
            <div className="absolute inset-0 bg-black/40"></div>
            
            <div className="absolute top-6 text-center z-10 p-4 bg-black/20 rounded-lg">
                <h2 className="text-2xl font-bold">{recipient.name}</h2>
                <p className="text-lg font-mono capitalize">{callStatus === 'calling' ? 'Ringing...' : callStatus === 'connected' ? formatDuration(callDuration) : 'Connecting...'}</p>
            </div>

            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-28 right-4 w-32 md:w-48 h-auto rounded-lg shadow-lg border-2 border-white/50 z-20"></video>

            <div className="absolute bottom-6 flex items-center gap-4 z-10 bg-black/30 backdrop-blur-sm p-3 rounded-full">
                <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${isMicMuted ? 'bg-red-500 text-white' : 'bg-white/20'}`} aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'} title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}>
                    {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
                </button>
                <button onClick={toggleCam} className={`p-3 rounded-full transition-colors ${isCamOff ? 'bg-red-500 text-white' : 'bg-white/20'}`} aria-label={isCamOff ? 'Turn camera on' : 'Turn camera off'} title={isCamOff ? 'Turn camera on' : 'Turn camera off'}>
                    {isCamOff ? <CamOffIcon /> : <CamOnIcon />}
                </button>
                 <button onClick={handleEndCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors" aria-label="End call" title="End call">
                    <EndCallIcon />
                </button>
            </div>
        </div>
    );
};

export default VideoCallPage;
