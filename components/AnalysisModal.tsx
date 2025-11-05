import React, { useState, useEffect } from 'react';
import { CopyIcon, ShareIcon } from './Icons';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: string | null;
  isLoading: boolean;
  trackName: string | null;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, analysis, isLoading, trackName }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [isShareSupported, setIsShareSupported] = useState(false);

  useEffect(() => {
    // Check for Web Share API support on component mount
    if (navigator.share) {
      setIsShareSupported(true);
    }
  }, []);

  useEffect(() => {
    // Reset copy button text when modal opens or analysis changes
    if (isOpen) {
      setCopyButtonText('Copy');
    }
  }, [isOpen, analysis]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyButtonText('Error');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }
  };

  const handleShare = async () => {
    if (!analysis || !trackName) return;
    try {
      await navigator.share({
        title: `Song Analysis: ${trackName}`,
        text: `Check out this analysis for "${trackName}":\n\n${analysis}`,
      });
    } catch (err) {
      // This error can happen if the user cancels the share dialog, so it's not a critical error.
      console.log('Share action was cancelled or failed', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl shadow-cyan-900/50 border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">Song Analysis</h2>
            <p className="text-sm text-slate-400 truncate pr-4">{trackName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className='font-semibold'>Analyzing with Gemini...</p>
                <p className='text-sm text-slate-500'>This may take a moment for longer songs.</p>
            </div>
          )}
          {analysis && (
            <div className="text-slate-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: analysis.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400 font-bold">$1</strong>') }} />
          )}
        </div>
        {analysis && !isLoading && (
          <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex items-center justify-end space-x-3">
            <button
              onClick={handleCopy}
              title="Copy analysis to clipboard"
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <CopyIcon className="w-5 h-5" />
              <span>{copyButtonText}</span>
            </button>
            {isShareSupported && (
              <button
                onClick={handleShare}
                title="Share analysis"
                className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-colors duration-200"
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

export default AnalysisModal;