import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import type { Track, TrackMetadata, AnalysisResult, Playlist as PlaylistType, ListeningStats, SoundboardSheetData, SoundboardPad } from './types';
import Playlist from './components/Playlist';
import PlayerControls from './components/PlayerControls';
import ConfirmationModal from './components/ConfirmationModal';
import AnalysisModal from './components/AnalysisModal';
import LyricsModal from './components/LyricsModal';
import KaraokeModal from './components/KaraokeModal';
import PlaylistSidebar from './components/PlaylistSidebar';
import AddToQueueModal from './components/AddToQueueModal';
import ShortcutsModal from './components/ShortcutsModal';
import HelpModal from './components/HelpModal';
import ProfileModal from './components/ProfileModal';
import Soundboard from './components/Soundboard';
import DJMode from './components/DJMode';
import LyricsSourceModal from './components/LyricsSourceModal';
import { DEFAULT_SOUNDBOARD_SHEETS } from './components/SoundboardSamples';
import { clearAllData, getTrackMetadata, saveTrackMetadata, getAllPlaylists, savePlaylists, getStats, saveStats, resetStats, getUserEqPresets, saveUserEqPresets, getSoundboardSheets, saveSoundboardSheets } from './db';
import { ShortcutsIcon, HelpIcon, ThemeIcon, SpotifyIcon, UserIcon } from './components/Icons';

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
const DEFAULT_SPOTIFY_CLIENT_ID = '5645471049f840c4b6f9a3f688bf8795';
const SPOTIFY_REDIRECT_URI = window.location.origin;
const SPOTIFY_SCOPES = 'streaming user-read-email user-read-private playlist-read-private playlist-read-collaborative';

const VOLUME_STEP = 0.1;

const DEFAULT_PLAYLIST_NAMES = [ 'Afrobeat', 'Birthday Songs', 'Classical', 'Diss Tracks', 'Drill', 'Gangster Rap', 'Hip-Hop', 'Pop', 'R&B', 'Rock' ];

type Theme = 'robotic' | 'modern' | 'sunset' | 'forest' | 'ocean' | 'cyberpunk' | 'monochrome';
const THEMES: Theme[] = ['robotic', 'modern', 'sunset', 'forest', 'ocean', 'cyberpunk', 'monochrome'];

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 256;

const App: React.FC = () => {
  // --- Core State ---
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);

  // --- UI/Mode State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isShuffle, setIsShuffle] = useState<boolean>(true);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [loadingTrackUrl, setLoadingTrackUrl] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [timeDisplayMode, setTimeDisplayMode] = useState<'elapsed' | 'remaining'>('elapsed');
  const [theme, setTheme] = useState<Theme>('robotic');
  const [librarySource, setLibrarySource] = useState<'local' | 'spotify'>('local');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem('sidebar-width');
    const width = savedWidth ? parseInt(savedWidth, 10) : DEFAULT_SIDEBAR_WIDTH;
    return Math.max(MIN_SIDEBAR_WIDTH, Math.min(width, MAX_SIDEBAR_WIDTH));
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // --- Playlist State ---
  const [playlists, setPlaylists] = useState<PlaylistType[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('all-tracks');
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  // --- EQ State ---
  const [isEqEnabled, setIsEqEnabled] = useState<boolean>(false);
  const [eqSettings, setEqSettings] = useState<number[]>(EQ_PRESETS['Flat']);
  const [showEq, setShowEq] = useState(false);
  const [userEqPresets, setUserEqPresets] = useState<{ [name: string]: number[] }>({});
  const [balance, setBalance] = useState<number>(0);
  const [isBassBoostEnabled, setIsBassBoostEnabled] = useState<boolean>(false);

  // --- Gemini AI Analysis State ---
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Gemini AI Lyrics State ---
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [lyricsResult, setLyricsResult] = useState<string | null>(null);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isLyricsSourceModalOpen, setIsLyricsSourceModalOpen] = useState(false);
  
  // --- Karaoke State ---
  const [isKaraokeModalOpen, setIsKaraokeModalOpen] = useState(false);
  const [karaokeLyrics, setKaraokeLyrics] = useState<string | null>(null);
  const [isVocalReductionOn, setIsVocalReductionOn] = useState(false);
  const [isKaraokeModeEnabled, setIsKaraokeModeEnabled] = useState(false);

  // --- Metadata & Stats State ---
  const [trackMetadata, setTrackMetadata] = useState<TrackMetadata>({ likes: {}, ratings: {}, analysis: {}, lyrics: {} });
  const [listeningStats, setListeningStats] = useState<ListeningStats>({ totalPlayTime: 0, playCounts: {}, history: [] });
  const listeningStatsRef = useRef(listeningStats);
  useEffect(() => {
    listeningStatsRef.current = listeningStats;
  }, [listeningStats]);

  // --- Modals State ---
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isDjModeOpen, setIsDjModeOpen] = useState(false);
  const [isDjModeMinimized, setIsDjModeMinimized] = useState(false);

  // --- Soundboard State ---
  const [soundboardSheets, setSoundboardSheets] = useState<SoundboardSheetData>({});
  const [currentSoundboardSheet, setCurrentSoundboardSheet] = useState(0);
  const [activeSoundPads, setActiveSoundPads] = useState<Set<number>>(new Set());

  // --- Sleep Timer State ---
  const [sleepTimerId, setSleepTimerId] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [isSleepTimerPopoverOpen, setIsSleepTimerPopoverOpen] = useState(false);

  // --- Spotify State ---
  const [isSpotifySdkReady, setIsSpotifySdkReady] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [userSpotifyClientId, setUserSpotifyClientId] = useState('');
  // Fix: Use 'any' for spotifyPlayer state as type definitions are not available in this environment.
  const [spotifyPlayer, setSpotifyPlayer] = useState<any | null>(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null);
  const [isSpotifyPremium, setIsSpotifyPremium] = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
  const [spotifyTracks, setSpotifyTracks] = useState<Track[]>([]);
  const [spotifyUser, setSpotifyUser] = useState<any>(null);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundboardFolderInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const bassBoostNodeRef = useRef<BiquadFilterNode | null>(null);
  const vocalReducerNodeRef = useRef<BiquadFilterNode | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const playingSoundsRef = useRef<Map<number, HTMLAudioElement>>(new Map());

  // --- Utility Functions ---
  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = (error) => reject(error); });
  const spotifyApiRequest = useCallback(async (endpoint: string, method = 'GET', body: any = null) => {
    if (!spotifyToken) return;
    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
      body: body ? JSON.stringify(body) : null
    });
    if (res.status === 401) { // Token expired
        setSpotifyToken(null);
        setSpotifyUser(null);
        alert('Spotify session expired. Please connect again.');
        return null;
    }
    if (!res.ok) {
        console.error(`Spotify API Error on ${endpoint}:`, await res.json());
        return null;
    }
    return res.status === 204 ? true : res.json();
  }, [spotifyToken]);

  const activeSpotifyClientId = useMemo(() => {
    return userSpotifyClientId || DEFAULT_SPOTIFY_CLIENT_ID;
  }, [userSpotifyClientId]);

  // Fix: Move memoized values before callbacks and effects that use them.
  // --- Memoized Values ---
  const systemPlaylists = useMemo<PlaylistType[]>(() => {
    const likedUrls = Object.entries(trackMetadata.likes).filter(([, liked]) => liked).map(([url]) => url);
    const ratedPlaylists = [5, 4, 3, 2, 1].map(r => ({ id: `rated-${r}`, name: `${r}-Star Rated`, trackUrls: Object.entries(trackMetadata.ratings).filter(([, rating]) => rating === r).map(([url]) => url), system: true })).filter(p => p.trackUrls.length > 0);
    return [{ id: 'all-tracks', name: 'All Tracks', trackUrls: allTracks.map(t => t.url), system: true }, { id: 'liked-songs', name: 'Liked Songs', trackUrls: likedUrls, system: true }, ...ratedPlaylists];
  }, [allTracks, trackMetadata.likes, trackMetadata.ratings]);

  const combinedPlaylists = useMemo(() => [...systemPlaylists, ...playlists], [systemPlaylists, playlists]);

  const activePlaylistTracks = useMemo<Track[]>(() => {
    if (librarySource === 'spotify') return spotifyTracks;
    const activePl = combinedPlaylists.find(p => p.id === activePlaylistId);
    if (!activePl || !Array.isArray(activePl.trackUrls)) {
        return [];
    }
    return allTracks.filter(t => activePl.trackUrls.includes(t.url)).sort((a, b) => activePl.trackUrls.indexOf(a.url) - activePl.trackUrls.indexOf(b.url));
  }, [activePlaylistId, combinedPlaylists, allTracks, librarySource, spotifyTracks]);

  const displayedTracks = useMemo(() => {
    if (!searchQuery) return activePlaylistTracks;
    const lq = searchQuery.toLowerCase().trim();
    return activePlaylistTracks.filter(t => t.name.toLowerCase().includes(lq) || t.artists?.join(', ').toLowerCase().includes(lq));
  }, [activePlaylistTracks, searchQuery]);

  const combinedEqPresets = useMemo(() => ({
    ...EQ_PRESETS,
    ...userEqPresets
  }), [userEqPresets]);

  // Fix: Moved setupAudioContext and other handlers before effects to prevent 'used before declaration' errors.
  // --- Handlers & Callbacks ---
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = context.createMediaElementSource(audioRef.current);

        const bassBoostFilter = context.createBiquadFilter();
        bassBoostFilter.type = 'lowshelf';
        bassBoostFilter.frequency.value = 250;
        bassBoostFilter.gain.value = 0;

        const eqNodes = BAND_FREQUENCIES.map(freq => {
            const filter = context.createBiquadFilter();
            filter.type = 'peaking'; filter.frequency.value = freq; filter.Q.value = 1.2; filter.gain.value = 0;
            return filter;
        });
        
        const vocalReducerNode = context.createBiquadFilter();
        vocalReducerNode.type = 'peaking';
        vocalReducerNode.frequency.value = 2500; // Center frequency for vocals
        vocalReducerNode.Q.value = 1.2; // Widen the filter slightly to catch more vocal tones
        vocalReducerNode.gain.value = 0; // Off by default

        const panner = context.createStereoPanner();
        panner.pan.value = 0;

        let lastNode: AudioNode = source;
        lastNode = lastNode.connect(bassBoostFilter);
        eqNodes.forEach(node => { lastNode = lastNode.connect(node); });
        lastNode = lastNode.connect(vocalReducerNode);
        lastNode = lastNode.connect(panner);
        lastNode.connect(context.destination);
        
        audioContextRef.current = context; 
        sourceNodeRef.current = source; 
        bassBoostNodeRef.current = bassBoostFilter;
        eqNodesRef.current = eqNodes;
        vocalReducerNodeRef.current = vocalReducerNode;
        pannerNodeRef.current = panner;

    } catch (error) { console.error("Failed to initialize Web Audio API:", error); }
  }, []);

  const handleThemeChange = () => { const i = THEMES.indexOf(theme); setTheme(THEMES[(i + 1) % THEMES.length]); };
  const handlePlayPause = useCallback(() => {
      if (!currentTrack) {
          if(displayedTracks.length > 0) setCurrentTrack(displayedTracks[0]);
          setIsPlaying(true);
          return;
      }
      if (currentTrack.source === 'spotify' && spotifyPlayer) spotifyPlayer.togglePlay();
      else if (currentTrack.source === 'local') setIsPlaying(prev => !prev);
  }, [currentTrack, displayedTracks, spotifyPlayer]);

  const playNext = useCallback(() => {
    if (!displayedTracks.length) return;
    if (isShuffle) {
        let randomIndex;
        do { randomIndex = Math.floor(Math.random() * displayedTracks.length); }
        while (displayedTracks.length > 1 && displayedTracks[randomIndex].url === currentTrack?.url);
        setCurrentTrack(displayedTracks[randomIndex]);
    } else {
        const currentIndex = currentTrack ? displayedTracks.findIndex(t => t.url === currentTrack.url) : -1;
        setCurrentTrack(displayedTracks[(currentIndex + 1) % displayedTracks.length]);
    }
  }, [displayedTracks, currentTrack, isShuffle]);

  const playPrev = useCallback(() => {
    if (!displayedTracks.length || !currentTrack) return;
    const currentIndex = displayedTracks.findIndex(t => t.url === currentTrack.url);
    setCurrentTrack(displayedTracks[(currentIndex - 1 + displayedTracks.length) % displayedTracks.length]);
  }, [displayedTracks, currentTrack]);

  const handleTrackSelect = async (track: Track) => {
    if (track.source === 'spotify') {
      if (!isSpotifyPremium) { alert("Spotify Premium is required for playback."); return; }
      if (spotifyDeviceId) {
        await spotifyApiRequest(`me/player/play?device_id=${spotifyDeviceId}`, 'PUT', { uris: [track.url] });
        setCurrentTrack(track);
        setIsPlaying(true);
      } else { alert("No active Spotify device found. Make sure Spotify is open on one of your devices."); }
    } else {
      setLoadingTrackUrl(track.url);
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleSpotifyLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${activeSpotifyClientId}&response_type=token&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}`;
    window.open(authUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveSpotifyClientId = (clientId: string) => {
    setUserSpotifyClientId(clientId);
    localStorage.setItem('spotify-client-id', clientId);
    alert('Spotify Client ID saved! You may need to reconnect to Spotify for the change to take effect.');
  };

  const handleSelectSpotifyPlaylist = async (playlistId: string) => {
    setActivePlaylistId(playlistId);
    setSpotifyTracks([]);
    try {
        const data = await spotifyApiRequest(`playlists/${playlistId}/tracks`);
        if(data) {
            const tracks: Track[] = data.items.map(({track}: any) => track && ({
                id: track.id,
                url: track.uri,
                source: 'spotify',
                name: track.name,
                artists: track.artists.map((a: any) => a.name),
                album: track.album.name,
                albumArtUrl: track.album.images?.[0]?.url,
                duration: Math.round(track.duration_ms / 1000)
            })).filter(Boolean);
            setSpotifyTracks(tracks);
        } else {
            alert('Could not load Spotify playlist. Please try again.');
        }
    } catch(e) {
        console.error("Error fetching spotify playlist:", e);
        alert('An unexpected error occurred while loading the Spotify playlist.');
    }
  };
  
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files; if (!files) return; setIsImporting(true);
    const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.opus'];
    const audioFiles: File[] = [...files].filter(f => AUDIO_EXTENSIONS.includes(f.name.slice(f.name.lastIndexOf('.')).toLowerCase()));
    if (audioFiles.length > 0) {
      const newTracks: Track[] = audioFiles.map((file: File) => ({
        source: 'local', file, url: URL.createObjectURL(file), name: file.name.replace(/\.[^/.]+$/, ""), duration: 0, relativePath: file.webkitRelativePath || file.name, createdAt: new Date().toISOString(),
      }));
      setAllTracks(newTracks);
      setCurrentTrack(newTracks[0]);
      setIsPlaying(true);
      setActivePlaylistId('all-tracks');
    } else { alert('No supported audio files found in the selected folder.'); }
    if (event.target) event.target.value = ''; setIsImporting(false);
  };

  const handleSeekBy = useCallback((seconds: number) => {
    if (!currentTrack) return;
    if (currentTrack.source === 'local' && audioRef.current) {
        audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
    if (currentTrack.source === 'spotify' && spotifyPlayer) {
        spotifyPlayer.getCurrentState().then((state: any) => {
            if (!state) return;
            const newPosition = Math.max(0, Math.min(state.duration, state.position + (seconds * 1000)));
            spotifyPlayer.seek(newPosition);
        });
    }
  }, [currentTrack, duration, spotifyPlayer]);

  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space': case 'Numpad5': e.preventDefault(); handlePlayPause(); break;
        case 'ArrowRight': case 'Numpad6': e.preventDefault(); playNext(); break;
        case 'ArrowLeft': case 'Numpad4': e.preventDefault(); playPrev(); break;
        case 'ArrowUp': case 'Numpad8': e.preventDefault(); setVolume(v => Math.min(1, v + VOLUME_STEP)); break;
        case 'ArrowDown': case 'Numpad2': e.preventDefault(); setVolume(v => Math.max(0, v - VOLUME_STEP)); break;
        case 'Numpad0': e.preventDefault(); setIsShuffle(s => !s); break;
        case 'NumpadDecimal': e.preventDefault(); setIsRepeat(r => !r); break;
        case 'Numpad7': e.preventDefault(); handleSeekBy(-6); break;
        case 'Numpad1': e.preventDefault(); handleSeekBy(-3); break;
        case 'Numpad9': e.preventDefault(); handleSeekBy(6); break;
        case 'Numpad3': e.preventDefault(); handleSeekBy(3); break;
      }
  }, [handlePlayPause, playNext, playPrev, handleSeekBy]);
  
  // Player Event Handlers
  const handleTimeUpdate = () => { if (audioRef.current) { const { currentTime, duration } = audioRef.current; setCurrentTime(currentTime); if(duration) setProgress((currentTime / duration) * 100); } };
  const handleLoadedMetadata = () => { if (audioRef.current) { setDuration(audioRef.current.duration); setAllTracks(tracks => tracks.map(t => t.url === currentTrack?.url ? {...t, duration: audioRef.current!.duration} : t)); } };
  const handleEnded = () => { if (isRepeat && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(console.error); } else { playNext(); } };
  const handleCanPlayThrough = () => { if (loadingTrackUrl) setLoadingTrackUrl(null); };
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => { if (!currentTrack) return; const newProgress = e.nativeEvent.offsetX / e.currentTarget.offsetWidth; const newTime = newProgress * duration; if (currentTrack.source === 'local' && audioRef.current) audioRef.current.currentTime = newTime; if (currentTrack.source === 'spotify' && spotifyPlayer) spotifyPlayer.seek(newTime * 1000); };

  const handleClearPlaylist = async () => {
    await clearAllData();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    allTracks.forEach(track => URL.revokeObjectURL(track.url));
    setAllTracks([]); setCurrentTrack(null); setIsPlaying(false);
    setProgress(0); setDuration(0); setCurrentTime(0); setSearchQuery('');
    setIsClearConfirmOpen(false);
  };
  
  const handleAIGenerateLyrics = async (forceRegenerate = false) => {
    if (!currentTrack) return;

    if (!forceRegenerate && trackMetadata.lyrics?.[currentTrack.url]) {
        setLyricsResult(trackMetadata.lyrics[currentTrack.url]);
        setIsGeneratingLyrics(false);
        setIsLyricsModalOpen(true);
        return;
    }

    setIsLyricsModalOpen(true);
    setIsGeneratingLyrics(true);
    setLyricsResult(null);

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        let response;

        if (currentTrack.source === 'local' && currentTrack.file) {
            const audioData = await fileToBase64(currentTrack.file);
            const audioPart = { inlineData: { mimeType: currentTrack.file.type || 'audio/mpeg', data: audioData } };
            const prompt = "Transcribe the lyrics from the provided audio file. If the song is instrumental, state that clearly. Only return the transcribed text.";
            response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [audioPart, { text: prompt }] },
            });
        } else if (currentTrack.source === 'spotify') {
            const prompt = `What are the lyrics for the song "${currentTrack.name}" by ${currentTrack.artists?.join(', ')}? If you cannot find the lyrics, state that clearly. Only return the lyrics as plain text.`;
            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
        } else {
            throw new Error("Unsupported track source for lyrics generation.");
        }

        const generatedLyrics = response.text;
        setLyricsResult(generatedLyrics);

        const newMetadata: TrackMetadata = {
            ...trackMetadata,
            lyrics: {
                ...(trackMetadata.lyrics ?? {}),
                [currentTrack.url]: generatedLyrics,
            },
        };
        setTrackMetadata(newMetadata);
        await saveTrackMetadata(newMetadata);
    } catch (error) {
        console.error("Error generating lyrics with Gemini:", error);
        setLyricsResult("Could not generate lyrics. An error occurred while communicating with the AI, or this feature is not supported for the current track.");
    } finally {
        setIsGeneratingLyrics(false);
    }
  };

  const handleGenerateLyrics = () => {
    if (!currentTrack) return;
    if (currentTrack.source === 'spotify') {
        handleAIGenerateLyrics();
        return;
    }
    setIsLyricsSourceModalOpen(true);
  };

  const handleLyricsSourceSelected = async (source: 'ai' | 'upload' | 'paste', content?: string) => {
    setIsLyricsSourceModalOpen(false);
    if (!currentTrack) return;

    if (source === 'ai') {
        await handleAIGenerateLyrics(true);
    } else if (content) {
        const newMetadata: TrackMetadata = {
            ...trackMetadata,
            lyrics: {
                ...(trackMetadata.lyrics ?? {}),
                [currentTrack.url]: content,
            },
        };
        setTrackMetadata(newMetadata);
        await saveTrackMetadata(newMetadata);
        setLyricsResult(content);
        setIsLyricsModalOpen(true);
    }
  };

  const handleAnalyzeTrack = async (forceRegenerate = false) => {
    if (!currentTrack || currentTrack.source !== 'local' || !currentTrack.file) return;
    if (!forceRegenerate && trackMetadata.analysis?.[currentTrack.url]) { setAnalysisResult(trackMetadata.analysis[currentTrack.url]); setIsAnalysisModalOpen(true); return; }
    setIsAnalysisModalOpen(true); setIsAnalyzing(true); setAnalysisResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const audioData = await fileToBase64(currentTrack.file);
      const audioPart = { inlineData: { mimeType: currentTrack.file.type || 'audio/mpeg', data: audioData } };
      const prompt = `Analyze the provided audio file and return a detailed breakdown in JSON format. The JSON object must contain these exact keys: "songStructure", "musicalElements", "lyricalComponents", "productionElements", "creativeTechnicalAspects", and "regenerationPrompt". For each key except "regenerationPrompt", provide a detailed, plain-text analysis. For "regenerationPrompt", provide a single, summarized text prompt, 350 characters or less, that could be used to regenerate a similar song. This prompt must not contain any special formatting characters like hashtags or asterisks.`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: { parts: [audioPart, { text: prompt }] }, config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { songStructure: { type: Type.STRING }, musicalElements: { type: Type.STRING }, lyricalComponents: { type: Type.STRING }, productionElements: { type: Type.STRING }, creativeTechnicalAspects: { type: Type.STRING }, regenerationPrompt: { type: Type.STRING } }, required: ["songStructure", "musicalElements", "lyricalComponents", "productionElements", "creativeTechnicalAspects", "regenerationPrompt"] } } });
      const newAnalysis: AnalysisResult = JSON.parse(response.text);
      setAnalysisResult(newAnalysis);
      const newMetadata: TrackMetadata = { ...trackMetadata, analysis: { ...(trackMetadata.analysis ?? {}), [currentTrack.url]: newAnalysis } };
      setTrackMetadata(newMetadata); await saveTrackMetadata(newMetadata);
    } catch (error) { console.error("Error analyzing song with Gemini:", error); setAnalysisResult({ songStructure: "Could not analyze song.", musicalElements: "An error occurred while communicating with the AI.", lyricalComponents: "", productionElements: "", creativeTechnicalAspects: "", regenerationPrompt: "Analysis failed." }); }
    finally { setIsAnalyzing(false); }
  };
  
  const handleStartKaraoke = useCallback(async (track: Track) => {
    // Set UI state and prepare the track without playing it yet
    setKaraokeLyrics(null);
    setIsKaraokeModalOpen(true);
    setCurrentTrack(track);
    setIsPlaying(false);

    // Fetch lyrics, regenerating if they don't exist or aren't timestamped
    let lyrics = trackMetadata.lyrics?.[track.url];
    if (!lyrics || !lyrics.includes('[')) { 
        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            const prompt = `Transcribe the lyrics from the provided audio file. Provide timestamps for the beginning of each line in the format [mm:ss.xx], where mm is minutes, ss is seconds, and xx is hundredths of a second. For example: [00:12.34] This is a lyric line. Ensure every line of lyric has a timestamp. If the song is instrumental, state that clearly without timestamps. Only return the transcribed text in this timestamped format.`;
            const audioData = await fileToBase64(track.file as File);
            const audioPart = { inlineData: { mimeType: track.file?.type || 'audio/mpeg', data: audioData } };
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [audioPart, { text: prompt }] },
            });
            lyrics = response.text;
            const newMetadata: TrackMetadata = { ...trackMetadata, lyrics: { ...(trackMetadata.lyrics ?? {}), [track.url]: lyrics } };
            setTrackMetadata(newMetadata);
            await saveTrackMetadata(newMetadata);
        } catch (error) {
            console.error("Error generating lyrics for karaoke:", error);
            lyrics = "Could not generate lyrics for this song.";
        }
    }
    
    // Set the lyrics in the modal
    setKaraokeLyrics(lyrics);

    // If lyrics were successfully generated, start playback
    if (lyrics && !lyrics.startsWith("Could not generate")) {
      setTimeout(() => setIsPlaying(true), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackMetadata.lyrics]);


  const handleLikeToggle = async (trackUrl: string) => { const newMetadata: TrackMetadata = { ...trackMetadata, likes: { ...trackMetadata.likes, [trackUrl]: !trackMetadata.likes[trackUrl] } }; setTrackMetadata(newMetadata); await saveTrackMetadata(newMetadata); };
  const handleRateTrack = async (trackUrl: string, rating: number) => { const newRating = (trackMetadata.ratings[trackUrl] || 0) === rating ? 0 : rating; const newMetadata: TrackMetadata = { ...trackMetadata, ratings: { ...trackMetadata.ratings, [trackUrl]: newRating } }; setTrackMetadata(newMetadata); await saveTrackMetadata(newMetadata); };
  const handleShareTrack = async (track: Track) => { try { if (navigator.share) await navigator.share({ title: 'Check out this track!', text: `I'm listening to "${track.name}" on Robo AI Jukebox.` }); else { await navigator.clipboard.writeText(`Listening to "${track.name}"`); alert('Track name copied!'); } } catch (error) { console.error('Share/Copy failed:', error); } };
  const handlePlaylistReorder = async (dragIndex: number, dropIndex: number) => {
    const activePl = combinedPlaylists.find(p => p.id === activePlaylistId); if (!activePl || activePl.system) return;
    const newOrderedList = [...activePlaylistTracks]; const [draggedItem] = newOrderedList.splice(dragIndex, 1); newOrderedList.splice(dropIndex, 0, draggedItem); const newUrlOrder = newOrderedList.map(t => t.url);
    const updatedUserPls = playlists.map(p => p.id === activePlaylistId ? { ...p, trackUrls: newUrlOrder } : p); setPlaylists(updatedUserPls); await savePlaylists(updatedUserPls);
  };
  const handleCreatePlaylist = async (name: string) => { const newPlaylist: PlaylistType = { id: uuidv4(), name, trackUrls: [] }; const updatedPls = [...playlists, newPlaylist]; setPlaylists(updatedPls); await savePlaylists(updatedPls); setActivePlaylistId(newPlaylist.id); };
  const handleAddToPlaylist = async (playlistId: string) => {
      if (!trackToAddToPlaylist) return;
      const updatedPls = playlists.map(p => {
          if (p.id === playlistId) {
              const currentUrls = p.trackUrls || [];
              if (!currentUrls.includes(trackToAddToPlaylist.url)) {
                  return { ...p, trackUrls: [...currentUrls, trackToAddToPlaylist.url] };
              }
          }
          return p;
      });
      setPlaylists(updatedPls);
      await savePlaylists(updatedPls);
      setTrackToAddToPlaylist(null);
  };
  const handleCreatePlaylistAndAdd = async (playlistName: string) => { if (!trackToAddToPlaylist) return; const newPlaylist: PlaylistType = { id: uuidv4(), name: playlistName, trackUrls: [trackToAddToPlaylist.url] }; const updatedPls = [...playlists, newPlaylist]; setPlaylists(updatedPls); await savePlaylists(updatedPls); setTrackToAddToPlaylist(null); };
  const handleRemoveTrackFromPlaylist = async (trackUrl: string) => {
      const activePl = playlists.find(p => p.id === activePlaylistId);
      if (!activePl || activePl.system) return;
      const updatedPls = playlists.map(p => {
          if (p.id === activePlaylistId) {
              return { ...p, trackUrls: (p.trackUrls || []).filter(url => url !== trackUrl) };
          }
          return p;
      });
      setPlaylists(updatedPls);
      await savePlaylists(updatedPls);
  };
  const handleSaveEqPreset = async (name: string) => {
    if (!name.trim() || EQ_PRESETS[name] || userEqPresets[name]) {
        alert("Preset name is invalid or already exists.");
        return;
    }
    const newPresets = { ...userEqPresets, [name.trim()]: eqSettings };
    setUserEqPresets(newPresets);
    await saveUserEqPresets(newPresets);
  };
  const handleDeleteEqPreset = async (name: string) => {
      if (!userEqPresets[name]) return;
      const newPresets = { ...userEqPresets };
      delete newPresets[name];
      setUserEqPresets(newPresets);
      await saveUserEqPresets(newPresets);
  };
  const handleBalanceChange = (value: number) => {
    setBalance(value);
    if (pannerNodeRef.current) {
        pannerNodeRef.current.pan.value = value;
    }
  };
  const handleBassBoostToggle = () => {
    setIsBassBoostEnabled(prev => {
        const newState = !prev;
        if (bassBoostNodeRef.current) {
            if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
            bassBoostNodeRef.current.gain.value = newState ? 6 : 0; // 6dB boost
        }
        return newState;
    });
  };

  const handleToggleVocalReduction = () => setIsVocalReductionOn(prev => !prev);
  
  const handleToggleDjMode = () => {
    if (!isDjModeOpen) {
        // When opening DJ mode, pause the main player
        setIsPlaying(false);
    } else {
        // When closing, also reset minimized state
        setIsDjModeMinimized(false);
    }
    setIsDjModeOpen(prev => !prev);
  };

  const handleToggleKaraokeMode = () => setIsKaraokeModeEnabled(prev => !prev);

  const handleToggleDjModeMinimize = () => {
    setIsDjModeMinimized(prev => !prev);
  };

  const handleProfileTrackSelect = (trackUrl: string) => {
    const trackToPlay = allTracks.find(t => t.url === trackUrl);
    if (trackToPlay) {
        // Profile modal stats are local-only, so this is a safe assumption
        if (trackToPlay.source === 'local') {
            // Switch to local library view if on Spotify
            if (librarySource !== 'local') {
                setLibrarySource('local');
            }
            // Switch to a playlist where the track is guaranteed to be visible
            setActivePlaylistId('all-tracks');
            // Play the track
            handleTrackSelect(trackToPlay);
            // Close the modal
            setIsProfileModalOpen(false);
        }
    }
  };

  const handleToggleSoundPad = useCallback((pad: SoundboardPad) => {
    const playingAudio = playingSoundsRef.current.get(pad.id);

    if (playingAudio) {
        // Sound is playing, so stop it.
        playingAudio.pause();
        playingAudio.currentTime = 0;
        playingSoundsRef.current.delete(pad.id);
        setActiveSoundPads(prev => {
            const newSet = new Set(prev);
            newSet.delete(pad.id);
            return newSet;
        });
    } else {
        // Sound is not playing, so start it.
        const audio = new Audio(pad.soundUrl);
        audio.volume = volume;
        audio.play().catch(e => console.error("Sound effect playback error:", e));
        
        playingSoundsRef.current.set(pad.id, audio);
        setActiveSoundPads(prev => {
            const newSet = new Set(prev);
            newSet.add(pad.id);
            return newSet;
        });

        audio.addEventListener('ended', () => {
            // Clean up when sound finishes naturally.
            // Check if this is still the current audio for this pad ID.
            if (playingSoundsRef.current.get(pad.id) === audio) {
                playingSoundsRef.current.delete(pad.id);
                setActiveSoundPads(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(pad.id);
                    return newSet;
                });
            }
        }, { once: true });
    }
  }, [volume]);

  const handleUpdateSoundboardPad = async (sheet: number, id: number, name: string, soundUrl: string) => {
    const newSheets = { ...soundboardSheets };
    if (newSheets[sheet]) {
        newSheets[sheet] = newSheets[sheet].map(p => p.id === id ? { ...p, name, soundUrl } : p);
        setSoundboardSheets(newSheets);
        await saveSoundboardSheets(newSheets);
    }
  };
  
  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read file"));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
  };

  const handleLoadSoundboardFolder = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.opus'];
    const audioFiles = [...files]
        .filter(f => AUDIO_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (audioFiles.length === 0) {
        alert('No supported audio files found in the selected folder.');
        if (event.target) event.target.value = '';
        return;
    }

    const useFileName = window.confirm('Do you want to name the pads using the audio file names?');
    alert(`Loading ${audioFiles.length} sounds... This may take a moment.`);

    const newSheets = JSON.parse(JSON.stringify(soundboardSheets));
    let currentSheetIndex = currentSoundboardSheet;
    let currentPadIndexInSheet = 0;
    const totalSheets = 9;
    const padsPerSheet = 16;
    let filesLoadedCount = 0;

    for (const file of audioFiles) {
        if (currentSheetIndex >= totalSheets) {
            alert(`Soundboard is full. ${filesLoadedCount} of ${audioFiles.length} files were loaded.`);
            break;
        }

        try {
            const soundUrl = await fileToDataUri(file);
            const padName = useFileName ? file.name.replace(/\.[^/.]+$/, "").substring(0, 20) : newSheets[currentSheetIndex][currentPadIndexInSheet].name;
            const padToUpdate = newSheets[currentSheetIndex][currentPadIndexInSheet];
            padToUpdate.name = padName;
            padToUpdate.soundUrl = soundUrl;
            filesLoadedCount++;
        } catch (error) {
            console.error("Error processing file:", file.name, error);
        }

        currentPadIndexInSheet++;
        if (currentPadIndexInSheet >= padsPerSheet) {
            currentPadIndexInSheet = 0;
            currentSheetIndex++;
        }
    }

    setSoundboardSheets(newSheets);
    await saveSoundboardSheets(newSheets);

    if (event.target) event.target.value = '';
    
    if (filesLoadedCount < audioFiles.length && currentSheetIndex >= totalSheets) {
        // This case is handled by the "Soundboard is full" alert.
    } else {
        alert(`${filesLoadedCount} sounds loaded successfully!`);
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResize = useCallback((e: MouseEvent) => {
      const newWidth = e.clientX;
      const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, MAX_SIDEBAR_WIDTH));
      setSidebarWidth(clampedWidth);
  }, []);

  const handleResizeEnd = useCallback(() => {
      setIsResizing(false);
  }, []);

  // --- Effects ---
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Handle sidebar resizing
  useEffect(() => {
      if (isResizing) {
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
          window.addEventListener('mousemove', handleResize);
          window.addEventListener('mouseup', handleResizeEnd);
      }
      return () => {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', handleResize);
          window.removeEventListener('mouseup', handleResizeEnd);
      };
  }, [isResizing, handleResize, handleResizeEnd]);

  // Save sidebar width to local storage
  useEffect(() => {
    localStorage.setItem('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle Vocal Reduction EQ
  useEffect(() => {
    if (vocalReducerNodeRef.current) {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        // Increased reduction to -40dB, the maximum for this filter type, for a stronger effect.
        vocalReducerNodeRef.current.gain.value = isVocalReductionOn ? -40 : 0;
    }
  }, [isVocalReductionOn]);

  // Load theme & data on initial mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('jukebox-theme') as Theme | null;
    if (savedTheme && THEMES.includes(savedTheme)) setTheme(savedTheme);

    const savedClientId = localStorage.getItem('spotify-client-id');
    if (savedClientId) {
      setUserSpotifyClientId(savedClientId);
    }

    const loadData = async () => {
        const [metadata, playlists, stats, eqPresets, sheets] = await Promise.all([
          getTrackMetadata(), 
          getAllPlaylists(), 
          getStats(), 
          getUserEqPresets(),
          getSoundboardSheets()
        ]);

        if (metadata) { 
            if (!metadata.analysis) metadata.analysis = {};
            if (!metadata.lyrics) metadata.lyrics = {};
            setTrackMetadata(metadata);
        }
        if (stats) setListeningStats(stats);
        if (eqPresets) setUserEqPresets(eqPresets);
        
        if (sheets && Object.keys(sheets).length > 0) {
          setSoundboardSheets(sheets);
        } else {
          setSoundboardSheets(DEFAULT_SOUNDBOARD_SHEETS);
          await saveSoundboardSheets(DEFAULT_SOUNDBOARD_SHEETS);
        }

        if (playlists && playlists.length > 0) {
            setPlaylists(playlists);
        } else {
            const defaultPls: PlaylistType[] = DEFAULT_PLAYLIST_NAMES.map(name => ({ id: uuidv4(), name, trackUrls: [] }));
            setPlaylists(defaultPls);
            await savePlaylists(defaultPls);
        }
    };
    loadData();

    return () => { allTracks.forEach(track => { if (track.source === 'local') URL.revokeObjectURL(track.url) }); audioContextRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Handle Theme Change
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('jukebox-theme', theme); }, [theme]);

  // Handle Spotify SDK loading and Auth hash parsing
  useEffect(() => {
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      setIsSpotifySdkReady(true);
    };
    if ((window as any).Spotify) {
      setIsSpotifySdkReady(true);
    }
  
    const hash = window.location.hash;
    const token = new URLSearchParams(hash.substring(1)).get('access_token');
    if (token) {
        setSpotifyToken(token);
        window.location.hash = ''; // Clear hash from URL
    }
  }, []);

  // Handle Spotify Player Initialization
  useEffect(() => {
    if (isSpotifySdkReady && spotifyToken && !spotifyPlayer) {
      // Fix: Access Spotify Player constructor from the window object as it's loaded via script.
      const player = new (window as any).Spotify.Player({
          name: 'Robo AI Jukebox',
          getOAuthToken: cb => { cb(spotifyToken); },
          volume: volume
      });
  
      player.addListener('ready', ({ device_id }) => {
          console.log('Spotify Player Ready with Device ID', device_id);
          setSpotifyDeviceId(device_id);
      });
      player.addListener('not_ready', ({ device_id }) => console.log('Device ID has gone offline', device_id));
      player.addListener('initialization_error', ({ message }) => {
          console.error("Spotify Player Init Error:", message);
      });
      player.addListener('authentication_error', ({ message }) => {
          console.error("Spotify Player Auth Error:", message);
          alert("Spotify authentication failed. Your session may have expired. Please connect again.");
          setSpotifyToken(null);
          setSpotifyUser(null);
      });
      player.addListener('account_error', ({ message }) => {
          setIsSpotifyPremium(false);
          alert(`Spotify Account Error: ${message}. Playback requires a Premium account.`);
      });
      player.addListener('player_state_changed', state => {
          if (!state) return;
          setIsPlaying(!state.paused);
          setProgress((state.position / state.duration) * 100);
          setCurrentTime(state.position / 1000);
          setDuration(state.duration / 1000);
          const currentTrackFromState = state.track_window?.current_track;
          if (currentTrackFromState && currentTrackRef.current?.id !== currentTrackFromState.id) {
              const newTrack: Track = {
                  id: currentTrackFromState.id,
                  url: currentTrackFromState.uri,
                  source: 'spotify',
                  name: currentTrackFromState.name,
                  artists: currentTrackFromState.artists.map((a: any) => a.name),
                  album: currentTrackFromState.album.name,
                  albumArtUrl: currentTrackFromState.album.images?.[0]?.url,
                  duration: Math.round(currentTrackFromState.duration_ms / 1000)
              };
              setCurrentTrack(newTrack);
          }
      });
  
      player.connect().then(success => {
          if (success) {
              console.log('The Spotify player has connected successfully!');
              setSpotifyPlayer(player);
          }
      });
  
      return () => {
          console.log("Disconnecting Spotify Player");
          player.disconnect();
          setSpotifyPlayer(null);
      };
    }
  }, [isSpotifySdkReady, spotifyToken, volume, spotifyPlayer]);

  // Fetch Spotify user data and playlists when token is available
  useEffect(() => {
    if (spotifyToken) {
        const fetchUserData = async () => {
            try {
              const user = await spotifyApiRequest('me');
              if (user) {
                  setSpotifyUser(user);
                  setIsSpotifyPremium(user.product === 'premium');
              } else {
                  throw new Error("Failed to fetch user profile.");
              }

              const playlistsData = await spotifyApiRequest('me/playlists?limit=50');
              if(playlistsData) {
                  setSpotifyPlaylists(playlistsData.items);
              } else {
                  throw new Error("Failed to fetch user playlists.");
              }
            } catch(e) {
                console.error("Error fetching user data from Spotify:", e);
                alert("Could not fetch your Spotify data. Your session might have expired. Please try connecting again.");
                setSpotifyToken(null);
                setSpotifyUser(null);
            }
        };
        fetchUserData();
    }
  }, [spotifyToken, spotifyApiRequest]);

  // Handle Player Volume
  useEffect(() => {
    if (audioRef.current && currentTrack?.source === 'local') audioRef.current.volume = volume;
    if (spotifyPlayer) spotifyPlayer.setVolume(volume);
  }, [volume, spotifyPlayer, currentTrack]);

  // Handle Play/Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentTrack?.source !== 'local') { audio.pause(); return; }
    
    const playAudio = async () => {
        try {
            if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
            await audio.play();
        } catch (error) { if ((error as DOMException).name !== 'AbortError') console.error("Audio playback error:", error); }
    };

    if (isPlaying && currentTrack) {
        if (audio.src !== currentTrack.url) {
            // A new track is being played. Update play count and history.
            setListeningStats(stats => {
                const newPlayCounts = { ...stats.playCounts, [currentTrack.url]: (stats.playCounts[currentTrack.url] || 0) + 1 };
                // Add to history, remove duplicates, and cap at 50
                const newHistory = [currentTrack.url, ...stats.history.filter(h => h !== currentTrack.url)].slice(0, 50);
                return { ...stats, playCounts: newPlayCounts, history: newHistory };
            });

            audio.src = currentTrack.url;
            audio.load();
            audio.addEventListener('canplay', playAudio, { once: true });
        } else { playAudio(); }
    } else { audio.pause(); }

    const cleanup = () => {
        if(audio) {
            audio.removeEventListener('canplay', playAudio);
        }
    };
    return cleanup;
  }, [currentTrack, isPlaying]);
  
  // Auto-start Karaoke when mode is enabled
  useEffect(() => {
    if (isKaraokeModeEnabled && currentTrack && currentTrack.source === 'local' && currentTrack.file) {
      // This will only trigger for new tracks when the mode is on, or when the mode is turned on for the current track.
      // A small delay allows other UI updates to settle before opening the modal.
      const timer = setTimeout(() => {
        handleStartKaraoke(currentTrack);
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.url, isKaraokeModeEnabled]);

  // Stat tracking effect
  useEffect(() => {
    let playTimeInterval: number | null = null;
    let saveStatsInterval: number | null = null;
    
    const persistStats = () => {
      if (listeningStatsRef.current.totalPlayTime > 0 || Object.keys(listeningStatsRef.current.playCounts).length > 0) {
        saveStats(listeningStatsRef.current);
      }
    };
    
    if (isPlaying && currentTrack?.source === 'local') {
      playTimeInterval = window.setInterval(() => {
        setListeningStats(stats => ({
          ...stats,
          totalPlayTime: stats.totalPlayTime + 1,
        }));
      }, 1000);
      
      saveStatsInterval = window.setInterval(persistStats, 15000);
    }
    
    return () => {
      if (playTimeInterval) window.clearInterval(playTimeInterval);
      if (saveStatsInterval) window.clearInterval(saveStatsInterval);
      persistStats();
    };
  }, [isPlaying, currentTrack]);

  // Handle Sleep Timer Countdown
  useEffect(() => {
    if (!sleepTimerRemaining || sleepTimerRemaining <= 0) return;
    const intervalId = window.setInterval(() => setSleepTimerRemaining(p => (p === null || p <= 1) ? null : p - 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [sleepTimerRemaining]);

  // Setup/Teardown EQ
  useEffect(() => {
    if (currentTrack && !audioContextRef.current) setupAudioContext();
  }, [currentTrack, setupAudioContext]);

  useEffect(() => {
    if (!audioContextRef.current || eqNodesRef.current.length === 0) return;
    eqNodesRef.current.forEach((node, index) => { node.gain.value = isEqEnabled ? eqSettings[index] : 0; });
  }, [isEqEnabled, eqSettings]);

  useEffect(() => { window.addEventListener('keydown', handleKeyboardShortcuts); return () => window.removeEventListener('keydown', handleKeyboardShortcuts); }, [handleKeyboardShortcuts]);

  const activePlaylist = combinedPlaylists.find(p => p.id === activePlaylistId);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="p-4 flex items-center justify-between border-b border-[var(--border-primary)] shadow-md flex-shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[var(--accent-primary)] uppercase">Robo AI - Jukebox</h1>
        <div className="flex items-center space-x-2">
            {spotifyUser ? (
                <div className="flex items-center space-x-2 bg-[var(--bg-tertiary)]/50 px-3 py-1.5 rounded-full">
                    <span className="text-sm font-semibold">{spotifyUser.display_name}</span>
                </div>
            ) : (
                <button 
                  onClick={handleSpotifyLogin} 
                  title="Connect to Spotify"
                  className="flex items-center space-x-2 bg-[#1DB954] hover:bg-[#1ED760] text-white font-bold py-2 px-4 rounded-full transition-colors"
                >
                    <SpotifyIcon className="w-5 h-5"/>
                    <span>Connect Spotify</span>
                </button>
            )}
            <button onClick={() => setIsProfileModalOpen(true)} title="Your Profile" className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--bg-tertiary)]/50">
                <UserIcon className="w-6 h-6" />
            </button>
            <button onClick={handleThemeChange} title="Switch Theme" className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--bg-tertiary)]/50">
                <ThemeIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setIsHelpModalOpen(true)} title="Help" className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--bg-tertiary)]/50">
                <HelpIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setIsShortcutsModalOpen(true)} title="Keyboard Shortcuts" className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-full hover:bg-[var(--bg-tertiary)]/50">
                <ShortcutsIcon className="w-6 h-6" />
            </button>
        </div>
      </header>
      
      <div className="flex flex-grow overflow-hidden">
        <PlaylistSidebar 
            playlists={combinedPlaylists}
            activePlaylistId={activePlaylistId}
            onSelectPlaylist={setActivePlaylistId}
            onCreatePlaylist={handleCreatePlaylist}
            librarySource={librarySource}
            onLibrarySourceChange={setLibrarySource}
            isSpotifyConnected={!!spotifyToken}
            spotifyPlaylists={spotifyPlaylists}
            onSelectSpotifyPlaylist={handleSelectSpotifyPlaylist}
            width={sidebarWidth}
            onResizeStart={handleResizeStart}
        />
        <main className="flex-grow overflow-hidden flex flex-col">
            <Playlist
            tracks={displayedTracks}
            totalTrackCount={allTracks.length}
            currentTrack={currentTrack}
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
            onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
            isUserPlaylist={activePlaylist ? !activePlaylist.system : false}
            playlists={playlists}
            librarySource={librarySource}
            onStartKaraoke={handleStartKaraoke}
            />
        </main>
      </div>

      <PlayerControls
        currentTrack={currentTrack}
        isPlaying={isPlaying} isShuffle={isShuffle} isRepeat={isRepeat}
        progress={progress} duration={duration} currentTime={currentTime}
        playlistSize={allTracks.length} volume={volume}
        isLoading={!!loadingTrackUrl} isImporting={isImporting} isAnalyzing={isAnalyzing}
        isGeneratingLyrics={isGeneratingLyrics}
        showEq={showEq} isEqEnabled={isEqEnabled} eqSettings={eqSettings}
        balance={balance} isBassBoostEnabled={isBassBoostEnabled}
        timeDisplayMode={timeDisplayMode}
        isSleepTimerPopoverOpen={isSleepTimerPopoverOpen}
        sleepTimerRemaining={sleepTimerRemaining}
        isSoundboardOpen={isSoundboardOpen}
        isDjModeOpen={isDjModeOpen}
        isKaraokeModeEnabled={isKaraokeModeEnabled}
        onPlayPause={handlePlayPause} onNext={playNext} onPrev={playPrev}
        onShuffleToggle={() => setIsShuffle(!isShuffle)} onRepeatToggle={() => setIsRepeat(!isRepeat)}
        onSeek={handleSeek} onAddSongsClick={() => fileInputRef.current?.click()}
        onVolumeChange={(e) => setVolume(parseFloat(e.target.value))}
        onVolumeUp={() => setVolume(v => Math.min(1, v + 0.1))}
        onVolumeDown={() => setVolume(v => Math.max(0, v - 0.1))}
        onEqToggle={() => setShowEq(!showEq)}
        onEqEnabledChange={(e) => { if(audioContextRef.current?.state === 'suspended') audioContextRef.current.resume(); setIsEqEnabled(e); }}
        onEqGainChange={(band, gain) => setEqSettings(p => { const n = [...p]; n[band] = gain; return n; })}
        onEqPresetChange={(p) => setEqSettings(combinedEqPresets[p])}
        onBalanceChange={handleBalanceChange}
        onBassBoostToggle={handleBassBoostToggle}
        onAnalyze={() => handleAnalyzeTrack()}
        onGenerateLyrics={handleGenerateLyrics}
        onTimeDisplayToggle={() => setTimeDisplayMode(p => p === 'elapsed' ? 'remaining' : 'elapsed')}
        onToggleSleepTimerPopover={() => setIsSleepTimerPopoverOpen(p => !p)}
        onSetSleepTimer={(mins) => {
          if (sleepTimerId) window.clearTimeout(sleepTimerId);
          if (mins <= 0) { setSleepTimerId(null); setSleepTimerRemaining(null); return; }
          const seconds = mins * 60;
          setSleepTimerRemaining(seconds);
          const newTimerId = window.setTimeout(() => { setIsPlaying(false); setSleepTimerId(null); setSleepTimerRemaining(null); }, seconds * 1000);
          setSleepTimerId(newTimerId);
        }}
        onToggleSoundboard={() => setIsSoundboardOpen(prev => !prev)}
        onToggleDjMode={handleToggleDjMode}
        onToggleKaraokeMode={handleToggleKaraokeMode}
        allPresets={combinedEqPresets}
        userPresets={userEqPresets}
        onSaveEqPreset={handleSaveEqPreset}
        onDeleteEqPreset={handleDeleteEqPreset}
      />

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} onCanPlayThrough={handleCanPlayThrough} crossOrigin="anonymous" />
      <input type="file" ref={fileInputRef} onChange={handleFolderSelect} className="hidden" multiple {...{webkitdirectory: "", directory: ""}} />
      <input type="file" ref={soundboardFolderInputRef} onChange={handleLoadSoundboardFolder} className="hidden" multiple {...{webkitdirectory: "", directory: ""}} />
      <ConfirmationModal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={handleClearPlaylist} title="Clear Entire Jukebox?">
        <p className="text-sm text-[var(--text-secondary)]">Are you sure you want to permanently delete all tracks and playlists? This action cannot be undone.</p>
      </ConfirmationModal>
      <AnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} analysis={analysisResult} isLoading={isAnalyzing} trackName={currentTrack?.name ?? null} onRegenerate={() => handleAnalyzeTrack(true)} />
      <LyricsModal 
        isOpen={isLyricsModalOpen} 
        onClose={() => setIsLyricsModalOpen(false)} 
        lyrics={lyricsResult} 
        isLoading={isGeneratingLyrics} 
        trackName={currentTrack?.name ?? null}
        onRegenerate={() => handleAIGenerateLyrics(true)}
      />
      <AddToQueueModal isOpen={!!trackToAddToPlaylist} onClose={() => setTrackToAddToPlaylist(null)} playlists={playlists} onSelectPlaylist={handleAddToPlaylist} onCreatePlaylist={handleCreatePlaylistAndAdd} trackName={trackToAddToPlaylist?.name ?? null} />
      <ShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        stats={listeningStats} 
        playlist={allTracks} 
        onResetStats={() => resetStats().then(() => setListeningStats({ totalPlayTime: 0, playCounts: {}, history: [] }))}
        userSpotifyClientId={userSpotifyClientId}
        onSaveSpotifyClientId={handleSaveSpotifyClientId}
        onTrackSelect={handleProfileTrackSelect}
      />
      <Soundboard
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        sheets={soundboardSheets}
        currentSheet={currentSoundboardSheet}
        onSheetChange={setCurrentSoundboardSheet}
        onUpdatePad={handleUpdateSoundboardPad}
        onTogglePad={handleToggleSoundPad}
        activePads={activeSoundPads}
        onLoadFolderClick={() => soundboardFolderInputRef.current?.click()}
      />
       <KaraokeModal
        isOpen={isKaraokeModalOpen}
        onClose={() => {
          setIsKaraokeModalOpen(false);
          setIsVocalReductionOn(false); // Reset on close
        }}
        lyrics={karaokeLyrics}
        trackName={currentTrack?.name ?? null}
        currentTime={currentTime}
        duration={duration}
        isVocalReductionOn={isVocalReductionOn}
        onToggleVocalReduction={handleToggleVocalReduction}
      />
      <DJMode
        isOpen={isDjModeOpen}
        isMinimized={isDjModeMinimized}
        onClose={handleToggleDjMode}
        onToggleMinimize={handleToggleDjModeMinimize}
        tracks={allTracks}
        volume={volume}
        currentTrack={currentTrack}
      />
       <LyricsSourceModal
        isOpen={isLyricsSourceModalOpen}
        onClose={() => setIsLyricsSourceModalOpen(false)}
        onConfirm={handleLyricsSourceSelected}
        trackName={currentTrack?.name ?? null}
      />
    </div>
  );
};

export default App;