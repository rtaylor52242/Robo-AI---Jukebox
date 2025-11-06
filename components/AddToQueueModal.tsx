
import React, { useState } from 'react';
import type { Playlist } from '../types';
import { CloseIcon, PlusIcon } from './Icons';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (playlistName: string) => void;
  trackName: string | null;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ isOpen, onClose, playlists, onSelectPlaylist, onCreatePlaylist, trackName }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const trackDisplayName = trackName?.replace(/\.[^/.]+$/, "") || "this song";
  const userPlaylists = playlists.filter(p => !p.system);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-[var(--bg-popover)] rounded-xl shadow-2xl shadow-[var(--shadow-color)] border border-[var(--border-primary)] w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--accent-primary)]">Add to Playlist</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          <p className="text-[var(--text-secondary)] mb-4">
            Add <strong className="text-[var(--accent-primary)]">{trackDisplayName}</strong> to:
          </p>
          {isCreating ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none transition"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button onClick={handleCreate} className="bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-2 px-4 rounded-lg transition">Save</button>
              <button onClick={() => setIsCreating(false)} className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full text-left bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--accent-primary)] font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-3 mb-4"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create new playlist</span>
            </button>
          )}

          {userPlaylists.length > 0 && (
            <ul className="space-y-2 max-h-60 overflow-y-auto border-t border-[var(--border-primary)] pt-4 mt-4">
              {userPlaylists.map(playlist => (
                <li key={playlist.id}>
                  <button
                    onClick={() => onSelectPlaylist(playlist.id)}
                    className="w-full text-left bg-[var(--bg-tertiary)]/50 hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-primary)] text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex justify-between items-center"
                  >
                    <span>{playlist.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{playlist.trackUrls.length} tracks</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;