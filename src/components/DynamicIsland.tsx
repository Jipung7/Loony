import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { HoloMascotEyes } from './HoloMascotEyes';
import { DockPosition } from '../types';
import { soundEngine } from '../services/soundEngine';
import {
  ToolPanelId,
  TOP_TOOL_PANELS,
  SIDE_TOOL_PANELS,
  TOOL_ACCENT_META,
  getToolLabel,
  CapsuleToolDots,
} from './capsule/CapsuleToolDots';
import { MascotToolView } from './capsule/tools/MascotToolView';
import { ClockPrayerToolView, PrayerExpandedStrip } from './capsule/tools/ClockPrayerToolView';
import { FocusTimerToolView } from './capsule/tools/FocusTimerToolView';
import { CalendarToolView, FullCalendarGrid } from './capsule/tools/CalendarToolView';
import { ClipboardBridgeToolView } from './capsule/tools/ClipboardBridgeToolView';
import { QuickCaptureToolView } from './capsule/tools/QuickCaptureToolView';
import { TodoToolView } from './capsule/tools/TodoToolView';
import { MusicToolView } from './capsule/tools/MusicToolView';

interface FrictionSpark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  angle: number;
  color: string;
}

interface TimedAuraState {
  id: string;
  coreGradient: string;
  outerGlow: string;
  blurPx: number;
  cycleDuration: string;
}

export const DynamicIsland: React.FC = () => {
  const {
    islandMode,
    setIslandMode,
    dockPosition,
    setDockPosition,
    islandOffset,
    setIslandOffset,
    resetIslandOffset,
    mascotMood,
    loonySignLabel,
    setExternalCuriousActive,
    settings,
    isSystemFullscreen,
    resolvedCapsuleTheme,
    clipboardHistory,
    bridgeFiles,
    pushClipboardText,
    sendBridgeFile,
    schedules,
    habits,
    urgentHabitsHMinus1,
    safeToSpend,
    toggleHabitCompleted,
    executeQuickCapture,
    prayerSchedule,
    nextPrayer,
    weather,
    isPlayingMusic,
    musicTrackName,
    musicArtistName,
    toggleMusicPlayer,
    nextMusicTrack,
    prevMusicTrack,
    openMusicSourceApp,
    focusTimerSecondsLeft,
    focusTimerTotalSeconds,
    isFocusTimerRunning,
    lastFocusTimerCompletedAt,
    startFocusTimer,
    toggleFocusTimer,
    resetFocusTimer,
    t,
    formatMoney,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';

  const isDockSide = dockPosition === 'left' || dockPosition === 'right';
  const isDockLeft = dockPosition === 'left';
  const isDockRight = dockPosition === 'right';
  const isDockTop = dockPosition === 'top';

  const toolPanels = isDockSide ? SIDE_TOOL_PANELS : TOP_TOOL_PANELS;
  const [activeToolIdx, setActiveToolIdx] = useState<number>(0);

  // State Expand untuk Jadwal Shalat 5 Waktu & Kalender Bulanan Penuh
  const [isPrayerExpanded, setIsPrayerExpanded] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  // State Input & Fokus
  const [clockText, setClockText] = useState('');
  const [secondsText, setSecondsText] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteSaved, setPasteSaved] = useState(false);

  // Penahan agar kapsul tetap terbuka saat aktif mengetik atau drag file
  const [isActivelyTyping, setIsActivelyTyping] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isCursorInside, setIsCursorInside] = useState(false);

  // =========================================================================
  // LOONY GEN 2: LIVING PHYSICS, INSTANT DRAG, PETTING, WHISPER & TIMED AURA
  // =========================================================================
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapDirectionState, setSnapDirectionState] = useState<'left' | 'right' | 'top' | null>(
    null
  );
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);
  const [snapFlight, setSnapFlight] = useState<{ x: number; y: number } | null>(null);
  const [inertiaLag, setInertiaLag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [impactSquash, setImpactSquash] = useState<{ scaleX: number; scaleY: number }>({
    scaleX: 1,
    scaleY: 1,
  });
  const [sparks, setSparks] = useState<FrictionSpark[]>([]);
  const [isDizzy, setIsDizzy] = useState(false);
  const [isHeadShaking, setIsHeadShaking] = useState(false);
  const [isPetted, setIsPetted] = useState(false);
  const [activeAura, setActiveAura] = useState<TimedAuraState | null>(null);

  const capsuleRef = useRef<HTMLDivElement | null>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const dragResetTimerRef = useRef<number | null>(null);
  const wheelCooldownRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dizzyTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const petTimerRef = useRef<number | null>(null);
  const auraTimerRef = useRef<number | null>(null);

  // Detector Elus Kepala (Cursor Petting)
  const petTrackerRef = useRef<{
    lastX: number;
    lastY: number;
    lastDir: number;
    reversals: number;
    lastTime: number;
  }>({
    lastX: 0,
    lastY: 0,
    lastDir: 0,
    reversals: 0,
    lastTime: 0,
  });

  // Detector Perubahan untuk Mini-Peek Whisper & Timed Aura
  const prevTrackRef = useRef<string>(musicTrackName);
  const prevPlayingRef = useRef<boolean>(isPlayingMusic);
  const prevClipIdRef = useRef<string | undefined>(clipboardHistory[0]?.id);
  const prevBridgeIdRef = useRef<string | undefined>(bridgeFiles[0]?.id);
  const prevSignRef = useRef<string | null>(loonySignLabel);
  const prevMoodRef = useRef<string>(mascotMood);
  const prevBudgetDangerRef = useRef<boolean>(safeToSpend.statusLevel === 'danger');
  const prevFocusTimerCompletedRef = useRef<number>(0);

  // Pointer drag trackers
  const dragPointerRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    lastX?: number;
    lastY?: number;
  } | null>(null);

  const activeTool = toolPanels[activeToolIdx % toolPanels.length] || 'clock-prayer';
  const activeAccent = TOOL_ACCENT_META[activeTool];
  // RnR 1: Selama di-drag MAUPUN selama meluncur ditarik magnet ke sisi manapun (termasuk atas),
  // kapsul tetap berbentuk kotak bulat yang sama persis seperti saat di-drag, dan baru berubah
  // membentuk sisi tajam menempel tepat pada saat menyentuh tepi layar!
  const isCompactSquare = isDraggingPosition || isSnapping;
  const showExpandedCalendar =
    islandMode !== 'idle' && activeTool === 'calendar' && isCalendarExpanded;
  const showExpandedPrayer =
    settings.prayerFeatureEnabled !== false &&
    islandMode !== 'idle' &&
    activeTool === 'clock-prayer' &&
    isPrayerExpanded;

  // =========================================================================
  // FITUR BREATHING AURA BACKLIGHT DENGAN BATAS WAKTU (RnR 1, 2, 3, 4, 5, 6)
  // =========================================================================
  const triggerTimedAura = (
    coreGradient: string,
    outerGlow: string,
    durationMs = 5200,
    cycleDuration = '2.2s',
    blurPx = 8
  ) => {
    if (
      settings.auraEffectEnabled === false ||
      settings.indicatorStyle === 'none' ||
      isDraggingPosition ||
      isSnapping
    )
      return;
    if (auraTimerRef.current) clearTimeout(auraTimerRef.current);

    // Opsi 1: Pendaran Halus Organik & Muted (Ditingkatkan intensitasnya sedikit tapi tetap samar & berkelas)
    const isSubtleMode = (settings.indicatorStyle || 'subtle-glow') === 'subtle-glow';
    const finalGradient = isSubtleMode
      ? 'radial-gradient(ellipse at 50% 50%, rgba(248, 250, 252, 0.42) 0%, rgba(203, 213, 225, 0.22) 55%, transparent 100%)'
      : coreGradient;
    const finalGlow = isSubtleMode
      ? '0 0 16px 3px rgba(226, 232, 240, 0.28)'
      : outerGlow;

    setActiveAura({
      id: `aura-${Date.now()}`,
      coreGradient: finalGradient,
      outerGlow: finalGlow,
      blurPx: isSubtleMode ? 9 : blurPx,
      cycleDuration,
    });
    auraTimerRef.current = window.setTimeout(() => {
      setActiveAura(null);
      auraTimerRef.current = null;
    }, durationMs);
  };

  // Listener Pengujian Langsung dari Menu Pengaturan
  useEffect(() => {
    const handleTestIndicator = () => {
      triggerTimedAura(
        'radial-gradient(ellipse at 50% 50%, rgba(248, 250, 252, 0.45) 0%, rgba(203, 213, 225, 0.25) 55%, transparent 100%)',
        '0 0 16px 3px rgba(226, 232, 240, 0.28)',
        4200,
        '2.2s',
        9
      );
    };
    window.addEventListener('loony-test-indicator', handleTestIndicator);
    return () => window.removeEventListener('loony-test-indicator', handleTestIndicator);
  }, [settings.indicatorStyle]);

  // 1) Musik mulai diputar atau lagu berganti -> Backlight Aura Cyan-Rose (5 detik lalu mati)
  useEffect(() => {
    const trackChanged =
      musicTrackName &&
      musicTrackName !== 'Belum ada media diputar' &&
      musicTrackName !== 'No media playing' &&
      musicTrackName !== prevTrackRef.current;
    const startedPlaying = isPlayingMusic && !prevPlayingRef.current;

    prevTrackRef.current = musicTrackName;
    prevPlayingRef.current = isPlayingMusic;

    if (isPlayingMusic && (trackChanged || startedPlaying)) {
      triggerTimedAura(
        'linear-gradient(90deg, rgba(34, 211, 238, 0.55), rgba(244, 63, 94, 0.45), rgba(56, 189, 248, 0.55))',
        '0 0 22px 5px rgba(34, 211, 238, 0.42), 0 0 36px 10px rgba(244, 63, 94, 0.24)',
        5200,
        '2.1s',
        12
      );
    }
  }, [musicTrackName, musicArtistName, isPlayingMusic, islandMode]);

  // 2) Clipboard baru (Ctrl+C) -> Backlight Aura Violet (4.5 detik lalu mati)
  useEffect(() => {
    const latest = clipboardHistory[0];
    if (latest && latest.id !== prevClipIdRef.current) {
      prevClipIdRef.current = latest.id;
      triggerTimedAura(
        'linear-gradient(90deg, rgba(168, 85, 247, 0.55), rgba(139, 92, 246, 0.5))',
        '0 0 22px 5px rgba(168, 85, 247, 0.42), 0 0 34px 9px rgba(139, 92, 246, 0.24)',
        4500,
        '2.0s',
        11
      );
    }
  }, [clipboardHistory, islandMode]);

  // 3) File Bridge baru masuk -> Backlight Aura Violet-Fuchsia (5 detik lalu mati)
  useEffect(() => {
    const latestFile = bridgeFiles[0];
    if (latestFile && latestFile.id !== prevBridgeIdRef.current) {
      prevBridgeIdRef.current = latestFile.id;
      triggerTimedAura(
        'linear-gradient(90deg, rgba(217, 70, 239, 0.55), rgba(168, 85, 247, 0.5))',
        '0 0 22px 5px rgba(217, 70, 239, 0.42), 0 0 34px 9px rgba(168, 85, 247, 0.24)',
        5000,
        '2.0s',
        11
      );
    }
  }, [bridgeFiles, islandMode]);

  // 4) Peringatan Jadwal / Tugas / Notif -> Backlight Aura Coral-Rose (5.5 detik lalu mati)
  useEffect(() => {
    if (loonySignLabel && loonySignLabel !== prevSignRef.current) {
      prevSignRef.current = loonySignLabel;
      triggerTimedAura(
        'linear-gradient(90deg, rgba(244, 63, 94, 0.55), rgba(251, 113, 133, 0.5))',
        '0 0 22px 5px rgba(244, 63, 94, 0.42), 0 0 34px 9px rgba(251, 113, 133, 0.24)',
        5500,
        '2.0s',
        11
      );
    } else if (!loonySignLabel) {
      prevSignRef.current = null;
    }
  }, [loonySignLabel, islandMode]);

  // 5) Overbudget Warning -> Backlight Aura Amber-Rose (5.5 detik lalu mati)
  useEffect(() => {
    const isDanger = safeToSpend.statusLevel === 'danger';
    if (isDanger && !prevBudgetDangerRef.current) {
      triggerTimedAura(
        'linear-gradient(90deg, rgba(245, 158, 11, 0.55), rgba(244, 63, 94, 0.55))',
        '0 0 22px 5px rgba(244, 63, 94, 0.42), 0 0 34px 9px rgba(245, 158, 11, 0.24)',
        5500,
        '1.9s',
        11
      );
    }
    prevBudgetDangerRef.current = isDanger;
  }, [safeToSpend.statusLevel]);

  // 6) Waktu Shalat atau Mengantuk (RnR 4: Aura mengantuk dibuat jauh lebih tipis & berbatas waktu)
  useEffect(() => {
    if (mascotMood !== prevMoodRef.current) {
      prevMoodRef.current = mascotMood;
      if (mascotMood === 'prayer-calm') {
        triggerTimedAura(
          'linear-gradient(90deg, rgba(16, 185, 129, 0.52), rgba(52, 211, 153, 0.45))',
          '0 0 22px 5px rgba(16, 185, 129, 0.38), 0 0 34px 9px rgba(52, 211, 153, 0.22)',
          6000,
          '2.6s',
          11
        );
      } else if (mascotMood === 'sleepy' || mascotMood === 'drowsy' || mascotMood === 'sleeping') {
        // RnR 4: Backlight aura mengantuk ekstra tipis & lembut dari belakang kapsul
        triggerTimedAura(
          'linear-gradient(90deg, rgba(99, 102, 241, 0.22), rgba(129, 140, 248, 0.18))',
          '0 0 10px 1.5px rgba(99, 102, 241, 0.2)',
          4500,
          '3.2s',
          6
        );
      }
    }
  }, [mascotMood]);

  // 7) Focus Timer Selesai (00:00) -> Backlight Aura Semarak Indigo-Cyan-Emerald (6.5 detik) & Whisper
  useEffect(() => {
    if (
      lastFocusTimerCompletedAt &&
      lastFocusTimerCompletedAt !== prevFocusTimerCompletedRef.current
    ) {
      prevFocusTimerCompletedRef.current = lastFocusTimerCompletedAt;
      triggerTimedAura(
        'linear-gradient(90deg, rgba(99, 102, 241, 0.72), rgba(56, 189, 248, 0.65), rgba(16, 185, 129, 0.6))',
        '0 0 28px 7px rgba(99, 102, 241, 0.5), 0 0 44px 12px rgba(56, 189, 248, 0.32)',
        6500,
        '1.8s',
        12
      );
    }
  }, [lastFocusTimerCompletedAt, islandMode]);

  // =========================================================================
  // INTERAKSI ELUS KEPALA (CURSOR PETTING -> ^━^ & BACKLIGHT AURA TIPIS)
  // Khusus saat berada di tampilan Loony (idle atau tool mascot)
  // =========================================================================
  useEffect(() => {
    if (islandMode !== 'idle' && activeTool !== 'mascot') {
      setIsPetted(false);
      petTrackerRef.current.reversals = 0;
      if (petTimerRef.current) clearTimeout(petTimerRef.current);
    }
  }, [activeTool, islandMode]);

  const handleCapsulePointerMoveForPetting = (e: React.PointerEvent) => {
    if (isDraggingPosition || isSnapping || dragPointerRef.current?.moved) return;

    // RnR 2: Hanya izinkan elus (petting) jika pengguna sedang berada di tampilan Loony
    if (islandMode !== 'idle') {
      if (!isDockSide) {
        // Mode atas/tengah mengambang: hanya boleh dielus jika activeTool adalah 'mascot'
        if (activeTool !== 'mascot') return;
      } else {
        // Docking samping: hanya boleh jika kursor berada tepat di kolom 54px Loony (bukan di rak tool)
        if (capsuleRef.current) {
          const rect = capsuleRef.current.getBoundingClientRect();
          const relX = e.clientX - rect.left;
          if (isDockLeft && relX > 56) return;
          if (isDockRight && relX < rect.width - 56) return;
        }
      }
    }

    const now = performance.now();
    const tracker = petTrackerRef.current;
    const dx = e.clientX - tracker.lastX;
    const dy = e.clientY - tracker.lastY;
    const primaryDelta = isDockSide ? dy : dx;

    if (Math.abs(primaryDelta) < 6) return;

    const dir = primaryDelta > 0 ? 1 : -1;
    if (now - tracker.lastTime > 750) {
      tracker.reversals = 0;
    } else if (tracker.lastDir !== 0 && dir !== tracker.lastDir) {
      tracker.reversals += 1;
    }

    tracker.lastX = e.clientX;
    tracker.lastY = e.clientY;
    tracker.lastDir = dir;
    tracker.lastTime = now;

    if (tracker.reversals >= 3 && !isPetted) {
      tracker.reversals = 0;
      setIsPetted(true);
      soundEngine.playHappyPatChime();
      setImpactSquash({ scaleX: 1.09, scaleY: 0.91 });
      window.setTimeout(() => setImpactSquash({ scaleX: 1, scaleY: 1 }), 190);

      // RnR 4: Backlight aura sedang dielus ekstra tipis dari belakang kapsul selama 2.5 detik
      triggerTimedAura(
        'linear-gradient(90deg, rgba(251, 191, 36, 0.25), rgba(251, 113, 133, 0.22))',
        '0 0 11px 1.5px rgba(251, 191, 36, 0.22)',
        2500,
        '1.8s',
        6
      );

      if (petTimerRef.current) clearTimeout(petTimerRef.current);
      petTimerRef.current = window.setTimeout(() => {
        setIsPetted(false);
      }, 2500);
    }
  };

  const markTypingActivity = () => {
    setIsActivelyTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      setIsActivelyTyping(false);
    }, 600);
  };

  const shouldHoldCapsuleOpen =
    isCursorInside ||
    isDraggingPosition ||
    isDraggingFile ||
    isActivelyTyping;

  useEffect(() => {
    setExternalCuriousActive(isActivelyTyping || isDraggingFile);
  }, [isActivelyTyping, isDraggingFile, setExternalCuriousActive]);

  // Update Jam Digital Real-Time
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
      setSecondsText(String(now.getSeconds()).padStart(2, '0'));
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  const autoCloseDelayMs = Math.max(1000, (settings.capsuleAutoCloseSec || 3.5) * 1000);
  const capsuleScale = settings.capsuleScale || 1;

  // Status sembunyikan kapsul saat aplikasi/game layar penuh aktif (jika preferensi pengguna diatur ke 'hide')
  const isHiddenByFullscreen =
    isSystemFullscreen &&
    (settings.fullscreenBehavior || 'hide') === 'hide' &&
    islandMode !== 'full-dashboard';

  useEffect(() => {
    if (isHiddenByFullscreen) {
      window.electronAPI?.setIgnoreMouseEvents(true);
      if (islandMode !== 'idle') {
        setIslandMode('idle');
      }
    }
  }, [isHiddenByFullscreen, islandMode, setIslandMode]);

  // =========================================================================
  // DIMENSI LAYAR REAKTIF UNTUK MULTI-MONITOR (SINKRON DENGAN KURSOR OS)
  // =========================================================================
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1366,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({
        w: window.innerWidth || 1366,
        h: window.innerHeight || 768,
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const winW = viewport.w;
  const winH = viewport.h;

  // Deteksi kursor OS & kelola click-through window + sinkronisasi ukuran monitor aktif
  useEffect(() => {
    if (!window.electronAPI?.onGlobalCursor) return;
    if (islandMode === 'full-dashboard') return;
    const unsubscribe = window.electronAPI.onGlobalCursor((pt) => {
      if (pt.screenW > 0 && pt.screenH > 0) {
        setViewport((prev) =>
          prev.w !== pt.screenW || prev.h !== pt.screenH
            ? { w: pt.screenW, h: pt.screenH }
            : prev
        );
      }

      if (!capsuleRef.current) return;
      const rect = capsuleRef.current.getBoundingClientRect();
      const pad = 16;
      const insideWithPad =
        pt.x >= rect.left - pad &&
        pt.x <= rect.right + pad &&
        pt.y >= rect.top - pad &&
        pt.y <= rect.bottom + pad;

      const strictlyInside =
        pt.x >= rect.left - 3 &&
        pt.x <= rect.right + 3 &&
        pt.y >= rect.top - 3 &&
        pt.y <= rect.bottom + 3;

      setIsCursorInside((prev) => (prev !== strictlyInside ? strictlyInside : prev));

      if (strictlyInside && islandMode === 'idle' && !isDraggingPosition && !snapFlight) {
        setIslandMode('hover');
      }

      if (insideWithPad || isDraggingPosition || snapFlight) {
        if (!isHiddenByFullscreen) {
          window.electronAPI?.setIgnoreMouseEvents(false);
        }
      } else if (!isDraggingPosition) {
        window.electronAPI?.setIgnoreMouseEvents(true);
      }
    });
    return () => unsubscribe();
  }, [isDraggingPosition, snapFlight, islandMode, setIslandMode, isHiddenByFullscreen]);

  // Timer Auto-Close: Setiap kali kapsul mengecil kembali ke 'idle', reset tool ke Loony (index 0)
  useEffect(() => {
    if (islandMode === 'idle') {
      setActiveToolIdx(0);
      setIsPrayerExpanded(false);
      setIsCalendarExpanded(false);
    }
  }, [islandMode]);

  useEffect(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    if (islandMode === 'idle' || islandMode === 'full-dashboard') return;

    if (shouldHoldCapsuleOpen) return;

    leaveTimerRef.current = window.setTimeout(() => {
      setIsPrayerExpanded(false);
      setIsCalendarExpanded(false);
      setActiveToolIdx(0);
      setIslandMode('idle');
      window.electronAPI?.setIgnoreMouseEvents(true);
    }, autoCloseDelayMs);

    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };
  }, [islandMode, shouldHoldCapsuleOpen, setIslandMode, autoCloseDelayMs]);

  // =========================================================================
  // LOGIKA DRAG & TARIKAN MAGNET KUAT KE SEMUA SISI (RnR 3 & RnR 6)
  // =========================================================================

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('form') ||
      target.closest('[data-interactive="true"]')
    ) {
      return;
    }

    dragPointerRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };

    window.electronAPI?.setIgnoreMouseEvents(false);
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragPointerRef.current) return;
      const dx = e.clientX - dragPointerRef.current.startX;
      const dy = e.clientY - dragPointerRef.current.startY;

      if (!dragPointerRef.current.moved && Math.hypot(dx, dy) > 4) {
        dragPointerRef.current.moved = true;
        setIsDraggingPosition(true);
        // RnR 6: Hilangkan semua efek aura saat sedang di-drag!
        setActiveAura(null);
        setIsCalendarExpanded(false);
        setIsPrayerExpanded(false);
        setIslandMode('idle');
      }

      if (!dragPointerRef.current.moved) return;

      const currentSize = 54;
      const minMargin = 40;

      const rawX = e.clientX - currentSize / 2;
      const rawY = e.clientY - currentSize / 2;

      const clampedX = Math.max(minMargin, Math.min(winW - currentSize - minMargin, rawX));
      const clampedY = Math.max(minMargin, Math.min(winH - currentSize - minMargin, rawY));

      dragPointerRef.current.lastX = clampedX;
      dragPointerRef.current.lastY = clampedY;
      setDragPreview({ x: clampedX, y: clampedY });
    };

    const onPointerUp = () => {
      if (!dragPointerRef.current) return;
      const wasMoved = dragPointerRef.current.moved;
      const lastRecordedX = dragPointerRef.current.lastX;
      const lastRecordedY = dragPointerRef.current.lastY;
      dragPointerRef.current = null;

      if (!wasMoved) {
        setIsDraggingPosition(false);
        setDragPreview(null);
        return;
      }

      const currentSize = 54;
      const curX = lastRecordedX ?? dragPreview?.x ?? winW / 2 - currentSize / 2;
      const curY = lastRecordedY ?? dragPreview?.y ?? 100;

      const distTop = curY;
      const distLeft = curX;
      const distRight = winW - (curX + currentSize);

      const MAGNET_THRESHOLD = 140;
      const minDist = Math.min(distTop, distLeft, distRight);

      if (minDist <= MAGNET_THRESHOLD) {
        let targetDock: DockPosition = 'top';
        let startX = curX;
        let startY = curY;
        let targetX = curX;
        let targetY = curY;
        let finalOffset = { x: 0, y: 0 };
        let snapDirection: 'left' | 'right' | 'top' = 'top';

        if (distLeft === minDist) {
          targetDock = 'left';
          targetX = 0;
          targetY = curY;
          finalOffset = { x: 0, y: Math.max(0.05, Math.min(0.92, curY / winH)) };
          snapDirection = 'left';
        } else if (distRight === minDist) {
          targetDock = 'right';
          targetX = winW - currentSize;
          targetY = curY;
          finalOffset = { x: 0, y: Math.max(0.05, Math.min(0.92, curY / winH)) };
          snapDirection = 'right';
        } else {
          targetDock = 'top';
          const curCenterX = curX + currentSize / 2;
          const targetCenterX = Math.max(175, Math.min(winW - 175, curCenterX));
          startX = curX;
          startY = curY;
          targetX = targetCenterX - currentSize / 2;
          targetY = 0;
          finalOffset = { x: Math.max(0.1, Math.min(0.9, targetCenterX / winW)), y: 0 };
          snapDirection = 'top';
        }

        const startTime = performance.now();
        const pullDuration = 200;

        setSnapDirectionState(snapDirection);
        setIsSnapping(true);
        setSnapFlight({ x: startX, y: startY });
        setDragPreview(null);
        setIsDraggingPosition(false);

        const animateMagneticPull = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / pullDuration);
          const progress = t * t * (1.6 - 0.6 * t);

          const curFlyX = startX + (targetX - startX) * progress;
          const curFlyY = startY + (targetY - startY) * progress;

          if (snapDirection === 'left') {
            setInertiaLag({ x: 20 * progress, y: 0 });
          } else if (snapDirection === 'right') {
            setInertiaLag({ x: -20 * progress, y: 0 });
          } else {
            setInertiaLag({ x: 0, y: 16 * progress });
          }

          setSnapFlight({ x: curFlyX, y: curFlyY });

          if (t < 1) {
            requestAnimationFrame(animateMagneticPull);
          } else {
            setDockPosition(targetDock);
            setIslandOffset(finalOffset);
            setSnapFlight(null);
            setIsSnapping(false);
            setSnapDirectionState(null);
            setInertiaLag({ x: 0, y: 0 });

            soundEngine.playMagneticImpact();

            if (snapDirection === 'left' || snapDirection === 'right') {
              setImpactSquash({ scaleX: 0.86, scaleY: 1.14 });
              window.setTimeout(() => setImpactSquash({ scaleX: 1, scaleY: 1 }), 140);
            } else {
              setImpactSquash({ scaleX: 1, scaleY: 0.94 });
              window.setTimeout(() => setImpactSquash({ scaleX: 1, scaleY: 1 }), 120);
            }

            // Partikel benturan di kedua sudut yang menghantam layar (termasuk sudut kiri-kanan atas!)
            const subtleColors = ['#ffffff', '#e4e4e7', '#a1a1aa'];
            const newSparks: FrictionSpark[] = [];

            const corners: Array<{ x: number; y: number; side?: 'L' | 'R' }> =
              snapDirection === 'left'
                ? [
                    { x: 2, y: 4 },
                    { x: 2, y: 50 },
                  ]
                : snapDirection === 'right'
                  ? [
                      { x: 52, y: 4 },
                      { x: 52, y: 50 },
                    ]
                  : [
                      { x: -2, y: 3, side: 'L' },
                      { x: 138, y: 3, side: 'R' },
                    ];

            corners.forEach((corner, cIdx) => {
              for (let i = 0; i < 2; i++) {
                let vx = 0;
                let vy = 0;

                if (snapDirection === 'left') {
                  vx = Math.random() * 18 + 10;
                  vy = (Math.random() - 0.5) * 20;
                } else if (snapDirection === 'right') {
                  vx = -(Math.random() * 18 + 10);
                  vy = (Math.random() - 0.5) * 20;
                } else {
                  // Untuk sisi atas, percikan memancar keluar ke samping kiri & kanan dari sudut kapsul
                  const dirSign = corner.side === 'L' ? -1 : 1;
                  vx = dirSign * (Math.random() * 18 + 10);
                  vy = Math.random() * 12 + 4;
                }

                const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
                const length = Math.random() * 3 + 4;

                newSparks.push({
                  id: Date.now() + cIdx * 10 + i,
                  x: corner.x,
                  y: corner.y,
                  vx,
                  vy,
                  length,
                  angle,
                  color: subtleColors[(cIdx + i) % subtleColors.length],
                });
              }
            });

            setSparks(newSparks);
            window.setTimeout(() => setSparks([]), 300);

            // Reaksi maskot Loony saat menabrak (75% geleng kepala + kedip, 25% pusing 2 detik)
            const isDizzyReaction = Math.random() < 0.25;
            if (isDizzyReaction) {
              setIsDizzy(true);
              if (dizzyTimerRef.current) clearTimeout(dizzyTimerRef.current);
              dizzyTimerRef.current = window.setTimeout(() => {
                setIsDizzy(false);
                setIsHeadShaking(true);
                window.setTimeout(() => setIsHeadShaking(false), 450);
              }, 2000);
            } else {
              setIsHeadShaking(true);
              if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
              shakeTimerRef.current = window.setTimeout(() => setIsHeadShaking(false), 450);
            }
          }
        };

        requestAnimationFrame(animateMagneticPull);
      } else {
        setDragPreview(null);
        setIsDraggingPosition(false);
        setDockPosition('float');
        setIslandOffset({
          x: Math.max(0.1, Math.min(0.9, (curX + currentSize / 2) / winW)),
          y: Math.max(0.05, Math.min(0.9, curY / winH)),
        });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragPreview, setDockPosition, setIslandMode, setIslandOffset, winH, winW]);

  const handleMouseEnter = () => {
    setIsCursorInside(true);
    window.electronAPI?.setIgnoreMouseEvents(false);
    if (islandMode === 'idle' && !isDraggingPosition && !snapFlight) {
      setIslandMode('hover');
    }
  };

  const handleMouseLeave = () => {
    setIsCursorInside(false);
    if (islandMode === 'full-dashboard') return;
    if (!isDraggingPosition && !snapFlight) {
      window.electronAPI?.setIgnoreMouseEvents(true);
    }
  };

  const stepTool = (dir: 1 | -1) => {
    setIsActivelyTyping(false);
    setIsCalendarExpanded(false);
    setIsPrayerExpanded(false);
    setActiveToolIdx((prev) => (prev + dir + toolPanels.length) % toolPanels.length);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (islandMode === 'idle') return;
    const now = Date.now();
    if (now - wheelCooldownRef.current < 210) return;
    if (Math.abs(e.deltaY) > 8 || Math.abs(e.deltaX) > 8) {
      wheelCooldownRef.current = now;
      const dir = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
      stepTool(dir);
    }
  };

  // Data Kalender Bulan Ini + Strip 7 Hari Minggu Ini
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayDate = now.getDate();
    const locale = isEn ? 'en-US' : 'id-ID';
    const monthName = now.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
    const fullMonthName = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const scheduledDays = new Set<number>();
    const ymPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    schedules.forEach((s) => {
      if (s.date.startsWith(ymPrefix)) {
        const d = parseInt(s.date.slice(ymPrefix.length), 10);
        if (!isNaN(d)) scheduledDays.add(d);
      }
    });

    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const dayLabels = isEn
      ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
      : ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    const weekStrip = dayLabels.map((label, idx) => {
      const d = new Date(year, month, todayDate - currentDayOfWeek + idx);
      const dateNum = d.getDate();
      const isSameMonth = d.getMonth() === month;
      return {
        label,
        dateNum,
        isToday: isSameMonth && dateNum === todayDate,
        hasSchedule: isSameMonth && scheduledDays.has(dateNum),
      };
    });

    return { monthName, fullMonthName, todayDate, cells, scheduledDays, weekStrip };
  }, [schedules, isEn]);

  // Daftar Tugas untuk Panel Todo
  const topThreeTasks = useMemo(() => {
    const habitTasks = habits.map((h) => ({
      id: h.id,
      title: h.title,
      done: h.completedToday,
      time: h.deadlineTime,
      isHabit: true,
    }));
    const schedTasks = schedules.map((s) => ({
      id: s.id,
      title: s.title,
      done: false,
      time: s.startTime,
      isHabit: false,
    }));
    return [...habitTasks, ...schedTasks].slice(0, 3);
  }, [habits, schedules]);

  const pendingTask = useMemo(
    () => topThreeTasks.find((t) => !t.done) || topThreeTasks[0] || null,
    [topThreeTasks]
  );

  const handleQuickInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    await executeQuickCapture(quickInput.trim());
    setQuickInput('');
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1400);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteInput.trim()) return;
    pushClipboardText(pasteInput.trim());
    setPasteInput('');
    setPasteSaved(true);
    setTimeout(() => setPasteSaved(false), 1200);
  };

  const openFullWindow = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCursorInside(false);
    window.electronAPI?.setIgnoreMouseEvents(false);
    setIslandMode('full-dashboard');
  };

  // =========================================================================
  // KOORDINAT & GAYA LAYOUT FIXED CONTAINER (PROPORSIONAL MULTI-MONITOR)
  // =========================================================================
  const containerStyle: React.CSSProperties = useMemo(() => {
    if (snapFlight) {
      if (snapDirectionState === 'left' || snapDirectionState === 'right') {
        return {
          position: 'fixed',
          left: `${snapFlight.x}px`,
          top: `${snapFlight.y}px`,
          zIndex: 50,
        };
      }
      return {
        position: 'fixed',
        left: `${snapFlight.x + 27}px`,
        top: `${snapFlight.y}px`,
        transform: 'translateX(-50%)',
        zIndex: 50,
      };
    }

    if (dragPreview) {
      return {
        position: 'fixed',
        left: `${dragPreview.x}px`,
        top: `${dragPreview.y}px`,
        zIndex: 50,
      };
    }

    // Konversi rasio proporsional (0..1) atau nilai piksel lama (>1) ke ukuran monitor aktif saat ini
    const resolvedX = !islandOffset.x
      ? winW * 0.5
      : islandOffset.x <= 1
        ? islandOffset.x * winW
        : islandOffset.x;

    const resolvedY = !islandOffset.y
      ? winH * 0.35
      : islandOffset.y <= 1
        ? islandOffset.y * winH
        : islandOffset.y;

    if (isDockLeft) {
      return {
        position: 'fixed',
        left: 0,
        top: `${Math.max(40, Math.min(winH - 100, resolvedY))}px`,
        zIndex: 50,
      };
    }

    if (isDockRight) {
      return {
        position: 'fixed',
        right: 0,
        top: `${Math.max(40, Math.min(winH - 100, resolvedY))}px`,
        zIndex: 50,
      };
    }

    if (dockPosition === 'float') {
      const floatCenterX = Math.max(175, Math.min(winW - 175, resolvedX));
      return {
        position: 'fixed',
        left: `${floatCenterX}px`,
        top: `${Math.max(40, Math.min(winH - 140, resolvedY))}px`,
        transform: 'translateX(-50%)',
        zIndex: 50,
      };
    }

    const centerX = Math.max(175, Math.min(winW - 175, resolvedX));
    return {
      position: 'fixed',
      top: 0,
      left: `${centerX}px`,
      transform: 'translateX(-50%)',
      zIndex: 50,
    };
  }, [snapFlight, snapDirectionState, dragPreview, dockPosition, isDockLeft, isDockRight, islandOffset, winH, winW]);

  const focusTimerFormatted = useMemo(() => {
    const mins = Math.floor(focusTimerSecondsLeft / 60);
    const secs = focusTimerSecondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [focusTimerSecondsLeft]);

  // Dimensi target animasi kapsul
  const targetDimensions = useMemo(() => {
    if (isCompactSquare) {
      return { width: 54, height: 54 };
    }
    if (isDockSide) {
      if (islandMode === 'idle') {
        return {
          width: isFocusTimerRunning ? 104 : 54,
          height: 54,
        };
      }
      return {
        width: 356,
        height: showExpandedCalendar ? 236 : showExpandedPrayer ? 114 : 62,
      };
    }
    if (islandMode === 'idle') {
      return {
        width: isFocusTimerRunning ? 174 : 136,
        height: 38,
      };
    }
    return {
      width: 334,
      height: showExpandedCalendar ? 244 : showExpandedPrayer ? 124 : 76,
    };
  }, [
    isCompactSquare,
    isDockSide,
    islandMode,
    isFocusTimerRunning,
    showExpandedCalendar,
    showExpandedPrayer,
  ]);

  const floatAmbientAnimate =
    dockPosition === 'float' && islandMode === 'idle' && !isCompactSquare
      ? { y: [0, -3, 0] }
      : { y: 0 };

  const renderPrayerExpandedStrip = () => (
    <PrayerExpandedStrip
      prayerSchedule={prayerSchedule}
      nextPrayer={nextPrayer}
      isEn={isEn}
    />
  );

  const renderFullCalendarGrid = () => (
    <FullCalendarGrid
      calendarData={calendarData}
      isEn={isEn}
    />
  );

  const renderActiveToolContent = () => (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={activeTool}
        initial={{ opacity: 0, y: 4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="w-full h-[46px] flex items-center justify-center overflow-hidden"
      >
        {activeTool === 'mascot' && !isDockSide && (
          <MascotToolView
            mood={mascotMood}
            isPlayingMusic={isPlayingMusic}
            signLabel={loonySignLabel}
            inertiaOffset={inertiaLag}
            isDizzy={isDizzy}
            isHeadShaking={isHeadShaking}
            isPetted={isPetted}
            dockPosition={dockPosition}
            onOpenFullWindow={openFullWindow}
          />
        )}

        {activeTool === 'clock-prayer' && (
          <ClockPrayerToolView
            clockText={clockText}
            secondsText={secondsText}
            settings={settings}
            nextPrayer={nextPrayer}
            weather={weather}
            isPrayerExpanded={isPrayerExpanded}
            onTogglePrayerExpanded={() => setIsPrayerExpanded((p) => !p)}
          />
        )}

        {activeTool === 'focus-timer' && (
          <FocusTimerToolView
            isFocusTimerRunning={isFocusTimerRunning}
            focusTimerFormatted={focusTimerFormatted}
            focusTimerTotalSeconds={focusTimerTotalSeconds}
            onStartFocusTimer={startFocusTimer}
            onToggleFocusTimer={toggleFocusTimer}
            onResetFocusTimer={resetFocusTimer}
            isEn={isEn}
          />
        )}

        {activeTool === 'calendar' && (
          <CalendarToolView
            calendarData={calendarData}
            isCalendarExpanded={isCalendarExpanded}
            onToggleCalendarExpanded={() => setIsCalendarExpanded((p) => !p)}
            isEn={isEn}
          />
        )}

        {activeTool === 'clipboard' && (
          <ClipboardBridgeToolView
            pasteInput={pasteInput}
            onPasteInputChange={setPasteInput}
            onPasteSubmit={handlePasteSubmit}
            markTypingActivity={markTypingActivity}
            pasteSaved={pasteSaved}
            clipboardHistory={clipboardHistory}
            onSendFile={sendBridgeFile}
            isEn={isEn}
          />
        )}

        {activeTool === 'quick-input' && (
          <QuickCaptureToolView
            quickInput={quickInput}
            onQuickInputChange={setQuickInput}
            onQuickInputSubmit={handleQuickInputSubmit}
            markTypingActivity={markTypingActivity}
            savedIndicator={savedIndicator}
            isEn={isEn}
          />
        )}

        {activeTool === 'todo' && (
          <TodoToolView
            pendingTask={pendingTask}
            onToggleHabitCompleted={toggleHabitCompleted}
            isEn={isEn}
          />
        )}

        {activeTool === 'music' && (
          <MusicToolView
            isPlayingMusic={isPlayingMusic}
            musicTrackName={musicTrackName}
            musicArtistName={musicArtistName}
            onOpenMusicSourceApp={openMusicSourceApp}
            onPrevTrack={prevMusicTrack}
            onToggleMusicPlayer={toggleMusicPlayer}
            onNextTrack={nextMusicTrack}
            isEn={isEn}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  const renderToolDots = () => (
    <CapsuleToolDots
      toolPanels={toolPanels}
      activeToolIdx={activeToolIdx}
      resolvedCapsuleTheme={resolvedCapsuleTheme}
      isEn={isEn}
      prayerFeatureEnabled={settings.prayerFeatureEnabled !== false}
      onSelectToolIdx={(idx) => {
        setIsActivelyTyping(false);
        setIsCalendarExpanded(false);
        setIsPrayerExpanded(false);
        setActiveToolIdx(idx);
      }}
    />
  );

  if (islandMode === 'full-dashboard') {
    return null;
  }

  return (
    <div
      style={{
        ...containerStyle,
        opacity: isHiddenByFullscreen ? 0 : 1,
        pointerEvents: isHiddenByFullscreen ? 'none' : undefined,
        transform: `${containerStyle.transform || ''} ${
          isHiddenByFullscreen
            ? isDockLeft
              ? 'scale(0.8) translateX(-40px)'
              : isDockRight
                ? 'scale(0.8) translateX(40px)'
                : 'scale(0.8) translateY(-40px)'
            : ''
        }`.trim(),
        transition: isHiddenByFullscreen
          ? 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          : undefined,
      }}
      data-theme={resolvedCapsuleTheme}
      className="pointer-events-none font-marshmallow"
    >
      {/* Partikel Benturan Minimalis (Putih / Abu-abu Halus) */}
      {sparks.map((spark) => (
        <motion.div
          key={spark.id}
          initial={{
            x: spark.x,
            y: spark.y,
            opacity: 0.9,
            scaleX: 1,
            scaleY: 1,
          }}
          animate={{
            x: spark.x + spark.vx,
            y: spark.y + spark.vy + 4,
            opacity: 0,
            scaleX: 0.2,
            scaleY: 0.2,
          }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
          style={{
            backgroundColor: spark.color,
            width: `${spark.length}px`,
            height: '1.5px',
            transform: `rotate(${spark.angle}deg)`,
            boxShadow: `0 0 4px 1px ${spark.color}`,
          }}
          className="absolute rounded-full pointer-events-none z-50 origin-center"
        />
      ))}

      {/* =====================================================================
          RnR 3: CAHAYA AURA DARI BELAKANG KAPSUL (BACKLIGHT MURNI TANPA GARIS TEPI)
          Mengikuti ukuran, posisi, dan lengkungan kapsul 1:1 di segala kondisi
         ===================================================================== */}
      <motion.div
        animate={{
          width: targetDimensions.width,
          height: targetDimensions.height,
          y: floatAmbientAnimate.y,
          scaleX: impactSquash.scaleX,
          scaleY: impactSquash.scaleY,
        }}
        transition={{
          width: { type: 'spring', stiffness: 420, damping: 36, mass: 0.75 },
          height: { type: 'spring', stiffness: 420, damping: 36, mass: 0.75 },
          scaleX: { type: 'spring', stiffness: 520, damping: 28 },
          scaleY: { type: 'spring', stiffness: 520, damping: 28 },
          y:
            dockPosition === 'float' && islandMode === 'idle' && !isCompactSquare
              ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 },
        }}
        style={{
          scale: capsuleScale,
          transformOrigin: isDockLeft
            ? 'left center'
            : isDockRight
              ? 'right center'
              : isDockTop
                ? 'top center'
                : 'center center',
          transition: 'border-radius 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: isCompactSquare
            ? 16
            : isDockLeft
              ? islandMode === 'idle'
                ? '0 18px 18px 0'
                : '0 22px 22px 0'
              : isDockRight
                ? islandMode === 'idle'
                  ? '18px 0 0 18px'
                  : '22px 0 0 22px'
                : isDockTop
                  ? islandMode === 'idle'
                    ? '0 0 18px 18px'
                    : '0 0 24px 24px'
                  : islandMode === 'idle'
                    ? 18
                    : 24,
        }}
        className="pointer-events-none absolute top-0 left-0 z-0"
      >
        <AnimatePresence>
          {activeAura &&
            !isDraggingPosition &&
            !isSnapping &&
            (settings.indicatorStyle || 'subtle-glow') === 'subtle-glow' && (
              <motion.div
                key={activeAura.id}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{
                  opacity: [0.18, 0.45, 0.18],
                  scale: [0.995, 1.018, 0.995],
                }}
                exit={{
                  opacity: 0,
                  scale: 0.985,
                  transition: { duration: 0.38, ease: 'easeOut' },
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
                style={
                  {
                    background: activeAura.coreGradient,
                    boxShadow: activeAura.outerGlow,
                    filter: `blur(${activeAura.blurPx}px)`,
                    willChange: 'opacity, transform',
                  } as React.CSSProperties
                }
                className="pointer-events-none absolute -inset-[3px] rounded-[inherit]"
              />
            )}
        </AnimatePresence>
      </motion.div>

      {/* =====================================================================
          KAPSUL UTAMA LOONY GEN 2 — PURE OBSIDIAN TANPA GARIS PUTIH
         ===================================================================== */}
      <motion.div
        ref={capsuleRef}
        animate={{
          width: targetDimensions.width,
          height: targetDimensions.height,
          y: floatAmbientAnimate.y,
          scaleX: impactSquash.scaleX,
          scaleY: impactSquash.scaleY,
        }}
        transition={{
          width: { type: 'spring', stiffness: 420, damping: 36, mass: 0.75 },
          height: { type: 'spring', stiffness: 420, damping: 36, mass: 0.75 },
          scaleX: { type: 'spring', stiffness: 520, damping: 28 },
          scaleY: { type: 'spring', stiffness: 520, damping: 28 },
          y:
            dockPosition === 'float' && islandMode === 'idle' && !isCompactSquare
              ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 },
        }}
        style={{
          scale: capsuleScale,
          transformOrigin: isDockLeft
            ? 'left center'
            : isDockRight
              ? 'right center'
              : isDockTop
                ? 'top center'
                : 'center center',
          transition: 'border-radius 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRadius: isCompactSquare
            ? 16
            : isDockLeft
              ? islandMode === 'idle'
                ? '0 18px 18px 0'
                : '0 22px 22px 0'
              : isDockRight
                ? islandMode === 'idle'
                  ? '18px 0 0 18px'
                  : '22px 0 0 22px'
                : isDockTop
                  ? islandMode === 'idle'
                    ? '0 0 18px 18px'
                    : '0 0 24px 24px'
                  : islandMode === 'idle'
                    ? 18
                    : 24,
          backgroundImage:
            islandMode !== 'idle' && !isCompactSquare
              ? resolvedCapsuleTheme === 'light'
                ? `radial-gradient(125% 105% at 50% 0%, ${activeAccent.lightSubtleTint} 0%, rgba(246, 246, 249, 0) 78%)`
                : `radial-gradient(120% 100% at 50% 0%, ${activeAccent.subtleTint} 0%, rgba(8, 8, 12, 0) 75%)`
              : undefined,
        }}
        data-theme={resolvedCapsuleTheme}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handleCapsulePointerMoveForPetting}
        onDoubleClick={resetIslandOffset}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
          if (islandMode === 'idle') setIslandMode('hover');
          setActiveToolIdx(toolPanels.indexOf('clipboard'));
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
          if (dragResetTimerRef.current) clearTimeout(dragResetTimerRef.current);
          dragResetTimerRef.current = window.setTimeout(() => setIsDraggingFile(false), 1200);
          if (islandMode === 'idle') setIslandMode('hover');
          if (activeTool !== 'clipboard') {
            setActiveToolIdx(toolPanels.indexOf('clipboard'));
          }
        }}
        onDragLeave={() => {
          if (dragResetTimerRef.current) clearTimeout(dragResetTimerRef.current);
          dragResetTimerRef.current = window.setTimeout(() => setIsDraggingFile(false), 600);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await sendBridgeFile(e.dataTransfer.files[0]);
          } else {
            const txt = e.dataTransfer.getData('text/plain');
            if (txt?.trim()) pushClipboardText(txt);
          }
        }}
        className="pointer-events-auto capsule-glass relative z-10 overflow-hidden text-zinc-100 cursor-grab active:cursor-grabbing"
      >
        {/* Opsi 3: Retro-Digital Hardware LED Dot (Teenage Engineering style) */}
        {settings.indicatorStyle === 'led-dot' && (
          <div
            className="pointer-events-none absolute top-2 right-2.5 z-30 flex items-center justify-center select-none"
            title={isEn ? 'Tactile LED Indicator' : 'LED Indikator Taktil'}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                activeAura
                  ? 'bg-amber-300 led-pulse-loop shadow-[0_0_8px_rgba(251,191,36,0.9)] ring-1 ring-amber-400/50'
                  : 'bg-zinc-700/50 border border-white/5'
              }`}
            />
          </div>
        )}

        {/* ===================================================================
            KONDISI A: SAAT DI-DRAG ATAU MELUNCUR MAGNET SAMPING (KOTAK 54x54)
           =================================================================== */}
        {isCompactSquare ? (
          <div className="w-[54px] h-[54px] flex items-center justify-center select-none">
            <HoloMascotEyes
              mood={mascotMood}
              size="sm"
              isCapsuleIdle={true}
              signLabel={loonySignLabel}
              inertiaOffset={inertiaLag}
              isPetted={isPetted}
              dockPosition={dockPosition}
            />
          </div>
        ) : isDockSide ? (
          /* ===================================================================
              KONDISI B: DOCKING SAMPING DENGAN RAK GESER & MINI-PEEK WHISPER
             =================================================================== */
          <div className="flex flex-col w-full h-full overflow-hidden">
            {/* Baris Utama: Maskot Loony & Rak Alat Samping */}
            <div className="relative w-full h-[62px] shrink-0">
              {/* Mata Maskot Loony: Terkunci Permanen di Tepi Luar (Kiri untuk Dock Left, Kanan untuk Dock Right) */}
              <div
                onClick={openFullWindow}
                className={`absolute top-0 w-[54px] ${
                  islandMode === 'idle' ? 'h-[54px]' : 'h-[62px]'
                } flex items-center justify-center hover:bg-white/[0.03] transition-colors cursor-pointer select-none z-20 ${
                  isDockLeft ? 'left-0' : 'right-0'
                }`}
              >
                <HoloMascotEyes
                  mood={mascotMood}
                  size="sm"
                  isCapsuleIdle={islandMode === 'idle'}
                  isPlayingMusic={isPlayingMusic}
                  signLabel={loonySignLabel}
                  inertiaOffset={inertiaLag}
                  isDizzy={isDizzy}
                  isHeadShaking={isHeadShaking}
                  isPetted={isPetted}
                  dockPosition={dockPosition}
                  idleSleepSec={settings.idleSleepSec ?? 45}
                />
              </div>

              {/* Timer Fokus saat Idle (jika sedang aktif) */}
              <AnimatePresence>
                {islandMode === 'idle' && isFocusTimerRunning && (
                  <div
                    className={`absolute top-0 h-[54px] w-[50px] flex items-center justify-center px-1.5 overflow-hidden z-10 ${
                      isDockLeft ? 'left-[54px]' : 'right-[54px]'
                    }`}
                  >
                    <span className="text-[11px] font-bold tabular-nums text-indigo-300">
                      {focusTimerFormatted}
                    </span>
                  </div>
                )}
              </AnimatePresence>

              {/* Rak Alat (Side Shelf Content) - Meluncur Halus dari Bawah Loony ke Arah Dalam Layar */}
              <div
                className={`absolute top-0 ${
                  islandMode === 'idle' ? 'h-[54px]' : 'h-[62px]'
                } w-[302px] flex flex-col justify-center px-2.5 z-10 pointer-events-auto transition-opacity duration-150 ${
                  isDockLeft ? 'left-[54px]' : 'right-[54px]'
                } ${islandMode !== 'idle' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                <div className="w-full">{renderActiveToolContent()}</div>
                {renderToolDots()}
              </div>
            </div>

            {/* Kalender / Strip Shalat saat Diperluas */}
            <AnimatePresence>
              {showExpandedCalendar && renderFullCalendarGrid()}
              {showExpandedPrayer && renderPrayerExpandedStrip()}
            </AnimatePresence>
          </div>
        ) : (
          /* ===================================================================
              KONDISI C: HORIZONTAL ATAS & TENGAH (FLOAT SIMETRIS)
             =================================================================== */
          <div className="w-full h-full flex flex-col items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {islandMode === 'idle' ? (
                <motion.div
                  key="horiz-idle"
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.14 }}
                  className="w-full h-full flex items-center justify-center gap-2 px-2.5 select-none"
                >
                  <HoloMascotEyes
                    mood={mascotMood}
                    size="sm"
                    isCapsuleIdle={true}
                    isPlayingMusic={isPlayingMusic}
                    signLabel={loonySignLabel}
                    inertiaOffset={inertiaLag}
                    isDizzy={isDizzy}
                    isHeadShaking={isHeadShaking}
                    isPetted={isPetted}
                    dockPosition={dockPosition}
                    idleSleepSec={settings.idleSleepSec ?? 45}
                    onClick={openFullWindow}
                  />
                  {isFocusTimerRunning && (
                    <span className="text-[11px] font-bold tabular-nums text-indigo-300 tracking-tight">
                      {focusTimerFormatted}
                    </span>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="horiz-open"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  className="w-[334px] flex flex-col px-3 pt-2 pb-1.5"
                >
                  <div className="w-full">{renderActiveToolContent()}</div>

                  {renderToolDots()}

                  <AnimatePresence>
                    {showExpandedCalendar && renderFullCalendarGrid()}
                    {showExpandedPrayer && renderPrayerExpandedStrip()}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
