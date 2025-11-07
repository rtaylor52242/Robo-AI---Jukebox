

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { ListeningStats, Track } from '../types';
import { CloseIcon, TrashIcon, CopyIcon } from './Icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ListeningStats;
  playlist: Track[];
  onResetStats: () => void;
  userSpotifyClientId: string;
  onSaveSpotifyClientId: (clientId: string) => void;
}

const formatTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0 minutes';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    let result = '';
    if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) {
        if (result) result += ', ';
        result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return result || '0 minutes';
};

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, stats, playlist, onResetStats, userSpotifyClientId, onSaveSpotifyClientId }) => {
  const [clientIdInput, setClientIdInput] = useState(userSpotifyClientId);
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  useEffect(() => {
    setClientIdInput(userSpotifyClientId);
  }, [userSpotifyClientId]);
  
  useEffect(() => {
    if (isOpen) {
      setCopyButtonText('Copy');
    }
  }, [isOpen]);

  const getTrackName = useCallback((url: string) => {
    const track = playlist.find(t => t.url === url);
    return track ? track.name : 'Unknown Track';
  }, [playlist]);

  const topTracks = useMemo(() => {
    return Object.keys(stats.playCounts)
      .sort((a, b) => stats.playCounts[b] - stats.playCounts[a])
      .slice(0, 5)
      .map(url => ({
        url,
        name: getTrackName(url),
        count: stats.playCounts[url],
      }));
  }, [stats.playCounts, getTrackName]);

  const recentHistory = useMemo(() => {
    return stats.history
      .filter(Boolean)
      .slice(0, 5)
      .map(url => ({
        url,
        name: getTrackName(url),
    }));
  }, [stats.history, getTrackName]);
  
  if (!isOpen) return null;

  const handleCopyRedirectURI = () => {
    navigator.clipboard.writeText(window.location.origin).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }).catch(err => {
      console.error('Failed to copy redirect URI:', err);
      setCopyButtonText('Error');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-[var(--bg-popover)] rounded-xl shadow-2xl shadow-[var(--shadow-color)] border border-[var(--border-primary)] w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--accent-primary)]">Your Listening Profile</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div>
            <h3 className="text-lg font-semibold text-[var(--accent-primary)] mb-2">Total Listening Time</h3>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{formatTime(stats.totalPlayTime)}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--accent-primary)] mb-3">Top 5 Most Played</h3>
              {topTracks.length > 0 ? (
                <ul className="space-y-2">
                  {topTracks.map((track, index) => (
                    <li key={track.url} className="flex items-center justify-between bg-[var(--bg-secondary)]/50 p-2 rounded-md">
                      <span className="truncate pr-4">{index + 1}. {track.name}</span>
                      <span className="text-xs bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] px-2 py-0.5 rounded-full flex-shrink-0">{track.count} plays</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text-muted)] italic">No listening data yet.</p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[var(--accent-primary)] mb-3">Recently Played</h3>
              {recentHistory.length > 0 ? (
                <ul className="space-y-2">
                  {recentHistory.map((track, index) => (
                    <li key={`${track.url}-${index}`} className="bg-[var(--bg-secondary)]/50 p-2 rounded-md truncate">{track.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--text-muted)] italic">No recent history.</p>
              )}
            </div>
          </div>
          
          <div className="border-t border-[var(--border-primary)] pt-6">
            <h3 className="text-lg font-semibold text-[var(--accent-primary)] mb-3">Spotify Integration</h3>
             <label htmlFor="spotify-client-id" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Spotify Client ID
            </label>
            <div className="flex space-x-2">
                <input
                id="spotify-client-id"
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="Enter your Spotify Client ID"
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none transition"
                />
                <button
                onClick={() => onSaveSpotifyClientId(clientIdInput)}
                className="bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-2 px-4 rounded-lg transition"
                >
                Save
                </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                If you encounter connection errors, you can provide your own Client ID. In your Spotify Developer Dashboard, ensure the Redirect URI is set to exactly:
            </p>
            <div className="mt-2 flex items-center space-x-2 bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border-primary)]">
                <code className="text-[var(--text-primary)] text-sm flex-grow">{window.location.origin}</code>
                <button 
                    onClick={handleCopyRedirectURI}
                    className="flex items-center space-x-1.5 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-primary)] font-semibold py-1 px-2.5 rounded-md transition-colors"
                >
                    <CopyIcon className="w-4 h-4" />
                    <span>{copyButtonText}</span>
                </button>
            </div>
          </div>

        </div>
        <footer className="p-4 border-t border-[var(--border-primary)] flex-shrink-0 flex items-center justify-end">
          <button
            onClick={onResetStats}
            title="Reset all stats"
            className="flex items-center space-x-2 bg-[var(--danger-secondary)] hover:bg-[var(--danger-primary)] text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <TrashIcon className="w-5 h-5" />
            <span>Reset Stats</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProfileModal;