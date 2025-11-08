import React, { useState, useEffect } from 'react';
import { EQ_PRESETS } from '../App';
import { CloseIcon, TrashIcon } from './Icons';

interface EqPopoverProps {
    isEqEnabled: boolean;
    eqSettings: number[];
    balance: number;
    isBassBoostEnabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    onGainChange: (bandIndex: number, gain: number) => void;
    onPresetChange: (presetName: string) => void;
    onBalanceChange: (value: number) => void;
    onBassBoostToggle: () => void;
    onClose: () => void;
    presets: { [name: string]: number[] };
    userPresets: { [name: string]: number[] };
    onSavePreset: (name: string) => void;
    onDeletePreset: (name: string) => void;
}

const BAND_LABELS = ['60Hz', '230Hz', '910Hz', '3.6KHz', '8KHz', '14KHz'];

const EqPopover: React.FC<EqPopoverProps> = ({ 
    isEqEnabled, 
    eqSettings, 
    balance,
    isBassBoostEnabled,
    onEnabledChange, 
    onGainChange, 
    onPresetChange,
    onBalanceChange,
    onBassBoostToggle,
    onClose,
    presets,
    userPresets,
    onSavePreset,
    onDeletePreset
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');

    useEffect(() => {
        const matchingPreset = Object.entries(presets).find(([, values]) => 
            // FIX: Cast `values` to `number[]` to resolve TypeScript inference issue where it was treated as `unknown`.
            (values as number[]).every((v, i) => v === eqSettings[i])
        );
        setSelectedPreset(matchingPreset ? matchingPreset[0] : '');
    }, [eqSettings, presets]);

    const handleReset = () => {
        onPresetChange('Flat');
    };

    const handleSaveClick = () => {
        if (newPresetName.trim()) {
            onSavePreset(newPresetName.trim());
            setIsSaving(false);
            setNewPresetName('');
        }
    };
    
    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        if (name) {
            onPresetChange(name);
        }
        setSelectedPreset(name);
    };
    
    const handleDeleteClick = () => {
        if (selectedPreset && userPresets[selectedPreset] && window.confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
            onDeletePreset(selectedPreset);
            setSelectedPreset(''); // Reset selection
        }
    };

    const isUserPresetSelected = selectedPreset in userPresets;

    return (
        <div 
            id="eq-popover" 
            className="absolute bottom-full left-0 mb-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl p-4 w-[41rem] z-20 animate-fade-in-up"
            style={{ animationDuration: '0.2s' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div 
                className="flex justify-between items-center mb-4"
            >
                <h3 className="font-bold text-[var(--accent-primary)]">Equalizer</h3>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className={`text-xs font-semibold ${isEqEnabled ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {isEqEnabled ? 'ON' : 'OFF'}
                        </span>
                        <label htmlFor="eq-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="eq-toggle" className="sr-only peer" checked={isEqEnabled} onChange={(e) => onEnabledChange(e.target.checked)} />
                            <div className="w-11 h-6 bg-[var(--bg-tertiary)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--accent-primary-hover)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary-hover)]"></div>
                        </label>
                    </div>
                     <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-1 hover:bg-[var(--bg-tertiary)]" aria-label="Close equalizer">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col space-y-3 mb-4">
                <div className="flex justify-between items-center space-x-2">
                    <select 
                        value={selectedPreset}
                        onChange={handlePresetChange} 
                        className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md px-2 py-1.5 text-sm w-full focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none"
                        disabled={!isEqEnabled}
                    >
                        <option value="">{selectedPreset ? 'Custom' : 'Select Preset'}</option>
                        <optgroup label="Default Presets">
                            {Object.keys(EQ_PRESETS).map(name => <option key={name} value={name}>{name}</option>)}
                        </optgroup>
                        {Object.keys(userPresets).length > 0 && (
                            <optgroup label="Your Presets">
                                {Object.keys(userPresets).map(name => <option key={name} value={name}>{name}</option>)}
                            </optgroup>
                        )}
                    </select>
                    {isUserPresetSelected && (
                        <button 
                            onClick={handleDeleteClick} 
                            className="p-2 bg-[var(--danger-secondary)]/80 hover:bg-[var(--danger-secondary)] text-white rounded-md transition-colors"
                            title={`Delete preset "${selectedPreset}"`}
                            disabled={!isEqEnabled}
                        >
                           <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={handleReset} 
                        className="bg-[var(--bg-tertiary)]/70 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold py-1.5 px-3 rounded-md text-sm"
                        disabled={!isEqEnabled}
                    >
                        Reset
                    </button>
                </div>

                {isSaving ? (
                     <div className="flex items-center space-x-2">
                         <input
                             type="text"
                             value={newPresetName}
                             onChange={(e) => setNewPresetName(e.target.value)}
                             placeholder="Preset name..."
                             className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md py-1.5 px-3 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary-hover)] focus:outline-none"
                             autoFocus
                             onKeyDown={(e) => e.key === 'Enter' && handleSaveClick()}
                         />
                         <button onClick={handleSaveClick} className="bg-[var(--accent-primary-hover)] hover:bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold py-1.5 px-3 text-sm rounded-md transition">Save</button>
                         <button onClick={() => setIsSaving(false)} className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-1.5 px-3 text-sm rounded-md transition">Cancel</button>
                     </div>
                ) : (
                    <button
                        onClick={() => setIsSaving(true)}
                        className="w-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--accent-primary)] font-semibold py-1.5 px-3 rounded-md text-sm transition-colors"
                        disabled={!isEqEnabled}
                    >
                        Save Current Settings as Preset
                    </button>
                )}
            </div>
            
            <div className="mb-4 space-y-4 pt-4 border-t border-[var(--border-primary)]">
                <div className="flex items-center justify-between">
                    <label htmlFor="bass-boost-toggle" className="font-semibold text-[var(--text-primary)]">Bass Boost</label>
                    <div className="flex items-center space-x-2">
                         <span className={`text-xs font-semibold ${isBassBoostEnabled ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)]'}`}>
                            {isBassBoostEnabled ? 'ON' : 'OFF'}
                        </span>
                        <label htmlFor="bass-boost-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="bass-boost-toggle" className="sr-only peer" checked={isBassBoostEnabled} onChange={onBassBoostToggle} disabled={!isEqEnabled} />
                            <div className="w-11 h-6 bg-[var(--bg-tertiary)] rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--accent-secondary)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-secondary)]"></div>
                        </label>
                    </div>
                </div>
                
                <div className="flex items-center space-x-4">
                    <label className="font-semibold text-[var(--text-primary)] w-20">Balance</label>
                    <div className="flex items-center flex-grow space-x-2">
                        <span className="text-xs font-bold text-[var(--text-secondary)]">L</span>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.1"
                            value={balance}
                            onChange={(e) => onBalanceChange(Number(e.target.value))}
                            className="w-full h-1.5 appearance-none rounded-full bg-[var(--bg-tertiary)] cursor-pointer disabled:opacity-50"
                            disabled={!isEqEnabled}
                        />
                        <span className="text-xs font-bold text-[var(--text-secondary)]">R</span>
                    </div>
                    <button 
                        onClick={() => onBalanceChange(0)}
                        className="text-xs bg-[var(--bg-tertiary)]/70 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold py-1 px-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isEqEnabled || balance === 0}
                    >
                        Reset
                    </button>
                </div>
            </div>


            <div className="flex justify-between items-end h-80 pt-4 px-2 pb-32">
                {eqSettings.map((gain, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <input
                            type="range"
                            min="-12"
                            max="12"
                            step="1"
                            value={gain}
                            onChange={(e) => onGainChange(index, Number(e.target.value))}
                            className="w-24 h-1.5 appearance-none rounded-full bg-[var(--bg-tertiary)] cursor-pointer -rotate-90 origin-bottom-center disabled:opacity-50"
                            disabled={!isEqEnabled}
                        />
                        <span className="text-xs text-[var(--text-secondary)] mt-4">{BAND_LABELS[index]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EqPopover;
