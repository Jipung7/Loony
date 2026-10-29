import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clipboard,
  Cloud,
  Copy,
  Download,
  FileUp,
  FolderOpen,
  Loader2,
  HandCoins,
  Lightbulb,
  MapPin,
  MessageSquare,
  Pin,
  Plus,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Trash2,
  Undo2,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HoloMascotEyes } from './HoloMascotEyes';
import { LoonyChatPanel } from './LoonyChatPanel';
import { clearSavedChatHistory } from '../services/loonyChat';
import {
  AI_PROVIDERS,
  testAiProviderConnection,
  detectProviderFromKey,
} from '../services/aiEngine';
import type { AiProviderType, AiTestResult } from '../services/aiEngine';
import { parseQuickInputLocal } from '../services/smartParser';
import { getLocalApiBase } from '../services/syncAndBridge';
import { QrCodeView } from './QrCodeView';
import { copyToClipboard } from '../utils/clipboard';
import { AppFontStyle, BridgeFileItem, IdeaTag, ThemeMode } from '../types';

type MobileToolId =
  | 'menu'
  | 'quick-capture'
  | 'bridge'
  | 'calendar'
  | 'habits'
  | 'budget'
  | 'debts'
  | 'ideas'
  | 'settings';

export const MobileCompanion: React.FC<{ onExitPreview?: () => void }> = ({ onExitPreview }) => {
  const {
    mascotMood,
    loonySignLabel,
    isPlayingMusic,
    clipboardHistory,
    bridgeFiles,
    outboxPendingCount,
    pushClipboardText,
    sendBridgeFile,
    togglePinBridgeFile,
    deleteBridgeFile,
    openBridgeFolder,
    ideas,
    togglePinIdea,
    deleteIdea,
    ideaCategories,
    addIdeaCategory,
    deleteIdeaCategory,
    schedules,
    addScheduleWithConflictCheck,
    deleteSchedule,
    habits,
    toggleHabitCompleted,
    addHabit,
    deleteHabit,
    debts,
    addDebt,
    markDebtPaid,
    deleteDebt,
    safeToSpend,
    expenses,
    addExpense,
    deleteExpense,
    updateBudgetBalance,
    budgetConfig,
    executeQuickCapture,
    lastUndo,
    triggerUndo,
    prayerSchedule,
    nextPrayer,
    weather,
    settings,
    updateSettings,
    resolvedWindowTheme,
    formatMoney,
    t,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';

  // State tampilan: 'chat' (Obrolan Loony AI) atau 'tools' (Menu Tools lengkap)
  const [mobileTab, setMobileTab] = useState<'chat' | 'tools'>('chat');
  const [activeTool, setActiveTool] = useState<MobileToolId>('menu');

  // State lokal input & form
  const [quickText, setQuickText] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [clipInput, setClipInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<AiTestResult | null>(null);

  const handleTestApiKey = async () => {
    const provider = settings.aiProvider || 'gemini';
    const cfg = AI_PROVIDERS[provider];
    const key = (settings.aiApiKey || settings.geminiApiKey || '').trim();
    if (cfg.requiresKey && !key) {
      setApiKeyTestResult({ ok: false, provider, message: 'Kunci API masih kosong' });
      return;
    }
    setIsTestingApiKey(true);
    setApiKeyTestResult(null);
    try {
      const res = await testAiProviderConnection(
        provider,
        key,
        settings.aiCustomBaseUrl,
        settings.aiModel
      );
      setApiKeyTestResult(res);
      if (res.ok && res.model) {
        updateSettings({ aiModel: res.model });
      }
    } catch (err: any) {
      setApiKeyTestResult({ ok: false, provider, message: err?.message || 'Gagal tersambung' });
    } finally {
      setIsTestingApiKey(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newSchedTitle, setNewSchedTitle] = useState('');
  const [newSchedTime, setNewSchedTime] = useState('19:00');
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitTime, setNewHabitTime] = useState('21:00');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [balanceInput, setBalanceInput] = useState(String(budgetConfig.activeBalance));
  const [showBalanceEdit, setShowBalanceEdit] = useState(false);
  const [debtPerson, setDebtPerson] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'hutang' | 'piutang'>('hutang');
  const [debtNote, setDebtNote] = useState('');
  const [ideaFilter, setIdeaFilter] = useState<IdeaTag | 'ALL'>('ALL');
  const [lanUrl, setLanUrl] = useState('http://localhost:47831');

  useEffect(() => {
    if (window.electronAPI?.getBridgeInfo) {
      window.electronAPI
        .getBridgeInfo()
        .then((info) => {
          if (info?.lanUrl) setLanUrl(info.lanUrl);
        })
        .catch(() => {});
    }
  }, []);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    const res = await executeQuickCapture(quickText);
    setQuickText('');
    setQuickFeedback(res.previewLabel);
    window.setTimeout(() => setQuickFeedback(null), 3500);
  };

  const handleCopyItem = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const handleDownloadFileToPhone = (file: BridgeFileItem) => {
    let href = file.dataUrl || file.url;
    if (!href && file.name) {
      const apiBase = getLocalApiBase();
      if (apiBase) {
        href = `${apiBase}/api/download?file=${encodeURIComponent(file.name)}&syncKey=${encodeURIComponent(settings.personalSyncKey || '')}`;
      }
    }
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = file.name || 'loony-file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const livePreview = quickText.trim() ? parseQuickInputLocal(quickText) : null;
  const isLaptopPreview = Boolean(onExitPreview);

  // Konten Utama Aplikasi: Murni Menu Tools Lengkap & Settings (Tanpa Kamera Palsu)
  const renderAppContent = () => {
    return (
      <div
        data-theme={resolvedWindowTheme}
        className="window-glass w-full h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-marshmallow"
      >
        {/* HEADER APLIKASI: Tab Pengalih Obrolan/Tools + Pengaturan */}
        <div className="px-3.5 py-2.5 bg-zinc-900/95 border-b border-white/10 flex items-center justify-between shrink-0">
          {/* Tab Pengalih: Obrolan ⇄ Menu Tools */}
          <div className="flex items-center gap-1 bg-white/[0.06] p-0.5 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setMobileTab('chat');
                setActiveTool('menu');
              }}
              className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                mobileTab === 'chat'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Obrolan</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('tools')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                mobileTab === 'tools'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span>Menu Tools</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {outboxPendingCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-zinc-800 border border-white/15 text-zinc-300">
                <WifiOff className="w-3 h-3" /> ({outboxPendingCount})
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileTab('tools');
                setActiveTool((prev) => (prev === 'settings' ? 'menu' : 'settings'));
              }}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                activeTool === 'settings'
                  ? 'bg-zinc-100 text-zinc-950 border-white font-bold'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-white/10'
              }`}
              title="Pengaturan Cloud & AI"
            >
              <Settings className="w-4 h-4" />
            </button>
            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs"
              >
                Tutup
              </button>
            )}
          </div>
        </div>

        {/* ISI HALAMAN: OBROLAN CHAT-FIRST ATAU MENU TOOLS */}
        {mobileTab === 'chat' ? (
          <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
            <LoonyChatPanel isMobile={true} onOpenTools={() => setMobileTab('tools')} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* JIKA BERADA DI MENU UTAMA */}
            {activeTool === 'menu' && (
            <div className="space-y-3">
              {/* 2 TOMBOL LEBAR UTAMA PRIORITAS DI ATAS */}
              <div className="space-y-2">
                {/* 1. KARTU CEPAT: TULIS CEPAT AI */}
                <div className="p-3.5 rounded-[20px] bg-zinc-900 border border-white/15 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                      <Sparkles className="w-4 h-4 text-zinc-200" />
                      <span>Tulis Cepat (Otak AI Loony)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTool('quick-capture')}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Buka Penuh
                    </button>
                  </div>

                  <form onSubmit={handleQuickSubmit} className="flex gap-1.5">
                    <input
                      type="text"
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      placeholder="Beli kopi 18rb, Besok rapat 14:00, atau ide cerita..."
                      className="flex-1 bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold hover:bg-white shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {livePreview && (
                    <div className="text-[10px] text-zinc-300 px-2 py-1 rounded bg-zinc-800/80">
                      Pilah: {livePreview.previewLabel} (
                      {(settings.aiApiKey || settings.geminiApiKey)?.trim()
                        ? AI_PROVIDERS[settings.aiProvider || 'gemini']?.name || 'AI'
                        : 'Smart Lokal'})
                    </div>
                  )}

                  {quickFeedback && (
                    <div className="text-[11px] text-zinc-200 px-2 py-1 rounded bg-zinc-800 border border-white/10 flex items-center justify-between">
                      <span>✓ {quickFeedback}</span>
                      {lastUndo && (
                        <button
                          type="button"
                          onClick={triggerUndo}
                          className="flex items-center gap-1 text-[10px] text-zinc-300 underline"
                        >
                          <Undo2 className="w-3 h-3" /> Batal
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. KARTU CEPAT: COPAS & FILE (LAPTOP ⇄ HP) */}
                <div className="p-3.5 rounded-[20px] bg-zinc-900 border border-white/15 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                      <Clipboard className="w-4 h-4 text-zinc-200" />
                      <span>Copas & File (Laptop ⇄ HP)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTool('bridge')}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Kelola ({clipboardHistory.length + bridgeFiles.length} item)
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={clipInput}
                      onChange={(e) => setClipInput(e.target.value)}
                      placeholder="Kirim copas / link ke Laptop..."
                      className="flex-1 bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!clipInput.trim()) return;
                        pushClipboardText(clipInput);
                        setClipInput('');
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Kirim
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 shrink-0 cursor-pointer"
                      title="Kirim File/Foto ke Laptop"
                    >
                      <FileUp className="w-4 h-4" />
                    </button>
                  </div>

                  {clipboardHistory.length > 0 && (
                    <div className="text-[11px] text-zinc-300 p-2 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between gap-2">
                      <span className="truncate pr-1 select-text font-mono flex-1">{clipboardHistory[0].content}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyItem(clipboardHistory[0].id, clipboardHistory[0].content)
                        }
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[10px] font-semibold text-zinc-200 shrink-0 cursor-pointer active:scale-95 transition flex items-center gap-1"
                      >
                        {copiedId === clipboardHistory[0].id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Disalin
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Salin
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* GRID MENU TOOLS LENGKAP LAINNYA */}
              <div className="pt-1">
                <div className="text-[11px] font-bold text-zinc-400 mb-2">PILIHAN TOOLS</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTool('calendar')}
                    className="p-3 rounded-[18px] bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-left transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-100">Jadwal & Shalat</div>
                    <div className="text-[10px] text-zinc-400">
                      {schedules.length} agenda • {weather.tempC}°C
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('habits')}
                    className="p-3 rounded-[18px] bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-left transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-100">To-Do & Rutinitas</div>
                    <div className="text-[10px] text-zinc-400">
                      {habits.filter((h) => !h.completedToday).length} belum selesai
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('budget')}
                    className="p-3 rounded-[18px] bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-left transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-100">
                      {isEn ? 'Daily Budget' : 'Jatah Harian'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {isEn
                        ? `Left: ${formatMoney(Math.round(safeToSpend.remainingSafeToday))}`
                        : `Sisa ${formatMoney(Math.round(safeToSpend.remainingSafeToday))}`}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('debts')}
                    className="p-3 rounded-[18px] bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-left transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                      <HandCoins className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-100">Pinjaman / Hutang</div>
                    <div className="text-[10px] text-zinc-400">
                      {debts.filter((d) => !d.isPaid).length} aktif dicatat
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('ideas')}
                    className="p-3 rounded-[18px] bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-left transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-100">Gudang Ide</div>
                    <div className="text-[10px] text-zinc-400">{ideas.length} ide tersimpan</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('settings')}
                    className="p-3 rounded-[18px] bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-left transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 mb-2">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-zinc-100">Pengaturan</div>
                    <div className="text-[10px] text-zinc-400">Cloud Mailbox & Otak AI</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* JIKA MEMBUKA SALAH SATU TOOL / PENGATURAN SPESIFIK */}
          {activeTool !== 'menu' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveTool('menu')}
                className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center gap-1.5 cursor-pointer"
              >
                ← Kembali ke Menu Tools
              </button>

              {/* 1. DETAIL: TULIS CEPAT */}
              {activeTool === 'quick-capture' && (
                <div className="space-y-3">
                  <form onSubmit={handleQuickSubmit} className="space-y-2">
                    <textarea
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      rows={4}
                      placeholder="Ketik bebas apa pun: 'Beli makan malam 28rb', 'Besok rapat jam 10:00', 'Rizky pinjam 50rb', atau ide cerita..."
                      className="w-full rounded-[16px] bg-zinc-900 border border-white/15 px-3.5 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30"
                    />
                    {livePreview && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-[11px] text-zinc-300">
                        <span>Pilah Otomatis: {livePreview.previewLabel}</span>
                        <span className="text-[10px] text-zinc-400">
                          {(settings.aiApiKey || settings.geminiApiKey)?.trim()
                            ? AI_PROVIDERS[settings.aiProvider || 'gemini']?.name || 'AI'
                            : 'Smart Lokal'}
                        </span>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-[16px] bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Kirim & Simpan
                    </button>
                  </form>
                </div>
              )}

              {/* 2. DETAIL: COPAS & FILE */}
              {activeTool === 'bridge' && (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={clipInput}
                      onChange={(e) => setClipInput(e.target.value)}
                      placeholder="Kirim copas / link ke Laptop..."
                      className="flex-1 rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!clipInput.trim()) return;
                        pushClipboardText(clipInput);
                        setClipInput('');
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      Kirim
                    </button>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-3 rounded-[16px] bg-zinc-900 hover:bg-zinc-800 border border-dashed border-white/20 text-xs text-zinc-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>Kirim File / Foto ke Laptop</span>
                    </button>
                  </div>

                  {bridgeFiles.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-zinc-400">
                        File Transit ({bridgeFiles.length})
                      </div>
                      {bridgeFiles.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/10"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="text-xs font-semibold text-zinc-100 truncate">
                              {f.name}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Dari {f.deviceSource} • {(f.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {(f.dataUrl || f.url || f.name) && (
                              <button
                                type="button"
                                onClick={() => handleDownloadFileToPhone(f)}
                                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 cursor-pointer"
                                title="Unduh ke HP"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => togglePinBridgeFile(f.id)}
                              className={`p-1.5 rounded-lg border cursor-pointer ${
                                f.pinned
                                  ? 'bg-zinc-200 text-zinc-950 border-white'
                                  : 'bg-zinc-800 text-zinc-400 border-white/10'
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBridgeFile(f.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-zinc-400">
                      Riwayat Copas ({clipboardHistory.length})
                    </div>
                    {clipboardHistory.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-900 border border-white/10"
                      >
                        <div className="min-w-0 flex-1 select-text">
                          <div className="text-xs text-zinc-100 break-words select-text font-mono">{item.content}</div>
                          <div className="text-[10px] text-zinc-400">{item.deviceSource}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyItem(item.id, item.content)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-100 text-[11px] flex items-center gap-1 border border-white/10 shrink-0 cursor-pointer active:scale-95 transition"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Disalin
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Salin
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. DETAIL: JADWAL & SHALAT */}
              {activeTool === 'calendar' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-[16px] bg-zinc-900 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">{prayerSchedule.locationLabel}</div>
                      <div className="text-xs font-bold text-zinc-100">
                        Shalat Berikutnya: {nextPrayer.name} ({nextPrayer.time})
                      </div>
                      <div className="text-[10px] text-zinc-400">{nextPrayer.countdownText}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-zinc-100">
                        {weather.icon} {weather.tempC}°C
                      </div>
                      <div className="text-[10px] text-zinc-400">{weather.conditionText}</div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newSchedTitle}
                      onChange={(e) => setNewSchedTitle(e.target.value)}
                      placeholder="Agenda baru..."
                      className="flex-1 rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                    <input
                      type="time"
                      value={newSchedTime}
                      onChange={(e) => setNewSchedTime(e.target.value)}
                      className="rounded-xl bg-zinc-900 border border-white/15 px-2 py-2 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSchedTitle.trim()) return;
                        const [h, m] = newSchedTime.split(':').map(Number);
                        const endH = String(Math.min(23, (h || 0) + 1)).padStart(2, '0');
                        addScheduleWithConflictCheck({
                          title: newSchedTitle.trim(),
                          date: new Date().toISOString().split('T')[0],
                          startTime: newSchedTime,
                          endTime: `${endH}:${String(m || 0).padStart(2, '0')}`,
                        });
                        setNewSchedTitle('');
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {schedules.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/10"
                      >
                        <div>
                          <div className="text-xs font-semibold text-zinc-100">{s.title}</div>
                          <div className="text-[10px] text-zinc-400">
                            {s.date} • {s.startTime} - {s.endTime}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSchedule(s.id)}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. DETAIL: TO-DO & RUTINITAS */}
              {activeTool === 'habits' && (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newHabitTitle}
                      onChange={(e) => setNewHabitTitle(e.target.value)}
                      placeholder="Rutinitas baru..."
                      className="flex-1 rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                    <input
                      type="time"
                      value={newHabitTime}
                      onChange={(e) => setNewHabitTime(e.target.value)}
                      className="rounded-xl bg-zinc-900 border border-white/15 px-2 py-2 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newHabitTitle.trim()) return;
                        addHabit(newHabitTitle.trim(), '✨', newHabitTime);
                        setNewHabitTitle('');
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {habits.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/10"
                      >
                        <button
                          type="button"
                          onClick={() => toggleHabitCompleted(h.id)}
                          className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              h.completedToday
                                ? 'bg-zinc-100 border-white text-zinc-950'
                                : 'border-zinc-500'
                            }`}
                          >
                            {h.completedToday && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <div
                              className={`text-xs font-semibold ${
                                h.completedToday ? 'line-through text-zinc-500' : 'text-zinc-100'
                              }`}
                            >
                              {h.title}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Batas {h.deadlineTime} • Streak {h.streak} hari
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHabit(h.id)}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. DETAIL: JATAH HARIAN */}
              {activeTool === 'budget' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-[16px] bg-zinc-900 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        {isEn ? 'Daily Safe-to-Spend' : 'Sisa Aman Hari Ini'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBalanceEdit((p) => !p)}
                        className="text-[10px] text-zinc-300 underline cursor-pointer"
                      >
                        {isEn ? 'Edit Balance' : 'Ubah Saldo'}
                      </button>
                    </div>
                    <div className="text-lg font-bold text-zinc-100 mt-0.5">
                      {formatMoney(safeToSpend.remainingSafeToday)}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      {isEn ? 'Spent today' : 'Terpakai hari ini'}: {formatMoney(safeToSpend.spentToday)}{' '}
                      {isEn ? 'of' : 'dari'} {formatMoney(safeToSpend.baseDailyAllowance)}
                    </div>

                    {showBalanceEdit && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex gap-1.5">
                        <input
                          type="number"
                          value={balanceInput}
                          onChange={(e) => setBalanceInput(e.target.value)}
                          className="flex-1 rounded-lg bg-zinc-950 border border-white/15 px-2 py-1 text-xs text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            updateBudgetBalance(Number(balanceInput) || 0);
                            setShowBalanceEdit(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-bold cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      placeholder="Pengeluaran..."
                      className="flex-1 rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                    <input
                      type="number"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="Rp"
                      className="w-24 rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amt = Number(expAmount);
                        if (!expTitle.trim() || !amt) return;
                        addExpense(amt, expTitle.trim());
                        setExpTitle('');
                        setExpAmount('');
                      }}
                      className="px-2.5 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {expenses.slice(0, 10).map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-white/10 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-zinc-100">{e.title}</div>
                          <div className="text-[10px] text-zinc-400">
                            {formatMoney(e.amount)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteExpense(e.id)}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. DETAIL: PINJAMAN / HUTANG */}
              {activeTool === 'debts' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={debtPerson}
                      onChange={(e) => setDebtPerson(e.target.value)}
                      placeholder="Nama orang..."
                      className="rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                    <input
                      type="number"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                      placeholder="Nominal Rp"
                      className="rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={debtType}
                      onChange={(e) => setDebtType(e.target.value as 'hutang' | 'piutang')}
                      className="rounded-xl bg-zinc-900 border border-white/15 px-2 py-2 text-xs text-zinc-100"
                    >
                      <option value="hutang">Hutang Kita</option>
                      <option value="piutang">Piutang Teman</option>
                    </select>
                    <input
                      type="text"
                      value={debtNote}
                      onChange={(e) => setDebtNote(e.target.value)}
                      placeholder="Catatan..."
                      className="flex-1 rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amt = Number(debtAmount);
                        if (!debtPerson.trim() || !amt) return;
                        addDebt(debtPerson.trim(), amt, debtType, debtNote.trim() || 'Pinjaman');
                        setDebtPerson('');
                        setDebtAmount('');
                        setDebtNote('');
                      }}
                      className="px-2.5 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {debts.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/10"
                      >
                        <div>
                          <div className="text-xs font-semibold text-zinc-100">
                            {d.person} • {formatMoney(d.amount)}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {d.type === 'hutang'
                              ? isEn ? 'I Owe' : 'Hutang Kita'
                              : isEn ? 'Owed to Me' : 'Piutang Teman'}{' '}
                            — {d.note}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!d.isPaid && (
                            <button
                              type="button"
                              onClick={() => markDebtPaid(d.id)}
                              className="px-2 py-1 rounded-lg bg-zinc-200 text-zinc-950 text-[10px] font-bold cursor-pointer"
                            >
                              Lunas
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteDebt(d.id)}
                            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. DETAIL: GUDANG IDE */}
              {activeTool === 'ideas' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {(['ALL', ...ideaCategories] as const).map((t) => (
                      <div key={t} className="inline-flex items-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setIdeaFilter(t)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border shrink-0 cursor-pointer ${
                            ideaFilter === t
                              ? 'bg-zinc-100 text-zinc-950 border-white'
                              : 'bg-zinc-900 text-zinc-400 border-white/10'
                          }`}
                        >
                          {t === 'ALL' ? 'Semua' : t}
                        </button>
                        {t !== 'ALL' && ideaCategories.length > 1 && ideaFilter === t && (
                          <button
                            type="button"
                            onClick={() => {
                              deleteIdeaCategory(t);
                              setIdeaFilter('ALL');
                            }}
                            className="ml-0.5 p-1 text-zinc-400 hover:text-rose-400 cursor-pointer"
                            title={`Hapus ${t}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    {ideas
                      .filter((i) => ideaFilter === 'ALL' || i.tag === ideaFilter)
                      .map((idea) => (
                        <div
                          key={idea.id}
                          className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {idea.tag}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePinIdea(idea.id)}
                                className={`p-1 rounded cursor-pointer ${
                                  idea.pinned ? 'text-white' : 'text-zinc-500'
                                }`}
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteIdea(idea.id)}
                                className="p-1 text-zinc-500 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-100">{idea.content}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 8. DETAIL: PENGATURAN LENGKAP MOBILE */}
              {activeTool === 'settings' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between font-bold text-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-violet-400" />
                        <span>Kode Pasangan Perangkat (Laptop ⇄ HP)</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-normal">Relay Otomatis</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Cukup samakan kode pendek ini dengan yang tampil di Pengaturan Laptop. Teks, link, dan file kecil langsung terhubung otomatis tanpa perlu akun Cloud.
                    </p>
                    <input
                      type="text"
                      value={settings.personalSyncKey}
                      onChange={(e) => updateSettings({ personalSyncKey: e.target.value.toUpperCase() })}
                      placeholder="LOONY-8492"
                      className="w-full rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-zinc-100 font-mono font-semibold"
                    />
                  </div>

                  {/* Tema Tampilan, Gaya Huruf & Fitur Waktu Shalat */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-3">
                    <div className="space-y-1.5">
                      <div className="font-bold text-zinc-100">Tema Tampilan</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'dark', label: 'Gelap' },
                            { id: 'light', label: 'Terang' },
                            { id: 'system', label: 'Ikuti Sistem' },
                          ] as Array<{ id: ThemeMode; label: string }>
                        ).map((tOpt) => (
                          <button
                            key={tOpt.id}
                            type="button"
                            onClick={() => updateSettings({ windowTheme: tOpt.id })}
                            className={`py-1.5 rounded-lg text-[11px] cursor-pointer ${
                              (settings.windowTheme || 'dark') === tOpt.id
                                ? 'bg-zinc-100 text-zinc-950 font-bold'
                                : 'bg-zinc-950 text-zinc-400'
                            }`}
                          >
                            {tOpt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <div className="font-bold text-zinc-100">Gaya Huruf (Tipografi)</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'rounded', label: 'Loony Bulat' },
                            { id: 'normal', label: 'Normal' },
                            { id: 'system', label: 'Sistem OS' },
                          ] as Array<{ id: AppFontStyle; label: string }>
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => updateSettings({ fontStyle: f.id })}
                            className={`py-1.5 rounded-lg text-[11px] cursor-pointer ${
                              (settings.fontStyle || 'rounded') === f.id
                                ? 'bg-zinc-100 text-zinc-950 font-bold'
                                : 'bg-zinc-950 text-zinc-400'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-zinc-100">Fitur Jadwal Waktu Shalat</div>
                        <div className="text-[10px] text-zinc-400">
                          Matikan jika hanya ingin menampilkan info cuaca
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({
                            prayerFeatureEnabled: settings.prayerFeatureEnabled === false,
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          settings.prayerFeatureEnabled !== false
                            ? 'bg-zinc-100 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {settings.prayerFeatureEnabled !== false ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-zinc-100">Riwayat Obrolan Loony</div>
                        <div className="text-[10px] text-zinc-400">
                          Bersihkan percakapan di perangkat ini
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => clearSavedChatHistory(settings.userNickname)}
                        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-200 hover:text-rose-300 text-[11px] font-semibold cursor-pointer"
                      >
                        Hapus Riwayat
                      </button>
                    </div>
                  </div>

                  {/* =========================================================
                      OTAK AI LOONY (UNIVERSAL AI BRAIN) - MOBILE
                     ========================================================= */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-100 text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Penyedia Otak AI Loony</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {AI_PROVIDERS[settings.aiProvider || 'gemini']?.name}
                      </span>
                    </div>

                    {/* Selector Provider Pills */}
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          { id: 'gemini', label: 'Gemini' },
                          { id: 'groq', label: 'Groq (Cepat)' },
                          { id: 'openrouter', label: 'OpenRouter' },
                          { id: 'deepseek', label: 'DeepSeek' },
                          { id: 'openai', label: 'OpenAI' },
                          { id: 'ollama', label: 'Ollama' },
                        ] as Array<{ id: AiProviderType; label: string }>
                      ).map((p) => {
                        const isSel = (settings.aiProvider || 'gemini') === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              updateSettings({ aiProvider: p.id });
                              setApiKeyTestResult(null);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                              isSel
                                ? 'bg-zinc-100 text-zinc-950 font-bold'
                                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {AI_PROVIDERS[settings.aiProvider || 'gemini']?.description}
                    </p>

                    {(() => {
                      const curProv = settings.aiProvider || 'gemini';
                      const curCfg = AI_PROVIDERS[curProv] || AI_PROVIDERS.gemini;
                      const isOllama = curProv === 'ollama';
                      const effKey = settings.aiApiKey || settings.geminiApiKey || '';

                      return (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            {!isOllama && (
                              <input
                                type="password"
                                value={effKey}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const detected = detectProviderFromKey(val);
                                  updateSettings({
                                    aiApiKey: val,
                                    geminiApiKey: val,
                                    ...(detected && detected !== curProv ? { aiProvider: detected } : {}),
                                  });
                                  setApiKeyTestResult(null);
                                }}
                                placeholder={curCfg.keyPlaceholder}
                                className="flex-1 rounded-xl bg-zinc-950 border border-white/15 px-3 py-2 text-xs text-zinc-100 font-mono"
                              />
                            )}
                            <button
                              type="button"
                              disabled={isTestingApiKey || (curCfg.requiresKey && !effKey.trim())}
                              onClick={handleTestApiKey}
                              className={`px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-200 cursor-pointer flex items-center gap-1 ${
                                isOllama ? 'w-full justify-center' : ''
                              }`}
                            >
                              {isTestingApiKey ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                                  <span>Menguji...</span>
                                </>
                              ) : (
                                <span>{isOllama ? 'Uji Koneksi Ollama' : 'Tes'}</span>
                              )}
                            </button>
                          </div>

                          {apiKeyTestResult && (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] ${
                                apiKeyTestResult.ok
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                              }`}
                            >
                              {apiKeyTestResult.ok ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                              )}
                              <span>{apiKeyTestResult.message}</span>
                            </div>
                          )}

                          {curCfg.helpUrl && (
                            <div className="pt-0.5">
                              <a
                                href={curCfg.helpUrl}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (window.electronAPI?.openExternal) {
                                    window.electronAPI.openExternal(curCfg.helpUrl);
                                  } else {
                                    window.open(curCfg.helpUrl, '_blank');
                                  }
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                              >
                                Dapatkan Kunci API di {curCfg.helpLabel}
                              </a>
                            </div>
                          )}

                          {curCfg.requiresKey && (
                            <p className="text-[9.5px] text-zinc-500 italic leading-relaxed pt-1">
                              💡 Kunci rahasia API biasanya hanya ditampilkan sekali saat dibuat di website penyedia. Jika lupa atau hilang, buat kunci baru lalu salin ke sini.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sensor Notifikasi HP (WhatsApp, Telegram, dll.) */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-100">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span>Sensor Notifikasi HP (WhatsApp dll.)</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Aktifkan agar Loony di samping kamera otomatis bereaksi memegang papan "WA" atau "!" saat ada pesan masuk.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.AndroidBridge?.openNotificationSettings) {
                          window.AndroidBridge.openNotificationSettings();
                        } else {
                          alert('Buka Pengaturan Android -> Notifikasi -> Akses Notifikasi -> Izinkan Loony Hub');
                        }
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Buka Izin Akses Notifikasi Android</span>
                    </button>
                  </div>

                  {/* Akses Lokasi GPS & Jadwal Shalat HP */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between font-bold text-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-sky-400" />
                        <span>Lokasi & Jadwal Shalat HP</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {prayerSchedule?.locationLabel || 'Mendeteksi...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.AndroidBridge?.requestLocationPermission) {
                          window.AndroidBridge.requestLocationPermission();
                        }
                        window.location.reload();
                      }}
                      className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Perbarui Lokasi GPS Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {/* Input file tersembunyi global agar bisa dipicu dari Menu depan maupun halaman Bridge */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              sendBridgeFile(f);
              e.target.value = '';
            }
          }}
        />
      </div>
    );
  };

  // Jika sedang di-preview di laptop, bungkus di dalam Frame Simulator Mobile Companion
  if (isLaptopPreview) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center gap-6 overflow-hidden select-none pointer-events-auto"
        style={{
          background: 'rgba(5, 5, 8, 0.72)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* PANEL SAMPING SIMULATOR LAPTOP */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="hidden md:flex flex-col gap-3 w-72 p-4 rounded-[24px] bg-zinc-950/95 border border-white/15 text-zinc-100 shadow-2xl font-marshmallow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-100">Simulator Mobile Companion</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10">
              Layar 20:9
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Di HP, saat aplikasi dibuka, ia langsung menampilkan <strong className="text-zinc-200">Menu Tools & Setting</strong> tanpa kamera tiruan. Sedangkan saat diminimalkan, mata Loony melayang di samping kamera.
          </p>

          <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2">
            <div className="text-[11px] font-semibold text-zinc-200">
              Coba Langsung di Smartphone:
            </div>
            <div className="flex items-center justify-center p-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-fit mx-auto">
              <QrCodeView data={lanUrl} size={120} />
            </div>
            <div className="text-[10px] text-zinc-400 text-center">
              Scan QR di atas dengan HP untuk membuka langsung:
            </div>
            <button
              type="button"
              onClick={() => handleCopyItem('lan-preview', lanUrl)}
              className="w-full py-1.5 px-2 rounded-lg bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-200 hover:border-white/25 cursor-pointer"
            >
              {copiedId === 'lan-preview' ? '✓ Link Tersalin!' : lanUrl}
            </button>
          </div>

          <button
            type="button"
            onClick={onExitPreview}
            className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 cursor-pointer"
          >
            ← Kembali ke Mode Kapsul Laptop
          </button>
        </div>

        {/* BINGKAI SIMULATOR MOBILE DI LAPTOP */}
        <div className="relative w-[376px] h-[756px] max-h-[93vh] rounded-[42px] border-[5px] border-zinc-800/95 shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden">
          {renderAppContent()}
        </div>
      </div>
    );
  }

  // Tampilan asli di Smartphone (Penuh Layar Bersih & Nyaman)
  return <div className="fixed inset-0 z-50">{renderAppContent()}</div>;
};
