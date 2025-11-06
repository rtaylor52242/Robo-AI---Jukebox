import React from 'react';
import { CloseIcon } from './Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" 
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl shadow-cyan-900/50 border border-slate-700 w-full max-w-md flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-red-400">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700" aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className="p-6">
          {children}
        </div>
        <footer className="p-4 bg-slate-800/50 rounded-b-xl flex-shrink-0 flex items-center justify-end space-x-3">
            <button
                onClick={onClose}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
            >
                Confirm
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmationModal;