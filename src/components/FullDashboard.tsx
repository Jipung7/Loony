import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Wallet, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HoloMascotEyes } from './HoloMascotEyes';
import { LoonyChatPanel } from './LoonyChatPanel';
import {
  checkForUpdates,
  getCachedUpdateInfo,
  type UpdateInfo,
} from '../services/updateChecker';
import { DashboardHeader, type MorphStage } from './dashboard/DashboardHeader';
import { SettingsTab } from './dashboard/tabs/SettingsTab';
import { TodayTab } from './dashboard/tabs/TodayTab';
import { FinanceTab } from './dashboard/tabs/FinanceTab';
import { BridgeTab } from './dashboard/tabs/BridgeTab';
import { QrPairingModal } from './dashboard/modals/QrPairingModal';
import { ResetConfirmModal } from './dashboard/modals/ResetConfirmModal';

type WorkspaceTab = 'today' | 'finance' | 'bridge';

/**
 * FullDashboard Component (Artisan Modular Architecture)
 *
 * Orkestrator utama kanvas ruang kerja asimetris Loony.
 * Memuat panel interaksi Loony di sisi kiri dan 3 tab workspace mandiri
 * (Hari Ini, Keuangan, & Bridge/Ide) di sisi kanan, serta integrasi
 * pengaturan, kontrol jendela, dan animasi morphing halus.
 */
export const FullDashboard: React.FC = () => {
  const {
    islandMode,
    setIslandMode,
    dockPosition,
    islandOffset,
    mascotMood,
    loonySignLabel,
    settings,
    updateSettings,
    resolvedWindowTheme,
    clipboardHistory,
    bridgeFiles,
    schedules,
    habits,
    safeToSpend,
    lastUndo,
    triggerUndo,
    weather,
    nextPrayer,
    isPlayingMusic,
    musicTrackName,
    toggleMusicPlayer,
    nextMusicTrack,
    prevMusicTrack,
    openMusicSourceApp,
    resetFactoryData,
    focusTimerSecondsLeft,
    focusTimerTotalSeconds,
    isFocusTimerRunning,
    startFocusTimer,
    toggleFocusTimer,
    resetFocusTimer,
    t,
    formatMoney,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';

  // Navigation & Window Morphing States
  const [stage, setStage] = useState<MorphStage>('leaping');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('today');
  const [viewportH, setViewportH] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 900
  );

  // Settings & Modal Navigation States
  const [showSettings, setShowSettings] = useState(false);
  const [lanUrl, setLanUrl] = useState('http://localhost:47831');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // GitHub Release Update Checker State
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => getCachedUpdateInfo());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Ambient Clock
  const [clockStr, setClockStr] = useState('');

  const windowRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  // Check for updates
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkForUpdates(true);
      setUpdateInfo(res);
    } catch {
      // Handled internally by checkForUpdates
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Clipboard copy handler
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    window.electronAPI?.writeClipboard(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1300);
  };

  // Initialize network info and background update check
  useEffect(() => {
    if (window.electronAPI?.getBridgeInfo) {
      window.electronAPI
        .getBridgeInfo()
        .then((info) => {
          if (info?.lanUrl) setLanUrl(info.lanUrl);
        })
        .catch(() => {});
    }
    checkForUpdates(false)
      .then((res) => {
        setUpdateInfo(res);
      })
      .catch(() => {});
  }, []);

  // Ambient Clock Updater
  useEffect(() => {
    const updateClock = () => {
      setClockStr(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Viewport resize listener
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Morphing transition into dashboard
  useEffect(() => {
    if (islandMode !== 'full-dashboard') return;
    clearAllTimers();
    setStage('leaping');
    window.electronAPI?.setIgnoreMouseEvents(false);

    const t1 = window.setTimeout(() => {
      setStage('expanded');
    }, 190);
    timersRef.current.push(t1);

    return () => clearAllTimers();
  }, [islandMode]);

  // Window close handler (reverse morphing)
  const handleCloseWindow = () => {
    if (stage === 'shrinking' || stage === 'returning') return;
    clearAllTimers();
    setShowSettings(false);
    setStage('shrinking');
    window.electronAPI?.setIgnoreMouseEvents(true);

    const t1 = window.setTimeout(() => {
      setStage('returning');
    }, 180);

    const t2 = window.setTimeout(() => {
      setIslandMode('idle');
    }, 390);

    timersRef.current.push(t1, t2);
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    if (islandMode !== 'full-dashboard') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseWindow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Ensure interactive mouse events when expanded
  useEffect(() => {
    if (islandMode !== 'full-dashboard') return;
    if (stage === 'expanded' || stage === 'leaping') {
      window.electronAPI?.setIgnoreMouseEvents(false);
    }
  }, [islandMode, stage]);

  // Format Focus Timer
  const focusTimerFormatted = useMemo(() => {
    const mins = Math.floor(focusTimerSecondsLeft / 60);
    const secs = focusTimerSecondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [focusTimerSecondsLeft]);

  // Date and context summaries
  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todaySchedulesCount = useMemo(
    () => schedules.filter((s) => s.date === todayISO).length,
    [schedules, todayISO]
  );

  const remainingHabitsCount = useMemo(
    () => habits.filter((h) => !h.completedToday).length,
    [habits]
  );

  if (islandMode !== 'full-dashboard') {
    return null;
  }

  const isFullScreen = settings.windowDisplayMode === 'fullscreen';
  const pairingLink = `${lanUrl}/?pair=${encodeURIComponent(settings.personalSyncKey || 'LOONY-BRIDGE-SYNC')}`;

  // Positioning coordinates for leap/morph
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1366;
  const resolvedX = !islandOffset.x
    ? viewportW * 0.5
    : islandOffset.x <= 1
      ? islandOffset.x * viewportW
      : islandOffset.x;
  const resolvedY = !islandOffset.y
    ? viewportH * 0.35
    : islandOffset.y <= 1
      ? islandOffset.y * viewportH
      : islandOffset.y;

  let capsuleRelativeX = resolvedX - viewportW / 2;
  let capsuleRelativeY = -(viewportH / 2 - 34);

  if (dockPosition === 'left') {
    capsuleRelativeX = -(viewportW / 2 - 28);
    capsuleRelativeY = resolvedY - viewportH / 2 + 28;
  } else if (dockPosition === 'right') {
    capsuleRelativeX = +(viewportW / 2 - 28);
    capsuleRelativeY = resolvedY - viewportH / 2 + 28;
  } else if (dockPosition === 'float') {
    capsuleRelativeX = resolvedX - viewportW / 2;
    capsuleRelativeY = resolvedY - viewportH / 2;
  }

  const getWindowTransformProps = () => {
    if (stage === 'leaping') {
      return {
        x: 0,
        y: 0,
        scaleX: 0.11,
        scaleY: 0.08,
        opacity: 1,
      };
    }
    if (stage === 'expanded') {
      return {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
      };
    }
    if (stage === 'shrinking') {
      return {
        x: 0,
        y: 0,
        scaleX: 0.11,
        scaleY: 0.08,
        opacity: 1,
      };
    }
    return {
      x: capsuleRelativeX,
      y: capsuleRelativeY,
      scaleX: 0.095,
      scaleY: 0.068,
      opacity: 0.92,
    };
  };

  return (
    <div
      data-theme={resolvedWindowTheme}
      onMouseDown={(e) => {
        if (!isFullScreen && windowRef.current && !windowRef.current.contains(e.target as Node)) {
          handleCloseWindow();
        }
      }}
      onMouseMove={() => window.electronAPI?.setIgnoreMouseEvents(false)}
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-auto font-marshmallow ${
        isFullScreen ? 'p-0' : 'px-4'
      }`}
    >
      {/* MATA LOONY SAAT MELOMPAT / MENYUSUT */}
      {stage !== 'expanded' && (
        <motion.div
          initial={{ x: capsuleRelativeX, y: capsuleRelativeY, scale: 1 }}
          animate={
            stage === 'returning'
              ? { x: capsuleRelativeX, y: capsuleRelativeY, scale: 0.96 }
              : { x: 0, y: 0, scale: 1.05 }
          }
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 30,
            mass: 0.7,
          }}
          className="fixed z-50 pointer-events-none flex items-center justify-center"
        >
          <HoloMascotEyes
            mood={mascotMood}
            size="sm"
            isCapsuleIdle={false}
            isPlayingMusic={isPlayingMusic}
            signLabel={loonySignLabel}
          />
        </motion.div>
      )}

      {/* JENDELA ASYMMETRIC SPLIT-WORKSPACE */}
      <motion.div
        ref={windowRef}
        data-theme={resolvedWindowTheme}
        data-fullscreen={isFullScreen ? 'true' : 'false'}
        initial={{
          x: capsuleRelativeX,
          y: capsuleRelativeY,
          scaleX: 0.095,
          scaleY: 0.068,
          opacity: 0.95,
        }}
        animate={getWindowTransformProps()}
        transition={{
          type: 'spring',
          stiffness: 360,
          damping: 30,
          mass: 0.72,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents(false)}
        onMouseMove={() => window.electronAPI?.setIgnoreMouseEvents(false)}
        className={`pointer-events-auto window-glass relative overflow-hidden text-zinc-100 flex flex-col transition-[width,height,border-radius] duration-200 ${
          isFullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none window-fullscreen-scale'
            : 'w-[940px] h-[610px] max-w-[95vw] max-h-[90vh] rounded-[26px]'
        }`}
      >
        {/* TOP BAR STATUS & CONTROLS */}
        <DashboardHeader
          isFullScreen={isFullScreen}
          stage={stage}
          clockStr={clockStr}
          weather={weather}
          settings={settings}
          updateSettings={updateSettings}
          nextPrayer={nextPrayer}
          isEn={isEn}
          focusTimerFormatted={focusTimerFormatted}
          focusTimerTotalSeconds={focusTimerTotalSeconds}
          isFocusTimerRunning={isFocusTimerRunning}
          toggleFocusTimer={toggleFocusTimer}
          startFocusTimer={startFocusTimer}
          resetFocusTimer={resetFocusTimer}
          musicTrackName={musicTrackName}
          isPlayingMusic={isPlayingMusic}
          openMusicSourceApp={openMusicSourceApp}
          prevMusicTrack={prevMusicTrack}
          toggleMusicPlayer={toggleMusicPlayer}
          nextMusicTrack={nextMusicTrack}
          lastUndo={lastUndo}
          triggerUndo={triggerUndo}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          updateInfo={updateInfo}
          onCloseWindow={handleCloseWindow}
          t={t}
        />

        {/* BODY UTAMA: PENGATURAN ATAU SPLIT WORKSPACE */}
        <div
          className={`relative z-10 flex-1 min-h-0 flex overflow-hidden transition-opacity duration-150 ${
            stage === 'expanded' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {showSettings ? (
            <SettingsTab
              isFullScreen={isFullScreen}
              onClose={() => setShowSettings(false)}
              updateInfo={updateInfo}
              isCheckingUpdate={isCheckingUpdate}
              onCheckUpdate={handleCheckForUpdates}
              onOpenQrModal={() => setShowQrModal(true)}
              onOpenResetConfirmModal={() => setShowResetConfirmModal(true)}
            />
          ) : (
            <div className="flex-1 min-h-0 w-full flex overflow-hidden">
              {/* KOLOM KIRI: RUANG HIDUP & OBROLAN LOONY */}
              <div
                className={`h-full min-h-0 shrink-0 border-r border-white/[0.04] bg-[#0a0a10]/50 flex flex-col overflow-hidden ${
                  isFullScreen ? 'w-[410px]' : 'w-[315px]'
                }`}
              >
                <LoonyChatPanel
                  onActionExecuted={(type) => {
                    if (type === 'expense' || type === 'debt') {
                      setActiveTab('finance');
                    } else if (type === 'schedule' || type === 'habit') {
                      setActiveTab('today');
                    } else if (type === 'idea') {
                      setActiveTab('bridge');
                    }
                  }}
                />
              </div>

              {/* KOLOM KANAN: KANVAS RUANG KERJA */}
              <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden">
                {/* Navigasi 3 Fokus Ruang Kerja */}
                <div
                  className={`flex items-center justify-between border-b border-white/[0.04] shrink-0 ${
                    isFullScreen ? 'px-8 py-3.5' : 'px-6 py-3'
                  }`}
                >
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('today')}
                      className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'today'
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                      }`}
                    >
                      <Calendar
                        className={`w-3.5 h-3.5 ${
                          activeTab === 'today' ? 'text-zinc-950' : 'text-sky-400/90'
                        }`}
                      />
                      <span>{t.nav.today}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('finance')}
                      className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'finance'
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                      }`}
                    >
                      <Wallet
                        className={`w-3.5 h-3.5 ${
                          activeTab === 'finance' ? 'text-zinc-950' : 'text-emerald-400/90'
                        }`}
                      />
                      <span>{t.nav.finance}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('bridge')}
                      className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'bridge'
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                      }`}
                    >
                      <Copy
                        className={`w-3.5 h-3.5 ${
                          activeTab === 'bridge' ? 'text-zinc-950' : 'text-violet-400/90'
                        }`}
                      />
                      <span>{t.nav.bridge}</span>
                    </button>
                  </div>

                  {/* Ringkasan Cepat Kontekstual di Kanan Atas Kanvas */}
                  <div className="text-[11px] text-zinc-500 shrink-0 whitespace-nowrap">
                    {activeTab === 'today' && (
                      <span className="shrink-0 whitespace-nowrap">
                        {remainingHabitsCount} {isEn ? 'routines' : 'rutinitas'} ·{' '}
                        {todaySchedulesCount} {isEn ? 'events today' : 'agenda hari ini'}
                      </span>
                    )}
                    {activeTab === 'finance' && (
                      <span className="shrink-0 whitespace-nowrap">
                        {t.finance.safeToSpendTitle}:{' '}
                        <strong className="text-zinc-300 tabular-nums">
                          {formatMoney(Math.round(safeToSpend.remainingSafeToday))}
                        </strong>
                      </span>
                    )}
                    {activeTab === 'bridge' && (
                      <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span>{isEn ? 'Bridge Active' : 'Bridge Aktif'}</span>
                        </span>
                        <span
                          className="font-mono text-zinc-400 text-[10.5px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.04] max-w-[120px] truncate"
                          title={settings.personalSyncKey}
                        >
                          {settings.personalSyncKey}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400 tabular-nums">
                          {clipboardHistory.length} {isEn ? 'texts' : 'teks'} · {bridgeFiles.length} {isEn ? 'files' : 'file'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ISI KANVAS BERDASARKAN TAB AKTIF */}
                <div className={`flex-1 min-h-0 overflow-hidden ${isFullScreen ? 'p-8' : 'p-6'}`}>
                  {activeTab === 'today' && <TodayTab isFullScreen={isFullScreen} />}
                  {activeTab === 'finance' && <FinanceTab isFullScreen={isFullScreen} />}
                  {activeTab === 'bridge' && (
                    <BridgeTab
                      onOpenQrModal={() => setShowQrModal(true)}
                      copiedId={copiedId}
                      onCopyText={handleCopyText}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal Pairing QR Bridge */}
      <QrPairingModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        pairingLink={pairingLink}
        personalSyncKey={settings.personalSyncKey}
        resolvedWindowTheme={resolvedWindowTheme}
        isEn={isEn}
        copiedId={copiedId}
        onCopyText={handleCopyText}
        closeLabel={t.common.close}
        copiedLabel={t.common.copied}
      />

      {/* Modal Konfirmasi Reset Data Pabrik */}
      <ResetConfirmModal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        onConfirmReset={resetFactoryData}
        resolvedWindowTheme={resolvedWindowTheme}
        isEn={isEn}
        cancelLabel={t.common.cancel}
      />
    </div>
  );
};
