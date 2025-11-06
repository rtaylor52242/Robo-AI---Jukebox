
import React, { useState, useEffect } from 'react';
import { CopyIcon, ShareIcon, CloseIcon, RegenerateIcon } from './Icons';
import type { AnalysisResult } from '../types';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  trackName: string | null;
  onRegenerate: () => void;
}

const ANALYSIS_SECTIONS = {
    songStructure: "Song Structure",
    musicalElements: "Musical Elements",
    lyricalComponents: "Lyrical Components",
    productionElements: "Production Elements",
    creativeTechnicalAspects: "Creative & Technical Aspects",
    regenerationPrompt: "Regeneration Prompt"
};

const AnalysisSection: React.FC<{ title: string; content: string; }> = ({ title, content }) => {
    const [copyText, setCopyText] = useState('Copy');

    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy'), 2000);
        }).catch(err => {
            console.error("Failed to copy text:", err);
            setCopyText('Error');
            setTimeout(() => setCopyText('Copy'), 2000);
        });
    };

    return (
        <div className="py-3">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-cyan-400">{title}</h3>
                <button onClick={handleCopy} className="flex items-center space-x-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1 px-2.5 rounded-md transition-colors">
                    <CopyIcon className="w-4 h-4" />
                    <span>{copyText}</span>
                </button>
            </div>
            <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        </div>
    );
};


const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, analysis, isLoading, trackName, onRegenerate }) => {
  const [copyAllText, setCopyAllText] = useState('Copy All');
  const [isShareSupported, setIsShareSupported] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setIsShareSupported(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCopyAllText('Copy All');
    }
  }, [isOpen, analysis]);

  if (!isOpen) return null;

  const formatFullAnalysis = (): string => {
    if (!analysis) return "";
    return Object.entries(analysis)
        .map(([key, value]) => {
            const title = ANALYSIS_SECTIONS[key as keyof AnalysisResult] || key;
            return `## ${title}\n\n${value}`;
        })
        .join('\n\n---\n\n');
  };

  const handleCopyAll = async () => {
    const fullText = formatFullAnalysis();
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyAllText('Copied!');
      setTimeout(() => setCopyAllText('Copy All'), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyAllText('Error');
    }
  };

  const handleShare = async () => {
    const fullText = formatFullAnalysis();
    if (!fullText || !trackName) return;
    try {
      await navigator.share({
        title: `Song Analysis: ${trackName}`,
        text: `Check out this analysis for "${trackName}":\n\n${fullText}`,
      });
    } catch (err) {
      console.log('Share action was cancelled or failed', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl shadow-cyan-900/50 border border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">Song Analysis</h2>
            <p className="text-sm text-slate-400 truncate pr-4">{trackName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 overflow-y-auto divide-y divide-slate-700/50">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-4 py-10">
                <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className='font-semibold'>Analyzing with Gemini...</p>
                <p className='text-sm text-slate-500 text-center'>This can take a moment, especially for longer audio files. Thanks for your patience!</p>
            </div>
          )}
          {analysis && !isLoading && (
            <>
                {Object.entries(analysis).map(([key, value]) => (
                    <AnalysisSection 
                        key={key}
                        title={ANALYSIS_SECTIONS[key as keyof AnalysisResult] || key}
                        content={value}
                    />
                ))}
            </>
          )}
        </div>
        {analysis && !isLoading && (
          <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex items-center justify-end space-x-3">
            <button
              onClick={onRegenerate}
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <RegenerateIcon className="w-5 h-5" />
              <span>Regenerate</span>
            </button>
            <button
              onClick={handleCopyAll}
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <CopyIcon className="w-5 h-5" />
              <span>{copyAllText}</span>
            </button>
            {isShareSupported && (
              <button
                onClick={handleShare}
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
