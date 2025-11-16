import React, { useState, useRef } from 'react';
import type { SoundboardPad, SoundboardSheetData } from '../types';
import { CloseIcon, UploadIcon, NextIcon, PrevIcon, FolderMusicIcon } from './Icons';

interface SoundboardProps {
    isOpen: boolean;
    onClose: () => void;
    sheets: SoundboardSheetData;
    currentSheet: number;
    onSheetChange: (sheetIndex: number) => void;
    onUpdatePad: (sheet: number, id: number, name: string, soundUrl: string) => void;
    onTogglePad: (pad: SoundboardPad) => void;
    activePads: Set<number>;
    onLoadFolderClick: () => void;
}

const Pad: React.FC<{
    pad: SoundboardPad;
    editMode: boolean;
    onUpdate: (name: string, soundUrl: string) => void;
    onPlay: () => void;
    isActive: boolean;
}> = ({ pad, editMode, onUpdate, onPlay, isActive }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(e.target.value, pad.soundUrl);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    onUpdate(pad.name, event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <div className="relative group">
            <button
                onClick={onPlay}
                disabled={editMode}
                className={`w-full aspect-square flex items-center justify-center p-2 rounded-lg text-center transition-all duration-150
                    ${editMode ? 'bg-[var(--bg-tertiary)]/50 cursor-not-allowed' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)] border-2 border-transparent'}
                    ${isActive ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] scale-105 shadow-lg shadow-[var(--shadow-color)]' : 'text-[var(--text-secondary)]'}
                `}
            >
                {!editMode && <span className="font-semibold text-sm break-all">{pad.name}</span>}
            </button>
            {editMode && (
                <div className="absolute inset-0 bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-lg flex flex-col items-center justify-center p-2 space-y-2">
                    <input
                        type="text"
                        value={pad.name}
                        onChange={handleNameChange}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-md text-center text-xs py-1 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary-hover)] rounded-full text-[var(--text-secondary)] hover:text-[var(--bg-primary)] transition-colors"
                        title="Upload new sound"
                    >
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="audio/*"
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
};


const Soundboard: React.FC<SoundboardProps> = ({ isOpen, onClose, sheets, currentSheet, onSheetChange, onUpdatePad, onTogglePad, activePads, onLoadFolderClick }) => {
    const [editMode, setEditMode] = useState(false);

    if (!isOpen) return null;

    const padsForCurrentSheet = sheets[currentSheet] || [];
    const totalSheets = 9;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
            <div className="bg-[var(--bg-popover)] rounded-xl shadow-2xl shadow-[var(--shadow-color)] border border-[var(--border-primary)] w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-[var(--accent-primary)]">Soundboard</h2>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => onSheetChange((currentSheet - 1 + totalSheets) % totalSheets)}
                                className="p-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70 hover:text-[var(--text-primary)] transition"
                                title="Previous Sheet"
                            >
                                <PrevIcon className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-sm w-20 text-center text-[var(--text-secondary)]">Sheet {currentSheet + 1} / {totalSheets}</span>
                            <button 
                                onClick={() => onSheetChange((currentSheet + 1) % totalSheets)}
                                className="p-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70 hover:text-[var(--text-primary)] transition"
                                title="Next Sheet"
                            >
                                <NextIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={onLoadFolderClick}
                            disabled={!editMode}
                            className="p-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70 hover:text-[var(--text-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Load Folder to current sheet"
                        >
                            <FolderMusicIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center space-x-2">
                            <span className={`text-xs font-semibold ${editMode ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                                Edit
                            </span>
                            <label htmlFor="edit-mode-toggle" className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="edit-mode-toggle" className="sr-only peer" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
                                <div className="w-11 h-6 bg-[var(--bg-tertiary)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--accent-primary-hover)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary-hover)]"></div>
                            </label>
                        </div>
                        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <div className="p-4 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-3">
                        {padsForCurrentSheet.map(pad => (
                            <Pad
                                key={pad.id}
                                pad={pad}
                                editMode={editMode}
                                onUpdate={(name, soundUrl) => onUpdatePad(currentSheet, pad.id, name, soundUrl)}
                                onPlay={() => onTogglePad(pad)}
                                isActive={activePads.has(pad.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Soundboard;