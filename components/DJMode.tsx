import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Track } from '../types';
import { CloseIcon, PlayIcon, PauseIcon, SearchIcon, MinimizeIcon, MaximizeIcon, AutoMixIcon, RecordIcon } from './Icons';

// A simple turntable visual component
const Turntable: React.FC<{ isPlaying: boolean; track: Track | null }> = ({ isPlaying, track }) => (
    <div className="relative w-48 h-48 sm:w-64 sm:h-64 bg-zinc-800 rounded-full flex items-center justify-center border-4 border-zinc-700 shadow-lg">
        <div className="w-4/5 h-4/5 bg-zinc-900 rounded-full flex items-center justify-center">
            {/* Spinning part */}
            <div className={`w-full h-full rounded-full transition-transform duration-1000 ease-linear ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }}>
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center relative">
                    {/* Record Grooves */}
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="absolute border border-zinc-700/50 rounded-full" style={{ width: `${10 + i * 8}%`, height: `${10 + i * 8}%` }}></div>
                    ))}
                    {/* Center Label */}
                    <div className="absolute w-1/3 h-1/3 bg-rose-500 rounded-full flex flex-col items-center justify-center text-center p-1">
                        <p className="text-white font-bold text-[8px] sm:text-[10px] leading-tight break-words" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{track?.name ?? 'No Track'}</p>
                    </div>
                    {/* Spindle */}
                    <div className="absolute w-2 h-2 bg-zinc-400 rounded-full border border-zinc-500"></div>
                </div>
            </div>
        </div>
        {/* Stylus/Arm */}
        <div className="absolute top-1/2 -right-12 sm:-right-16 -translate-y-full w-16 h-16 sm:w-20 sm:h-20">
            <div className={`w-full h-2 bg-zinc-500 rounded-full origin-bottom-left transition-transform duration-500 ${isPlaying ? 'rotate-[15deg]' : 'rotate-[5deg]'}`}>
                <div className="w-4 h-4 bg-zinc-600 rounded-sm absolute right-0 -top-1"></div>
            </div>
        </div>
    </div>
);

// Track selector modal
const TrackSelector: React.FC<{
    tracks: Track[];
    onSelect: (track: Track) => void;
    onClose: () => void;
}> = ({ tracks, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const filteredTracks = useMemo(() => 
        tracks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    , [tracks, search]);

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-[var(--bg-secondary)] rounded-lg w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-[var(--border-primary)] flex items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                        <input 
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search tracks..."
                            className="w-full bg-[var(--bg-tertiary)] rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:outline-none"
                        />
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]"><CloseIcon /></button>
                </header>
                <ul className="overflow-y-auto p-2">
                    {filteredTracks.map(track => (
                        <li key={track.url}>
                            <button onClick={() => onSelect(track)} className="w-full text-left p-2 rounded-md hover:bg-[var(--bg-tertiary)]/70 transition-colors">
                                {track.name}
                            </button>
                        </li>
                    ))}
                    {filteredTracks.length === 0 && <p className="text-center p-4 text-[var(--text-muted)]">No tracks found.</p>}
                </ul>
            </div>
        </div>
    );
};

// Main DJ Mode component
interface DJModeProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  tracks: Track[];
  volume: number; // Master volume from main player
  currentTrack: Track | null;
}

const DJMode: React.FC<DJModeProps> = ({ isOpen, isMinimized, onClose, onToggleMinimize, tracks, volume, currentTrack }) => {
    const [trackA, setTrackA] = useState<Track | null>(null);
    const [trackB, setTrackB] = useState<Track | null>(null);
    const [isPlayingA, setIsPlayingA] = useState(false);
    const [isPlayingB, setIsPlayingB] = useState(false);
    const [pitchA, setPitchA] = useState(1);
    const [pitchB, setPitchB] = useState(1);
    const [crossfade, setCrossfade] = useState(0); // -1 (A) to 1 (B)
    const [isTrackSelectorOpenFor, setIsTrackSelectorOpenFor] = useState<'A' | 'B' | null>(null);
    const [isAutoMixing, setIsAutoMixing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const audioRefA = useRef<HTMLAudioElement>(null);
    const audioRefB = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeARef = useRef<GainNode | null>(null);
    const gainNodeBRef = useRef<GainNode | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const animationFrameRef = useRef<number>();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recorderDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    useEffect(() => {
        // When DJ mode is opened, if Deck A is empty, load the current track from the main player.
        // This effectively loads it on the "first load" without overwriting a user's session.
        if (isOpen && !trackA && currentTrack) {
            setTrackA(currentTrack);
            if (audioRefA.current) {
                audioRefA.current.src = currentTrack.url;
                audioRefA.current.load();
            }
        }
    }, [isOpen, currentTrack, trackA]);

    // Setup Web Audio API
    useEffect(() => {
        if (isOpen && !audioContextRef.current && tracks.length > 0) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const sourceA = context.createMediaElementSource(audioRefA.current!);
            const sourceB = context.createMediaElementSource(audioRefB.current!);
            const gainA = context.createGain();
            const gainB = context.createGain();
            const masterGain = context.createGain();

            sourceA.connect(gainA).connect(masterGain).connect(context.destination);
            sourceB.connect(gainB).connect(masterGain).connect(context.destination);
            
            audioContextRef.current = context;
            gainNodeARef.current = gainA;
            gainNodeBRef.current = gainB;
            masterGainRef.current = masterGain;
        } else if (!isOpen && audioContextRef.current) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    }, [isOpen, tracks.length]);

    // Handle master volume
    useEffect(() => {
        if (masterGainRef.current) {
            masterGainRef.current.gain.value = volume;
        }
    }, [volume]);
    
    // Handle crossfader
    useEffect(() => {
        if (!gainNodeARef.current || !gainNodeBRef.current) return;
        // Constant power crossfade
        const x = (crossfade + 1) / 2; // Map -1 to 1 range to 0 to 1
        const angle = x * 0.5 * Math.PI;
        gainNodeARef.current.gain.value = Math.cos(angle);
        gainNodeBRef.current.gain.value = Math.sin(angle);
    }, [crossfade]);

    const playPause = useCallback((deck: 'A' | 'B') => {
        const context = audioContextRef.current;
        if (context?.state === 'suspended') {
            context.resume().catch(console.error);
        }
        if (deck === 'A') setIsPlayingA(p => !p);
        else setIsPlayingB(p => !p);
    }, []);
    
    useEffect(() => {
        isPlayingA ? audioRefA.current?.play().catch(console.error) : audioRefA.current?.pause();
    }, [isPlayingA]);
    
    useEffect(() => {
        isPlayingB ? audioRefB.current?.play().catch(console.error) : audioRefB.current?.pause();
    }, [isPlayingB]);

    useEffect(() => { if(audioRefA.current) audioRefA.current.playbackRate = pitchA; }, [pitchA]);
    useEffect(() => { if(audioRefB.current) audioRefB.current.playbackRate = pitchB; }, [pitchB]);

    const handleCue = (deck: 'A' | 'B') => {
        if (deck === 'A' && audioRefA.current) {
            setIsPlayingA(false);
            audioRefA.current.currentTime = 0;
        }
        if (deck === 'B' && audioRefB.current) {
            setIsPlayingB(false);
            audioRefB.current.currentTime = 0;
        }
    };

    const handleSelectTrack = (track: Track) => {
        if (isTrackSelectorOpenFor === 'A') {
            setTrackA(track);
            if (audioRefA.current) {
                audioRefA.current.src = track.url;
                audioRefA.current.load();
            }
            setIsPlayingA(false);
        } else if (isTrackSelectorOpenFor === 'B') {
            setTrackB(track);
            if (audioRefB.current) {
                audioRefB.current.src = track.url;
                audioRefB.current.load();
            }
            setIsPlayingB(false);
        }
        setIsTrackSelectorOpenFor(null);
    };

    const handleAutoMix = useCallback(() => {
        if (isAutoMixing || !trackA || !trackB) return;

        const autoMixDuration = 8000; // 8 seconds for a smooth mix
        setIsAutoMixing(true);
        const startValue = crossfade;
        const targetValue = startValue < 0 ? 1 : -1;
        let startTime: number | null = null;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const progress = Math.min(elapsedTime / autoMixDuration, 1);
            
            const easedProgress = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const newCrossfade = startValue + (targetValue - startValue) * easedProgress;
            setCrossfade(newCrossfade);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setCrossfade(targetValue);
                setIsAutoMixing(false);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

    }, [crossfade, isAutoMixing, trackA, trackB]);

    const handleToggleRecording = useCallback(() => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
        } else {
            if (!audioContextRef.current || !masterGainRef.current) {
                alert("Audio context not ready. Please load and play a track first.");
                return;
            }

            const destination = audioContextRef.current.createMediaStreamDestination();
            recorderDestinationRef.current = destination;
            masterGainRef.current.connect(destination);

            const options = { mimeType: 'audio/webm; codecs=opus' };
            const recorder = new MediaRecorder(destination.stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
            
            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const fileExtension = mimeType.split('/')[1].split(';')[0];
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                
                const now = new Date();
                const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
                
                a.href = url;
                a.download = `DJ-Mix-${timestamp}.${fileExtension}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                recordedChunksRef.current = [];
                setIsRecording(false);
                
                if (masterGainRef.current && recorderDestinationRef.current) {
                    masterGainRef.current.disconnect(recorderDestinationRef.current);
                    recorderDestinationRef.current = null;
                }
            };

            recorder.start();
            setIsRecording(true);
        }
    }, [isRecording]);


    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);


    if (!isOpen) return null;

    const containerClasses = isMinimized
        ? "fixed bottom-6 right-6 w-96 bg-zinc-900/80 backdrop-blur-md rounded-lg shadow-2xl z-50 text-white animate-fade-in-up"
        : "fixed inset-0 bg-black/95 z-50 flex p-4 sm:p-6 text-white animate-fade-in-up";

    return (
        <>
            <div className={containerClasses} onClick={isMinimized ? e => e.stopPropagation() : onClose}>
                {isMinimized ? (
                    <>
                        <header className="p-2 border-b border-[var(--border-primary)] flex justify-between items-center">
                            <h3 className="font-bold text-sm text-[var(--accent-primary)]">DJ Mode</h3>
                            <div className="flex items-center">
                                <button onClick={onToggleMinimize} className="p-1 rounded-full hover:bg-white/10 transition" title="Maximize"><MaximizeIcon className="w-5 h-5"/></button>
                                <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition" title="Close DJ Mode"><CloseIcon className="w-5 h-5"/></button>
                            </div>
                        </header>
                        <div className="p-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <button onClick={() => playPause('A')} disabled={!trackA} className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600 flex-shrink-0">
                                    {isPlayingA ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                </button>
                                <p className="text-xs truncate flex-grow" title={trackA?.name}>{trackA?.name || 'Deck A Empty'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => playPause('B')} disabled={!trackB} className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600 flex-shrink-0">
                                    {isPlayingB ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                </button>
                                <p className="text-xs truncate flex-grow" title={trackB?.name}>{trackB?.name || 'Deck B Empty'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">A</span>
                                <input type="range" min="-1" max="1" step="0.01" value={crossfade} onChange={e => setCrossfade(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                <span className="font-bold text-xs">B</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex-shrink-0 flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-[var(--accent-primary)]" style={{fontFamily: 'var(--font-family)'}}>DJ MODE</h2>
                            <div className="flex items-center">
                                <button onClick={onToggleMinimize} title="Minimize" className="p-2 rounded-full hover:bg-white/10 transition"><MinimizeIcon className="w-8 h-8"/></button>
                                <button onClick={onClose} title="Close DJ Mode" className="p-2 rounded-full hover:bg-white/10 transition"><CloseIcon className="w-8 h-8"/></button>
                            </div>
                        </div>
                        
                        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 overflow-auto">
                            {/* DECK A */}
                            <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-between gap-4">
                                <button onClick={() => setIsTrackSelectorOpenFor('A')} className="w-full bg-[var(--bg-tertiary)] py-2 rounded-md hover:bg-[var(--bg-tertiary)]/70 transition truncate px-4">{trackA?.name || 'Load Track A'}</button>
                                <Turntable isPlaying={isPlayingA} track={trackA} />
                                <div className="w-full flex items-center justify-around gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={pitchA} onChange={e => setPitchA(Number(e.target.value))} className="w-24 h-1.5 appearance-none rounded-full bg-[var(--bg-tertiary)] cursor-pointer -rotate-90 origin-bottom-center" />
                                        <label className="text-xs">PITCH</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleCue('A')} disabled={!trackA} className="bg-yellow-500 text-black font-bold rounded-md px-4 py-2 disabled:opacity-50">CUE</button>
                                        <button onClick={() => playPause('A')} disabled={!trackA} className="w-16 h-16 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600">
                                            {isPlayingA ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* DECK B */}
                            <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-between gap-4">
                                <button onClick={() => setIsTrackSelectorOpenFor('B')} className="w-full bg-[var(--bg-tertiary)] py-2 rounded-md hover:bg-[var(--bg-tertiary)]/70 transition truncate px-4">{trackB?.name || 'Load Track B'}</button>
                                <Turntable isPlaying={isPlayingB} track={trackB} />
                                <div className="w-full flex items-center justify-around gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={pitchB} onChange={e => setPitchB(Number(e.target.value))} className="w-24 h-1.5 appearance-none rounded-full bg-[var(--bg-tertiary)] cursor-pointer -rotate-90 origin-bottom-center" />
                                        <label className="text-xs">PITCH</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleCue('B')} disabled={!trackB} className="bg-yellow-500 text-black font-bold rounded-md px-4 py-2 disabled:opacity-50">CUE</button>
                                        <button onClick={() => playPause('B')} disabled={!trackB} className="w-16 h-16 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600">
                                            {isPlayingB ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 pt-4">
                            <div className="flex items-center gap-4">
                                <span className="font-bold">A</span>
                                <input type="range" min="-1" max="1" step="0.01" value={crossfade} onChange={e => setCrossfade(Number(e.target.value))} disabled={isAutoMixing} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50" />
                                <span className="font-bold">B</span>
                                <button
                                    onClick={handleToggleRecording}
                                    disabled={isAutoMixing}
                                    className={`p-2 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 transition text-red-500 disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:bg-zinc-800 ${isRecording ? 'animate-pulse' : ''}`}
                                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                                >
                                    <RecordIcon className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleAutoMix}
                                    disabled={!trackA || !trackB || isAutoMixing}
                                    className="p-2 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 transition text-[var(--accent-secondary)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:bg-zinc-800"
                                    title="Auto Mix"
                                >
                                    <AutoMixIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Hidden audio elements that must persist */}
            <audio ref={audioRefA} loop crossOrigin="anonymous" className="hidden" />
            <audio ref={audioRefB} loop crossOrigin="anonymous" className="hidden" />

            {/* Track selector modal */}
            {isTrackSelectorOpenFor && (
                <TrackSelector tracks={tracks} onSelect={handleSelectTrack} onClose={() => setIsTrackSelectorOpenFor(null)} />
            )}
        </>
    );
};

export default DJMode;