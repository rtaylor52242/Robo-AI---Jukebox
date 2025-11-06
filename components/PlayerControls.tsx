import React from 'react';
import type { Track } from '../types';
import { PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon, FolderMusicIcon, VolumeUpIcon, VolumeDownIcon, SpinnerIcon, EqIcon, AnalyzeIcon } from './Icons';
import EqPopover from './EqPopover';

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
  eqPosition: { x: number; y: number };
  timeDisplayMode: 'elapsed' | 'remaining';
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onAddSongsClick: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEqToggle: () => void;
  onEqEnabledChange: (enabled: boolean) => void;
  onEqGainChange: (bandIndex: number, gain: number) => void;
  onEqPresetChange: (presetName: string) => void;
  onAnalyze: () => void;
  onEqPositionChange: (position: { x: number; y: number }) => void;
  onTimeDisplayToggle: () => void;
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
  eqPosition,
  timeDisplayMode,
  onPlayPause,
  onNext,
  onPrev,
  onShuffleToggle,
  onRepeatToggle,
  onSeek,
  onAddSongsClick,
  onVolumeChange,
  onEqToggle,
  onEqEnabledChange,
  onEqGainChange,
  onEqPresetChange,
  onAnalyze,
  onEqPositionChange,
  onTimeDisplayToggle,
}) => {
  const trackName = currentTrack?.file.name.replace(/\.[^/.]+$/, "") || "No track selected";

  return (
    <footer className="bg-slate-800/50 backdrop-blur-lg border-t border-slate-700/50 p-4 shadow-2xl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center min-w-0 w-1/3">
                <p className="text-sm font-semibold truncate text-left">{trackName}</p>
                {isLoading && <SpinnerIcon className="w-4 h-4 ml-2 animate-spin text-cyan-400" />}
            </div>
            <div
                className="flex items-center space-x-2 text-xs text-slate-400 w-1/3 justify-end cursor-pointer"
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
        <div title="Seek" className="w-full bg-slate-700 rounded-full h-1.5 mb-4 group cursor-pointer" onClick={onSeek}>
          <div
            className="bg-gradient-to-r from-cyan-500 to-pink-500 h-1.5 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
             <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-around sm:justify-between flex-wrap gap-x-4 gap-y-3">
            <div className="">
                 {playlistSize > 0 && (
                    <button onClick={onAddSongsClick} title="Add more songs" disabled={isImporting} className="text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Add music folder">
                        <FolderMusicIcon className="w-6 h-6"/>
                    </button>
                 )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
                 <button onClick={onShuffleToggle} title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'} className={`transition ${isShuffle ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                    <ShuffleIcon className="w-6 h-6"/>
                </button>
                <button onClick={onPrev} title="Previous" disabled={!currentTrack} className="text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <PrevIcon className="w-8 h-8"/>
                </button>
                <button
                    onClick={onPlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                    disabled={!currentTrack}
                    className="w-14 h-14 flex items-center justify-center rounded-full bg-cyan-500 text-slate-900 hover:bg-cyan-400 transition transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                </button>
                <button onClick={onNext} title="Next" disabled={!currentTrack} className="text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <NextIcon className="w-8 h-8"/>
                </button>
                <button onClick={onRepeatToggle} title={isRepeat ? 'Disable Repeat' : 'Enable Repeat'} className={`transition ${isRepeat ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                    <RepeatIcon className="w-6 h-6"/>
                </button>
            </div>
            <div className="flex items-center flex-wrap justify-center sm:justify-end gap-x-2 gap-y-2 relative">
                <button onClick={onAnalyze} title="Analyze Song" disabled={!currentTrack || isAnalyzing} className="transition p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    <AnalyzeIcon className="w-6 h-6"/>
                </button>
                <button onClick={onEqToggle} title="Equalizer" className={`transition p-1 rounded-full ${isEqEnabled ? 'text-cyan-400 bg-cyan-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                    <EqIcon className="w-6 h-6"/>
                </button>
                <VolumeDownIcon className="w-6 h-6" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={onVolumeChange}
                  className="w-24 h-1 rounded-lg appearance-none cursor-pointer bg-slate-700"
                  style={{ accentColor: '#06b6d4' }}
                />
                <VolumeUpIcon className="w-6 h-6" />

                {showEq && (
                  <EqPopover
                    isEqEnabled={isEqEnabled}
                    eqSettings={eqSettings}
                    position={eqPosition}
                    onEnabledChange={onEqEnabledChange}
                    onGainChange={onEqGainChange}
                    onPresetChange={onEqPresetChange}
                    onClose={onEqToggle}
                    onPositionChange={onEqPositionChange}
                  />
                )}
            </div>
        </div>
      </div>
    </footer>
  );
};

export default PlayerControls;
