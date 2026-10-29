import React, { useRef } from 'react';
import { Clipboard, Upload } from 'lucide-react';
import { ClipboardItem } from '../../../types';

export interface ClipboardBridgeToolViewProps {
  pasteInput: string;
  onPasteInputChange: (val: string) => void;
  onPasteSubmit: (e: React.FormEvent) => void;
  markTypingActivity: () => void;
  pasteSaved: boolean;
  clipboardHistory: ClipboardItem[];
  onSendFile: (file: File) => void;
  isEn: boolean;
}

/**
 * Tampilan alat Clipboard & Instant Bridge di kapsul
 */
export const ClipboardBridgeToolView: React.FC<ClipboardBridgeToolViewProps> = ({
  pasteInput,
  onPasteInputChange,
  onPasteSubmit,
  markTypingActivity,
  pasteSaved,
  clipboardHistory,
  onSendFile,
  isEn,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex items-center gap-1.5 px-1">
      <form onSubmit={onPasteSubmit} className="flex-1 flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 focus-within:bg-white/[0.08] transition-colors min-w-0">
          <Clipboard className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <input
            type="text"
            value={pasteInput}
            onKeyDown={markTypingActivity}
            onPaste={markTypingActivity}
            onChange={(e) => {
              markTypingActivity();
              onPasteInputChange(e.target.value);
            }}
            placeholder={
              pasteSaved
                ? isEn ? 'Saved to Bridge!' : 'Tersimpan ke Bridge!'
                : clipboardHistory[0]?.content
                  ? `${isEn ? 'Recent' : 'Terakhir'}: ${clipboardHistory[0].content.slice(0, 22)}...`
                  : isEn ? 'Paste text / drop file...' : 'Paste teks / drop file...'
            }
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none min-w-0"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSendFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={isEn ? 'Send file to another device' : 'Kirim File ke Perangkat Lain'}
          className="p-1.5 rounded-xl capsule-btn text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
      </form>
      <span className="px-1.5 py-0.5 rounded-lg bg-white/[0.05] text-[10px] font-semibold text-zinc-400 shrink-0">
        {clipboardHistory.length}
      </span>
    </div>
  );
};
