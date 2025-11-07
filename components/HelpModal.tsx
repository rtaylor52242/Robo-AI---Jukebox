
import React from 'react';
import { CloseIcon } from './Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="py-3">
        <h3 className="text-lg font-semibold text-[var(--accent-primary)] mb-2">{title}</h3>
        <div className="text-[var(--text-secondary)] space-y-2 text-sm leading-relaxed">{children}</div>
    </div>
);

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-[var(--bg-popover)] rounded-xl shadow-2xl shadow-[var(--shadow-color)] border border-[var(--border-primary)] w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--accent-primary)]">Help Guide</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto divide-y divide-[var(--border-primary)]">
            <HelpSection title="Getting Started">
                <p>There are two ways to play music:</p>
                <ul className="list-disc list-inside pl-4">
                    <li><strong>Local Files:</strong> Click the <strong>"Select Music Folder"</strong> button (if the library is empty) to load your local audio files.</li>
                    <li><strong>Spotify:</strong> Click the <strong>"Connect Spotify"</strong> button in the header to link your Spotify Premium account.</li>
                </ul>
            </HelpSection>
            <HelpSection title="Playback Controls">
                <p>Use the main controls in the bottom bar to play, pause, skip, and go to the previous track. You can also toggle shuffle and repeat modes.</p>
                <p>The progress bar is seekable—just click anywhere on it to jump to that part of the song.</p>
                <p>Click the <strong>Sleep Timer</strong> icon (crescent moon) to set a timer that will automatically stop playback after a chosen duration.</p>
            </HelpSection>
            <HelpSection title="Playlist Management">
                <p>The sidebar on the left organizes your music. If you've connected Spotify, you can switch between your <strong>Local</strong> library and <strong>Spotify</strong> playlists using the switcher at the top.</p>
                <p>For your local library, you can view all tracks, see your liked songs, and filter by star rating.</p>
                <p>Create your own custom local playlists by clicking <strong>"New Playlist"</strong>. To add a song to a playlist, hover over it in the main list and click the <strong className="text-[var(--accent-primary)]">+</strong> icon.</p>
                <p>You can re-order songs within a custom local playlist by dragging and dropping them.</p>
            </HelpSection>
            <HelpSection title="Track Interactions (Local Files Only)">
                <p>When viewing your local library, hover over any track to reveal a set of icons:</p>
                <ul className="list-disc list-inside pl-4">
                    <li><strong>Like (Heart):</strong> Adds the song to your "Liked Songs" playlist.</li>
                    <li><strong>Rate (Stars):</strong> Give a 1-5 star rating. Rated songs appear in special playlists.</li>
                    <li><strong>Share:</strong> Opens your device's share dialog to share the track name.</li>
                    <li><strong>Add to Playlist:</strong> Opens a dialog to add the song to a custom playlist.</li>
                </ul>
            </HelpSection>
            <HelpSection title="Advanced Tools (Local Files Only)">
                 <p><strong>Equalizer:</strong> Click the EQ icon in the player to open the 6-band graphic equalizer. You can use presets or create your own custom sound profile. The EQ window is draggable!</p>
                 <p><strong>Song Analysis:</strong> Click the brain icon to use the Gemini AI to get a deep analysis of the current track's structure, musical elements, lyrics, and more. You can even get a prompt to regenerate a similar song!</p>
            </HelpSection>
             <HelpSection title="Personalization & Profile">
                <p><strong>Themes:</strong> Customize your jukebox's appearance by clicking the <strong>Theme</strong> icon in the header to cycle through different visual styles.</p>
                <p><strong>Profile:</strong> Click the <strong>User</strong> icon in the header to open your Listening Profile. Here you can see stats like your total listening time, most played tracks, and recent history for your local library.</p>
            </HelpSection>
             <HelpSection title="Keyboard Shortcuts">
                <p>Click the keyboard icon in the header to see a full list of keyboard shortcuts for controlling playback.</p>
            </HelpSection>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
