import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Volume2,
  Clock,
  Smartphone,
  ArrowLeft,
  Monitor,
  Sparkles,
  Trash2,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  QrCode,
  Eye,
  EyeOff,
  Loader2,
  Download,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { SettingRow } from '../SettingRow';
import { ToggleSwitch } from '../ToggleSwitch';
import { useApp } from '../../../context/AppContext';
import { soundEngine } from '../../../services/soundEngine';
import { mapWeatherCode } from '../../../services/prayerAndWeather';
import {
  AI_PROVIDERS,
  detectProviderFromKey,
  testAiProviderConnection,
  type AiProviderType,
  type AiTestResult,
} from '../../../services/aiEngine';
import {
  CURRENT_APP_VERSION,
  GITHUB_RELEASES_PAGE,
  type UpdateInfo,
} from '../../../services/updateChecker';
import {
  clearSavedChatHistory,
  loadSavedChatHistory,
} from '../../../services/loonyChat';
import {
  AdzanAlertMode,
  AppFontStyle,
  DisplayInfo,
  DockPosition,
  FullscreenBehavior,
  MonitorTargetMode,
  ThemeMode,
  WindowDisplayMode,
} from '../../../types';

export type SettingsSectionId =
  | 'appearance'
  | 'character'
  | 'prayer-finance'
  | 'bridge-system';

export interface SettingsTabProps {
  isFullScreen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isCheckingUpdate: boolean;
  onCheckUpdate: () => void;
  onOpenQrModal: () => void;
  onOpenResetConfirmModal: () => void;
}

/**
 * Tab Pengaturan Profesional
 * Sidebar navigasi di kiri + baris pengaturan horizontal terstruktur di kanan
 */
export const SettingsTab: React.FC<SettingsTabProps> = ({
  isFullScreen,
  onClose,
  updateInfo,
  isCheckingUpdate,
  onCheckUpdate,
  onOpenQrModal,
  onOpenResetConfirmModal,
}) => {
  const {
    settings,
    updateSettings,
    dockPosition,
    setDockPosition,
    resetIslandOffset,
    availableDisplays,
    prayerSchedule,
    weather,
    refreshLocationAndPrayer,
    budgetConfig,
    updateBudgetBalance,
    triggerTestAdzan,
    exportBackupData,
    importBackupData,
    t,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';

  const [settingsSection, setSettingsSection] =
    useState<SettingsSectionId>('appearance');

  // AI Brain Settings State
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<AiTestResult | null>(
    null
  );

  // Chat History Feedback State
  const [savedChatCount, setSavedChatCount] = useState<number>(0);
  const [chatClearedFeedback, setChatClearedFeedback] = useState(false);

  // Weather / Location Refresh Feedback
  const [locationRefreshing, setLocationRefreshing] = useState(false);

  // Cycle Day Picker Popover State
  const [showCycleDayPicker, setShowCycleDayPicker] = useState(false);
  const cycleDayPickerRef = useRef<HTMLDivElement | null>(null);

  // Copy PIN Feedback
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);

  // Advanced Supabase Toggle
  const [showAdvancedCloud, setShowAdvancedCloud] = useState(false);

  // Windows Auto-start State
  const [autoStartActive, setAutoStartActive] = useState(false);

  // Backup file input ref & status
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupStatusMsg, setBackupStatusMsg] = useState<string | null>(null);

  // Load chat count on mount
  useEffect(() => {
    try {
      const history = loadSavedChatHistory();
      setSavedChatCount(history.length);
    } catch {
      setSavedChatCount(0);
    }
  }, []);

  // Check auto-start status from Electron
  useEffect(() => {
    if (window.electronAPI?.getAutoStart) {
      window.electronAPI
        .getAutoStart()
        .then((res) => {
          setAutoStartActive(Boolean(res));
        })
        .catch(() => {});
    }
  }, []);

  // Close cycle day picker on outside click / scroll outside
  useEffect(() => {
    if (!showCycleDayPicker) return;

    const handleClose = (e: MouseEvent | TouchEvent) => {
      if (
        cycleDayPickerRef.current &&
        !cycleDayPickerRef.current.contains(e.target as Node)
      ) {
        setShowCycleDayPicker(false);
      }
    };
    const handleScroll = (e: Event) => {
      if (
        cycleDayPickerRef.current &&
        cycleDayPickerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setShowCycleDayPicker(false);
    };

    window.addEventListener('mousedown', handleClose);
    window.addEventListener('touchstart', handleClose);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleClose);
      window.removeEventListener('touchstart', handleClose);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showCycleDayPicker]);

  // Handlers
  const handleToggleAutoStart = async () => {
    if (!window.electronAPI?.setAutoStart) return;
    const next = !autoStartActive;
    const ok = await window.electronAPI.setAutoStart(next);
    if (ok) {
      setAutoStartActive(next);
    }
  };

  const handleClearChatHistory = () => {
    clearSavedChatHistory();
    setSavedChatCount(0);
    setChatClearedFeedback(true);
    window.setTimeout(() => setChatClearedFeedback(false), 2500);
  };

  const handleRefreshLocation = async () => {
    setLocationRefreshing(true);
    try {
      await refreshLocationAndPrayer();
    } finally {
      window.setTimeout(() => setLocationRefreshing(false), 500);
    }
  };

  const handleGenerateSimpleSyncCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    updateSettings({ personalSyncKey: `LOONY-${randomNum}` });
  };

  const handleCopySyncPin = () => {
    navigator.clipboard?.writeText(settings.personalSyncKey);
    setCopiedSyncCode(true);
    window.setTimeout(() => setCopiedSyncCode(false), 2000);
  };

  const handleTestApiKey = async () => {
    const provider = (settings.aiProvider as AiProviderType) || 'gemini';
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

  const handleExportBackupFile = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateKey = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `loony-backup-${dateKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const ok = importBackupData(content);
      setBackupStatusMsg(
        ok
          ? isEn
            ? 'Backup imported successfully!'
            : 'Data berhasil dipulihkan!'
          : isEn
            ? 'Invalid file format'
            : 'Format file tidak valid'
      );
      window.setTimeout(() => setBackupStatusMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenReleaseUrl = (url?: string) => {
    const target = url || GITHUB_RELEASES_PAGE;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(target);
    } else {
      window.open(target, '_blank');
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full flex overflow-hidden">
      {/* SIDEBAR NAVIGASI PENGATURAN (KIRI) */}
      <div
        className={`h-full shrink-0 border-r border-white/[0.04] bg-[#0a0a10]/50 flex flex-col justify-between p-4 ${
          isFullScreen ? 'w-[265px]' : 'w-[205px]'
        }`}
      >
        <div className="space-y-1">
          <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {isEn ? 'PREFERENCES' : 'PREFERENSI'}
          </div>

          {(
            [
              {
                id: 'appearance',
                label: t.settings.navAppearance,
                icon: <Sliders className="w-3.5 h-3.5 text-sky-400/90" />,
              },
              {
                id: 'character',
                label: t.settings.navCharacter,
                icon: <Volume2 className="w-3.5 h-3.5 text-amber-400/90" />,
              },
              {
                id: 'prayer-finance',
                label: isEn ? 'Time & Cycle' : 'Waktu & Siklus',
                icon: <Clock className="w-3.5 h-3.5 text-emerald-400/90" />,
              },
              {
                id: 'bridge-system',
                label: t.settings.navConnection,
                icon: (
                  <div className="relative">
                    <Smartphone className="w-3.5 h-3.5 text-violet-400/90" />
                    {updateInfo?.status === 'update-available' && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-[#0a0a10] animate-pulse" />
                    )}
                  </div>
                ),
              },
            ] as Array<{ id: SettingsSectionId; label: string; icon: React.ReactNode }>
          ).map((item) => {
            const active = settingsSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSettingsSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                  active
                    ? 'bg-white/[0.07] text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={onClose}
            title={t.common.back}
            aria-label={t.common.back}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KONTEN PENGATURAN (KANAN) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-5">
        <div className={isFullScreen ? 'max-w-3xl' : 'max-w-2xl'}>
          {/* =========================================================
              BAGIAN 1: TAMPILAN & KAPSUL
             ========================================================= */}
          {settingsSection === 'appearance' && (
            <div className="divide-y divide-white/[0.04]">
              {/* Bahasa Aplikasi */}
              <SettingRow
                title={t.settings.language}
                description={t.settings.languageDesc}
              >
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {(
                    [
                      { id: 'en', flag: '🇺🇸', label: 'English (US)' },
                      { id: 'id', flag: '🇮🇩', label: 'Indonesia' },
                    ] as const
                  ).map((langOpt) => {
                    const active = (settings.language || 'en') === langOpt.id;
                    return (
                      <button
                        key={langOpt.id}
                        type="button"
                        onClick={() =>
                          updateSettings({
                            language: langOpt.id,
                            currencySymbol: langOpt.id === 'id' ? 'Rp' : '$',
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>{langOpt.flag}</span>
                        <span>{langOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Tema Jendela Ruang Kerja */}
              <SettingRow title={t.settings.windowTheme}>
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {(
                    [
                      { id: 'dark', label: t.settings.themeDark },
                      { id: 'light', label: t.settings.themeLight },
                      { id: 'system', label: t.settings.themeSystem },
                    ] as Array<{ id: ThemeMode; label: string }>
                  ).map((opt) => {
                    const active = (settings.windowTheme || 'dark') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSettings({ windowTheme: opt.id })}
                        className={`px-3 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Tema Kapsul Kecil */}
              <SettingRow title={t.settings.capsuleTheme}>
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {(
                    [
                      { id: 'dark', label: t.settings.themeDark },
                      { id: 'light', label: t.settings.themeLight },
                      { id: 'system', label: t.settings.themeSystem },
                    ] as Array<{ id: ThemeMode; label: string }>
                  ).map((opt) => {
                    const active = (settings.capsuleTheme || 'dark') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSettings({ capsuleTheme: opt.id })}
                        className={`px-3 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Mode Tampilan Jendela: Mengambang vs Layar Penuh */}
              <SettingRow title={t.settings.windowDisplayMode}>
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {(
                    [
                      { id: 'floating', label: t.settings.modeFloating },
                      { id: 'fullscreen', label: t.settings.modeFullscreen },
                    ] as Array<{ id: WindowDisplayMode; label: string }>
                  ).map((opt) => {
                    const active = (settings.windowDisplayMode || 'floating') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSettings({ windowDisplayMode: opt.id })}
                        className={`px-3 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Gaya Tipografi / Font */}
              <SettingRow title={t.settings.fontStyle}>
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {(
                    [
                      { id: 'rounded', label: t.settings.fontRounded },
                      { id: 'normal', label: t.settings.fontNormal },
                      { id: 'system', label: t.settings.fontSystem },
                    ] as Array<{ id: AppFontStyle; label: string }>
                  ).map((fontOpt) => {
                    const active = (settings.fontStyle || 'normal') === fontOpt.id;
                    return (
                      <button
                        key={fontOpt.id}
                        type="button"
                        onClick={() => updateSettings({ fontStyle: fontOpt.id })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {fontOpt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Skala Ukuran Kapsul */}
              <SettingRow title={t.settings.capsuleScale}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    value={settings.capsuleScale || 1}
                    onChange={(e) =>
                      updateSettings({ capsuleScale: parseFloat(e.target.value) })
                    }
                    className="w-28 accent-zinc-200 cursor-pointer"
                  />
                  <span className="w-10 text-right text-xs font-semibold text-zinc-200 tabular-nums">
                    {Math.round((settings.capsuleScale || 1) * 100)}%
                  </span>
                  {Math.abs((settings.capsuleScale || 1) - 1) > 0.02 && (
                    <button
                      type="button"
                      onClick={() => updateSettings({ capsuleScale: 1 })}
                      className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-[10px] text-zinc-300 cursor-pointer"
                    >
                      {t.common.reset}
                    </button>
                  )}
                </div>
              </SettingRow>

              {/* Posisi Tempel Kapsul */}
              <SettingRow title={t.settings.capsulePlacement}>
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                    {(
                      [
                        { id: 'top', label: t.settings.placementTop },
                        { id: 'left', label: t.settings.placementLeft },
                        { id: 'right', label: t.settings.placementRight },
                        { id: 'float', label: t.settings.placementCenter },
                      ] as Array<{ id: DockPosition; label: string }>
                    ).map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setDockPosition(pos.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          dockPosition === pos.id
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={resetIslandOffset}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-zinc-300 cursor-pointer"
                    title={isEn ? 'Center capsule coordinates' : 'Reset koordinat kapsul ke tengah'}
                  >
                    {t.common.center}
                  </button>
                </div>
              </SettingRow>

              {/* Monitor Target Kapsul */}
              {availableDisplays.length > 1 && (
                <SettingRow
                  title={t.settings.monitorTarget}
                  description={
                    isEn
                      ? 'Choose the display where Loony capsule resides.'
                      : 'Tentukan monitor tempat kapsul Loony bertengger.'
                  }
                >
                  <div className="flex flex-col gap-2 items-end">
                    <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                      {(
                        [
                          { id: 'follow-cursor', label: t.settings.monitorFollowCursor },
                          { id: 'primary', label: t.settings.monitorPrimary },
                          { id: 'specific', label: t.settings.monitorSpecific },
                        ] as Array<{ id: MonitorTargetMode; label: string }>
                      ).map((opt) => {
                        const active = (settings.monitorTargetMode || 'follow-cursor') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateSettings({ monitorTargetMode: opt.id })}
                            className={`px-3 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                              active
                                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {settings.monitorTargetMode === 'specific' && (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {availableDisplays.map((disp: DisplayInfo) => {
                          const isSelected =
                            (settings.specificMonitorId ?? availableDisplays[0]?.id) === disp.id;
                          return (
                            <button
                              key={disp.id}
                              type="button"
                              onClick={() => updateSettings({ specificMonitorId: disp.id })}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-200 font-semibold shadow-sm'
                                  : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                              }`}
                            >
                              <Monitor className="w-3 h-3" />
                              <span>{disp.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SettingRow>
              )}

              {/* Fullscreen Behavior */}
              <SettingRow
                title={t.settings.fullscreenBehavior}
                description={t.settings.fullscreenBehaviorDesc}
              >
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {(
                    [
                      { id: 'hide', label: t.settings.fullscreenAutoHide },
                      { id: 'always-on-top', label: t.settings.fullscreenAlwaysOnTop },
                    ] as Array<{ id: FullscreenBehavior; label: string }>
                  ).map((opt) => {
                    const active = (settings.fullscreenBehavior || 'hide') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSettings({ fullscreenBehavior: opt.id })}
                        className={`px-3 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Delay Kapsul Menutup */}
              <SettingRow title={t.settings.autoCloseDelay}>
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {[2.0, 3.5, 5.0, 7.0].map((sec) => {
                    const active =
                      Math.abs((settings.capsuleAutoCloseSec || 3.5) - sec) < 0.2;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateSettings({ capsuleAutoCloseSec: sec })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] tabular-nums transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {sec} {isEn ? 's' : 'dtk'}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Indikator Reaksi Kapsul */}
              <SettingRow title={t.settings.reactionStyle}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex p-0.5 rounded-xl bg-zinc-900 border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          indicatorStyle: 'subtle-glow',
                          auraEffectEnabled: true,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                        (settings.indicatorStyle || 'subtle-glow') === 'subtle-glow'
                          ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.settings.reactionSubtleGlow}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          indicatorStyle: 'led-dot',
                          auraEffectEnabled: true,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                        settings.indicatorStyle === 'led-dot'
                          ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.settings.reactionLedDot}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          indicatorStyle: 'none',
                          auraEffectEnabled: false,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                        settings.indicatorStyle === 'none'
                          ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.settings.reactionNone}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={settings.indicatorStyle === 'none'}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('loony-test-indicator'));
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                      settings.indicatorStyle === 'none'
                        ? 'bg-zinc-900/60 text-zinc-600 border-white/5 cursor-not-allowed'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10 cursor-pointer active:scale-95'
                    }`}
                    title={
                      settings.indicatorStyle === 'none'
                        ? isEn
                          ? 'Reaction effect is disabled'
                          : 'Efek sedang dinonaktifkan'
                        : isEn
                          ? 'Click to trigger test animation on top capsule'
                          : 'Klik untuk menyalakan animasi uji coba pada kapsul atas'
                    }
                  >
                    <Sparkles
                      className={`w-3.5 h-3.5 ${
                        settings.indicatorStyle === 'none'
                          ? 'text-zinc-600'
                          : 'text-amber-300'
                      }`}
                    />
                    <span>
                      {settings.indicatorStyle === 'none'
                        ? isEn
                          ? 'Disabled'
                          : 'Nonaktif'
                        : t.settings.reactionTest}
                    </span>
                  </button>
                </div>
              </SettingRow>
            </div>
          )}

          {/* =========================================================
              BAGIAN 2: KARAKTER & SUARA LOONY
             ========================================================= */}
          {settingsSection === 'character' && (
            <div className="divide-y divide-white/[0.04]">
              {/* Panggilan Pengguna */}
              <SettingRow title={t.settings.userNickname}>
                <input
                  type="text"
                  value={settings.userNickname || ''}
                  onChange={(e) => updateSettings({ userNickname: e.target.value })}
                  placeholder={t.settings.userNicknamePlaceholder}
                  className="w-44 bg-white/[0.04] rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:bg-white/[0.07]"
                />
              </SettingRow>

              {/* Loony Idle Sleep */}
              <SettingRow title={t.settings.idleSleep}>
                <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                  {[
                    { label: isEn ? '30s' : '30 dtk', val: 30 },
                    { label: isEn ? '45s' : '45 dtk', val: 45 },
                    { label: isEn ? '90s' : '90 dtk', val: 90 },
                    { label: isEn ? 'Always Awake' : 'Selalu Terjaga', val: 0 },
                  ].map((opt) => {
                    const currentVal = settings.idleSleepSec ?? 45;
                    const active = currentVal === opt.val;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => updateSettings({ idleSleepSec: opt.val })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Whisper Notification */}
              <SettingRow title={t.settings.whisperNotification}>
                <ToggleSwitch
                  checked={settings.peekWhisperEnabled !== false}
                  onChange={(next) => updateSettings({ peekWhisperEnabled: next })}
                />
              </SettingRow>

              {/* Suara Efek Interaksi */}
              <SettingRow title={t.settings.soundEffects}>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.setSfxEnabled(true);
                      soundEngine.setSfxVolume(settings.soundVolume ?? 70);
                      soundEngine.playHappyPatChime();
                      soundEngine.setSfxEnabled(settings.soundEffectsEnabled !== false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-zinc-300 cursor-pointer"
                  >
                    {t.settings.testSound}
                  </button>
                  <ToggleSwitch
                    checked={settings.soundEffectsEnabled !== false}
                    onChange={(next) => updateSettings({ soundEffectsEnabled: next })}
                  />
                </div>
              </SettingRow>

              {/* Volume Slider Efek Suara */}
              {settings.soundEffectsEnabled !== false && (
                <SettingRow
                  title={t.settings.soundVolume}
                  description={t.settings.soundVolumeDesc}
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={settings.soundVolume ?? 70}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateSettings({ soundVolume: val });
                        soundEngine.setSfxVolume(val);
                      }}
                      onMouseUp={() => {
                        soundEngine.setSfxVolume(settings.soundVolume ?? 70);
                        soundEngine.playHappyPatChime();
                      }}
                      className="w-28 accent-zinc-100 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                    />
                    <span className="text-xs font-mono font-medium text-zinc-300 w-9 text-right tabular-nums">
                      {settings.soundVolume ?? 70}%
                    </span>
                  </div>
                </SettingRow>
              )}

              {/* Bersihkan Riwayat Chat */}
              <SettingRow
                title={t.settings.clearChat}
                description={
                  isEn
                    ? `${savedChatCount} messages saved`
                    : `${savedChatCount} pesan tersimpan`
                }
              >
                <button
                  type="button"
                  onClick={handleClearChatHistory}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    chatClearedFeedback
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-white/[0.05] hover:bg-rose-500/15 text-zinc-300 hover:text-rose-300'
                  }`}
                >
                  {chatClearedFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isEn ? 'History Cleared' : 'Riwayat Dibersihkan'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.settings.clearChatBtn}</span>
                    </>
                  )}
                </button>
              </SettingRow>
            </div>
          )}

          {/* =========================================================
              BAGIAN 3: WAKTU & SIKLUS
             ========================================================= */}
          {settingsSection === 'prayer-finance' && (
            <div className="divide-y divide-white/[0.04]">
              {/* Simbol Mata Uang */}
              <SettingRow
                title={t.settings.currency}
                description={t.settings.currencyDesc}
              >
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {['$', 'Rp', '€', '£', '¥'].map((sym) => {
                    const currentSym =
                      settings.currencySymbol ||
                      (settings.language === 'id' ? 'Rp' : '$');
                    const active = currentSym === sym;
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => updateSettings({ currencySymbol: sym })}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          active
                            ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Fitur Shalat Toggle */}
              <SettingRow
                title={t.settings.prayerFeature}
                description={t.settings.prayerFeatureDesc}
              >
                <ToggleSwitch
                  checked={settings.prayerFeatureEnabled !== false}
                  onChange={(next) => updateSettings({ prayerFeatureEnabled: next })}
                />
              </SettingRow>

              {/* Mode Suara Adzan */}
              {settings.prayerFeatureEnabled !== false && (
                <SettingRow title={t.settings.adzanAlert}>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                      {(
                        [
                          { id: 'soft-chime', label: isEn ? 'Soft Chime' : 'Nada Lembut' },
                          { id: 'full-adzan', label: isEn ? 'Full Melody' : 'Melodi Hijaz' },
                          { id: 'silent', label: isEn ? 'Silent' : 'Tanpa Suara' },
                        ] as Array<{ id: AdzanAlertMode; label: string }>
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => updateSettings({ adzanAlertMode: mode.id })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                            settings.adzanAlertMode === mode.id
                              ? 'bg-zinc-100 text-zinc-950 font-semibold'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={triggerTestAdzan}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-zinc-300 cursor-pointer"
                    >
                      {t.common.test}
                    </button>
                  </div>
                </SettingRow>
              )}

              {/* Cuaca & Lokasi */}
              <SettingRow
                title={isEn ? 'Location & Weather' : 'Lokasi & Cuaca'}
                description={`${prayerSchedule.locationLabel} · ${weather.tempC}°C ${
                  weather.weatherCode !== undefined
                    ? mapWeatherCode(weather.weatherCode, settings.language || 'en')
                    : weather.conditionText
                }`}
              >
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs text-zinc-200 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${locationRefreshing ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {locationRefreshing
                      ? isEn
                        ? 'Detecting...'
                        : 'Mendeteksi...'
                      : isEn
                        ? 'Update Location'
                        : 'Perbarui Lokasi'}
                  </span>
                </button>
              </SettingRow>

              {/* Tanggal Siklus Anggaran Bulanan */}
              <SettingRow title={isEn ? 'Monthly Budget Cycle' : 'Siklus Anggaran Bulanan'}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {isEn ? 'Every month on' : 'Setiap tanggal'}
                  </span>

                  <div ref={cycleDayPickerRef} className="relative flex items-center gap-1.5">
                    {/* Stepper (-) */}
                    <button
                      type="button"
                      onClick={() => {
                        const cur = budgetConfig.cycleEndDay || 25;
                        const prevDay = cur <= 1 ? 31 : cur - 1;
                        updateBudgetBalance(budgetConfig.activeBalance, prevDay);
                      }}
                      title={isEn ? 'Previous day' : 'Hari sebelumnya'}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition active:scale-95 border border-white/5"
                    >
                      -
                    </button>

                    {/* Popover Opener */}
                    <button
                      type="button"
                      onClick={() => setShowCycleDayPicker((prev) => !prev)}
                      className="bg-[#12121a] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-zinc-100 flex items-center gap-2 cursor-pointer transition focus:outline-none"
                    >
                      <span className="font-medium">
                        {isEn
                          ? `Day ${budgetConfig.cycleEndDay || 25}`
                          : `Tanggal ${budgetConfig.cycleEndDay || 25}`}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                          showCycleDayPicker ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Stepper (+) */}
                    <button
                      type="button"
                      onClick={() => {
                        const cur = budgetConfig.cycleEndDay || 25;
                        const nextDay = cur >= 31 ? 1 : cur + 1;
                        updateBudgetBalance(budgetConfig.activeBalance, nextDay);
                      }}
                      title={isEn ? 'Next day' : 'Hari berikutnya'}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition active:scale-95 border border-white/5"
                    >
                      +
                    </button>

                    {/* Non-scrolling 31-day Calendar Grid */}
                    {showCycleDayPicker && (
                      <div className="absolute right-0 bottom-full mb-2 z-50 w-[240px] p-2.5 rounded-2xl bg-[#12121a] border border-white/10 shadow-2xl space-y-2 select-none">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            {isEn ? 'Select Cycle Day' : 'Pilih Tanggal Siklus'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {isEn
                              ? `Day ${budgetConfig.cycleEndDay || 25}`
                              : `Tgl ${budgetConfig.cycleEndDay || 25}`}
                          </span>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
                            const isSelected = (budgetConfig.cycleEndDay || 25) === dayNum;
                            return (
                              <button
                                key={dayNum}
                                type="button"
                                onClick={() => {
                                  updateBudgetBalance(budgetConfig.activeBalance, dayNum);
                                  setShowCycleDayPicker(false);
                                }}
                                className={`h-7 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                                    : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                                }`}
                              >
                                {dayNum}
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              updateBudgetBalance(budgetConfig.activeBalance, 1);
                              setShowCycleDayPicker(false);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                          >
                            {isEn ? 'Day 1 (Start)' : 'Tgl 1 (Awal)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateBudgetBalance(budgetConfig.activeBalance, 25);
                              setShowCycleDayPicker(false);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                          >
                            {isEn ? 'Day 25 (Payday)' : 'Tgl 25 (Gajian)'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SettingRow>
            </div>
          )}

          {/* =========================================================
              BAGIAN 4: KONEKSI & SISTEM
             ========================================================= */}
          {settingsSection === 'bridge-system' && (
            <div className="divide-y divide-white/[0.04]">
              {/* Kode Pasangan Bridge */}
              <SettingRow
                title={isEn ? 'Bridge Pair Code' : 'Kode Pasangan Bridge'}
                alignTop={true}
                description={
                  isEn
                    ? 'Sync PIN for transferring files and text between devices.'
                    : 'PIN sinkronisasi pengiriman file dan teks antar perangkat.'
                }
              >
                <div className="flex flex-col items-end gap-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <input
                      type="text"
                      value={settings.personalSyncKey}
                      onChange={(e) =>
                        updateSettings({ personalSyncKey: e.target.value.toUpperCase() })
                      }
                      placeholder={isEn ? 'e.g. LOONY-8492' : 'Misal: LOONY-8492'}
                      className="w-36 bg-white/[0.05] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold text-zinc-100 text-center tracking-wide focus:outline-none focus:bg-white/[0.08]"
                    />

                    <button
                      type="button"
                      onClick={handleCopySyncPin}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold cursor-pointer transition shrink-0"
                    >
                      {copiedSyncCode
                        ? t.common.copied
                        : isEn
                          ? 'Copy PIN'
                          : 'Salin PIN'}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateSimpleSyncCode}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 cursor-pointer transition shrink-0"
                    >
                      {isEn ? 'Random PIN' : 'Acak PIN'}
                    </button>

                    <button
                      type="button"
                      onClick={onOpenQrModal}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition border border-cyan-500/20 shrink-0"
                      title={isEn ? 'Open QR Code to scan on mobile' : 'Buka QR Code untuk scan di HP'}
                    >
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isEn ? 'Open QR' : 'Buka QR'}</span>
                    </button>
                  </div>

                  {/* Supabase Server Opsional */}
                  <div className="w-full flex flex-col items-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedCloud((p) => !p)}
                      className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500 hover:text-zinc-300 cursor-pointer transition"
                    >
                      <span>
                        {showAdvancedCloud
                          ? isEn
                            ? 'Hide custom cloud server'
                            : 'Sembunyikan server cloud pribadi'
                          : isEn
                            ? 'Custom Supabase server (Optional)'
                            : 'Server Supabase pribadi (Opsional)'}
                      </span>
                      {showAdvancedCloud ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {showAdvancedCloud && (
                      <div className="mt-2 pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 w-full max-w-[340px]">
                        <input
                          type="text"
                          value={settings.supabaseUrl}
                          onChange={(e) =>
                            updateSettings({ supabaseUrl: e.target.value.trim() })
                          }
                          placeholder="Supabase URL (https://...)"
                          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-1 text-[11px] text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none"
                        />
                        <input
                          type="password"
                          value={settings.supabaseAnonKey}
                          onChange={(e) =>
                            updateSettings({ supabaseAnonKey: e.target.value.trim() })
                          }
                          placeholder="Anon Public Key"
                          className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-1 text-[11px] text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </SettingRow>

              {/* Provider AI Loony */}
              <SettingRow
                title={t.settings.aiProvider}
                alignTop={true}
                description={
                  (() => {
                    const currentProv = (settings.aiProvider as AiProviderType) || 'gemini';
                    const cfg = AI_PROVIDERS[currentProv] || AI_PROVIDERS.gemini;
                    return (
                      (isEn ? cfg.descriptionEn || cfg.description : cfg.description) ||
                      t.settings.aiProviderDesc
                    );
                  })()
                }
              >
                <div className="flex flex-wrap gap-1 max-w-[340px] justify-end">
                  {(
                    [
                      { id: 'gemini', label: 'Google Gemini' },
                      { id: 'groq', label: isEn ? 'Groq (Fast)' : 'Groq (Cepat)' },
                      { id: 'openrouter', label: 'OpenRouter' },
                      { id: 'deepseek', label: 'DeepSeek' },
                      { id: 'openai', label: 'OpenAI' },
                      { id: 'ollama', label: isEn ? 'Ollama (Local)' : 'Ollama (Lokal)' },
                      { id: 'custom', label: isEn ? 'Custom' : 'Kustom' },
                    ] as Array<{ id: AiProviderType; label: string }>
                  ).map((prov) => {
                    const isSelected = (settings.aiProvider || 'gemini') === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => {
                          updateSettings({ aiProvider: prov.id });
                          setApiKeyTestResult(null);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10.5px] transition cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                            : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                        }`}
                      >
                        {prov.label}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>

              {/* Kunci API & Uji Koneksi */}
              {(() => {
                const currentProv = (settings.aiProvider as AiProviderType) || 'gemini';
                const currentCfg = AI_PROVIDERS[currentProv] || AI_PROVIDERS.gemini;
                const isOllama = currentProv === 'ollama';
                const effectiveKey = settings.aiApiKey || settings.geminiApiKey || '';

                return (
                  <>
                    <SettingRow
                      title={
                        isOllama
                          ? isEn
                            ? 'Ollama Connection Status'
                            : 'Status Koneksi Ollama'
                          : isEn
                            ? `${currentCfg.name} API Key`
                            : `Kunci API ${currentCfg.name}`
                      }
                      alignTop={true}
                      description={
                        isOllama
                          ? isEn
                            ? 'Running on local machine (http://localhost:11434/v1)'
                            : 'Berjalan di komputer lokal (http://localhost:11434/v1)'
                          : effectiveKey.trim()
                            ? isEn
                              ? 'Key configured · Ready to test'
                              : 'Kunci terpasang · Siap diuji'
                            : isEn
                              ? 'Offline brain active (No cloud AI)'
                              : 'Mode pintar lokal aktif (tanpa AI awan)'
                      }
                    >
                      <div className="flex flex-col items-end gap-2 w-full max-w-[360px]">
                        <div className="flex items-center gap-1.5 w-full justify-end">
                          {!isOllama && (
                            <>
                              <input
                                type={showApiKey ? 'text' : 'password'}
                                value={effectiveKey}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const detected = detectProviderFromKey(val);
                                  updateSettings({
                                    aiApiKey: val,
                                    geminiApiKey: val,
                                    ...(detected && detected !== currentProv
                                      ? { aiProvider: detected }
                                      : {}),
                                  });
                                  setApiKeyTestResult(null);
                                }}
                                placeholder={
                                  isEn
                                    ? currentCfg.keyPlaceholderEn || currentCfg.keyPlaceholder
                                    : currentCfg.keyPlaceholder
                                }
                                className="w-48 bg-white/[0.04] rounded-xl px-3 py-1.5 text-[11px] text-zinc-100 font-mono placeholder:text-zinc-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey((p) => !p)}
                                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0"
                                title={
                                  showApiKey
                                    ? isEn
                                      ? 'Hide'
                                      : 'Sembunyikan'
                                    : isEn
                                      ? 'Show'
                                      : 'Tampilkan'
                                }
                              >
                                {showApiKey ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={
                              isTestingApiKey ||
                              (currentCfg.requiresKey && !effectiveKey.trim())
                            }
                            onClick={handleTestApiKey}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-[11px] font-medium text-zinc-200 cursor-pointer transition flex items-center gap-1 shrink-0"
                          >
                            {isTestingApiKey ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                                <span>{t.settings.aiTesting}</span>
                              </>
                            ) : (
                              <span>{t.settings.aiTest}</span>
                            )}
                          </button>
                        </div>

                        {apiKeyTestResult && (
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] max-w-full ${
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
                            <span className="truncate">{apiKeyTestResult.message}</span>
                          </div>
                        )}

                        {currentCfg.helpUrl && (
                          <a
                            href={currentCfg.helpUrl}
                            onClick={(e) => {
                              e.preventDefault();
                              if (window.electronAPI?.openExternal) {
                                window.electronAPI.openExternal(currentCfg.helpUrl);
                              } else {
                                window.open(currentCfg.helpUrl, '_blank');
                              }
                            }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                          >
                            {isEn
                              ? `Get API Key at ${currentCfg.helpLabel}`
                              : `Dapatkan Kunci API di ${currentCfg.helpLabel}`}
                          </a>
                        )}

                        {currentCfg.requiresKey && (
                          <p className="text-[9.5px] text-zinc-500 italic leading-relaxed text-right max-w-[320px]">
                            {isEn
                              ? '💡 Secret API keys are usually only shown once upon creation. If forgotten, create a new one and paste it here.'
                              : '💡 Kunci rahasia API biasanya hanya ditampilkan sekali saat dibuat di website penyedia. Jika lupa, buat kunci baru lalu salin ke sini.'}
                          </p>
                        )}
                      </div>
                    </SettingRow>

                    {(currentProv === 'ollama' || currentProv === 'custom') && (
                      <SettingRow
                        title={isEn ? 'Server URL & Model' : 'URL Server & Model'}
                        description={
                          isEn
                            ? 'OpenAI-compatible server URL and downloaded model name'
                            : 'Alamat server OpenAI-compatible dan nama model yang diunduh'
                        }
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={settings.aiCustomBaseUrl || currentCfg.defaultBaseUrl}
                            onChange={(e) =>
                              updateSettings({ aiCustomBaseUrl: e.target.value })
                            }
                            placeholder={currentCfg.defaultBaseUrl}
                            className="w-44 bg-white/[0.04] rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-100 font-mono focus:outline-none"
                            title="Base URL"
                          />
                          <input
                            type="text"
                            value={settings.aiModel || currentCfg.defaultModel}
                            onChange={(e) =>
                              updateSettings({ aiModel: e.target.value })
                            }
                            placeholder={currentCfg.defaultModel}
                            className="w-28 bg-white/[0.04] rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-100 font-mono focus:outline-none"
                            title={isEn ? 'Model Name' : 'Nama Model'}
                          />
                        </div>
                      </SettingRow>
                    )}
                  </>
                );
              })()}

              {/* Pintasan Global (Alt + ~) */}
              <SettingRow
                title={t.settings.globalShortcut}
                description={t.settings.globalShortcutDesc}
              >
                <ToggleSwitch
                  checked={settings.globalShortcutEnabled !== false}
                  onChange={(next) =>
                    updateSettings({ globalShortcutEnabled: next })
                  }
                />
              </SettingRow>

              {/* Mulai Otomatis Saat Booting */}
              <SettingRow title={t.settings.autoStart}>
                <ToggleSwitch
                  checked={autoStartActive}
                  onChange={handleToggleAutoStart}
                />
              </SettingRow>

              {/* Ekspor & Impor Data Lokal */}
              <SettingRow
                title={t.settings.backupRestore}
                description={backupStatusMsg || undefined}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackupFile}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs text-zinc-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Export (.json)' : 'Ekspor (.json)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs text-zinc-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Import' : 'Impor'}</span>
                  </button>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportBackupFile}
                  />
                </div>
              </SettingRow>

              {/* Reset Pabrik */}
              <SettingRow
                title={t.settings.resetData}
                description={
                  isEn
                    ? 'Erase all local data and restore Loony to factory defaults'
                    : 'Hapus semua data dan mulai ulang Loony seperti baru'
                }
              >
                <button
                  type="button"
                  onClick={onOpenResetConfirmModal}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold cursor-pointer transition"
                >
                  {isEn ? 'Reset Data' : 'Reset Data'}
                </button>
              </SettingRow>

              {/* Pemeriksa Rilis GitHub */}
              <SettingRow
                title={t.settings.appUpdate}
                alignTop={true}
                description={t.settings.appUpdateDesc}
              >
                <div className="flex flex-col items-end gap-2.5 w-full max-w-[340px]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-mono font-medium text-zinc-300">
                      v{CURRENT_APP_VERSION}
                    </span>

                    <button
                      type="button"
                      disabled={isCheckingUpdate}
                      onClick={onCheckUpdate}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                        isCheckingUpdate
                          ? 'bg-white/[0.04] text-zinc-500 cursor-not-allowed'
                          : 'bg-white/[0.07] hover:bg-white/[0.12] text-zinc-200 active:scale-95'
                      }`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isCheckingUpdate ? 'animate-spin text-sky-400' : 'text-zinc-400'
                        }`}
                      />
                      <span>
                        {isCheckingUpdate
                          ? t.settings.checkingUpdate
                          : t.settings.checkForUpdates}
                      </span>
                    </button>
                  </div>

                  {updateInfo && (
                    <div className="w-full text-right">
                      {updateInfo.status === 'update-available' && (
                        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/20 text-left space-y-2 mt-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                              <span>
                                {t.settings.updateAvailable.replace(
                                  '{version}',
                                  updateInfo.latestVersion || ''
                                )}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {updateInfo.publishedAt
                                ? new Date(updateInfo.publishedAt).toLocaleDateString()
                                : ''}
                            </span>
                          </div>

                          {updateInfo.releaseName && (
                            <p className="text-[11px] font-medium text-zinc-200">
                              {updateInfo.releaseName}
                            </p>
                          )}

                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenReleaseUrl(updateInfo.releaseUrl)}
                              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                            >
                              <span>{t.settings.downloadUpdate}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {updateInfo.status === 'up-to-date' && (
                        <p className="text-[11px] text-emerald-400 flex items-center justify-end gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {t.settings.upToDate} (v{CURRENT_APP_VERSION})
                          </span>
                        </p>
                      )}

                      {updateInfo.status === 'no-release' && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-zinc-400">
                            {t.settings.noReleasesYet}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenReleaseUrl(updateInfo.releaseUrl)}
                            className="text-[10.5px] text-sky-400/90 hover:text-sky-300 underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{t.settings.openReleasesPage}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {updateInfo.status === 'offline' && (
                        <p className="text-[11px] text-amber-400/90">
                          {isEn
                            ? 'Offline: Check your internet connection'
                            : 'Perangkat offline: Periksa koneksi internet Anda'}
                        </p>
                      )}

                      {updateInfo.status === 'error' && (
                        <p className="text-[11px] text-rose-400/90">
                          {updateInfo.errorMessage || t.settings.checkFailed}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SettingRow>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
