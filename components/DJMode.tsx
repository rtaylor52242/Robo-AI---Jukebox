import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Track } from '../types';
import { CloseIcon, PlayIcon, PauseIcon, SearchIcon, MinimizeIcon, MaximizeIcon, AutoMixIcon, RecordIcon } from './Icons';

// Waveform Analysis and Display
interface WaveformAnalysis {
    bands: {
        low: Float32Array;
        mid: Float32Array;
        high: Float32Array;
    };
    duration: number;
}

const FREQUENCY_COLORS = {
    low: 'rgba(236, 72, 153, 0.7)', // pink-500
    mid: 'rgba(34, 211, 238, 0.7)',  // cyan-400
    high: 'rgba(250, 204, 21, 0.7)', // yellow-400
};

// This function runs in an offline context to extract frequency bands from an audio buffer
const analyzeTrack = async (file: File): Promise<WaveformAnalysis> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const processBand = async (filterSetup: (ctx: OfflineAudioContext, source: AudioBufferSourceNode) => AudioNode) => {
        const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        const finalNode = filterSetup(offlineCtx, source);
        finalNode.connect(offlineCtx.destination);

        source.start(0);
        const renderedBuffer = await offlineCtx.startRendering();
        // Combine channels for a mono representation
        const monoData = new Float32Array(renderedBuffer.length);
        for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
            const channelData = renderedBuffer.getChannelData(channel);
            for (let i = 0; i < renderedBuffer.length; i++) {
                monoData[i] += channelData[i] / renderedBuffer.numberOfChannels;
            }
        }
        return monoData;
    };

    const low = await processBand((ctx, source) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 250;
        source.connect(filter);
        return filter;
    });

    const mid = await processBand((ctx, source) => {
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 250;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 4000;
        source.connect(highpass).connect(lowpass);
        return lowpass;
    });
    
    const high = await processBand((ctx, source) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4000;
        source.connect(filter);
        return filter;
    });

    await audioContext.close();
    return { bands: { low, mid, high }, duration: audioBuffer.duration };
};

const DualWaveformDisplay: React.FC<{
    analysisL: WaveformAnalysis | null, isAnalyzingL: boolean, currentTimeL: number,
    analysisR: WaveformAnalysis | null, isAnalyzingR: boolean, currentTimeR: number,
}> = React.memo(({ analysisL, isAnalyzingL, currentTimeL, analysisR, isAnalyzingR, currentTimeR }) => {
    const canvasLRef = useRef<HTMLCanvasElement>(null);
    const canvasRRef = useRef<HTMLCanvasElement>(null);

    const drawWaveform = useCallback((canvas: HTMLCanvasElement, analysis: WaveformAnalysis | null, currentTime: number) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        if (!analysis) return;
        
        const drawBand = (data: Float32Array, color: string) => {
            ctx.fillStyle = color;
            const step = Math.ceil(data.length / width);
            const amp = height / 2;
            for (let i = 0; i < width; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
                ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
            }
        };

        ctx.globalCompositeOperation = 'lighter';
        drawBand(analysis.bands.low, FREQUENCY_COLORS.low);
        drawBand(analysis.bands.mid, FREQUENCY_COLORS.mid);
        drawBand(analysis.bands.high, FREQUENCY_COLORS.high);
        ctx.globalCompositeOperation = 'source-over';
        
        if (analysis.duration > 0) {
            const playheadX = (currentTime / analysis.duration) * width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(playheadX, 0, 2, height);
        }
    }, []);

    useEffect(() => {
        const canvasL = canvasLRef.current;
        if (canvasL) drawWaveform(canvasL, analysisL, currentTimeL);
    }, [analysisL, currentTimeL, drawWaveform]);
    
    useEffect(() => {
        const canvasR = canvasRRef.current;
        if (canvasR) drawWaveform(canvasR, analysisR, currentTimeR);
    }, [analysisR, currentTimeR, drawWaveform]);

    const WaveformPlaceholder: React.FC<{isAnalyzing: boolean}> = ({ isAnalyzing }) => (
        <div className="w-full h-full bg-black/50 rounded-md flex items-center justify-center">
            {isAnalyzing ? (
                <div className="flex flex-col items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                </div>
            ) : (
                <p className="text-[var(--text-muted)] text-sm">Load a local track to see waveform</p>
            )}
        </div>
    );
    
    return (
        <div className="w-full h-full grid grid-rows-2 gap-2">
            <div className="relative">
                <canvas ref={canvasLRef} width="1000" height="150" className="w-full h-full rounded-md" />
                { !analysisL && <WaveformPlaceholder isAnalyzing={isAnalyzingL} /> }
            </div>
            <div className="relative">
                <canvas ref={canvasRRef} width="1000" height="150" className="w-full h-full rounded-md" />
                { !analysisR && <WaveformPlaceholder isAnalyzing={isAnalyzingR} /> }
            </div>
        </div>
    );
});


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
    const [trackL, setTrackL] = useState<Track | null>(null);
    const [trackR, setTrackR] = useState<Track | null>(null);
    const [isPlayingL, setIsPlayingL] = useState(false);
    const [isPlayingR, setIsPlayingR] = useState(false);
    const [pitchL, setPitchL] = useState(1);
    const [pitchR, setPitchR] = useState(1);
    const [crossfade, setCrossfade] = useState(0); // -1 (L) to 1 (R)
    const [isTrackSelectorOpenFor, setIsTrackSelectorOpenFor] = useState<'L' | 'R' | null>(null);
    const [isAutoMixing, setIsAutoMixing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const [analysisL, setAnalysisL] = useState<WaveformAnalysis | null>(null);
    const [analysisR, setAnalysisR] = useState<WaveformAnalysis | null>(null);
    const [isAnalyzingL, setIsAnalyzingL] = useState(false);
    const [isAnalyzingR, setIsAnalyzingR] = useState(false);
    const [currentTimeL, setCurrentTimeL] = useState(0);
    const [currentTimeR, setCurrentTimeR] = useState(0);

    const audioRefL = useRef<HTMLAudioElement>(null);
    const audioRefR = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeLRef = useRef<GainNode | null>(null);
    const gainNodeRRef = useRef<GainNode | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const animationFrameRef = useRef<number>();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recorderDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    useEffect(() => {
        // When DJ mode is opened, if Deck L is empty, load the current track from the main player.
        if (isOpen && !trackL && currentTrack) {
            handleSelectTrack(currentTrack, 'L');
        }
    }, [isOpen, currentTrack, trackL]);

    // Setup Web Audio API
    useEffect(() => {
        if (isOpen && !audioContextRef.current && tracks.length > 0) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const sourceL = context.createMediaElementSource(audioRefL.current!);
            const sourceR = context.createMediaElementSource(audioRefR.current!);
            const gainL = context.createGain();
            const gainR = context.createGain();
            const masterGain = context.createGain();

            sourceL.connect(gainL).connect(masterGain).connect(context.destination);
            sourceR.connect(gainR).connect(masterGain).connect(context.destination);
            
            audioContextRef.current = context;
            gainNodeLRef.current = gainL;
            gainNodeRRef.current = gainR;
            masterGainRef.current = masterGain;
        } else if (!isOpen && audioContextRef.current) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    }, [isOpen, tracks.length]);

    // Update current time for waveforms
    useEffect(() => {
        let frameId: number;
        const updateTimes = () => {
            if(audioRefL.current) setCurrentTimeL(audioRefL.current.currentTime);
            if(audioRefR.current) setCurrentTimeR(audioRefR.current.currentTime);
            frameId = requestAnimationFrame(updateTimes);
        };
        frameId = requestAnimationFrame(updateTimes);
        return () => cancelAnimationFrame(frameId);
    }, []);

    // Handle master volume
    useEffect(() => {
        if (masterGainRef.current) {
            masterGainRef.current.gain.value = volume;
        }
    }, [volume]);
    
    // Handle crossfader
    useEffect(() => {
        if (!gainNodeLRef.current || !gainNodeRRef.current) return;
        const x = (crossfade + 1) / 2;
        const angle = x * 0.5 * Math.PI;
        gainNodeLRef.current.gain.value = Math.cos(angle);
        gainNodeRRef.current.gain.value = Math.sin(angle);
    }, [crossfade]);

    const playPause = useCallback((deck: 'L' | 'R') => {
        const context = audioContextRef.current;
        if (context?.state === 'suspended') {
            context.resume().catch(console.error);
        }
        if (deck === 'L') setIsPlayingL(p => !p);
        else setIsPlayingR(p => !p);
    }, []);
    
    useEffect(() => {
        isPlayingL ? audioRefL.current?.play().catch(console.error) : audioRefL.current?.pause();
    }, [isPlayingL]);
    
    useEffect(() => {
        isPlayingR ? audioRefR.current?.play().catch(console.error) : audioRefR.current?.pause();
    }, [isPlayingR]);

    useEffect(() => { if(audioRefL.current) audioRefL.current.playbackRate = pitchL; }, [pitchL]);
    useEffect(() => { if(audioRefR.current) audioRefR.current.playbackRate = pitchR; }, [pitchR]);

    const handleCue = (deck: 'L' | 'R') => {
        if (deck === 'L' && audioRefL.current) {
            setIsPlayingL(false);
            audioRefL.current.currentTime = 0;
        }
        if (deck === 'R' && audioRefR.current) {
            setIsPlayingR(false);
            audioRefR.current.currentTime = 0;
        }
    };

    const handleSelectTrack = async (track: Track, deck: 'L' | 'R' | null = isTrackSelectorOpenFor) => {
        if (deck === 'L') {
            setTrackL(track);
            setIsPlayingL(false);
            setAnalysisL(null);
            if (audioRefL.current) {
                audioRefL.current.src = track.url;
                audioRefL.current.load();
            }
            if (track.source === 'local' && track.file) {
                setIsAnalyzingL(true);
                try {
                    const analysis = await analyzeTrack(track.file);
                    setAnalysisL(analysis);
                } catch (e) { console.error("Track L analysis failed:", e); }
                finally { setIsAnalyzingL(false); }
            }
        } else if (deck === 'R') {
            setTrackR(track);
            setIsPlayingR(false);
            setAnalysisR(null);
            if (audioRefR.current) {
                audioRefR.current.src = track.url;
                audioRefR.current.load();
            }
            if (track.source === 'local' && track.file) {
                setIsAnalyzingR(true);
                try {
                    const analysis = await analyzeTrack(track.file);
                    setAnalysisR(analysis);
                } catch (e) { console.error("Track R analysis failed:", e); }
                finally { setIsAnalyzingR(false); }
            }
        }
        if (isTrackSelectorOpenFor) setIsTrackSelectorOpenFor(null);
    };

    const handleAutoMix = useCallback(() => {
        if (isAutoMixing || !trackL || !trackR) return;

        const autoMixDuration = 8000;
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

    }, [crossfade, isAutoMixing, trackL, trackR]);

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
                                <button onClick={() => playPause('L')} disabled={!trackL} className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600 flex-shrink-0">
                                    {isPlayingL ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                </button>
                                <p className="text-xs truncate flex-grow" title={trackL?.name}>{trackL?.name || 'Deck L Empty'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => playPause('R')} disabled={!trackR} className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600 flex-shrink-0">
                                    {isPlayingR ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                </button>
                                <p className="text-xs truncate flex-grow" title={trackR?.name}>{trackR?.name || 'Deck R Empty'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">L</span>
                                <input type="range" min="-1" max="1" step="0.01" value={crossfade} onChange={e => setCrossfade(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                <span className="font-bold text-xs">R</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                        <div className="flex-shrink-0 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-[var(--accent-primary)]" style={{fontFamily: 'var(--font-family)'}}>DJ MODE</h2>
                            <div className="flex items-center">
                                <button onClick={onToggleMinimize} title="Minimize" className="p-2 rounded-full hover:bg-white/10 transition"><MinimizeIcon className="w-8 h-8"/></button>
                                <button onClick={onClose} title="Close DJ Mode" className="p-2 rounded-full hover:bg-white/10 transition"><CloseIcon className="w-8 h-8"/></button>
                            </div>
                        </div>
                        
                        <div className="h-40 flex-shrink-0">
                           <DualWaveformDisplay 
                                analysisL={analysisL} isAnalyzingL={isAnalyzingL} currentTimeL={currentTimeL}
                                analysisR={analysisR} isAnalyzingR={isAnalyzingR} currentTimeR={currentTimeR}
                           />
                        </div>

                        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 overflow-auto">
                            {/* DECK L */}
                            <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-between gap-4">
                                <button onClick={() => setIsTrackSelectorOpenFor('L')} className="w-full bg-[var(--bg-tertiary)] py-2 rounded-md hover:bg-[var(--bg-tertiary)]/70 transition truncate px-4">{trackL?.name || 'Load Track L'}</button>
                                <Turntable isPlaying={isPlayingL} track={trackL} />
                                <div className="w-full flex items-center justify-around gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={pitchL} onChange={e => setPitchL(Number(e.target.value))} className="w-24 h-1.5 appearance-none rounded-full bg-[var(--bg-tertiary)] cursor-pointer -rotate-90 origin-bottom-center" />
                                        <label className="text-xs">PITCH</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleCue('L')} disabled={!trackL} className="bg-yellow-500 text-black font-bold rounded-md px-4 py-2 disabled:opacity-50">CUE</button>
                                        <button onClick={() => playPause('L')} disabled={!trackL} className="w-16 h-16 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600">
                                            {isPlayingL ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* DECK R */}
                            <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-between gap-4">
                                <button onClick={() => setIsTrackSelectorOpenFor('R')} className="w-full bg-[var(--bg-tertiary)] py-2 rounded-md hover:bg-[var(--bg-tertiary)]/70 transition truncate px-4">{trackR?.name || 'Load Track R'}</button>
                                <Turntable isPlaying={isPlayingR} track={trackR} />
                                <div className="w-full flex items-center justify-around gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <input type="range" min="0.5" max="1.5" step="0.01" value={pitchR} onChange={e => setPitchR(Number(e.target.value))} className="w-24 h-1.5 appearance-none rounded-full bg-[var(--bg-tertiary)] cursor-pointer -rotate-90 origin-bottom-center" />
                                        <label className="text-xs">PITCH</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleCue('R')} disabled={!trackR} className="bg-yellow-500 text-black font-bold rounded-md px-4 py-2 disabled:opacity-50">CUE</button>
                                        <button onClick={() => playPause('R')} disabled={!trackR} className="w-16 h-16 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center disabled:bg-gray-600">
                                            {isPlayingR ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 pt-4">
                            <div className="flex items-center gap-4">
                                <span className="font-bold">L</span>
                                <input type="range" min="-1" max="1" step="0.01" value={crossfade} onChange={e => setCrossfade(Number(e.target.value))} disabled={isAutoMixing} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50" />
                                <span className="font-bold">R</span>
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
                                    disabled={!trackL || !trackR || isAutoMixing}
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
            <audio ref={audioRefL} loop crossOrigin="anonymous" className="hidden" />
            <audio ref={audioRefR} loop crossOrigin="anonymous" className="hidden" />

            {/* Track selector modal */}
            {isTrackSelectorOpenFor && (
                <TrackSelector tracks={tracks} onSelect={track => handleSelectTrack(track)} onClose={() => setIsTrackSelectorOpenFor(null)} />
            )}
        </>
    );
};

export default DJMode;
