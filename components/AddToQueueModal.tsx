import React from 'react';
import type { Playlist } from '../types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  onSelectPlaylist: (playlistId: string) => void;
  trackName: string | null;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ isOpen, onClose, playlists, onSelectPlaylist, trackName }) => {
  if (!isOpen) return null;

  const trackDisplayName = trackName?.replace(/\.[^/.]+$/, "") || "this song";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl shadow-cyan-900/50 border border-slate-700 w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400">Add to Playlist</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          <p className="text-slate-400 mb-4">
            Select a playlist to add <strong className="text-cyan-400">{trackDisplayName}</strong> to:
          </p>
          {playlists.length > 0 ? (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {playlists.map(playlist => (
                <li key={playlist.id}>
                  <button
                    onClick={() => onSelectPlaylist(playlist.id)}
                    className="w-full text-left bg-slate-700 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-300 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex justify-between items-center"
                  >
                    <span>{playlist.name}</span>
                    <span className="text-xs text-slate-500">{playlist.trackUrls.length} tracks</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-center py-4">You haven't created any playlists yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
