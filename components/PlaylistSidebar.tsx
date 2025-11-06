
import React, { useState } from 'react';
import type { Playlist } from '../types';
import { PlusIcon } from './Icons';

interface PlaylistSidebarProps {
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: (name: string) => void;
}

const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({ playlists, activePlaylistId, onSelectPlaylist, onCreatePlaylist }) => {
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
    <aside className="w-64 bg-slate-800/30 p-4 flex-shrink-0 flex flex-col border-r border-slate-700/50">
      <h2 className="text-xl font-bold text-slate-300 mb-4">Playlists</h2>

      <div className="flex-grow overflow-y-auto space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Library</h3>
          <ul className="space-y-1">
            {systemPlaylists.map(playlist => (
              <li key={playlist.id}>
                <button
                  onClick={() => onSelectPlaylist(playlist.id)}
                  className={`w-full text-left font-semibold py-2 px-3 rounded-md transition-colors text-sm flex justify-between items-center ${
                    activePlaylistId === playlist.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  <span>{playlist.name}</span>
                  <span className="text-xs font-mono">{playlist.trackUrls.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Playlists</h3>
             <ul className="space-y-1">
                {userPlaylists.map(playlist => (
                  <li key={playlist.id}>
                    <button
                      onClick={() => onSelectPlaylist(playlist.id)}
                       className={`w-full text-left font-semibold py-2 px-3 rounded-md transition-colors text-sm flex justify-between items-center ${
                        activePlaylistId === playlist.id
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-400 hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="truncate pr-2">{playlist.name}</span>
                      <span className="text-xs font-mono flex-shrink-0">{playlist.trackUrls.length}</span>
                    </button>
                  </li>
                ))}
            </ul>
        </div>
      </div>
      
      <div className="flex-shrink-0 pt-4 border-t border-slate-700/50">
        {isCreating ? (
           <div className="space-y-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg py-1.5 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <div className="flex space-x-2">
                <button onClick={handleCreate} className="flex-grow bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-1.5 text-sm rounded-lg transition">Create</button>
                <button onClick={() => setIsCreating(false)} className="flex-grow bg-slate-600 hover:bg-slate-500 text-slate-200 font-semibold py-1.5 text-sm rounded-lg transition">Cancel</button>
              </div>
           </div>
        ) : (
            <button 
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                <PlusIcon className="w-5 h-5"/>
                <span>New Playlist</span>
            </button>
        )}
      </div>
    </aside>
  );
};

export default PlaylistSidebar;
