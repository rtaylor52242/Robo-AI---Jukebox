import React from 'react';
import { CloseIcon } from './Icons';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutItem: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
    <p className="text-slate-300">{description}</p>
    <div className="flex items-center space-x-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          <kbd className="px-2 py-1 text-sm font-semibold text-cyan-300 bg-slate-700 border border-slate-600 rounded-md">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-slate-500">+</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);


const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-2xl shadow-cyan-900/50 border border-slate-700 w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition rounded-full p-1 hover:bg-slate-700">
            <CloseIcon />
          </button>
        </header>
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Playback Controls</h3>
            <ShortcutItem keys={['Spacebar', 'Numpad 5']} description="Play / Pause" />
            <ShortcutItem keys={['ArrowRight', 'Numpad 6']} description="Next Track" />
            <ShortcutItem keys={['ArrowLeft', 'Numpad 4']} description="Previous Track" />
            <ShortcutItem keys={['Numpad 0']} description="Toggle Shuffle" />
            <ShortcutItem keys={['Numpad .']} description="Toggle Repeat" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Navigation</h3>
            <ShortcutItem keys={['Numpad 7']} description="Rewind 6 Seconds" />
            <ShortcutItem keys={['Numpad 1']} description="Rewind 3 Seconds" />
            <ShortcutItem keys={['Numpad 9']} description="Fast-Forward 6 Seconds" />
            <ShortcutItem keys={['Numpad 3']} description="Fast-Forward 3 Seconds" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-2">Volume</h3>
            <ShortcutItem keys={['ArrowUp', 'Numpad 8']} description="Volume Up" />
            <ShortcutItem keys={['ArrowDown', 'Numpad 2']} description="Volume Down" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;