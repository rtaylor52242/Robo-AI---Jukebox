

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
            <HelpSection title="Playlist Management">
                <p>The sidebar on the left organizes your music. If you've connected Spotify, you can switch between your <strong>Local</strong> library and <strong>Spotify</strong> playlists using the switcher at the top.</p>
                <p>For your local library, you can view all tracks, see your liked songs, and filter by star rating.</p>
                <p>Create your own custom local playlists by clicking <strong>"New Playlist"</strong>. To add a song to a playlist, hover over it in the main list and click the <strong className="text-[var(--accent-primary)]">+</strong> icon.</p>
                <p>You can re-order songs within a custom local playlist by dragging and dropping them.</p>
            </HelpSection>
            <HelpSection title="AI-Powered Features">
                 <p><strong>Generate Lyrics:</strong> Click the lyrics icon in the player controls. For local files, the AI will listen to the audio and transcribe it. For Spotify tracks, it will look up the lyrics. Generated lyrics for local tracks are automatically saved—the next time you open them, they'll load instantly. Use the <strong>Regenerate</strong> button if you want a new version, or the <strong>Share</strong> button to send the lyrics to others.</p>
                 <p><strong>Song Analysis (Local Files Only):</strong> Click the brain icon to use the Gemini AI to get a deep analysis of the current track's structure, musical elements, lyrics, and more. You can even get a prompt to regenerate a similar song!</p>
            </HelpSection>
            <HelpSection title="Karaoke Mode (Local Files Only)">
                <p>There are two ways to start a karaoke session:</p>
                <ul className="list-disc list-inside pl-4 mb-2">
                    <li><strong>Single Song:</strong> Hover over any local track in your playlist and click the <strong>Karaoke</strong> (microphone) icon.</li>
                    <li><strong>Continuous Mode:</strong> In the main player controls, click the <strong>Karaoke Mode</strong> toggle button (microphone icon). When enabled, every local track you play will automatically open in Karaoke Mode.</li>
                </ul>
                <p>Once started, you have several controls:</p>
                <ul className="list-disc list-inside pl-4">
                    <li><strong>Synced Lyrics:</strong> The AI will generate time-synchronized lyrics that highlight as the song plays, just like a real karaoke machine.</li>
                    <li><strong>Vocal Reduction:</strong> On the karaoke screen, click the microphone icon with a slash through it to reduce the original artist's vocals, making it easier for you to take the lead!</li>
                    <li><strong>Font Controls:</strong> Use the plus and minus buttons to adjust the lyric font size for perfect readability.</li>
                </ul>
            </HelpSection>
            <HelpSection title="Soundboard">
                <p>Click the soundboard icon in the player controls to open a <strong>144-pad soundboard</strong> spread across 9 sheets.</p>
                 <ul className="list-disc list-inside pl-4">
                    <li><strong>Play:</strong> Simply click any pad to play its sound effect over your music.</li>
                    <li><strong>Navigate:</strong> Use the "Next" and "Previous" buttons in the soundboard header to switch between the 9 sheets.</li>
                    <li><strong>Customize:</strong> Toggle the "Edit" switch in the header. In edit mode, you can click on any pad to change its name and upload your own local audio file as a new sound effect. All your changes are saved automatically.</li>
                </ul>
            </HelpSection>
            <HelpSection title="DJ Mode (Local Files Only)">
                <p>Click the DJ icon in the player controls to open a professional two-deck mixing interface. Here's how to use it:</p>
                <ul className="list-disc list-inside pl-4">
                    <li><strong>Loading Tracks:</strong> Click "Load Track L" or "Load Track R" to open your library and select a song for each deck. The app will analyze the track and generate a colored waveform.</li>
                    <li><strong>Dual Waveform Display:</strong> At the top, you'll see both tracks' waveforms running in parallel. They are color-coded by frequency (Pink for bass, Cyan for mids, Yellow for highs) to help you visually plan your transitions.</li>
                    <li><strong>Playback:</strong> Each deck has its own Play/Pause button, a CUE button to return to the start, and a vertical Pitch slider to adjust the track's speed (BPM).</li>
                    <li><strong>Mixing:</strong> Use the horizontal <strong>Crossfader</strong> at the bottom to blend between Deck L and Deck R. For a perfect transition, click the <strong>Auto Mix</strong> button to have the crossfader glide automatically over 8 seconds.</li>
                    <li><strong>Recording:</strong> Click the red <strong>Record</strong> button to start recording your entire mix. Click it again to stop, and your session will be saved as an audio file to your computer.</li>
                    <li><strong>Window Controls:</strong> Use the header buttons to <strong>Minimize</strong> the DJ interface to a compact player, <strong>Maximize</strong> it back to full view, or <strong>Close</strong> it entirely.</li>
                </ul>
            </HelpSection>
            <HelpSection title="Advanced Controls">
                 <p><strong>Equalizer (Local Files Only):</strong> Click the EQ icon to open the 6-band graphic equalizer. You can use presets or create your own custom sound profile. New controls also allow you to toggle a <strong>Bass Boost</strong> and adjust the <strong>Left/Right Speaker Balance</strong>.</p>
                 <p><strong>Sleep Timer:</strong> Click the crescent moon icon to set a timer that will automatically stop playback after a chosen duration.</p>
            </HelpSection>
             <HelpSection title="Your Profile & Settings">
                <p>Click the <strong>User</strong> icon in the header to open your Listening Profile. Here you can:</p>
                <ul className="list-disc list-inside pl-4">
                    <li>View stats for your local library, including total listening time, your top 5 most-played tracks, and your recently played history.</li>
                    <li><strong>Reset Stats:</strong> Clear all your local listening data and start fresh.</li>
                    <li><strong>Spotify Client ID:</strong> For advanced users, you can provide your own Spotify Client ID if you encounter connection issues with the default one.</li>
                </ul>
                <p><strong>Themes:</strong> Customize your jukebox's appearance by clicking the <strong>Theme</strong> icon in the header to cycle through different visual styles.</p>
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
