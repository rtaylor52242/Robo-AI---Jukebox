import React, { useEffect, useRef } from 'react';
import type { Track } from '../types';
import { FolderMusicIcon, MusicNoteIcon, SpinnerIcon } from './Icons';

interface PlaylistProps {
  tracks: Track[];
  currentTrackUrl: string | null;
  loadingTrackUrl: string | null;
  onTrackSelect: (index: number) => void;
  onFolderSelectClick: () => void;
}

const Playlist: React.FC<PlaylistProps> = ({
  tracks,
  currentTrackUrl,
  loadingTrackUrl,
  onTrackSelect,
  onFolderSelectClick,
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTrackUrl]);

  if (tracks.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <div className="mb-4">
          <FolderMusicIcon className="w-24 h-24 text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-300 mb-2">No Music Loaded</h2>
        <p className="mb-6 max-w-sm">
          Click the button below to select a folder on your computer. All audio files will be added to your jukebox playlist.
        </p>
        <button
          onClick={onFolderSelectClick}
          title="Select Music Folder"
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-6 rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-300 transform hover:scale-105"
        >
          Select Music Folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-scroll p-4 md:p-6">
      <ul ref={listRef} className="space-y-2">
        {tracks.map((track, index) => {
          const isPlaying = track.url === currentTrackUrl;
          const isLoading = track.url === loadingTrackUrl;
          const trackName = track.file.name.replace(/\.[^/.]+$/, "");

          return (
            <li
              key={track.url}
              ref={isPlaying ? activeItemRef : null}
              onClick={() => onTrackSelect(index)}
              className={`group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out relative ${
                isPlaying
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-900/50'
                  : 'bg-slate-800/50 hover:bg-slate-700/70'
              }`}
            >
              <div className="flex items-center text-sm w-12 shrink-0">
                <span className={`w-6 text-center font-mono ${isPlaying ? 'text-cyan-400' : 'text-slate-400'}`}>{index + 1}</span>
                {isLoading ? (
                  <SpinnerIcon className="w-6 h-6 ml-2 animate-spin text-cyan-400" />
                ) : (
                  <MusicNoteIcon className={`w-6 h-6 ml-2 ${isPlaying ? 'animate-pulse text-cyan-400' : 'text-slate-500'}`} />
                )}
              </div>
              <div className="flex-grow ml-4 min-w-0">
                <p className="font-semibold truncate">{trackName}</p>
              </div>
              
              {isPlaying && !isLoading && (
                <div className="ml-4 flex space-x-1">
                    <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite]"></span>
                    <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.2s]"></span>
                    <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.4s]"></span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Playlist;
