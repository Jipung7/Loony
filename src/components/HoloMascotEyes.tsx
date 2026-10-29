import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoonyMorphFace, LoonySignLabel, MascotMood } from '../types';

interface HoloMascotEyesProps {
  mood: MascotMood;
  onClick?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  isCapsuleIdle?: boolean;
  isPlayingMusic?: boolean;
  signLabel?: LoonySignLabel;
  // Loony Gen 2 Living Physics
  inertiaOffset?: { x: number; y: number };
  isDizzy?: boolean;
  isHeadShaking?: boolean;
  isPetted?: boolean;
  dockPosition?: 'top' | 'left' | 'right' | 'float';
  idleSleepSec?: number;
}

type IdleQuirk = 'none' | 'glasses-off' | 'eye-roll';

const resolveMorphFace = (label?: LoonySignLabel): LoonyMorphFace | null => {
  if (!label) return null;
  if (label === 'file-in' || label === 'PHONE') return 'file-in';
  if (label === 'clipboard-copy') return 'clipboard-copy';
  if (label === 'task-done') return 'task-done';
  if (label === 'alert-upcoming' || label === 'TASK' || label === 'SCHEDULE' || label === 'NOTIF') return 'alert-upcoming';
  if (label === 'income-added') return 'income-added';
  if (label === 'budget-warning' || label === 'BUDGET') return 'budget-warning';
  return null;
};

/**
 * Maskot "Loony" — Marshmallow Glasses-Bridge Eyes
 * - Warna mata selalu putih bersih netral (#f4f4f5).
 * - Lirikan 3D perspektif aktif mengikuti kursor di seluruh layar (multi-monitor).
 * - Saat terbangun dari mengantuk/tidur: animasi kaget melotot + berkedip kencang 3x berturut-turut.
 * - Mengenakan Headset dengan outline & pemisah tegas saat sedang memutar musik/media Windows.
 * - Morphing Layar Wajah (EMO Style): Bertransformasi menjadi ikon gerak saat ada berkas masuk, copas, centang tugas, dll.
 * - Animasi Idle Tambahan (dengan jeda cooldown panjang ~50 detik agar tidak mengganggu lirikan kursor):
 *   1) Melepas Kacamata (memperlihatkan mata sipit)
 *   2) Memutar Mata ke Atas (ketika bosan melihat pengguna sibuk tanpa menyentuh Loony)
 */
export const HoloMascotEyes: React.FC<HoloMascotEyesProps> = ({
  mood,
  onClick,
  size = 'md',
  isCapsuleIdle = true,
  isPlayingMusic = false,
  signLabel = null,
  inertiaOffset = { x: 0, y: 0 },
  isDizzy = false,
  isHeadShaking = false,
  isPetted = false,
  dockPosition = 'top',
  idleSleepSec = 45,
}) => {
  const [gaze, setGaze] = useState({ normX: 0, normY: 0, speed: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [idleSleepStage, setIdleSleepStage] = useState<'awake' | 'drowsy' | 'sleeping'>('awake');
  const [idleQuirk, setIdleQuirk] = useState<IdleQuirk>('none');
  const [eyeRollPhase, setEyeRollPhase] = useState<number>(0);

  // State khusus saat Loony kaget terbangun: 'wide' (melotot kaget) | 'shut' (kedip rapat cepat) | null
  const [wakeStartlePhase, setWakeStartlePhase] = useState<'wide' | 'shut' | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastCursorRef = useRef({ x: -9999, y: -9999, t: Date.now() });
  const lastActiveTimeRef = useRef<number>(Date.now());
  const sleepStageRef = useRef<'awake' | 'drowsy' | 'sleeping'>('awake');

  // Cooldown panjang untuk Quirk Idle agar Loony tetap fokus melirik kursor sebagian besar waktu
  const busyMoveCounterRef = useRef<number>(0);
  const lastQuirkFinishedAtRef = useRef<number>(Date.now());
  const nextQuirkTypeRef = useRef<'glasses-off' | 'eye-roll'>('glasses-off');
  const quirkTimerRef = useRef<number | null>(null);
  const wakeTimersRef = useRef<number[]>([]);

  const clearWakeTimers = () => {
    wakeTimersRef.current.forEach((id) => window.clearTimeout(id));
    wakeTimersRef.current = [];
  };

  // Animasi Kaget Terbangun: Melotot sebentar lalu berkedip kencang 3 kali berturut-turut!
  const triggerStartledWakeUp = () => {
    clearWakeTimers();
    setIdleQuirk('none');
    setWakeStartlePhase('wide'); // 0ms: Mata terbuka lebar kaget + sedikit melompat

    const sequence: Array<{ delay: number; phase: 'wide' | 'shut' | null }> = [
      { delay: 75, phase: 'shut' },   // Kedip cepat 1
      { delay: 140, phase: 'wide' },
      { delay: 205, phase: 'shut' },  // Kedip cepat 2
      { delay: 270, phase: 'wide' },
      { delay: 335, phase: 'shut' },  // Kedip cepat 3
      { delay: 405, phase: null },    // Kembali normal
    ];

    sequence.forEach((step) => {
      const tid = window.setTimeout(() => {
        setWakeStartlePhase(step.phase);
      }, step.delay);
      wakeTimersRef.current.push(tid);
    });
  };

  // Jika kapsul dibuka (hover), bangunkan Loony & reset counter quirk
  useEffect(() => {
    if (!isCapsuleIdle) {
      lastActiveTimeRef.current = Date.now();
      busyMoveCounterRef.current = 0;
      lastQuirkFinishedAtRef.current = Date.now();
      if (sleepStageRef.current !== 'awake') {
        sleepStageRef.current = 'awake';
        setIdleSleepStage('awake');
        triggerStartledWakeUp();
      }
      setIdleQuirk('none');
    }
  }, [isCapsuleIdle]);

  // Fungsi pemicu animasi Quirk Idle (Melepas Kacamata / Memutar Mata ke Atas)
  const triggerIdleQuirk = (type: 'glasses-off' | 'eye-roll') => {
    if (quirkTimerRef.current) window.clearTimeout(quirkTimerRef.current);
    setIdleQuirk(type);

    if (type === 'eye-roll') {
      setEyeRollPhase(-1);
      const t1 = window.setTimeout(() => setEyeRollPhase(0), 550);
      const t2 = window.setTimeout(() => setEyeRollPhase(1), 1150);
      quirkTimerRef.current = window.setTimeout(() => {
        setIdleQuirk('none');
        setEyeRollPhase(0);
        lastQuirkFinishedAtRef.current = Date.now();
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      }, 2100);
    } else {
      quirkTimerRef.current = window.setTimeout(() => {
        setIdleQuirk('none');
        lastQuirkFinishedAtRef.current = Date.now();
        setIsBlinking(true);
        window.setTimeout(() => setIsBlinking(false), 120);
      }, 2600);
    }
  };

  // Pantau pergerakan kursor global & hitung waktu diam / waktu pengguna sibuk
  useEffect(() => {
    const updateFromPoint = (
      clientX: number,
      clientY: number,
      screenW: number,
      screenH: number
    ) => {
      const dist = Math.hypot(
        clientX - lastCursorRef.current.x,
        clientY - lastCursorRef.current.y
      );

      // Abaikan jika kursor sama sekali tidak bergerak (< 1.5px)
      if (dist < 1.5) return;

      const now = Date.now();
      if (dist > 6) {
        lastActiveTimeRef.current = now;

        // Jika sebelumnya sedang mengantuk atau tidur, picu animasi Kaget Berkedip Kencang!
        if (sleepStageRef.current !== 'awake') {
          sleepStageRef.current = 'awake';
          setIdleSleepStage('awake');
          triggerStartledWakeUp();
        }

        // Hitung kesibukan pengguna menggerakkan kursor saat Loony dicuekin di kapsul idle.
        // Wajib lewat cooldown minimal 50 detik sejak quirk terakhir + minimal 420 gerakan kursor
        // supaya Loony tetap dominan melirik kursor dan tidak keseringan memutar mata / lepas kacamata!
        if (isCapsuleIdle && (mood === 'neutral' || mood === 'happy')) {
          const timeSinceLastQuirk = now - lastQuirkFinishedAtRef.current;
          if (timeSinceLastQuirk >= 50000) {
            busyMoveCounterRef.current += 1;
            if (busyMoveCounterRef.current >= 420) {
              busyMoveCounterRef.current = 0;
              lastQuirkFinishedAtRef.current = now;
              const chosen = nextQuirkTypeRef.current;
              nextQuirkTypeRef.current = chosen === 'glasses-off' ? 'eye-roll' : 'glasses-off';
              triggerIdleQuirk(chosen);
            }
          }
        }
      }

      let originX = screenW / 2;
      let originY = 36;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      }

      const dx = clientX - originX;
      const dy = clientY - originY;

      const rawX = dx / Math.max(240, screenW * 0.35);
      const rawY = dy / Math.max(220, screenH * 0.45);

      const clampedX = Math.max(-1, Math.min(1, rawX));
      const clampedY = Math.max(-1, Math.min(1, rawY));

      const sensitiveX = Math.sign(clampedX) * Math.pow(Math.abs(clampedX), 0.72);
      const sensitiveY = Math.sign(clampedY) * Math.pow(Math.abs(clampedY), 0.75);

      const dt = Math.max(16, now - lastCursorRef.current.t);
      const speed = Math.min(1, dist / dt / 2.5);
      lastCursorRef.current = { x: clientX, y: clientY, t: now };

      setGaze({
        normX: sensitiveX,
        normY: sensitiveY,
        speed,
      });
    };

    const handleDomMove = (e: MouseEvent) => {
      updateFromPoint(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', handleDomMove);

    let unsubscribeElectron: (() => void) | undefined;
    if (window.electronAPI?.onGlobalCursor) {
      unsubscribeElectron = window.electronAPI.onGlobalCursor((data) => {
        updateFromPoint(
          data.x,
          data.y,
          data.screenW || window.innerWidth,
          data.screenH || window.innerHeight
        );
      });
    }

    // Timer pengecek durasi diam saat Idle (mengikuti pengaturan idleSleepSec; 0 = jangan tidur):
    const sleepCheckInterval = window.setInterval(() => {
      if (!isCapsuleIdle || idleSleepSec <= 0) {
        if (sleepStageRef.current !== 'awake') {
          sleepStageRef.current = 'awake';
          setIdleSleepStage('awake');
        }
        return;
      }
      const drowsyThresholdMs = idleSleepSec * 1000;
      const sleepThresholdMs = idleSleepSec * 2000;
      const idleDurationMs = Date.now() - lastActiveTimeRef.current;
      if (idleDurationMs >= sleepThresholdMs) {
        setIdleQuirk('none');
        sleepStageRef.current = 'sleeping';
        setIdleSleepStage((prev) => (prev === 'sleeping' ? prev : 'sleeping'));
      } else if (idleDurationMs >= drowsyThresholdMs) {
        setIdleQuirk('none');
        sleepStageRef.current = 'drowsy';
        setIdleSleepStage((prev) => (prev === 'drowsy' ? prev : 'drowsy'));
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleDomMove);
      if (unsubscribeElectron) unsubscribeElectron();
      clearInterval(sleepCheckInterval);
    };
  }, [isCapsuleIdle, mood, idleSleepSec]);

  // Kedipan mata natural untuk semua kondisi mata terbuka (termasuk 'curious' / heran, fokus, marah, dll.)
  useEffect(() => {
    if (idleSleepStage === 'sleeping' || idleQuirk === 'glasses-off' || wakeStartlePhase !== null) {
      setIsBlinking(false);
      return;
    }

    let outerId: number;
    let innerId: number;
    const scheduleBlink = () => {
      const delay =
        idleSleepStage === 'drowsy'
          ? 2200 + Math.random() * 1400
          : 2500 + Math.random() * 2200;
      const blinkDuration = idleSleepStage === 'drowsy' ? 380 : 145;

      outerId = window.setTimeout(() => {
        setIsBlinking(true);
        innerId = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, blinkDuration);
      }, delay);
    };
    scheduleBlink();
    return () => {
      clearTimeout(outerId);
      clearTimeout(innerId);
    };
  }, [idleSleepStage, idleQuirk, wakeStartlePhase]);

  const dims =
    size === 'sm'
      ? {
          boxW: 76,
          boxH: 32,
          eyeW: 14,
          eyeH: 12,
          bridgeW: 8,
          bridgeH: 2.6,
          rx: 4.5,
          moveX: 8.5,
          moveY: 4.5,
        }
      : size === 'lg'
        ? {
            boxW: 98,
            boxH: 42,
            eyeW: 18,
            eyeH: 15,
            bridgeW: 10,
            bridgeH: 3.2,
            rx: 6,
            moveX: 11,
            moveY: 6,
          }
        : {
            boxW: 84,
            boxH: 36,
            eyeW: 16,
            eyeH: 13.5,
            bridgeW: 9,
            bridgeH: 2.8,
            rx: 5,
            moveX: 9.5,
            moveY: 5,
          };

  const eyeColor = '#f4f4f5';

  const effectiveMood: MascotMood =
    mood === 'warning-budget' || mood === 'reminder-habit' || mood === 'curious'
      ? mood
      : idleSleepStage === 'sleeping'
        ? 'sleeping'
        : idleSleepStage === 'drowsy'
          ? 'drowsy'
          : mood;

  const isAsleepOrDrowsy = effectiveMood === 'sleeping' || effectiveMood === 'drowsy';
  const isQuirkActive =
    idleQuirk !== 'none' &&
    wakeStartlePhase === null &&
    effectiveMood !== 'warning-budget' &&
    effectiveMood !== 'reminder-habit' &&
    effectiveMood !== 'curious' &&
    !isAsleepOrDrowsy;

  // Saat mengantuk, tidur, atau sedang memutar mata bosan, atur pandangan secara khusus
  const gazeFactor =
    effectiveMood === 'sleeping'
      ? 0
      : effectiveMood === 'drowsy'
        ? 0.25
        : isQuirkActive && idleQuirk === 'glasses-off'
          ? 0.2
          : 1;

  const restingBiasX = dockPosition === 'left' ? 0.35 : dockPosition === 'right' ? -0.35 : 0;
  const activeNormX =
    isDizzy
      ? Math.sin(Date.now() / 150) * 0.45
      : isQuirkActive && idleQuirk === 'eye-roll'
        ? eyeRollPhase * 0.65
        : Math.max(-1, Math.min(1, gaze.normX * gazeFactor + restingBiasX * (1 - Math.abs(gaze.normX))));

  const activeNormY =
    isDizzy
      ? Math.cos(Date.now() / 150) * 0.45
      : isQuirkActive && idleQuirk === 'eye-roll'
        ? -1.15
        : gaze.normY * gazeFactor;

  const leftPerspectiveScaleX = 1 - activeNormX * 0.16;
  const rightPerspectiveScaleX = 1 + activeNormX * 0.16;
  const leftPerspectiveScaleY =
    1 - Math.max(0, activeNormX) * 0.12 + gaze.speed * gazeFactor * 0.06;
  const rightPerspectiveScaleY =
    1 - Math.max(0, -activeNormX) * 0.12 + gaze.speed * gazeFactor * 0.06;

  const gazeTiltDeg = activeNormX * 5.5;
  const gazeSkewDeg = -activeNormX * 7;

  const getMoodEyeModifier = (side: 'left' | 'right') => {
    // Efek Dielus Kepala (Cursor Petting -> Senyum Bulan Sabit ^━^)
    if (isPetted) {
      return {
        scaleY: 0.42,
        scaleX: 1.14,
        rotate: side === 'left' ? -6 : 6,
        yOffset: -1.2,
        borderRadius: '999px 999px 2px 2px',
      };
    }

    // Efek Pusing Akibat Benturan Keras (25% chance collision)
    if (isDizzy) {
      return {
        scaleY: 0.82,
        scaleX: 0.82,
        rotate: side === 'left' ? -25 : 25,
        yOffset: -0.5,
        borderRadius: '50%',
      };
    }

    // Prioritas Tertinggi: Animasi Kaget Terbangun (Berkedip Kencang 3x)
    if (wakeStartlePhase === 'shut') {
      return {
        scaleY: 0.09,
        scaleX: 1.15,
        rotate: 0,
        yOffset: 0.5,
        borderRadius: '999px',
      };
    }
    if (wakeStartlePhase === 'wide') {
      return {
        scaleY: 1.24,
        scaleX: 1.08,
        rotate: 0,
        yOffset: -1.8,
        borderRadius: `${dims.rx + 1}px`,
      };
    }

    // 1. Quirk Idle: Melepas Kacamata -> Mata Sipit (ㅡ  ㅡ)
    if (isQuirkActive && idleQuirk === 'glasses-off') {
      return {
        scaleY: 0.21,
        scaleX: 1.14,
        rotate: side === 'left' ? 2 : -2,
        yOffset: 0.5,
        borderRadius: '999px',
      };
    }

    // 2. Quirk Idle: Memutar Mata ke Atas (Bosan dicuekin)
    if (isQuirkActive && idleQuirk === 'eye-roll') {
      return {
        scaleY: 0.76,
        scaleX: 1.04,
        rotate: side === 'left' ? -3 : 3,
        yOffset: -1.8,
        borderRadius: `${dims.rx + 2}px ${dims.rx + 2}px ${dims.rx}px ${dims.rx}px`,
      };
    }

    if (effectiveMood === 'sleeping') {
      return {
        scaleY: 0.16,
        scaleX: 1.08,
        rotate: side === 'left' ? 3 : -3,
        yOffset: 1.2,
        borderRadius: '999px',
      };
    }

    // RnR 7: Saat berkedip di kondisi mata terbuka apa pun (termasuk 'curious' / heran), pertahankan kemiringan ekspresi agar kedipan terlihat natural & tajam
    if (isBlinking) {
      const blinkRotate =
        effectiveMood === 'curious'
          ? side === 'left'
            ? -19
            : 19
          : effectiveMood === 'warning-budget'
            ? side === 'left'
              ? 19
              : -19
            : 0;
      return {
        scaleY: 0.09,
        scaleX: 1.12,
        rotate: blinkRotate,
        yOffset: effectiveMood === 'drowsy' ? 1.2 : 0.4,
        borderRadius: '999px',
      };
    }

    switch (effectiveMood) {
      case 'drowsy':
        return {
          scaleY: 0.4,
          scaleX: 1.05,
          rotate: side === 'left' ? -2.5 : 2.5,
          yOffset: 1.0,
          borderRadius: `${dims.rx}px ${dims.rx}px ${dims.rx + 2}px ${dims.rx + 2}px`,
        };

      case 'prayer-calm':
      case 'sleepy':
        return {
          scaleY: 0.44,
          scaleX: 1.04,
          rotate: side === 'left' ? -2 : 2,
          yOffset: 1.0,
          borderRadius: `${dims.rx}px ${dims.rx}px ${dims.rx + 2}px ${dims.rx + 2}px`,
        };

      case 'warning-budget':
        return {
          scaleY: 0.78,
          scaleX: 1.06,
          rotate: side === 'left' ? 19 : -19,
          yOffset: 0.5,
          borderRadius:
            side === 'left'
              ? `${dims.rx}px 2px ${dims.rx}px ${dims.rx}px`
              : `2px ${dims.rx}px ${dims.rx}px ${dims.rx}px`,
        };

      case 'curious':
        return {
          scaleY: side === 'left' ? 0.82 : 1.05,
          scaleX: 1.04,
          rotate: side === 'left' ? -19 : 19,
          yOffset: side === 'left' ? 0.5 : -0.5,
          borderRadius:
            side === 'left'
              ? `2px ${dims.rx}px ${dims.rx}px ${dims.rx}px`
              : `${dims.rx}px 2px ${dims.rx}px ${dims.rx}px`,
        };

      case 'reminder-habit':
        return {
          scaleY: 1.06,
          scaleX: 1.02,
          rotate: 0,
          yOffset: 0,
          borderRadius: `${dims.rx}px`,
        };

      case 'happy':
        return {
          scaleY: 0.88,
          scaleX: 1.06,
          rotate: side === 'left' ? -3 : 3,
          yOffset: -0.6,
          borderRadius: `${dims.rx + 2.5}px ${dims.rx + 2.5}px ${dims.rx - 1}px ${dims.rx - 1}px`,
        };

      case 'neutral':
      case 'focused':
      default:
        return {
          scaleY: 1,
          scaleX: 1,
          rotate: 0,
          yOffset: 0,
          borderRadius: `${dims.rx}px`,
        };
    }
  };

  const leftMod = getMoodEyeModifier('left');
  const rightMod = getMoodEyeModifier('right');

  const loopClass =
    effectiveMood === 'sleeping'
      ? 'mascot-sleep-loop'
      : effectiveMood === 'drowsy'
        ? 'mascot-drowsy-loop'
        : isPlayingMusic
          ? 'mascot-music-loop'
          : '';

  const morphFace = resolveMorphFace(signLabel);

  // Transisi cepat saat sedang berkedip kaget terbangun atau berkedip normal agar kedipan terlihat tajam & jelas!
  const effectiveBlinking = morphFace ? false : isBlinking;
  const effectiveWakePhase = morphFace ? null : wakeStartlePhase;

  const eyeSpringTransition =
    effectiveWakePhase !== null
      ? { duration: 0.045, ease: 'linear' as const }
      : effectiveBlinking
        ? { duration: 0.055, ease: 'easeOut' as const }
        : { type: 'spring' as const, stiffness: 260, damping: 22 };

  const morphSpring = {
    type: 'spring' as const,
    stiffness: 440,
    damping: 24,
    mass: 0.7,
    backgroundColor:
      morphFace === 'budget-warning'
        ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' as const }
        : undefined,
    boxShadow:
      morphFace === 'budget-warning'
        ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' as const }
        : undefined,
    scaleX:
      morphFace === 'budget-warning'
        ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' as const }
        : undefined,
    scaleY:
      morphFace === 'budget-warning'
        ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' as const }
        : undefined,
    rotate:
      morphFace === 'alert-upcoming'
        ? { duration: 0.65, ease: 'easeInOut' as const }
        : morphFace === 'budget-warning'
          ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' as const }
          : undefined,
    rotateY:
      morphFace === 'income-added'
        ? { duration: 0.75, ease: 'easeInOut' as const }
        : undefined,
  };

  const activeEyeTransition = morphFace ? morphSpring : eyeSpringTransition;

  // Jarak pergeseran mata ke titik tengah simetris (EMO Continuous Physics Morph)
  const centerShift = (dims.eyeW + dims.bridgeW) / 2;

  // Nilai animasi Mata Kiri saat Morphing vs Normal
  const leftEyeAnim = useMemo(() => {
    switch (morphFace) {
      case 'income-added':
        return {
          x: 0,
          y: [0, -3, 0],
          scaleX: 1.15,
          scaleY: 1.15,
          rotate: 0,
          rotateY: [0, 180, 360],
          borderRadius: '50%',
          backgroundColor: '#facc15',
          boxShadow: '0 0 10px rgba(250, 204, 21, 0.95)',
          zIndex: 10,
        };
      case 'alert-upcoming':
        // Mata kiri memanjang vertikal menjadi batang tanda seru (!)
        return {
          x: centerShift,
          y: -3.5,
          scaleX: 0.45,
          scaleY: 1.25,
          rotate: [0, -10, 10, -8, 8, -4, 4, 0],
          borderRadius: '2.5px',
          backgroundColor: '#fbbf24',
          boxShadow: '0 0 10px rgba(251, 191, 36, 0.9)',
          zIndex: 10,
        };
      case 'task-done':
        // Mata kiri bergeser ke tengah membesar menjadi lingkaran centang hijau emerald
        return {
          x: centerShift,
          y: 0,
          scaleX: 1.45,
          scaleY: 1.45,
          rotate: 0,
          borderRadius: '50%',
          backgroundColor: '#10b981',
          boxShadow: '0 0 14px rgba(16, 185, 129, 0.9)',
          zIndex: 20,
        };
      case 'clipboard-copy':
        // Mata kiri berubah menjadi selembar kertas dokumen teks depan
        return {
          x: -1,
          y: 0,
          scaleX: 1.05,
          scaleY: 1.35,
          rotate: 0,
          borderRadius: '3px',
          backgroundColor: '#f4f4f5',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.35)',
          zIndex: 10,
        };
      case 'file-in':
        // Mata kiri bergeser ke tengah menjadi baki inbox berkas
        return {
          x: centerShift,
          y: 3,
          scaleX: 1.6,
          scaleY: 1.1,
          rotate: 0,
          borderRadius: '3px',
          backgroundColor: '#27272a',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.25)',
          zIndex: 10,
        };
      case 'budget-warning':
        // Mata kiri bergeser ke tengah membesar menjadi Koin Peringatan Uang yang berkedip-kedip
        return {
          x: centerShift,
          y: 0,
          scaleX: [1.4, 1.48, 1.4],
          scaleY: [1.4, 1.48, 1.4],
          rotate: [0, -4, 4, -3, 3, 0],
          borderRadius: '50%',
          backgroundColor: ['#f59e0b', '#ef4444', '#f59e0b', '#ef4444', '#f59e0b'],
          boxShadow: [
            '0 0 10px rgba(245, 158, 11, 0.95)',
            '0 0 18px rgba(239, 68, 68, 0.95)',
            '0 0 10px rgba(245, 158, 11, 0.95)',
          ],
          zIndex: 20,
        };
      default:
        return {
          x: 0,
          y: leftMod.yOffset,
          scaleX: leftMod.scaleX * leftPerspectiveScaleX,
          scaleY: leftMod.scaleY * leftPerspectiveScaleY,
          rotate: leftMod.rotate,
          borderRadius: leftMod.borderRadius,
          backgroundColor: '#f4f4f5',
          boxShadow: '0 0 7px rgba(244, 244, 245, 0.65)',
          zIndex: 1,
        };
    }
  }, [morphFace, leftMod, leftPerspectiveScaleX, leftPerspectiveScaleY, centerShift]);

  // Nilai animasi Mata Kanan saat Morphing vs Normal
  const rightEyeAnim = useMemo(() => {
    switch (morphFace) {
      case 'income-added':
        return {
          x: 0,
          y: [0, -3, 0],
          scaleX: 1.15,
          scaleY: 1.15,
          rotate: 0,
          rotateY: [0, 180, 360],
          borderRadius: '50%',
          backgroundColor: '#facc15',
          boxShadow: '0 0 10px rgba(250, 204, 21, 0.95)',
          opacity: 1,
          zIndex: 10,
        };
      case 'alert-upcoming':
        // Mata kanan menjadi titik bulat di bawah batang tanda seru (!)
        return {
          x: -centerShift,
          y: 7.5,
          scaleX: 0.38,
          scaleY: 0.38,
          rotate: [0, -10, 10, -8, 8, -4, 4, 0],
          borderRadius: '50%',
          backgroundColor: '#fbbf24',
          boxShadow: '0 0 8px rgba(251, 191, 36, 0.9)',
          opacity: 1,
          zIndex: 10,
        };
      case 'task-done':
        // Mata kanan menyerap ke titik 0 di tengah sehingga tidak menimpa centang
        return {
          x: -centerShift,
          y: 0,
          scaleX: 0,
          scaleY: 0,
          rotate: 0,
          borderRadius: '50%',
          backgroundColor: '#10b981',
          opacity: 0,
          zIndex: 1,
        };
      case 'clipboard-copy':
        // Mata kanan menjadi lembar kertas kedua yang meluncur keluar (efek kloning)
        return {
          x: [-centerShift, 5.5],
          y: [0, -3],
          scaleX: 1.05,
          scaleY: 1.35,
          rotate: [0, 4],
          borderRadius: '3px',
          backgroundColor: '#d4d4d8',
          boxShadow: '0 0 6px rgba(212, 212, 216, 0.35)',
          opacity: 1,
          zIndex: 5,
        };
      case 'file-in':
        // Mata kanan menjadi selembar berkas yang meluncur turun dari atas ke baki
        return {
          x: -centerShift,
          y: [-12, -2],
          scaleX: 0.9,
          scaleY: 1.15,
          rotate: 0,
          borderRadius: '2px',
          backgroundColor: '#f4f4f5',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.4)',
          opacity: 1,
          zIndex: 10,
        };
      case 'budget-warning':
        // Mata kanan menyerap ke titik 0 di tengah melebur ke dalam koin peringatan
        return {
          x: -centerShift,
          y: 0,
          scaleX: 0,
          scaleY: 0,
          rotate: 0,
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          opacity: 0,
          zIndex: 1,
        };
      default:
        return {
          x: 0,
          y: rightMod.yOffset,
          scaleX: rightMod.scaleX * rightPerspectiveScaleX,
          scaleY: rightMod.scaleY * rightPerspectiveScaleY,
          rotate: rightMod.rotate,
          borderRadius: rightMod.borderRadius,
          backgroundColor: '#f4f4f5',
          boxShadow: '0 0 7px rgba(244, 244, 245, 0.65)',
          opacity: 1,
          zIndex: 1,
        };
    }
  }, [morphFace, rightMod, rightPerspectiveScaleX, rightPerspectiveScaleY, centerShift]);

  // Nilai animasi Garis Penghubung (Bridge)
  const bridgeAnim = useMemo(() => {
    if (morphFace === 'income-added') {
      return {
        opacity: 0.75,
        scaleX: 1,
        scaleY: 1,
        y: 0,
        backgroundColor: '#eab308',
      };
    }
    if (morphFace) {
      return {
        opacity: 0,
        scaleX: 0,
        scaleY: 0,
        y: 0,
        backgroundColor: '#f4f4f5',
      };
    }
    return {
      opacity: isQuirkActive && idleQuirk === 'glasses-off' ? 0 : 1,
      scaleX: isQuirkActive && idleQuirk === 'glasses-off' ? 0.5 : 1,
      scaleY:
        wakeStartlePhase === 'shut' || isBlinking || effectiveMood === 'sleeping'
          ? 0.75
          : 1,
      y:
        isQuirkActive && idleQuirk === 'glasses-off'
          ? 7
          : effectiveMood === 'warning-budget'
            ? 2.2
            : effectiveMood === 'curious'
              ? -2
              : isAsleepOrDrowsy || effectiveMood === 'prayer-calm'
                ? 1.4
                : 0,
      backgroundColor: '#f4f4f5',
    };
  }, [morphFace, isQuirkActive, idleQuirk, wakeStartlePhase, isBlinking, effectiveMood, isAsleepOrDrowsy]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="relative flex flex-col items-center justify-center select-none p-0 cursor-pointer"
      style={{
        width: dims.boxW,
        height: dims.boxH,
      }}
    >
      {/* Layer 1: Pegas Pandangan Kursor + Inertia Lag + Head Shake + Efek Pusing */}
      <motion.div
        animate={
          isHeadShaking
            ? {
                x: [0, -6, 6, -4, 4, -2, 2, 0],
                y: 0,
                rotate: [0, -3, 3, -2, 2, 0],
              }
            : {
                x: activeNormX * dims.moveX + (inertiaOffset?.x || 0),
                y:
                  activeNormY * dims.moveY +
                  (wakeStartlePhase === 'wide' ? -2.5 : 0) +
                  (inertiaOffset?.y || 0),
                rotate: isDizzy ? [0, 8, -8, 0] : gazeTiltDeg,
                skewX: isDizzy ? 0 : gazeSkewDeg,
              }
        }
        transition={
          isHeadShaking
            ? { duration: 0.42, ease: 'easeInOut' }
            : isDizzy
              ? { duration: 0.4, repeat: Infinity, ease: 'easeInOut' }
              : {
                  type: 'spring',
                  stiffness: isAsleepOrDrowsy ? 85 : 260,
                  damping: isAsleepOrDrowsy ? 22 : 20,
                  mass: 0.7,
                }
        }
        className="relative flex items-center justify-center"
      >
        {/* Layer 2: Loop Mengantuk / Tidur / Anggukan Musik ATAU Morphing Screen */}
        <div className={`relative flex items-center justify-center ${loopClass}`}>
          {/* =================================================================
              HEADSET LOONY BERAKSEN CYAN-NEON SLEEK
             ================================================================= */}
          <AnimatePresence>
            {isPlayingMusic && (
              <motion.div
                key="loony-headset"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                {/* Busur Headband di Atas Mata */}
                <div
                  style={{
                    width: dims.eyeW * 2 + dims.bridgeW + 12,
                    height: dims.eyeH + 10,
                  }}
                  className="loony-headset-arch absolute -top-[6px] rounded-t-full border-t-[2.5px] border-x-[2px] border-zinc-300/90"
                />
                {/* Bantalan Headset Kiri dengan Aksen Cyan Glow */}
                <div
                  style={{
                    height: dims.eyeH + 2,
                    left: -7.5,
                  }}
                  className="loony-headset-pad-l absolute w-[5.5px] rounded-full bg-zinc-900 border border-cyan-300/90"
                />
                {/* Bantalan Headset Kanan dengan Aksen Cyan Glow */}
                <div
                  style={{
                    height: dims.eyeH + 2,
                    right: -7.5,
                  }}
                  className="loony-headset-pad-r absolute w-[5.5px] rounded-full bg-zinc-900 border border-cyan-300/90"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mata Kiri (OLED Phosphor Luminescence / Charcoal Contrast + Specular Glint + Continuous Morph) */}
          <motion.div
            animate={leftEyeAnim}
            transition={activeEyeTransition}
            style={{
              width: dims.eyeW,
              height: dims.eyeH,
            }}
            className="loony-eye-lens relative overflow-hidden flex items-center justify-center"
          >
            {/* Pantulan Cahaya Lensa (Specular Highlight) Normal */}
            {!morphFace && !effectiveBlinking && effectiveMood !== 'sleeping' && effectiveWakePhase !== 'shut' && (
              <div
                style={{
                  transform: `translate(${activeNormX * 1.2}px, ${activeNormY * 0.8}px)`,
                }}
                className="loony-eye-glint absolute top-[2px] left-[2.5px] w-[4px] h-[2px] rounded-full bg-white/90 blur-[0.2px]"
              />
            )}

            {/* Simbol Koin Cuan (Kiri) */}
            {morphFace === 'income-added' && (
              <span className="font-marshmallow font-extrabold text-[8.5px] text-zinc-950 leading-none select-none pointer-events-none">
                $
              </span>
            )}

            {/* Simbol Centang Tugas Selesai */}
            {morphFace === 'task-done' && (
              <motion.svg
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.25, 1], opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.25, ease: 'easeOut' }}
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 fill-white select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-30"
              >
                <path
                  fillRule="evenodd"
                  d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                />
              </motion.svg>
            )}

            {/* Simbol Koin Uang Peringatan Berkedip-kedip (Budget Warning) */}
            {morphFace === 'budget-warning' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [1, 1.15, 0.95, 1.12, 1],
                  opacity: [1, 0.2, 1, 0.2, 1],
                }}
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex items-center justify-center select-none pointer-events-none z-30"
              >
                <span className="font-marshmallow font-extrabold text-[10px] text-zinc-950 leading-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
                  $
                </span>
              </motion.div>
            )}

            {/* Garis-garis Dokumen Teks Kiri (Clipboard Copy) */}
            {morphFace === 'clipboard-copy' && (
              <div className="flex flex-col gap-[1.5px] w-2 pointer-events-none">
                <div className="h-[1px] w-full bg-zinc-400 rounded-full" />
                <div className="h-[1px] w-1.5 bg-zinc-400 rounded-full" />
              </div>
            )}
          </motion.div>

          {/* Garis Tengah Penghubung (Ciri Khas Kacamata / Glasses Bridge) */}
          <motion.div
            animate={bridgeAnim}
            transition={activeEyeTransition}
            style={{
              width: dims.bridgeW,
              height: dims.bridgeH,
            }}
            className="loony-eye-bridge rounded-full -mx-[1px] z-10"
          />

          {/* Mata Kanan (OLED Phosphor Luminescence / Charcoal Contrast + Specular Glint + Continuous Morph) */}
          <motion.div
            animate={rightEyeAnim}
            transition={activeEyeTransition}
            style={{
              width: dims.eyeW,
              height: dims.eyeH,
            }}
            className="loony-eye-lens relative overflow-hidden flex items-center justify-center"
          >
            {/* Pantulan Cahaya Lensa (Specular Highlight) Normal */}
            {!morphFace && !effectiveBlinking && effectiveMood !== 'sleeping' && effectiveWakePhase !== 'shut' && (
              <div
                style={{
                  transform: `translate(${activeNormX * 1.2}px, ${activeNormY * 0.8}px)`,
                }}
                className="loony-eye-glint absolute top-[2px] left-[2.5px] w-[4px] h-[2px] rounded-full bg-white/90 blur-[0.2px]"
              />
            )}

            {/* Simbol Koin Cuan (Kanan) */}
            {morphFace === 'income-added' && (
              <span className="font-marshmallow font-extrabold text-[8.5px] text-zinc-950 leading-none select-none pointer-events-none">
                $
              </span>
            )}

            {/* Garis-garis Dokumen Kanan (Clipboard Copy Clone & File-in) */}
            {(morphFace === 'clipboard-copy' || morphFace === 'file-in') && (
              <div className="flex flex-col gap-[1.5px] w-2 pointer-events-none">
                <div className="h-[1px] w-full bg-zinc-400 rounded-full" />
                <div className="h-[1px] w-1.5 bg-zinc-400 rounded-full" />
              </div>
            )}
          </motion.div>

          {/* Efek Kilau Sparkle saat Copas */}
          <AnimatePresence>
            {morphFace === 'clipboard-copy' && (
              <motion.span
                key="copy-sparkle"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.25, 0], rotate: [0, 45, 90] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="pointer-events-none absolute -top-2.5 right-0 text-[10px] select-none"
              >
                ✨
              </motion.span>
            )}
          </AnimatePresence>

          {/* Animasi Tidur (Zzz lembut di atas kanan mata) */}
          <AnimatePresence>
            {effectiveMood === 'sleeping' && (
              <motion.div
                key="sleep-zzz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute -top-2.5 -right-3.5 flex items-center"
              >
                <motion.span
                  animate={{ y: [2, -5], x: [0, 3], opacity: [0, 0.85, 0], scale: [0.75, 1.05] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="font-marshmallow font-bold text-[10px] text-zinc-300 leading-none select-none"
                >
                  z
                </motion.span>
                <motion.span
                  animate={{ y: [3, -6], x: [1, 4], opacity: [0, 0.65, 0], scale: [0.65, 0.95] }}
                  transition={{ duration: 2.4, delay: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="font-marshmallow font-bold text-[8px] text-zinc-400 leading-none select-none"
                >
                  z
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Efek Dielus Kepala (Petting Sparkles Bahagia) */}
          <AnimatePresence>
            {isPetted && (
              <motion.div
                key="loony-petted-sparkles"
                initial={{ opacity: 0, y: 2, scale: 0.7 }}
                animate={{ opacity: 1, y: -2, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.6 }}
                className="pointer-events-none absolute -top-3.5 inset-x-0 flex justify-center items-center gap-2.5"
              >
                <motion.span
                  animate={{ y: [0, -5], opacity: [0.95, 0], scale: [0.8, 1.15] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut' }}
                  className="text-[9px] text-amber-300 drop-shadow-[0_0_5px_rgba(252,211,77,0.85)]"
                >
                  ✦
                </motion.span>
                <motion.span
                  animate={{ y: [1, -6], opacity: [0.95, 0], scale: [0.85, 1.2] }}
                  transition={{ duration: 1.05, delay: 0.2, repeat: Infinity, ease: 'easeOut' }}
                  className="text-[9px] text-rose-300 drop-shadow-[0_0_5px_rgba(253,164,175,0.85)]"
                >
                  ✧
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Efek Pusing: Bintang-bintang Mini Berputar di Atas Mata */}
          <AnimatePresence>
            {isDizzy && (
              <motion.div
                key="loony-dizzy-stars"
                initial={{ opacity: 0, y: 3, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="pointer-events-none absolute -top-4 inset-x-0 flex justify-center items-center gap-1.5"
              >
                <motion.span
                  animate={{ rotate: 360, scale: [0.8, 1.25, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                  className="text-[10px] text-amber-300 drop-shadow-[0_0_5px_rgba(252,211,77,0.9)]"
                >
                  ✦
                </motion.span>
                <motion.span
                  animate={{ rotate: -360, scale: [1.2, 0.85, 1.2] }}
                  transition={{ repeat: Infinity, duration: 1.3, ease: 'linear' }}
                  className="text-[12px] text-yellow-200 drop-shadow-[0_0_6px_rgba(254,240,138,0.95)]"
                >
                  ✧
                </motion.span>
                <motion.span
                  animate={{ rotate: 360, scale: [0.8, 1.25, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.95, ease: 'linear' }}
                  className="text-[10px] text-amber-300 drop-shadow-[0_0_5px_rgba(252,211,77,0.9)]"
                >
                  ✦
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tanda Mengingatkan: Tanda Seru Merah (!) di Bagian Kanan Mata */}
          <AnimatePresence>
            {!morphFace && effectiveMood === 'reminder-habit' && (
              <motion.span
                key="bang-mark"
                initial={{ opacity: 0, scale: 0.4, x: -4 }}
                animate={{ opacity: 1, scale: [1, 1.18, 1], x: 0 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute -right-4 top-1/2 -translate-y-1/2 font-marshmallow font-bold text-sm leading-none text-red-500 select-none"
              >
                !
              </motion.span>
            )}
          </AnimatePresence>

          {/* Tanda Kesal/Peringatan: Simbol (💢) di Bagian Atas Kanan Mata saat Notifikasi Peringatan & Budget */}
          <AnimatePresence>
            {Boolean(
              morphFace &&
                (morphFace === 'alert-upcoming' ||
                  morphFace === 'budget-warning' ||
                  effectiveMood === 'warning-budget')
            ) && (
              <motion.span
                key="anger-mark"
                initial={{ opacity: 0, scale: 0.5, rotate: -7 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: [-7, 7, -7],
                  y: [0, -1.5, 0],
                }}
                exit={{
                  opacity: 0,
                  scale: 0.4,
                  transition: { duration: 0.18, ease: 'easeIn' },
                }}
                transition={{
                  opacity: { duration: 0.18, ease: 'easeOut' },
                  scale: { type: 'spring', stiffness: 380, damping: 22 },
                  rotate: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' },
                  y: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="absolute -top-2.5 -right-3 text-[11px] leading-none select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] z-30"
              >
                💢
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
