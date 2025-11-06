
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import type { Track, TrackMetadata, AnalysisResult, Playlist as PlaylistType } from './types';
import Playlist from './components/Playlist';
import PlayerControls from './components/PlayerControls';
import ConfirmationModal from './components/ConfirmationModal';
import AnalysisModal from './components/AnalysisModal';
import PlaylistSidebar from './components/PlaylistSidebar';
import AddToPlaylistModal from './components/AddToQueueModal';
import ShortcutsModal from './components/ShortcutsModal';
import { clearTracks, getTrackMetadata, saveTrackMetadata, getAllPlaylists, savePlaylists } from './db';
import { ShortcutsIcon } from './components/Icons';

export const EQ_PRESETS: { [name: string]: number[] } = {
  'Flat': [0, 0, 0, 0, 0, 0],
  'Classical': [5, 4, -2, 3, 3, 4],
  'Blues': [3, -2, 3, -1, 4, 2],
  'Jazz': [4, 2, -2, 2, 3, 2],
  'Hip-Hop': [5, 4, 0, 1, 3, 2],
  'Pop': [-1, 2, 4, 2, -1, -2],
  'R&B': [4, 3, 1, -1, 2, 3],
  'Vocal': [-2, 1, 3, 2, 0, -1],
};

const BAND_FREQUENCIES = [60, 230, 910, 3600, 8000, 14000];
const API_KEY = process.env.API_KEY;

const App: React.FC = () => {
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [queuedTracks, setQueuedTracks] = useState<File[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [loadingTrackUrl, setLoadingTrackUrl] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [timeDisplayMode, setTimeDisplayMode] = useState<'elapsed' | 'remaining'>('elapsed');

  const [playlists, setPlaylists] = useState<PlaylistType[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('all-tracks');
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  const [isEqEnabled, setIsEqEnabled] = useState<boolean>(false);
  const [eqSettings, setEqSettings] = useState<number[]>(EQ_PRESETS['Flat']);
  const [showEq, setShowEq] = useState(false);
  const [eqPosition, setEqPosition] = useState({
    x: window.innerWidth - 420,
    y: Math.max(20, window.innerHeight - 450)
  });

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata>({ likes: {}, ratings: {}, analysis: {} });
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);

  const systemPlaylists = useMemo<PlaylistType[]>(() => {
    const likedUrls = Object.entries(trackMetadata.likes).filter(([, liked]) => liked).map(([url]) => url);
    
    const ratedPlaylists = [5, 4, 3, 2, 1].map(rating => {
        const urls = Object.entries(trackMetadata.ratings)
            .filter(([, r]) => r === rating)
            .map(([url]) => url);
        return {
            id: `rated-${rating}-stars`,
            name: `${rating}-Star Rated`,
            trackUrls: urls,
            system: true
        };
    }).filter(p => p.trackUrls.length > 0);

    return [
      { id: 'all-tracks', name: 'All Tracks', trackUrls: allTracks.map(t => t.url), system: true },
      { id: 'liked-songs', name: 'Liked Songs', trackUrls: likedUrls, system: true },
      ...ratedPlaylists
    ];
  }, [allTracks, trackMetadata.likes, trackMetadata.ratings]);

  const combinedPlaylists = useMemo(() => [...systemPlaylists, ...playlists], [systemPlaylists, playlists]);

  const activePlaylistTracks = useMemo<Track[]>(() => {
    const activePlaylist = combinedPlaylists.find(p => p.id === activePlaylistId);
    if (!activePlaylist) return [];
    
    return allTracks.filter(track => activePlaylist.trackUrls.includes(track.url))
      .sort((a, b) => { // Maintain playlist order
        const indexA = activePlaylist.trackUrls.indexOf(a.url);
        const indexB = activePlaylist.trackUrls.indexOf(b.url);
        return indexA - indexB;
      });
  }, [activePlaylistId, combinedPlaylists, allTracks]);

  const displayedTracks = useMemo(() => {
    if (!searchQuery) {
      return activePlaylistTracks;
    }
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (!lowercasedQuery) {
        return activePlaylistTracks;
    }
    return activePlaylistTracks.filter((track, index) =>
      track.file.name.toLowerCase().includes(lowercasedQuery) ||
      (index + 1).toString() === lowercasedQuery
    );
  }, [activePlaylistTracks, searchQuery]);


  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = context.createMediaElementSource(audioRef.current);
        const eqNodes = BAND_FREQUENCIES.map(freq => {
            const filter = context.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.2;
            filter.gain.value = 0;
            return filter;
        });
        let lastNode: AudioNode = source;
        eqNodes.forEach(node => {
            lastNode.connect(node);
            lastNode = node;
        });
        lastNode.connect(context.destination);
        audioContextRef.current = context;
        sourceNodeRef.current = source;
        eqNodesRef.current = eqNodes;
    } catch (error) {
        console.error("Failed to initialize Web Audio API:", error);
    }
  }, []);

  useEffect(() => {
    if (queuedTracks) {
      const newTracks: Track[] = queuedTracks.map((file: File) => ({
        file,
        url: URL.createObjectURL(file),
        relativePath: file.webkitRelativePath,
      }));
      setAllTracks(prev => [...prev, ...newTracks]);
      setQueuedTracks(null);
    }
  }, [queuedTracks]);

  useEffect(() => {
    if (currentTrackIndex !== null && !audioContextRef.current) {
      setupAudioContext();
    }
  }, [currentTrackIndex, setupAudioContext]);

  useEffect(() => {
    if (!audioContextRef.current || eqNodesRef.current.length === 0) return;
    eqNodesRef.current.forEach((node, index) => {
        node.gain.value = isEqEnabled ? eqSettings[index] : 0;
    });
  }, [isEqEnabled, eqSettings]);


  useEffect(() => {
    const loadData = async () => {
        const [storedMetadata, storedPlaylists] = await Promise.all([getTrackMetadata(), getAllPlaylists()]);
        if (storedMetadata) {
            if (!storedMetadata.analysis) storedMetadata.analysis = {};
            setTrackMetadata(storedMetadata);
        }
        if (storedPlaylists) {
            setPlaylists(storedPlaylists);
        }
    };
    loadData();

    return () => {
      allTracks.forEach(track => URL.revokeObjectURL(track.url));
      audioContextRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
  
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsImporting(true);
    allTracks.forEach(track => URL.revokeObjectURL(track.url));

    const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.opus'];
    
    const audioFiles: File[] = [...files].filter(file => {
        if (file.type.startsWith('audio/')) return true;
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        return AUDIO_EXTENSIONS.includes(extension);
    });

    if (audioFiles.length > 0) {
      const firstFile = audioFiles[0];
      const firstTrack: Track = { file: firstFile, url: URL.createObjectURL(firstFile), relativePath: firstFile.webkitRelativePath };
      setAllTracks([firstTrack]);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      setActivePlaylistId('all-tracks');
      if (audioFiles.length > 1) setQueuedTracks(audioFiles.slice(1));
    } else {
        setAllTracks([]);
        setCurrentTrackIndex(null);
        setIsPlaying(false);
        alert('No supported audio files found in the selected folder.');
    }

    if (event.target) event.target.value = '';
    setIsImporting(false);
  };
  
  const selectTrackByIndex = (index: number) => {
    setLoadingTrackUrl(allTracks[index].url);
    if (index === currentTrackIndex) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (!isPlaying) setIsPlaying(true);
      }
    } else {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  const handleTrackSelect = (track: Track) => {
    const originalIndex = allTracks.findIndex(t => t.url === track.url);
    if (originalIndex !== -1) {
      selectTrackByIndex(originalIndex);
    }
  };

  const playNext = useCallback(() => {
    if (displayedTracks.length === 0) return;
    let nextTrack: Track;
    const currentTrackUrl = currentTrackIndex !== null ? allTracks[currentTrackIndex].url : null;
    
    if (isShuffle) {
      if (displayedTracks.length > 1) {
          let randomIndex;
          do { randomIndex = Math.floor(Math.random() * displayedTracks.length); }
          while (displayedTracks[randomIndex].url === currentTrackUrl);
          nextTrack = displayedTracks[randomIndex];
      } else { nextTrack = displayedTracks[0]; }
    } else {
        const currentIndexInDisplayed = currentTrackUrl ? displayedTracks.findIndex(t => t.url === currentTrackUrl) : -1;
        const nextIndexInDisplayed = (currentIndexInDisplayed + 1) % displayedTracks.length;
        nextTrack = displayedTracks[nextIndexInDisplayed];
    }
    
    if (nextTrack) handleTrackSelect(nextTrack);
  }, [allTracks, displayedTracks, currentTrackIndex, isShuffle]);

  const playPrev = useCallback(() => {
    if (displayedTracks.length === 0 || currentTrackIndex === null) return;
    const currentTrackUrl = allTracks[currentTrackIndex].url;
    const currentIndexInDisplayed = displayedTracks.findIndex(t => t.url === currentTrackUrl);
    const prevIndexInDisplayed = (currentIndexInDisplayed - 1 + displayedTracks.length) % displayedTracks.length;
    const prevTrack = displayedTracks[prevIndexInDisplayed];
    if (prevTrack) handleTrackSelect(prevTrack);
  }, [allTracks, displayedTracks, currentTrackIndex]);
  
  const handlePlayPause = useCallback(() => {
      if(currentTrackIndex === null && allTracks.length > 0) {
          setCurrentTrackIndex(0);
          setIsPlaying(true);
          return;
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
      setIsPlaying(prev => !prev);
  }, [currentTrackIndex, allTracks]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const VOLUME_STEP = 0.05;
      switch (e.code) {
        case 'Space': case 'Numpad5': e.preventDefault(); handlePlayPause(); break;
        case 'ArrowRight': case 'Numpad6': e.preventDefault(); playNext(); break;
        case 'ArrowLeft': case 'Numpad4': e.preventDefault(); playPrev(); break;
        case 'ArrowUp': case 'Numpad8': e.preventDefault(); setVolume(v => Math.min(1, v + VOLUME_STEP)); break;
        case 'ArrowDown': case 'Numpad2': e.preventDefault(); setVolume(v => Math.max(0, v - VOLUME_STEP)); break;
        case 'Numpad7': if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 6); break;
        case 'Numpad9': if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 6); break;
        case 'Numpad1': if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 3); break;
        case 'Numpad3': if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 3); break;
        case 'Numpad0': setIsShuffle(s => !s); break;
        case 'NumpadDecimal': setIsRepeat(r => !r); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, playNext, playPrev, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = currentTrackIndex !== null ? allTracks[currentTrackIndex] : null;
    if (!isPlaying || !track) { audio.pause(); return; }
    const playAudio = async () => {
      try {
        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        await audio.play();
      } catch (error) { if ((error as DOMException).name !== 'AbortError') console.error("Audio playback error:", error); }
    };
    if (audio.src !== track.url) {
      audio.src = track.url;
      audio.addEventListener('canplay', () => playAudio(), { once: true });
      audio.addEventListener('error', () => console.error(`Failed to load audio: ${track.url}`), { once: true });
    } else { playAudio(); }
  }, [currentTrackIndex, isPlaying, allTracks]);

  const handleTimeUpdate = () => { if (audioRef.current) { setCurrentTime(audioRef.current.currentTime); if (audioRef.current.duration) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); } };
  const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };
  const handleEnded = () => { if (isRepeat && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } else { playNext(); } };
  const handleCanPlayThrough = () => { if (audioRef.current?.src === loadingTrackUrl) setLoadingTrackUrl(null); };
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => { if (audioRef.current && !isNaN(duration) && duration > 0) audioRef.current.currentTime = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * duration; };
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value));
  const handleEqEnabledChange = (enabled: boolean) => { if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume(); setIsEqEnabled(enabled); };
  const handleEqGainChange = (bandIndex: number, gain: number) => setEqSettings(p => { const n = [...p]; n[bandIndex] = gain; return n; });
  const handleEqPresetChange = (presetName: string) => { if (EQ_PRESETS[presetName]) setEqSettings(EQ_PRESETS[presetName]); };
  const handleEqPositionChange = (position: { x: number; y: number }) => {
    const popoverWidth = 384, popoverHeight = 280, headerHeight = 60;
    const clampedX = Math.max(-(popoverWidth - headerHeight), Math.min(position.x, window.innerWidth - headerHeight));
    const clampedY = Math.max(0, Math.min(position.y, window.innerHeight - popoverHeight));
    setEqPosition({ x: clampedX, y: clampedY });
  };
  const handleTimeDisplayToggle = () => setTimeDisplayMode(prev => prev === 'elapsed' ? 'remaining' : 'elapsed');
  const handleClearPlaylist = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    allTracks.forEach(track => URL.revokeObjectURL(track.url));
    setAllTracks([]); setCurrentTrackIndex(null); setIsPlaying(false); setProgress(0); setDuration(0); setCurrentTime(0); setSearchQuery('');
    try { await clearTracks(); } catch (error) { console.error("Failed to clear tracks from DB:", error); }
    setIsClearConfirmOpen(false);
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = (error) => reject(error); });

  const handleAnalyzeTrack = async (forceRegenerate = false) => {
    const track = currentTrackIndex !== null ? allTracks[currentTrackIndex] : null;
    if (!track) return;
    if (!forceRegenerate && trackMetadata.analysis?.[track.url]) { setAnalysisResult(trackMetadata.analysis[track.url]); setIsAnalysisModalOpen(true); return; }
    setIsAnalysisModalOpen(true); setIsAnalyzing(true); setAnalysisResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const audioData = await fileToBase64(track.file);
      const audioPart = { inlineData: { mimeType: track.file.type || 'audio/mpeg', data: audioData } };
      const prompt = `Analyze the provided audio file and return a detailed breakdown in JSON format. The JSON object must contain these exact keys: "songStructure", "musicalElements", "lyricalComponents", "productionElements", "creativeTechnicalAspects", and "regenerationPrompt". For each key except "regenerationPrompt", provide a detailed, plain-text analysis. For "regenerationPrompt", provide a single, summarized text prompt, 350 characters or less, that could be used to regenerate a similar song. This prompt must not contain any special formatting characters like hashtags or asterisks.`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: { parts: [audioPart, { text: prompt }] }, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { songStructure: { type: Type.STRING }, musicalElements: { type: Type.STRING }, lyricalComponents: { type: Type.STRING }, productionElements: { type: Type.STRING }, creativeTechnicalAspects: { type: Type.STRING }, regenerationPrompt: { type: Type.STRING } }, required: ["songStructure", "musicalElements", "lyricalComponents", "productionElements", "creativeTechnicalAspects", "regenerationPrompt"] } } });
      const newAnalysis: AnalysisResult = JSON.parse(response.text);
      setAnalysisResult(newAnalysis);
      const newMetadata: TrackMetadata = { ...trackMetadata, analysis: { ...(trackMetadata.analysis ?? {}), [track.url]: newAnalysis } };
      setTrackMetadata(newMetadata);
      await saveTrackMetadata(newMetadata);
    } catch (error) { console.error("Error analyzing song with Gemini:", error); setAnalysisResult({ songStructure: "Could not analyze song.", musicalElements: "An error occurred while communicating with the AI.", lyricalComponents: "", productionElements: "", creativeTechnicalAspects: "", regenerationPrompt: "Analysis failed." }); }
    finally { setIsAnalyzing(false); }
  };

  const handleLikeToggle = async (trackUrl: string) => {
    const newMetadata: TrackMetadata = { ...trackMetadata, likes: { ...trackMetadata.likes, [trackUrl]: !trackMetadata.likes[trackUrl] } };
    setTrackMetadata(newMetadata);
    await saveTrackMetadata(newMetadata);
  };
  const handleRateTrack = async (trackUrl: string, rating: number) => {
      const newRating = (trackMetadata.ratings[trackUrl] || 0) === rating ? 0 : rating;
      const newMetadata: TrackMetadata = { ...trackMetadata, ratings: { ...trackMetadata.ratings, [trackUrl]: newRating } };
      setTrackMetadata(newMetadata);
      await saveTrackMetadata(newMetadata);
  };
  const handleShareTrack = async (track: Track) => {
      const trackName = track.file.name.replace(/\.[^/.]+$/, "");
      if (navigator.share) { try { await navigator.share({ title: 'Check out this track!', text: `I'm listening to "${trackName}" on Robo AI Jukebox.` }); } catch (error) { if ((error as DOMException).name !== 'AbortError') console.error('Share failed:', error); } }
      else { try { await navigator.clipboard.writeText(`Listening to "${trackName}"`); alert('Track name copied!'); } catch (err) { alert('Could not copy to clipboard.'); } }
  };
  const handlePlaylistReorder = (dragIndex: number, dropIndex: number) => {
    const activeList = activePlaylistTracks;
    const currentTrackUrl = currentTrackIndex !== null ? allTracks[currentTrackIndex].url : null;
    const newOrderedList = [...activeList];
    const [draggedItem] = newOrderedList.splice(dragIndex, 1);
    newOrderedList.splice(dropIndex, 0, draggedItem);
    const newUrlOrder = newOrderedList.map(t => t.url);
    const updatedPlaylists = combinedPlaylists.map(p => p.id === activePlaylistId ? {...p, trackUrls: newUrlOrder} : p);
    setPlaylists(updatedPlaylists.filter(p => !p.system));
    if (currentTrackUrl) { const newCurrentIndex = allTracks.findIndex(t => t.url === currentTrackUrl); if (newCurrentIndex !== -1) setCurrentTrackIndex(newCurrentIndex); }
  };

  const handleCreatePlaylist = async (name: string) => {
    const newPlaylist: PlaylistType = { id: uuidv4(), name, trackUrls: [] };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    await savePlaylists(updatedPlaylists);
    setActivePlaylistId(newPlaylist.id);
  };
  const handleAddToPlaylist = async (playlistId: string) => {
    if (!trackToAddToPlaylist) return;
    const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId && !p.trackUrls.includes(trackToAddToPlaylist.url)) {
            return { ...p, trackUrls: [...p.trackUrls, trackToAddToPlaylist.url] };
        }
        return p;
    });
    setPlaylists(updatedPlaylists);
    await savePlaylists(updatedPlaylists);
    setTrackToAddToPlaylist(null);
  };
  const handleCreatePlaylistAndAdd = async (playlistName: string) => {
    if (!trackToAddToPlaylist) return;
    const newPlaylist: PlaylistType = { id: uuidv4(), name: playlistName, trackUrls: [trackToAddToPlaylist.url] };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    await savePlaylists(updatedPlaylists);
    setTrackToAddToPlaylist(null);
  };

  const currentTrack = currentTrackIndex !== null ? allTracks[currentTrackIndex] : null;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      <header className="p-4 flex items-center justify-between border-b border-slate-700/50 shadow-md flex-shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-cyan-400 uppercase">Robo AI - Jukebox</h1>
        <button onClick={() => setIsShortcutsModalOpen(true)} title="Keyboard Shortcuts" className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700/50">
            <ShortcutsIcon className="w-6 h-6" />
        </button>
      </header>
      
      <div className="flex flex-grow overflow-hidden">
        <PlaylistSidebar 
            playlists={combinedPlaylists}
            activePlaylistId={activePlaylistId}
            onSelectPlaylist={setActivePlaylistId}
            onCreatePlaylist={handleCreatePlaylist}
        />
        <main className="flex-grow overflow-hidden flex flex-col">
            <Playlist
            tracks={displayedTracks}
            totalTrackCount={allTracks.length}
            currentTrackUrl={currentTrack?.url ?? null}
            loadingTrackUrl={loadingTrackUrl}
            onTrackSelect={handleTrackSelect}
            onFolderSelectClick={() => fileInputRef.current?.click()}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onClearPlaylistClick={() => setIsClearConfirmOpen(true)}
            trackMetadata={trackMetadata}
            onLikeToggle={handleLikeToggle}
            onRate={handleRateTrack}
            onShare={handleShareTrack}
            onReorder={handlePlaylistReorder}
            onAddToPlaylistClick={(track) => setTrackToAddToPlaylist(track)}
            />
        </main>
      </div>

      <PlayerControls
        currentTrack={currentTrack}
        isPlaying={isPlaying} isShuffle={isShuffle} isRepeat={isRepeat}
        progress={progress} duration={duration} currentTime={currentTime}
        playlistSize={allTracks.length} volume={volume}
        isLoading={!!loadingTrackUrl} isImporting={isImporting} isAnalyzing={isAnalyzing}
        showEq={showEq} isEqEnabled={isEqEnabled} eqSettings={eqSettings} eqPosition={eqPosition}
        timeDisplayMode={timeDisplayMode}
        onPlayPause={handlePlayPause} onNext={playNext} onPrev={playPrev}
        onShuffleToggle={() => setIsShuffle(!isShuffle)} onRepeatToggle={() => setIsRepeat(!isRepeat)}
        onSeek={handleSeek} onAddSongsClick={() => fileInputRef.current?.click()}
        onVolumeChange={handleVolumeChange}
        onEqToggle={() => setShowEq(!showEq)}
        onEqEnabledChange={handleEqEnabledChange}
        onEqGainChange={handleEqGainChange}
        onEqPresetChange={handleEqPresetChange}
        onAnalyze={() => handleAnalyzeTrack()}
        onEqPositionChange={handleEqPositionChange}
        onTimeDisplayToggle={handleTimeDisplayToggle}
      />

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} onCanPlayThrough={handleCanPlayThrough} crossOrigin="anonymous" />
      <input type="file" ref={fileInputRef} onChange={handleFolderSelect} className="hidden" multiple {...{webkitdirectory: "", directory: ""}} />
      <ConfirmationModal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={handleClearPlaylist} title="Clear Entire Jukebox?">
        <p className="text-sm text-slate-400">Are you sure you want to permanently delete all tracks and playlists? This action cannot be undone.</p>
      </ConfirmationModal>
      <AnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} analysis={analysisResult} isLoading={isAnalyzing} trackName={currentTrack?.file.name ?? null} onRegenerate={() => handleAnalyzeTrack(true)} />
      <AddToPlaylistModal isOpen={!!trackToAddToPlaylist} onClose={() => setTrackToAddToPlaylist(null)} playlists={playlists} onSelectPlaylist={handleAddToPlaylist} onCreatePlaylist={handleCreatePlaylistAndAdd} trackName={trackToAddToPlaylist?.file.name ?? null} />
      <ShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
    </div>
  );
};

export default App;
