import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
  resolvedWindowTheme: string;
  isEn: boolean;
  cancelLabel?: string;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  resolvedWindowTheme,
  isEn,
  cancelLabel = 'Batal',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="window-glass relative w-[340px] p-5 rounded-2xl flex flex-col gap-3.5 text-zinc-100 shadow-2xl border border-white/[0.08]"
            data-theme={resolvedWindowTheme}
          >
            <div className="text-xs font-semibold text-zinc-200">
              {isEn ? 'Restore Factory Defaults?' : 'Kembalikan ke Setelan Awal?'}
            </div>
            <div className="text-[11px] text-zinc-400 leading-relaxed">
              {isEn
                ? 'All schedules, routines, ideas, finance records, and settings will be permanently wiped.'
                : 'Semua jadwal, rutinitas, catatan ide, riwayat keuangan, dan pengaturan akan dihapus bersih.'}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 cursor-pointer transition"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfirmReset();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer transition"
              >
                {isEn ? 'Wipe & Reset' : 'Hapus & Reset'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
