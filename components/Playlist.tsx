
import React, { useEffect, useRef, useState } from 'react';
import type { Track, TrackMetadata } from '../types';
import { FolderMusicIcon, MusicNoteIcon, SpinnerIcon, SearchIcon, CloseIcon, TrashIcon, HeartIcon, StarIcon, ShareIcon, PlusIcon } from './Icons';

interface PlaylistProps {
  tracks: Track[];
  totalTrackCount: number;
  currentTrackUrl: string | null;
  loadingTrackUrl: string | null;
  onTrackSelect: (track: Track) => void;
  onFolderSelectClick: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onClearPlaylistClick: () => void;
  trackMetadata: TrackMetadata;
  onLikeToggle: (trackUrl: string) => void;
  onRate: (trackUrl: string, rating: number) => void;
  onShare: (track: Track) => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
  onAddToPlaylistClick: (track: Track) => void;
}

const Playlist: React.FC<PlaylistProps> = ({
  tracks,
  totalTrackCount,
  currentTrackUrl,
  loadingTrackUrl,
  onTrackSelect,
  onFolderSelectClick,
  searchQuery,
  onSearchQueryChange,
  onClearPlaylistClick,
  trackMetadata,
  onLikeToggle,
  onRate,
  onShare,
  onReorder,
  onAddToPlaylistClick
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTrackUrl]);

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };


  if (totalTrackCount === 0) {
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
    <div className="flex-grow flex flex-col overflow-hidden p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
                type="text"
                placeholder="Search playlist..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-10 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            />
            {searchQuery && (
                <button onClick={() => onSearchQueryChange('')} className="absolute inset-y-0 right-0 pr-3 flex items-center" title="Clear search">
                    <CloseIcon className="h-5 w-5 text-slate-400 hover:text-white"/>
                </button>
            )}
        </div>
        <button
            onClick={onClearPlaylistClick}
            title="Clear Playlist"
            className="p-2 bg-slate-800 hover:bg-red-800/50 border border-slate-700 hover:border-red-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
            aria-label="Clear Playlist"
        >
            <TrashIcon className="w-5 h-5" />
        </button>
      </div>


      {tracks.length === 0 && searchQuery && (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-300 mb-2">No Results Found</h2>
          <p className="max-w-sm">No tracks in your playlist match "<span className="text-cyan-400 font-semibold">{searchQuery}</span>".</p>
        </div>
      )}

      <div className="flex-grow overflow-y-scroll">
        <ul ref={listRef} className="space-y-2">
            {tracks.map((track, index) => {
            const isPlaying = track.url === currentTrackUrl;
            const isLoading = track.url === loadingTrackUrl;
            const trackName = track.file.name.replace(/\.[^/.]+$/, "");
            const isLiked = trackMetadata.likes[track.url] ?? false;
            const rating = trackMetadata.ratings[track.url] ?? 0;
            const isBeingDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index;


            return (
                <li
                key={track.url}
                ref={isPlaying ? activeItemRef : null}
                onClick={() => onTrackSelect(track)}
                draggable
                onDragStart={(e) => {
                    setDraggedIndex(index);
                    e.dataTransfer.setData('text/plain', index.toString());
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnter={() => {
                    if (draggedIndex !== null && draggedIndex !== index) {
                        setDragOverIndex(index);
                    }
                }}
                onDragLeave={() => {
                   if(isDragOver) setDragOverIndex(null)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(index);
                }}
                onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                }}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out relative
                  ${ isPlaying
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-900/50'
                    : 'bg-slate-800/50 hover:bg-slate-700/70'
                  }
                  ${ isBeingDragged ? 'opacity-50' : ''}
                  ${ isDragOver ? 'shadow-[0_-2px_0_0_#06b6d4]' : ''}
                `}
                >
                <div className="flex items-center flex-grow min-w-0">
                    <div className="flex items-center text-sm w-12 shrink-0">
                        <span className={`w-6 text-center font-mono ${isPlaying ? 'text-cyan-400' : 'text-slate-400'}`}>{index + 1}</span>
                        {isLoading ? (
                        <SpinnerIcon className="w-6 h-6 ml-2 animate-spin text-cyan-400" />
                        ) : (
                        <MusicNoteIcon className={`w-6 h-6 ml-2 ${isPlaying ? 'animate-pulse text-cyan-400' : 'text-slate-500'}`} />
                        )}
                    </div>
                    <div className="flex-grow ml-4 min-w-0">
                        <p className="font-semibold truncate" title={trackName}>{trackName}</p>
                    </div>
                </div>
                
                <div className="flex items-center flex-shrink-0">
                    <div className="flex-shrink-0 flex items-center space-x-1 text-slate-400 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddToPlaylistClick(track); }}
                            className="p-1 rounded-full hover:bg-slate-700/50"
                            title="Add to playlist"
                        >
                            <PlusIcon className="w-5 h-5 hover:text-cyan-400" />
                        </button>
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <button 
                                    key={i} 
                                    onClick={(e) => { e.stopPropagation(); onRate(track.url, i + 1); }}
                                    className="p-1 rounded-full hover:bg-slate-700/50"
                                    title={`Rate ${i + 1} star${i > 0 ? 's' : ''}`}
                                >
                                    <StarIcon className={`w-5 h-5 transition-colors ${i < rating ? 'text-yellow-400' : 'hover:text-yellow-300'}`} filled={i < rating} />
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onLikeToggle(track.url); }}
                            className="p-1 rounded-full hover:bg-slate-700/50"
                            title={isLiked ? 'Unlike' : 'Like'}
                        >
                            <HeartIcon className={`w-5 h-5 transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-400'}`} filled={isLiked} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShare(track); }}
                            className="p-1 rounded-full hover:bg-slate-700/50"
                            title="Share"
                        >
                            <ShareIcon className="w-5 h-5 hover:text-cyan-400" />
                        </button>
                    </div>
                    
                    {isPlaying && !isLoading && (
                        <div className="ml-4 flex space-x-1">
                            <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite]"></span>
                            <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.2s]"></span>
                            <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.4s]"></span>
                        </div>
                    )}
                </div>
                </li>
            );
            })}
        </ul>
      </div>
    </div>
  );
};

export default Playlist;