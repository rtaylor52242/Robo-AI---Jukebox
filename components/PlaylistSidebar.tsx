import React, { useState } from 'react';
import type { Playlist } from '../types';
import { PlusIcon, SpotifyIcon } from './Icons';

interface PlaylistSidebarProps {
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: (name: string) => void;
  librarySource: 'local' | 'spotify';
  onLibrarySourceChange: (source: 'local' | 'spotify') => void;
  isSpotifyConnected: boolean;
  spotifyPlaylists: any[];
  onSelectSpotifyPlaylist: (id: string) => void;
  width: number;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({ 
    playlists, 
    activePlaylistId, 
    onSelectPlaylist, 
    onCreatePlaylist,
    librarySource,
    onLibrarySourceChange,
    isSpotifyConnected,
    spotifyPlaylists,
    onSelectSpotifyPlaylist,
    width,
    onResizeStart
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const systemPlaylists = playlists.filter(p => p.system);
  const userPlaylists = playlists.filter(p => !p.system);

  return (
    <aside 
      className="bg-[var(--bg-secondary)]/30 p-4 flex-shrink-0 flex flex-col border-r border-[var(--border-primary)] relative"
      style={{ width: `${width}px` }}
    >
      
      {isSpotifyConnected && (
        <div className="flex-shrink-0 mb-4 p-1 bg-[var(--bg-tertiary)]/50 rounded-lg flex items-center">
            <button 
                onClick={() => onLibrarySourceChange('local')}
                className={`w-1/2 py-1.5 text-sm font-bold rounded-md transition-colors ${librarySource === 'local' ? 'bg-[var(--accent-primary-hover)] text-[var(--bg-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                Local
            </button>
            <button 
                onClick={() => onLibrarySourceChange('spotify')}
                className={`w-1/2 py-1.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${librarySource === 'spotify' ? 'bg-[var(--accent-primary-hover)] text-[var(--bg-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                <SpotifyIcon className="w-5 h-5" />
                Spotify
            </button>
        </div>
      )}

      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
        {librarySource === 'local' ? 'Local Library' : 'Spotify Library'}
      </h2>

      {librarySource === 'local' && (
        <>
            <div className="flex-grow overflow-y-auto space-y-4">
                <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Library</h3>
                <ul className="space-y-1">
                    {systemPlaylists.map(playlist => (
                    <li key={playlist.id}>
                        <button
                        onClick={() => onSelectPlaylist(playlist.id)}
                        className={`w-full text-left font-semibold py-2 px-3 rounded-md transition-colors text-sm flex justify-between items-center ${
                            activePlaylistId === playlist.id
                            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                        }`}
                        >
                        <span>{playlist.name}</span>
                        <span className="text-xs font-mono">{(playlist.trackUrls || []).length}</span>
                        </button>
                    </li>
                    ))}
                </ul>
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Your Playlists</h3>
                    <ul className="space-y-1">
                        {userPlaylists.map(playlist => (
                        <li key={playlist.id}>
                            <button
                            onClick={() => onSelectPlaylist(playlist.id)}
                            className={`w-full text-left font-semibold py-2 px-3 rounded-md transition-colors text-sm flex justify-between items-center ${
                                activePlaylistId === playlist.id
                                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                            }`}
                            >
                            <span className="truncate pr-2">{playlist.name}</span>
                            <span className="text-xs font-mono flex-shrink-0">{(playlist.trackUrls || []).length}</span>
                            </button>
                        </li>
                        ))}
                    </ul>
                </div>
            </div>
      
            <div className="flex-shrink-0 pt-4 border-t border-[var(--border-primary)]">
                {isCreating ? (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="New playlist name..."
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg py-1.5 px-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none transition"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') setIsCreating(false);
                        }}
                    />
                    <div className="flex space-x-2">
                        <button onClick={handleCreate} className="flex-grow bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-1.5 text-sm rounded-lg transition">Create</button>
                        <button onClick={() => setIsCreating(false)} className="flex-grow bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-1.5 text-sm rounded-lg transition">Cancel</button>
                    </div>
                </div>
                ) : (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center justify-center space-x-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        <PlusIcon className="w-5 h-5"/>
                        <span>New Playlist</span>
                    </button>
                )}
            </div>
        </>
      )}

      {librarySource === 'spotify' && (
        <div className="flex-grow overflow-y-auto space-y-4">
            <ul className="space-y-1">
                {spotifyPlaylists.map(playlist => (
                    <li key={playlist.id}>
                    <button
                        onClick={() => onSelectSpotifyPlaylist(playlist.id)}
                        className={`w-full text-left font-semibold py-2 px-3 rounded-md transition-colors text-sm flex justify-between items-center ${
                        activePlaylistId === playlist.id
                            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                        }`}
                    >
                        <span className="truncate pr-2">{playlist.name}</span>
                        <span className="text-xs font-mono flex-shrink-0">{playlist.tracks.total}</span>
                    </button>
                    </li>
                ))}
            </ul>
        </div>
      )}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
        title="Resize sidebar"
      >
        <div className="w-0.5 h-full bg-transparent group-hover:bg-[var(--accent-primary)]/50 transition-colors duration-200 mx-auto"></div>
      </div>
    </aside>
  );
};

export default PlaylistSidebar;