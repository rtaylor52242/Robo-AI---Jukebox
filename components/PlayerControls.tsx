import React from 'react';
import type { Track } from '../types';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon, FolderMusicIcon, VolumeUpIcon, VolumeDownIcon, SpinnerIcon, EqIcon, AnalyzeIcon, SleepTimerIcon } from './Icons';
import EqPopover from './EqPopover';
import SleepTimerPopover from './SleepTimerPopover';

interface PlayerControlsProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  playlistSize: number;
  volume: number;
  isLoading: boolean;
  isImporting: boolean;
  isAnalyzing: boolean;
  showEq: boolean;
  isEqEnabled: boolean;
  eqSettings: number[];
  timeDisplayMode: 'elapsed' | 'remaining';
  isSleepTimerPopoverOpen: boolean;
  sleepTimerRemaining: number | null;
  allPresets: { [name: string]: number[] };
  userPresets: { [name: string]: number[] };
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onAddSongsClick: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onEqToggle: () => void;
  onEqEnabledChange: (enabled: boolean) => void;
  onEqGainChange: (bandIndex: number, gain: number) => void;
  onEqPresetChange: (presetName: string) => void;
  onAnalyze: () => void;
  onTimeDisplayToggle: () => void;
  onToggleSleepTimerPopover: () => void;
  onSetSleepTimer: (minutes: number) => void;
  onSaveEqPreset: (name: string) => void;
  onDeleteEqPreset: (name: string) => void;
}

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack,
  isPlaying,
  isShuffle,
  isRepeat,
  progress,
  duration,
  currentTime,
  playlistSize,
  volume,
  isLoading,
  isImporting,
  isAnalyzing,
  showEq,
  isEqEnabled,
  eqSettings,
  timeDisplayMode,
  isSleepTimerPopoverOpen,
  sleepTimerRemaining,
  allPresets,
  userPresets,
  onPlayPause,
  onNext,
  onPrev,
  onShuffleToggle,
  onRepeatToggle,
  onSeek,
  onAddSongsClick,
  onVolumeChange,
  onVolumeUp,
  onVolumeDown,
  onEqToggle,
  onEqEnabledChange,
  onEqGainChange,
  onEqPresetChange,
  onAnalyze,
  onTimeDisplayToggle,
  onToggleSleepTimerPopover,
  onSetSleepTimer,
  onSaveEqPreset,
  onDeleteEqPreset,
}) => {
  const trackName = currentTrack?.name || "No track selected";
  const trackSource = currentTrack?.source ?? 'local';

  return (
    <footer className="bg-[var(--bg-secondary)]/50 backdrop-blur-lg border-t border-[var(--border-primary)] p-4 shadow-2xl">
      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center min-w-0 w-1/3">
              {currentTrack?.source === 'spotify' && currentTrack.albumArtUrl && (
                  <img src={currentTrack.albumArtUrl} alt={currentTrack.album} className="w-12 h-12 rounded-md mr-3" />
              )}
              <div className="flex-grow min-w-0">
                  <p className="text-sm font-semibold truncate text-left">{trackName}</p>
                  {currentTrack?.artists && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">{currentTrack.artists.join(', ')}</p>
                  )}
              </div>
              {isLoading && <SpinnerIcon className="w-4 h-4 ml-2 animate-spin text-[var(--accent-primary)]" />}
            </div>
            <div
                className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] w-1/3 justify-end cursor-pointer"
                onClick={onTimeDisplayToggle}
                title="Toggle time remaining/elapsed"
            >
                {timeDisplayMode === 'remaining' && currentTrack ? (
                    <span>-{formatTime(duration - currentTime)}</span>
                ) : (
                    <span>{formatTime(currentTime)}</span>
                )}
                <span>/</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>

        {/* Progress Bar */}
        <div title="Seek" className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 mb-4 group cursor-pointer" onClick={onSeek}>
          <div
            className="bg-gradient-to-r from-[var(--accent-primary-hover)] to-[var(--accent-secondary)] h-1.5 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
             <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-[var(--text-primary)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-around sm:justify-between flex-wrap gap-x-4 gap-y-3">
            <div className="">
                 {playlistSize > 0 && trackSource === 'local' && (
                    <button onClick={onAddSongsClick} title="Add more songs" disabled={isImporting} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Add music folder">
                        <FolderMusicIcon className="w-6 h-6"/>
                    </button>
                 )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
                 <button onClick={onShuffleToggle} title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'} className={`transition ${isShuffle ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                    <ShuffleIcon className="w-6 h-6"/>
                </button>
                <button onClick={onPrev} title="Previous" disabled={!currentTrack} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <PrevIcon className="w-8 h-8"/>
                </button>
                <button
                    onClick={onPlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                    disabled={!currentTrack}
                    className="w-14 h-14 flex items-center justify-center rounded-full bg-[var(--accent-primary-hover)] text-[var(--bg-primary)] hover:bg-[var(--accent-primary)] transition transform hover:scale-105 disabled:bg-[var(--bg-tertiary)]/50 disabled:cursor-not-allowed"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                </button>
                <button onClick={onNext} title="Next" disabled={!currentTrack} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <NextIcon className="w-8 h-8"/>
                </button>
                <button onClick={onRepeatToggle} title={isRepeat ? 'Disable Repeat' : 'Enable Repeat'} className={`transition ${isRepeat ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                    <RepeatIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="flex items-center flex-wrap justify-center sm:justify-end gap-x-2 gap-y-2 relative">
                <button onClick={onAnalyze} title="Analyze Song" disabled={!currentTrack || isAnalyzing || trackSource !== 'local'} className="transition p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed">
                    <AnalyzeIcon className="w-6 h-6"/>
                </button>
                <button onClick={onEqToggle} title="Equalizer" disabled={trackSource !== 'local'} className={`transition p-1 rounded-full ${isEqEnabled ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <EqIcon className="w-6 h-6"/>
                </button>
                <button 
                    onClick={onToggleSleepTimerPopover} 
                    title="Sleep Timer" 
                    className={`transition p-1 rounded-full ${sleepTimerRemaining ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                >
                    <SleepTimerIcon className="w-6 h-6"/>
                </button>
                <button onClick={onVolumeDown} title="Decrease Volume" className="transition p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                    <VolumeDownIcon className="w-6 h-6" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={onVolumeChange}
                  title={`Volume: ${Math.round(volume * 100)}%`}
                  className="w-24 h-1 rounded-lg appearance-none cursor-pointer bg-[var(--bg-tertiary)]"
                />
                <button onClick={onVolumeUp} title="Increase Volume" className="transition p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                    <VolumeUpIcon className="w-6 h-6" />
                </button>

                {isSleepTimerPopoverOpen && (
                    <SleepTimerPopover
                        remainingTime={sleepTimerRemaining}
                        onSetTimer={onSetSleepTimer}
                        onClose={onToggleSleepTimerPopover}
                    />
                )}
            </div>
        </div>

        {showEq && (
          <EqPopover
            isEqEnabled={isEqEnabled}
            eqSettings={eqSettings}
            onEnabledChange={onEqEnabledChange}
            onGainChange={onEqGainChange}
            onPresetChange={onEqPresetChange}
            onClose={onEqToggle}
            presets={allPresets}
            userPresets={userPresets}
            onSavePreset={onSaveEqPreset}
            onDeletePreset={onDeleteEqPreset}
          />
        )}
      </div>
    </footer>
  );
};

export default PlayerControls;