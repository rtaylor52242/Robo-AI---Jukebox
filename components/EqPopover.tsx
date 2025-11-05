import React from 'react';
import { EQ_PRESETS } from '../App';

interface EqPopoverProps {
    isEqEnabled: boolean;
    eqSettings: number[];
    onEnabledChange: (enabled: boolean) => void;
    onGainChange: (bandIndex: number, gain: number) => void;
    onPresetChange: (presetName: string) => void;
}

const BAND_LABELS = ['60Hz', '230Hz', '910Hz', '3.6KHz', '8KHz', '14KHz'];

const EqPopover: React.FC<EqPopoverProps> = ({ 
    isEqEnabled, 
    eqSettings, 
    onEnabledChange, 
    onGainChange, 
    onPresetChange 
}) => {

    const handleReset = () => {
        onPresetChange('Flat');
    };

    return (
        <div 
            id="eq-popover" 
            className="absolute bottom-full right-0 mb-3 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-4 w-96 z-20"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-cyan-400">Equalizer</h3>
                <div className="flex items-center space-x-2">
                    <span className={`text-xs font-semibold ${isEqEnabled ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {isEqEnabled ? 'ON' : 'OFF'}
                    </span>
                    <label htmlFor="eq-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="eq-toggle" className="sr-only peer" checked={isEqEnabled} onChange={(e) => onEnabledChange(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <select 
                    onChange={(e) => onPresetChange(e.target.value)} 
                    className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-sm w-full focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    disabled={!isEqEnabled}
                >
                    <option value="">Select Preset</option>
                    {Object.keys(EQ_PRESETS).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <button 
                    onClick={handleReset} 
                    className="ml-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-1 px-3 rounded-md text-sm"
                    disabled={!isEqEnabled}
                >
                    Reset
                </button>
            </div>

            <div className="flex justify-between items-end h-32 pt-4 px-2">
                {eqSettings.map((gain, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <input
                            type="range"
                            min="-12"
                            max="12"
                            step="1"
                            value={gain}
                            onChange={(e) => onGainChange(index, Number(e.target.value))}
                            className="w-24 h-1.5 appearance-none rounded-full bg-slate-600 cursor-pointer -rotate-90 origin-bottom-center disabled:opacity-50"
                            style={{
                                accentColor: '#06b6d4',
                            }}
                            disabled={!isEqEnabled}
                        />
                        <span className="text-xs text-slate-400 mt-4">{BAND_LABELS[index]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EqPopover;
