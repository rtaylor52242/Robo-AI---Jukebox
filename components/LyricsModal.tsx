import React, { useState, useEffect } from 'react';
import { CopyIcon, CloseIcon, RegenerateIcon, ShareIcon } from './Icons';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lyrics: string | null;
  isLoading: boolean;
  trackName: string | null;
  onRegenerate: () => void;
}

const LyricsModal: React.FC<LyricsModalProps> = ({ isOpen, onClose, lyrics, isLoading, trackName, onRegenerate }) => {
  const [copyText, setCopyText] = useState('Copy');
  const [isShareSupported, setIsShareSupported] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setIsShareSupported(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCopyText('Copy');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!lyrics) return;
    navigator.clipboard.writeText(lyrics).then(() => {
        setCopyText('Copied!');
        window.setTimeout(() => setCopyText('Copy'), 2000);
    }).catch(err => {
        console.error("Failed to copy text:", err);
        setCopyText('Error');
        window.setTimeout(() => setCopyText('Copy'), 2000);
    });
  };
  
  const handleShare = async () => {
    if (!lyrics || !trackName) return;
    try {
      await navigator.share({
        title: `Lyrics for ${trackName}`,
        text: `Lyrics for "${trackName}":\n\n${lyrics}`,
      });
    } catch (err) {
      console.log('Share action was cancelled or failed', err);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-[var(--bg-popover)] rounded-xl shadow-2xl shadow-[var(--shadow-color)] border border-[var(--border-primary)] w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[var(--accent-primary)]">Lyrics</h2>
            <p className="text-sm text-[var(--text-secondary)] truncate pr-4">{trackName}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] space-y-4 py-10">
                <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
                <p className='font-semibold'>Generating with Gemini...</p>
                <p className='text-sm text-[var(--text-muted)] text-center'>This might take a moment. Thanks for your patience!</p>
            </div>
          )}
          {lyrics && !isLoading && (
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap text-sm leading-relaxed">{lyrics}</p>
          )}
        </div>
        {lyrics && !isLoading && (
          <footer className="p-4 border-t border-[var(--border-primary)] flex-shrink-0 flex items-center justify-end space-x-3">
            <button
              onClick={onRegenerate}
              className="flex items-center space-x-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <RegenerateIcon className="w-5 h-5" />
              <span>Regenerate</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <CopyIcon className="w-5 h-5" />
              <span>{copyText}</span>
            </button>
             {isShareSupported && (
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                <ShareIcon className="w-5 h-5" />
                <span>Share</span>
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

export default LyricsModal;