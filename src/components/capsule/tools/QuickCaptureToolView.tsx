import React from 'react';
import { Sparkles } from 'lucide-react';

export interface QuickCaptureToolViewProps {
  quickInput: string;
  onQuickInputChange: (val: string) => void;
  onQuickInputSubmit: (e: React.FormEvent) => void;
  markTypingActivity: () => void;
  savedIndicator: boolean;
  isEn: boolean;
}

/**
 * Tampilan alat Tulis Cepat (Smart Quick Capture) di kapsul
 */
export const QuickCaptureToolView: React.FC<QuickCaptureToolViewProps> = ({
  quickInput,
  onQuickInputChange,
  onQuickInputSubmit,
  markTypingActivity,
  savedIndicator,
  isEn,
}) => {
  return (
    <form onSubmit={onQuickInputSubmit} className="w-full flex items-center gap-1.5 px-1">
      <div className="flex-1 flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 focus-within:bg-white/[0.08] transition-colors min-w-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <input
          type="text"
          autoFocus
          value={quickInput}
          onKeyDown={markTypingActivity}
          onPaste={markTypingActivity}
          onChange={(e) => {
            markTypingActivity();
            onQuickInputChange(e.target.value);
          }}
          placeholder={isEn ? 'Capture note, expense, schedule...' : 'Catat ide, pengeluaran, jadwal...'}
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none min-w-0"
        />
      </div>
      <button
        type="submit"
        className="rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold px-3 py-1.5 text-xs transition cursor-pointer shrink-0"
      >
        {savedIndicator ? '✓' : isEn ? 'Save' : 'Simpan'}
      </button>
    </form>
  );
};
