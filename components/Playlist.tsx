

import React, { useEffect, useRef, useState } from 'react';
import type { Track, TrackMetadata, Playlist } from '../types';
import { FolderMusicIcon, MusicNoteIcon, SpinnerIcon, SearchIcon, CloseIcon, TrashIcon, HeartIcon, StarIcon, ShareIcon, PlusIcon, PlaylistIcon, MinusIcon, SpotifyIcon, KaraokeIcon } from './Icons';

interface PlaylistProps {
  tracks: Track[];
  totalTrackCount: number;
  currentTrack: Track | null;
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
  onRemoveTrackFromPlaylist: (trackUrl: string) => void;
  isUserPlaylist: boolean;
  playlists: Playlist[];
  librarySource: 'local' | 'spotify';
  onStartKaraoke: (track: Track) => void;
}

const Playlist: React.FC<PlaylistProps> = ({
  tracks,
  totalTrackCount,
  currentTrack,
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
  onAddToPlaylistClick,
  onRemoveTrackFromPlaylist,
  isUserPlaylist,
  playlists,
  librarySource,
  onStartKaraoke,
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const prevSearchQueryRef = useRef(searchQuery);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    // When search is cleared, scroll to the currently playing track.
    if (prevSearchQueryRef.current && searchQuery === '' && activeItemRef.current) {
        activeItemRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }
    prevSearchQueryRef.current = searchQuery;
  }, [searchQuery]);


  const handleDrop = (dropIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const currentTrackUrl = currentTrack?.url;

  if (totalTrackCount === 0 && librarySource === 'local') {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-[var(--text-secondary)] p-8 text-center">
        <div className="mb-4">
          <FolderMusicIcon className="w-24 h-24 text-[var(--text-muted)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No Music Loaded</h2>
        <p className="mb-6 max-w-sm">
          Click the button below to select a folder on your computer. All audio files will be added to your jukebox playlist.
        </p>
        <button
          onClick={onFolderSelectClick}
          title="Select Music Folder"
          className="bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-3 px-6 rounded-lg shadow-lg shadow-[var(--shadow-color)] transition-all duration-300 transform hover:scale-105"
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
                <SearchIcon className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <input
                type="text"
                placeholder="Search playlist..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2 pl-10 pr-10 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none transition"
            />
            {searchQuery && (
                <button onClick={() => onSearchQueryChange('')} className="absolute inset-y-0 right-0 pr-3 flex items-center" title="Clear search">
                    <CloseIcon className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"/>
                </button>
            )}
        </div>
        {librarySource === 'local' && (
            <button
                onClick={onClearPlaylistClick}
                title="Clear Playlist"
                className="p-2 bg-[var(--bg-secondary)] hover:bg-[var(--danger-secondary)]/50 border border-[var(--border-primary)] hover:border-[var(--danger-primary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger-primary)] transition-colors"
                aria-label="Clear Playlist"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        )}
      </div>


      {tracks.length === 0 && searchQuery && (
        <div className="flex-grow flex flex-col items-center justify-center text-[var(--text-secondary)] p-8 text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No Results Found</h2>
          <p className="max-w-sm">No tracks in your playlist match "<span className="text-[var(--accent-primary)] font-semibold">{searchQuery}</span>".</p>
        </div>
      )}
      {tracks.length === 0 && librarySource === 'spotify' && !searchQuery && (
        <div className="flex-grow flex flex-col items-center justify-center text-[var(--text-secondary)] p-8 text-center">
          <SpotifyIcon className="w-24 h-24 text-[var(--text-muted)] mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Select a Playlist</h2>
          <p className="max-w-sm">Choose one of your Spotify playlists from the sidebar to begin.</p>
        </div>
      )}

      <div className="flex-grow overflow-y-scroll">
        <ul ref={listRef} className="space-y-2">
            {tracks.map((track, index) => {
            const isPlaying = track.url === currentTrackUrl;
            const isLoading = track.url === loadingTrackUrl;
            const trackName = track.name;
            const isLiked = trackMetadata.likes[track.url] ?? false;
            const rating = trackMetadata.ratings[track.url] ?? 0;
            const isBeingDragged = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const trackPlaylists = track.source === 'local' ? playlists.filter(p => Array.isArray(p.trackUrls) && p.trackUrls.includes(track.url)) : [];
            const playlistNames = trackPlaylists.map(p => p.name).join(', ');
            
            let trackTitleAttr = playlistNames ? `${trackName}\nPlaylists: ${playlistNames}` : trackName;
            if (track.source === 'local' && track.createdAt) {
                try {
                    const creationDate = new Date(track.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    trackTitleAttr += `\nAdded: ${creationDate}`;
                } catch (e) {
                    console.warn("Could not parse createdAt date for track:", track.name, track.createdAt);
                }
            }
            
            const isDraggable = librarySource === 'local' && !isUserPlaylist;

            return (
                <li
                key={track.url}
                ref={isPlaying ? activeItemRef : null}
                onClick={() => onTrackSelect(track)}
                draggable={isDraggable}
                onDragStart={(e) => {
                    if (!isDraggable) return;
                    setDraggedIndex(index);
                    e.dataTransfer.setData('text/plain', index.toString());
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnter={() => {
                    if (!isDraggable) return;
                    if (draggedIndex !== null && draggedIndex !== index) {
                        setDragOverIndex(index);
                    }
                }}
                onDragLeave={() => {
                   if(isDragOver) setDragOverIndex(null)
                }}
                onDragOver={(e) => { if(isDraggable) e.preventDefault() }}
                onDrop={(e) => {
                    if (!isDraggable) return;
                    e.preventDefault();
                    handleDrop(index);
                }}
                onDragEnd={() => {
                    if (!isDraggable) return;
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                }}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out relative
                  ${ isPlaying
                    ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/50 shadow-lg shadow-[var(--shadow-color)]'
                    : 'bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-tertiary)]/70'
                  }
                  ${ isBeingDragged ? 'opacity-50' : ''}
                  ${ isDragOver ? 'shadow-[0_-2px_0_0_var(--accent-primary-hover)]' : ''}
                `}
                >
                <div className="flex items-center flex-grow min-w-0">
                    <div className="flex items-center text-sm w-12 shrink-0">
                        <span className={`w-6 text-center font-mono ${isPlaying ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{index + 1}</span>
                        {isLoading ? (
                        <SpinnerIcon className="w-6 h-6 ml-2 animate-spin text-[var(--accent-primary)]" />
                        ) : (
                          track.source === 'spotify' 
                            ? <SpotifyIcon className={`w-6 h-6 ml-2 ${isPlaying ? ' text-[var(--accent-primary)]' : 'text-green-500'}`} />
                            : <MusicNoteIcon className={`w-6 h-6 ml-2 ${isPlaying ? 'animate-pulse text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                        )}
                    </div>
                    <div className="flex-grow ml-4 min-w-0">
                        <p className="font-semibold truncate" title={trackTitleAttr}>{trackName}</p>
                         {track.source === 'spotify' && track.artists && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{track.artists.join(', ')}</p>
                         )}
                         {track.source === 'local' && playlistNames && (
                            <div className="flex items-center text-xs text-[var(--text-muted)] mt-0.5" title={`In playlists: ${playlistNames}`}>
                                <PlaylistIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                <p className="truncate">
                                    {playlistNames}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center flex-shrink-0">
                    {track.source === 'local' && (
                        <div className="flex-shrink-0 flex items-center space-x-1 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                            {isUserPlaylist && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveTrackFromPlaylist(track.url); }}
                                    className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]/50"
                                    title="Remove from playlist"
                                >
                                    <MinusIcon className="w-5 h-5 hover:text-[var(--danger-primary)]" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddToPlaylistClick(track); }}
                                className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]/50"
                                title="Add to playlist"
                            >
                                <PlusIcon className="w-5 h-5 hover:text-[var(--accent-primary)]" />
                            </button>
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <button 
                                        key={i} 
                                        onClick={(e) => { e.stopPropagation(); onRate(track.url, i + 1); }}
                                        className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]/50"
                                        title={`Rate ${i + 1} star${i > 0 ? 's' : ''}`}
                                    >
                                        <StarIcon className={`w-5 h-5 transition-colors ${i < rating ? 'text-[var(--warning-primary)]' : 'hover:text-[var(--warning-primary)]'}`} filled={i < rating} />
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onLikeToggle(track.url); }}
                                className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]/50"
                                title={isLiked ? 'Unlike' : 'Like'}
                            >
                                <HeartIcon className={`w-5 h-5 transition-colors ${isLiked ? 'text-[var(--like-primary)]' : 'hover:text-[var(--like-primary)]'}`} filled={isLiked} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onStartKaraoke(track); }}
                                className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]/50"
                                title="Karaoke Mode"
                            >
                                <KaraokeIcon className="w-5 h-5 hover:text-[var(--accent-primary)]" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onShare(track); }}
                                className="p-1 rounded-full hover:bg-[var(--bg-tertiary)]/50"
                                title="Share"
                            >
                                <ShareIcon className="w-5 h-5 hover:text-[var(--accent-primary)]" />
                            </button>
                        </div>
                    )}
                    
                    {isPlaying && !isLoading && (
                        <div className="ml-4 flex space-x-1">
                            <span className="w-1 h-4 bg-[var(--accent-primary)] rounded-full animate-[bounce_1.2s_ease-in-out_infinite]"></span>
                            <span className="w-1 h-4 bg-[var(--accent-primary)] rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.2s]"></span>
                            <span className="w-1 h-4 bg-[var(--accent-primary)] rounded-full animate-[bounce_1.2s_ease-in-out_infinite_0.4s]"></span>
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