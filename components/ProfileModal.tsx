import React, { useMemo } from 'react';
import type { ListeningStats, Track } from '../types';
import { CloseIcon, TrashIcon } from './Icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ListeningStats;
  playlist: Track[];
  onResetStats: () => void;
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

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, stats, playlist, onResetStats }) => {
  if (!isOpen) return null;

  const getTrackName = (url: string) => {
    const track = playlist.find(t => t.url === url);
    return track ? track.file.name.replace(/\.[^/.]+$/, '') : 'Unknown Track';
  };

  const topTracks = useMemo(() => {
    // Fix: Using Object.keys and sorting by value avoids type inference issues with Object.entries, resolving the arithmetic operation error.
    return Object.keys(stats.playCounts)
      .sort((a, b) => stats.playCounts[b] - stats.playCounts[a])
      .slice(0, 5)
      .map(url => ({
        name: getTrackName(url),
        count: stats.playCounts[url],
      }));
  }, [stats.playCounts, playlist]);

  const recentHistory = useMemo(() => {
    return stats.history.map(url => getTrackName(url));
  }, [stats.history, playlist]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl shadow-cyan-900/50 border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400">Your Listening Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700">
            <CloseIcon />
          </button>
        </header>
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Total Listening Time</h3>
            <p className="text-3xl font-bold text-slate-200">{formatTime(stats.totalPlayTime)}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Top 5 Most Played</h3>
              {topTracks.length > 0 ? (
                <ul className="space-y-2">
                  {topTracks.map((track, index) => (
                    <li key={index} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                      <span className="truncate pr-4">{index + 1}. {track.name}</span>
                      <span className="text-xs bg-cyan-800 text-cyan-300 px-2 py-0.5 rounded-full flex-shrink-0">{track.count} plays</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">No listening data yet.</p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">Recently Played</h3>
              {recentHistory.length > 0 ? (
                <ul className="space-y-2">
                  {recentHistory.map((name, index) => (
                    <li key={index} className="bg-slate-700/50 p-2 rounded-md truncate">{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">No recent history.</p>
              )}
            </div>
          </div>

        </div>
        <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex items-center justify-end">
          <button
            onClick={onResetStats}
            title="Reset all stats"
            className="flex items-center space-x-2 bg-red-800 hover:bg-red-700 text-red-100 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
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