import React, { useState, useRef } from 'react';
import { CloseIcon, UploadIcon, AnalyzeIcon, CopyIcon } from './Icons';

interface LyricsSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (source: 'ai' | 'upload' | 'paste', content?: string) => void;
  trackName: string | null;
}

const LyricsSourceModal: React.FC<LyricsSourceModalProps> = ({ isOpen, onClose, onConfirm, trackName }) => {
  const [pasteContent, setPasteContent] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onConfirm('upload', content);
      };
      reader.onerror = (e) => {
        console.error("Error reading file:", e);
        alert("Could not read the selected file.");
      };
      reader.readAsText(file);
    }
    if(event.target) event.target.value = '';
  };
  
  const handlePasteSave = () => {
      if (pasteContent.trim()) {
          onConfirm('paste', pasteContent);
      } else {
          alert("Please paste some content before saving.");
      }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleClose = () => {
      setShowPasteInput(false);
      setPasteContent('');
      onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={handleClose}>
      <div className="bg-[var(--bg-popover)] rounded-xl shadow-2xl shadow-[var(--shadow-color)] border border-[var(--border-primary)] w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[var(--accent-primary)]">Provide Lyrics</h2>
            <p className="text-sm text-[var(--text-secondary)] truncate pr-4">For: {trackName}</p>
          </div>
          <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        {!showPasteInput && (
            <div className="p-6 space-y-3">
                <p className="text-center text-[var(--text-secondary)] mb-3">How would you like to add lyrics? This will replace any existing lyrics.</p>
                <button onClick={() => onConfirm('ai')} className="w-full text-left bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-primary)] text-[var(--text-primary)] font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-3">
                    <AnalyzeIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                    <span>Generate with Gemini AI</span>
                </button>
                <button onClick={handleUploadClick} className="w-full text-left bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-3">
                    <UploadIcon className="w-5 h-5" />
                    <span>Upload .txt or .lrc file</span>
                </button>
                <button onClick={() => setShowPasteInput(true)} className="w-full text-left bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-3">
                    <CopyIcon className="w-5 h-5" />
                    <span>Paste Lyrics as Text</span>
                </button>
            </div>
        )}

        {showPasteInput && (
            <div className="p-6 flex flex-col space-y-3">
                <h3 className="text-lg font-semibold text-[var(--text-secondary)]">Paste your lyrics below:</h3>
                <textarea 
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    className="w-full h-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none transition resize-none"
                    placeholder="[00:12.34] Lyrics with or without timestamps..."
                    autoFocus
                />
                <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={() => setShowPasteInput(false)} className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition">Cancel</button>
                    <button onClick={handlePasteSave} className="bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-2 px-4 rounded-lg transition">Save Lyrics</button>
                </div>
            </div>
        )}
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.lrc" className="hidden" />
      </div>
    </div>
  );
};

export default LyricsSourceModal;
