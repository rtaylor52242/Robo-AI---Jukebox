import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, PlusIcon, MinusIcon, KaraokeIcon, VocalSlashIcon, PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon } from './Icons';

interface KaraokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lyrics: string | null;
  trackName: string | null;
  currentTime: number;
  duration: number;
  isVocalReductionOn: boolean;
  onToggleVocalReduction: () => void;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
}

type LyricLine = {
  time: number;
  text: string;
};

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const KaraokeModal: React.FC<KaraokeModalProps> = ({ 
    isOpen, 
    onClose, 
    lyrics, 
    trackName, 
    currentTime, 
    duration, 
    isVocalReductionOn, 
    onToggleVocalReduction,
    isPlaying,
    isShuffle,
    isRepeat,
    progress,
    onPlayPause,
    onNext,
    onPrev,
    onSeek,
    onShuffleToggle,
    onRepeatToggle,
}) => {
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [fontSize, setFontSize] = useState(4);
  const activeLineRef = useRef<HTMLLIElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);


  const increaseFont = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFontSize(s => Math.min(s + 0.25, 7)); 
  };
  const decreaseFont = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFontSize(s => Math.max(s - 0.25, 1.5));
  };

  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) { // Only auto-hide if music is playing
            setControlsVisible(false);
        }
    }, 3000);
  };

  useEffect(() => {
    if (isOpen) {
        showControls();
    }
    return () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPlaying]); // Show controls if modal opens or if playback is paused

  useEffect(() => {
    if (isOpen && lyrics && duration > 0) {
      const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
      const parsedTimestampedLines = lyrics
        .trim()
        .split('\n')
        .map(line => {
          const match = line.match(timestampRegex);
          if (match) {
            const [, min, sec, cs, text] = match;
            const time = parseInt(min, 10) * 60 + parseInt(sec, 10) + parseInt(cs, 10) / (cs.length === 3 ? 1000 : 100);
            return { time, text: text.trim() };
          }
          return null;
        })
        .filter((line): line is LyricLine => line !== null && line.text !== '');

      if (parsedTimestampedLines.length > 2) { // Use timestamped logic if we have enough timed lines
        setLines(parsedTimestampedLines);
      } else { // Fallback for plain lyrics
        const plainLines = lyrics.trim().split('\n').filter(line => line.trim() !== '');
        if (plainLines.length > 0) {
          const timePerLine = duration / plainLines.length;
          const fallbackLines = plainLines.map((text, index) => ({
            time: index * timePerLine,
            text,
          }));
          setLines(fallbackLines);
        }
      }
    } else {
        setLines([]);
        setCurrentLineIndex(-1);
    }
  }, [isOpen, lyrics, duration]);

  useEffect(() => {
    if (lines.length > 0) {
      let newIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
          if (currentTime >= lines[i].time) {
              newIndex = i;
              break;
          }
      }
      setCurrentLineIndex(newIndex);
    }
  }, [currentTime, lines]);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4 animate-fade-in-up" onMouseMove={showControls} onClick={showControls}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-yellow-300 transition rounded-full p-2 bg-white/10 hover:bg-white/20 z-20">
            <CloseIcon className="w-8 h-8" />
        </button>

        <div className={`absolute bottom-4 right-4 flex items-center space-x-2 bg-white/10 p-2 rounded-lg z-20 backdrop-blur-sm transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={(e) => { e.stopPropagation(); onToggleVocalReduction(); }} title={isVocalReductionOn ? "Enable Vocals" : "Reduce Vocals"} className="text-white p-2 rounded-md hover:bg-white/20 transition">
              {isVocalReductionOn ? <VocalSlashIcon className="w-6 h-6" /> : <KaraokeIcon className="w-6 h-6" />}
            </button>
            <button onClick={decreaseFont} title="Decrease font size" className="text-white p-2 rounded-md hover:bg-white/20 transition">
                <MinusIcon className="w-6 h-6" />
            </button>
            <button onClick={increaseFont} title="Increase font size" className="text-white p-2 rounded-md hover:bg-white/20 transition">
                <PlusIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="w-full h-full flex flex-col justify-center items-center text-center overflow-hidden">
            <h2 className="text-2xl font-bold text-gray-400 mb-8 flex-shrink-0 z-10">{trackName}</h2>
            
            {lyrics ? (
                 <ul 
                    className="text-white/70 space-y-4 overflow-y-auto w-full max-w-4xl py-10"
                    style={{ fontSize: `${fontSize}rem`, lineHeight: 1.2 }}
                 >
                    {lines.map((line, index) => (
                        <li
                            key={index}
                            ref={index === currentLineIndex ? activeLineRef : null}
                            className={`font-bold transition-all duration-300 ease-in-out ${index === currentLineIndex ? 'text-yellow-300 scale-105' : ''}`}
                        >
                            {line.text}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center text-white space-y-4">
                    <div className="w-12 h-12 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
                    <p className='font-semibold text-2xl'>Generating Synchronized Lyrics...</p>
                </div>
            )}
        </div>
        
        <div 
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={e => e.stopPropagation()}
        >
            <div className="max-w-3xl mx-auto space-y-3">
                <div className="flex items-center gap-3 text-xs font-mono text-white/80">
                    <span>{formatTime(currentTime)}</span>
                    <div title="Seek" className="w-full bg-white/20 rounded-full h-1.5 group cursor-pointer" onClick={onSeek}>
                        <div
                            className="bg-yellow-300 h-1.5 rounded-full relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-center space-x-4">
                    <button onClick={onShuffleToggle} title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'} className={`transition p-2 rounded-full ${isShuffle ? 'text-yellow-300 bg-white/10' : 'text-white/70 hover:text-white'}`}>
                        <ShuffleIcon className="w-6 h-6"/>
                    </button>
                    <button onClick={onPrev} title="Previous" disabled={!trackName} className="text-white/70 hover:text-white transition disabled:opacity-50">
                        <PrevIcon className="w-8 h-8"/>
                    </button>
                    <button
                        onClick={onPlayPause}
                        title={isPlaying ? 'Pause' : 'Play'}
                        disabled={!trackName}
                        className="w-16 h-16 flex items-center justify-center rounded-full bg-yellow-300 text-black hover:bg-yellow-400 transition transform hover:scale-105 disabled:bg-gray-600"
                    >
                        {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                    </button>
                    <button onClick={onNext} title="Next" disabled={!trackName} className="text-white/70 hover:text-white transition disabled:opacity-50">
                        <NextIcon className="w-8 h-8"/>
                    </button>
                    <button onClick={onRepeatToggle} title={isRepeat ? 'Disable Repeat' : 'Enable Repeat'} className={`transition p-2 rounded-full ${isRepeat ? 'text-yellow-300 bg-white/10' : 'text-white/70 hover:text-white'}`}>
                        <RepeatIcon className="w-6 h-6"/>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default KaraokeModal;