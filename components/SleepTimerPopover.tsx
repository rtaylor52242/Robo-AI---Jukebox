import React from 'react';
import { CloseIcon } from './Icons';

interface SleepTimerPopoverProps {
    remainingTime: number | null;
    onSetTimer: (minutes: number) => void;
    onClose: () => void;
}

const formatTime = (timeInSeconds: number | null): string => {
    if (timeInSeconds === null || isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const TIMER_OPTIONS = [15, 30, 45, 60, 90];

const SleepTimerPopover: React.FC<SleepTimerPopoverProps> = ({ remainingTime, onSetTimer, onClose }) => {
    const isActive = (remainingTime ?? 0) > 0;

    const handleSet = (minutes: number) => {
        onSetTimer(minutes);
        onClose();
    };
    
    const handleCancel = () => {
        onSetTimer(0);
        onClose();
    };

    return (
        <div
            id="sleep-timer-popover"
            className="absolute bottom-full right-0 mb-3 bg-[var(--bg-popover)] backdrop-blur-md border border-[var(--border-primary)] rounded-lg shadow-2xl p-4 w-60 z-20 animate-fade-in-up"
            style={{ animationDuration: '0.2s' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4">
                <span className="w-6"></span> {/* Spacer to balance the close button */}
                <h3 className="font-bold text-[var(--accent-primary)]">Sleep Timer</h3>
                <button 
                    onClick={onClose} 
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-full p-0.5 hover:bg-[var(--bg-tertiary)]" 
                    aria-label="Close sleep timer"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
            {isActive ? (
                <div className="text-center">
                    <p className="text-[var(--text-secondary)] mb-2">Time remaining:</p>
                    <p className="text-3xl font-mono font-bold text-[var(--accent-primary)] mb-4">{formatTime(remainingTime)}</p>
                    <button
                        onClick={handleCancel}
                        className="w-full bg-[var(--danger-secondary)] hover:bg-[var(--danger-primary)] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancel Timer
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {TIMER_OPTIONS.map(minutes => (
                        <button
                            key={minutes}
                            onClick={() => handleSet(minutes)}
                            className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            {minutes} min
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SleepTimerPopover;