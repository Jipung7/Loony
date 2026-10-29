import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy } from 'lucide-react';
import { QrCodeView } from '../../QrCodeView';

export interface QrPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingLink: string;
  personalSyncKey?: string;
  resolvedWindowTheme: string;
  isEn: boolean;
  copiedId: string | null;
  onCopyText: (id: string, text: string) => void;
  closeLabel?: string;
  copiedLabel?: string;
}

export const QrPairingModal: React.FC<QrPairingModalProps> = ({
  isOpen,
  onClose,
  pairingLink,
  personalSyncKey,
  resolvedWindowTheme,
  isEn,
  copiedId,
  onCopyText,
  closeLabel = 'Tutup',
  copiedLabel = 'Disalin',
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
            className="window-glass relative w-[340px] p-5 rounded-2xl flex flex-col items-center gap-3.5 text-zinc-100 shadow-2xl border border-white/[0.08]"
            data-theme={resolvedWindowTheme}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title={closeLabel}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center gap-1 text-center">
              <div className="font-mono text-cyan-400 text-sm font-semibold tracking-wider flex items-center gap-1.5">
                <span>[■━■]</span>
                <span className="text-zinc-200 font-sans text-xs font-semibold">
                  {isEn ? 'Connect Smartphone' : 'Hubungkan Smartphone'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                {isEn
                  ? 'Scan QR with phone. Ensure Phone & PC are on the same Wi-Fi or Hotspot.'
                  : 'Scan QR dengan HP. Pastikan HP & Laptop di jaringan Wi-Fi atau Hotspot yang sama.'}
              </div>
            </div>

            {/* QR Container */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner flex flex-col items-center gap-2">
              <QrCodeView data={pairingLink} size={185} />
              {personalSyncKey && (
                <div className="text-[10px] text-zinc-500 font-mono tracking-wide">
                  PIN: <span className="text-zinc-300 font-semibold">{personalSyncKey}</span>
                </div>
              )}
            </div>

            {/* Link Copy Bar */}
            <div className="w-full flex items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex-1 min-w-0 px-1 text-[11px] font-mono text-zinc-400 truncate">
                {pairingLink}
              </div>
              <button
                type="button"
                onClick={() => onCopyText('modal-pairing-link', pairingLink)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-[10px] font-medium shrink-0 transition cursor-pointer flex items-center gap-1"
              >
                {copiedId === 'modal-pairing-link' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{copiedLabel}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{isEn ? 'Copy' : 'Salin'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
