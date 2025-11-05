import React from 'react';

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

const TIMER_OPTIONS = [15, 30, 45, 60];

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
            className="absolute bottom-full right-0 mb-3 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-4 w-60 z-20"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="font-bold text-cyan-400 mb-4 text-center">Sleep Timer</h3>
            {isActive ? (
                <div className="text-center">
                    <p className="text-slate-300 mb-2">Time remaining:</p>
                    <p className="text-3xl font-mono font-bold text-cyan-400 mb-4">{formatTime(remainingTime)}</p>
                    <button
                        onClick={handleCancel}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-4 rounded-lg transition-colors"
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
