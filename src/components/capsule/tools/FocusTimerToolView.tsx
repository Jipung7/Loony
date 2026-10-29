import React from 'react';
import { Timer, Pause, Play, RotateCcw } from 'lucide-react';

export interface FocusTimerToolViewProps {
  isFocusTimerRunning: boolean;
  focusTimerFormatted: string;
  focusTimerTotalSeconds: number;
  onStartFocusTimer: (mins: number) => void;
  onToggleFocusTimer: () => void;
  onResetFocusTimer: () => void;
  isEn: boolean;
}

/**
 * Tampilan alat Focus Timer di kapsul dengan preset 15, 25, 45, 5 menit
 */
export const FocusTimerToolView: React.FC<FocusTimerToolViewProps> = ({
  isFocusTimerRunning,
  focusTimerFormatted,
  focusTimerTotalSeconds,
  onStartFocusTimer,
  onToggleFocusTimer,
  onResetFocusTimer,
  isEn,
}) => {
  return (
    <div className="w-full flex items-center justify-between gap-2 px-1.5">
      <div className="flex items-center gap-1.5 shrink-0">
        <Timer
          className={`w-3.5 h-3.5 shrink-0 ${
            isFocusTimerRunning ? 'text-indigo-400 animate-pulse' : 'text-indigo-400/90'
          }`}
        />
        <span className="text-lg font-bold text-zinc-100 leading-none tabular-nums">
          {focusTimerFormatted}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {[15, 25, 45, 5].map((mins) => {
          const activePreset = Math.round(focusTimerTotalSeconds / 60) === mins;
          return (
            <button
              key={mins}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartFocusTimer(mins);
              }}
              className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                activePreset
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'capsule-btn text-zinc-300 hover:text-white'
              }`}
            >
              {mins}m
            </button>
          );
        })}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFocusTimer();
          }}
          title={
            isFocusTimerRunning
              ? isEn ? 'Pause Focus Timer' : 'Jeda Focus Timer'
              : isEn ? 'Start Focus Timer' : 'Mulai Focus Timer'
          }
          className="p-1.5 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white transition cursor-pointer ml-0.5"
        >
          {isFocusTimerRunning ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResetFocusTimer();
          }}
          title={isEn ? 'Reset Focus Timer' : 'Reset Focus Timer'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
