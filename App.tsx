import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Track } from './types';
import Playlist from './components/Playlist';
import PlayerControls from './components/PlayerControls';

// FIX: Added and exported EQ_PRESETS to fix an import error in EqPopover.tsx.
// Updated to a 6-band EQ with user-requested presets.
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

const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
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

  // EQ State
  const [isEqEnabled, setIsEqEnabled] = useState<boolean>(false);
  const [eqSettings, setEqSettings] = useState<number[]>(EQ_PRESETS['Flat']);
  const [showEq, setShowEq] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);


  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = context.createMediaElementSource(audioRef.current);
        
        const eqNodes = BAND_FREQUENCIES.map(freq => {
            const filter = context.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1.2; // A slightly narrower band for better separation
            filter.gain.value = 0; // Initial gain
            return filter;
        });

        // Chain the nodes: source -> eq[0] -> eq[1] ... -> destination
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

  // Initialize Audio Context when the first track is ready to play
  useEffect(() => {
    if (currentTrackIndex !== null && !audioContextRef.current) {
      setupAudioContext();
    }
  }, [currentTrackIndex, setupAudioContext]);

  // Apply EQ settings when they change or EQ is toggled
  useEffect(() => {
    if (!audioContextRef.current || eqNodesRef.current.length === 0) return;

    eqNodesRef.current.forEach((node, index) => {
        node.gain.value = isEqEnabled ? eqSettings[index] : 0;
    });
  }, [isEqEnabled, eqSettings]);


  useEffect(() => {
    return () => {
      // Cleanup object URLs on component unmount
      playlist.forEach(track => URL.revokeObjectURL(track.url));
      // Close audio context on unmount
      audioContextRef.current?.close();
    };
  }, [playlist]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsImporting(true);

    const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.opus'];
    
    const audioFiles = Array.from(files).filter((file: any) => {
        if (file.type.startsWith('audio/')) return true;
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        return AUDIO_EXTENSIONS.includes(extension);
    });

    if (audioFiles.length > 0) {
      const newTracks: Track[] = audioFiles.map((file: any) => ({
        file,
        url: URL.createObjectURL(file),
        relativePath: file.webkitRelativePath,
      }));
      setPlaylist(newTracks);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    } else {
        alert('No supported audio files found in the selected folder.');
    }

    if (event.target) event.target.value = '';
    setIsImporting(false);
  };
  
  const handleTrackSelect = (index: number) => {
    setLoadingTrackUrl(playlist[index].url);
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

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    
    let nextIndex;
    if (isShuffle) {
      if (playlist.length > 1) {
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * playlist.length);
          } while (randomIndex === currentTrackIndex);
          nextIndex = randomIndex;
      } else {
        nextIndex = 0;
      }
    } else {
      nextIndex = ((currentTrackIndex ?? -1) + 1) % playlist.length;
    }
    
    handleTrackSelect(nextIndex);
  }, [playlist, currentTrackIndex, isShuffle]);

  const playPrev = useCallback(() => {
    if (playlist.length === 0 || currentTrackIndex === null) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    handleTrackSelect(prevIndex);
  }, [playlist, currentTrackIndex]);
  
  const handlePlayPause = useCallback(() => {
      if(currentTrackIndex === null && playlist.length > 0) {
          setCurrentTrackIndex(0);
          setIsPlaying(true);
          return;
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      setIsPlaying(prev => !prev);
  }, [currentTrackIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;

    if (!isPlaying || !track) {
      audio.pause();
      return;
    }
    
    const playAudio = async () => {
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audio.play();
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Audio playback error:", error);
        }
      }
    };

    if (audio.src !== track.url) {
      audio.src = track.url;
      const handleCanPlay = () => {
        playAudio();
      };
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      
      const handleLoadError = () => {
        console.error(`Failed to load audio source: ${track.url}`);
      };
      audio.addEventListener('error', handleLoadError, { once: true });
      
      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleLoadError);
      };
    } else {
      playAudio();
    }
  }, [currentTrackIndex, isPlaying, playlist]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    if (audioRef.current.duration) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };
  
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  };

  const handleCanPlayThrough = () => {
    if (audioRef.current?.src === loadingTrackUrl) {
      setLoadingTrackUrl(null);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || isNaN(duration) || duration === 0) return;
    const seekTime = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * duration;
    audioRef.current.currentTime = seekTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };
  
  const handleEqEnabledChange = (enabled: boolean) => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    setIsEqEnabled(enabled);
  };

  const handleEqGainChange = (bandIndex: number, gain: number) => {
    setEqSettings(prev => {
        const newSettings = [...prev];
        newSettings[bandIndex] = gain;
        return newSettings;
    });
  };

  const handleEqPresetChange = (presetName: string) => {
    if (EQ_PRESETS[presetName]) {
        setEqSettings(EQ_PRESETS[presetName]);
    }
  };

  const currentTrack = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      <header className="p-4 flex items-center justify-between border-b border-slate-700/50 shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-cyan-400 uppercase">Robo AI - Jukebox</h1>
      </header>
      
      <main className="flex-grow overflow-hidden flex flex-col">
        <Playlist
          tracks={playlist}
          currentTrackUrl={currentTrack?.url ?? null}
          loadingTrackUrl={loadingTrackUrl}
          onTrackSelect={handleTrackSelect}
          onFolderSelectClick={() => fileInputRef.current?.click()}
        />
      </main>

      <PlayerControls
        currentTrack={currentTrack}
        isPlaying={isPlaying} 
        isShuffle={isShuffle} 
        isRepeat={isRepeat}
        progress={progress} 
        duration={duration} 
        currentTime={currentTime}
        playlistSize={playlist.length} 
        volume={volume}
        isLoading={!!loadingTrackUrl}
        isImporting={isImporting}
        showEq={showEq}
        isEqEnabled={isEqEnabled}
        eqSettings={eqSettings}
        onPlayPause={handlePlayPause} 
        onNext={playNext} 
        onPrev={playPrev}
        onShuffleToggle={() => setIsShuffle(!isShuffle)} 
        onRepeatToggle={() => setIsRepeat(!isRepeat)}
        onSeek={handleSeek} 
        onAddSongsClick={() => fileInputRef.current?.click()}
        onVolumeChange={handleVolumeChange}
        onEqToggle={() => setShowEq(!showEq)}
        onEqEnabledChange={handleEqEnabledChange}
        onEqGainChange={handleEqGainChange}
        onEqPresetChange={handleEqPresetChange}
      />

      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata} 
        onEnded={handleEnded} 
        onCanPlayThrough={handleCanPlayThrough}
        crossOrigin="anonymous" 
      />
      
      <input type="file" ref={fileInputRef} onChange={handleFolderSelect} className="hidden" multiple {...{webkitdirectory: "", directory: ""}} />
    </div>
  );
};

export default App;