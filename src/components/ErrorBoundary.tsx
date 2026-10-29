import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Copy, Check, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
  isRestoredFromSnapshot: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
      isRestoredFromSnapshot: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    window.electronAPI?.setIgnoreMouseEvents?.(false);
    console.error('Loony Error Boundary caught an unhandled error:', error, errorInfo);
  }

  private getAppLanguage(): 'en' | 'id' {
    try {
      const raw = localStorage.getItem('productivitysys_state_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.settings?.language === 'id') return 'id';
        if (parsed?.settings?.language === 'en') return 'en';
      }
    } catch {}
    return (navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en';
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyDiagnostic = () => {
    const { error, errorInfo } = this.state;
    const diagnostic = [
      '=== LOONY DIAGNOSTIC REPORT ===',
      `Timestamp: ${new Date().toISOString()}`,
      `App Version: 2.0.0`,
      `User Agent: ${navigator.userAgent}`,
      `Error Name: ${error?.name || 'UnknownError'}`,
      `Error Message: ${error?.message || 'No message'}`,
      '\n--- STACK TRACE ---',
      error?.stack || 'No stack trace available',
      '\n--- COMPONENT STACK ---',
      errorInfo?.componentStack || 'No component stack',
    ].join('\n');

    navigator.clipboard.writeText(diagnostic).then(() => {
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  private handleRestoreSnapshot = () => {
    try {
      const snapshot = localStorage.getItem('productivitysys_snapshot_v3');
      if (snapshot) {
        localStorage.setItem('productivitysys_state_v3', snapshot);
        this.setState({ isRestoredFromSnapshot: true });
        window.setTimeout(() => window.location.reload(), 900);
      }
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isEn = this.getAppLanguage() === 'en';
    const { error, copied, showDetails, isRestoredFromSnapshot } = this.state;
    const hasSnapshot = Boolean(typeof window !== 'undefined' && localStorage.getItem('productivitysys_snapshot_v3'));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none font-marshmallow select-none text-zinc-100">
        {/* Jendela Fleksibel Normal (Bukan Fullscreen Opaque, Tidak Menutupi Layar Desktop) */}
        <div className="pointer-events-auto relative w-[360px] max-w-[92vw] p-5 rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">

          {/* Maskot Loony Statis (x_x) — Diam & Tanpa Efek Aura Kuning */}
          <div className="py-2 px-4 rounded-xl bg-white/[0.04] border border-white/5 mb-3 flex items-center justify-center">
            <span className="font-mono text-xl font-bold tracking-widest text-zinc-200">
              (x_x)
            </span>
          </div>

          {/* Keterangan Teks Langsung di Bawah Loony (Tanpa Papan) */}
          <h2 className="text-sm font-bold text-zinc-100 mb-1">
            {isEn ? 'Loony tripped for a moment' : 'Loony tersandung sedikit'}
          </h2>

          <p className="text-xs text-zinc-400 leading-relaxed mb-4 max-w-[300px]">
            {isEn
              ? 'An unexpected glitch occurred, but your data is safe and intact.'
              : 'Terjadi kendala tak terduga, tapi seluruh datamu tetap aman tersimpan.'}
          </p>

          {/* Tombol Aksi Utama */}
          <div className="w-full flex items-center justify-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Reload Loony' : 'Muat Ulang Loony'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleCopyDiagnostic}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 border-white/10 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEn ? 'Copied' : 'Tersalin'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Copy Diagnostic' : 'Salin Diagnostik'}</span>
                </>
              )}
            </button>
          </div>

          {/* Opsi Pemulihan Snapshot jika Tersedia */}
          {hasSnapshot && (
            <div className="w-full mb-2.5">
              <button
                type="button"
                onClick={this.handleRestoreSnapshot}
                disabled={isRestoredFromSnapshot}
                className="w-full py-1.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isRestoredFromSnapshot
                    ? isEn ? 'Snapshot Restored! Restarting...' : 'Snapshot Dipulihkan! Memulai ulang...'
                    : isEn ? 'Restore from Last Automatic Snapshot' : 'Pulihkan dari Snapshot Cadangan Terakhir'}
                </span>
              </button>
            </div>
          )}

          {/* Collapsible Detail Teknis */}
          <div className="w-full pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="text-[10px] text-zinc-500 hover:text-zinc-400 transition flex items-center justify-center gap-1 w-full py-1 cursor-pointer"
            >
              <span>{isEn ? 'Technical Details' : 'Rincian Teknis'}</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-2.5 rounded-xl bg-black/50 border border-white/5 text-left max-h-36 overflow-y-auto">
                <p className="text-[11px] font-mono text-rose-300 mb-1 break-all">
                  {error?.name}: {error?.message}
                </p>
                <pre className="text-[9px] font-mono text-zinc-500 whitespace-pre-wrap break-all">
                  {error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
