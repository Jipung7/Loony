import React from 'react';

export type ToolPanelId =
  | 'mascot'
  | 'clock-prayer'
  | 'focus-timer'
  | 'calendar'
  | 'clipboard'
  | 'quick-input'
  | 'todo'
  | 'music';

export const TOP_TOOL_PANELS: ToolPanelId[] = [
  'mascot',
  'clock-prayer',
  'focus-timer',
  'calendar',
  'clipboard',
  'quick-input',
  'todo',
  'music',
];

export const SIDE_TOOL_PANELS: ToolPanelId[] = [
  'clock-prayer',
  'focus-timer',
  'calendar',
  'clipboard',
  'quick-input',
  'todo',
  'music',
];

export const TOOL_ACCENT_META: Record<
  ToolPanelId,
  {
    activeDotClass: string;
    lightActiveDotClass: string;
    subtleTint: string;
    lightSubtleTint: string;
    label: string;
  }
> = {
  mascot: {
    activeDotClass: 'bg-zinc-100',
    lightActiveDotClass: 'bg-zinc-900',
    subtleTint: 'rgba(255, 255, 255, 0.025)',
    lightSubtleTint: 'rgba(24, 24, 27, 0.045)',
    label: 'Loony',
  },
  'clock-prayer': {
    activeDotClass: 'bg-emerald-400',
    lightActiveDotClass: 'bg-emerald-500',
    subtleTint: 'rgba(16, 185, 129, 0.035)',
    lightSubtleTint: 'rgba(16, 185, 129, 0.085)',
    label: 'Jam & Shalat',
  },
  'focus-timer': {
    activeDotClass: 'bg-indigo-400',
    lightActiveDotClass: 'bg-indigo-500',
    subtleTint: 'rgba(99, 102, 241, 0.045)',
    lightSubtleTint: 'rgba(99, 102, 241, 0.095)',
    label: 'Focus Timer',
  },
  calendar: {
    activeDotClass: 'bg-sky-400',
    lightActiveDotClass: 'bg-sky-500',
    subtleTint: 'rgba(56, 189, 248, 0.035)',
    lightSubtleTint: 'rgba(14, 165, 233, 0.085)',
    label: 'Kalender',
  },
  clipboard: {
    activeDotClass: 'bg-violet-400',
    lightActiveDotClass: 'bg-violet-500',
    subtleTint: 'rgba(168, 85, 247, 0.035)',
    lightSubtleTint: 'rgba(139, 92, 246, 0.085)',
    label: 'Clipboard',
  },
  'quick-input': {
    activeDotClass: 'bg-amber-400',
    lightActiveDotClass: 'bg-amber-500',
    subtleTint: 'rgba(245, 158, 11, 0.035)',
    lightSubtleTint: 'rgba(245, 158, 11, 0.09)',
    label: 'Tulis Cepat',
  },
  todo: {
    activeDotClass: 'bg-rose-400',
    lightActiveDotClass: 'bg-rose-500',
    subtleTint: 'rgba(244, 63, 94, 0.035)',
    lightSubtleTint: 'rgba(244, 63, 94, 0.085)',
    label: 'Tugas',
  },
  music: {
    activeDotClass: 'bg-cyan-400',
    lightActiveDotClass: 'bg-cyan-500',
    subtleTint: 'rgba(34, 211, 238, 0.035)',
    lightSubtleTint: 'rgba(6, 182, 212, 0.09)',
    label: 'Musik',
  },
};

export const getToolLabel = (id: ToolPanelId, isEn: boolean, prayerEnabled = true): string => {
  switch (id) {
    case 'mascot':
      return 'Loony';
    case 'clock-prayer':
      return isEn
        ? prayerEnabled
          ? 'Clock & Prayer'
          : 'Clock & Weather'
        : prayerEnabled
          ? 'Jam & Shalat'
          : 'Jam & Cuaca';
    case 'focus-timer':
      return 'Focus Timer';
    case 'calendar':
      return isEn ? 'Calendar' : 'Kalender';
    case 'clipboard':
      return 'Clipboard';
    case 'quick-input':
      return isEn ? 'Quick Capture' : 'Tulis Cepat';
    case 'todo':
      return isEn ? 'Tasks & Routine' : 'Tugas';
    case 'music':
      return isEn ? 'Now Playing' : 'Musik';
    default:
      return id;
  }
};

export interface CapsuleToolDotsProps {
  toolPanels: ToolPanelId[];
  activeToolIdx: number;
  resolvedCapsuleTheme: string;
  isEn: boolean;
  prayerFeatureEnabled: boolean;
  onSelectToolIdx: (idx: number) => void;
}

/**
 * Indikator Titik Navigasi Minimalis di bagian bawah kapsul
 */
export const CapsuleToolDots: React.FC<CapsuleToolDotsProps> = ({
  toolPanels,
  activeToolIdx,
  resolvedCapsuleTheme,
  isEn,
  prayerFeatureEnabled,
  onSelectToolIdx,
}) => {
  const isLightCapsule = resolvedCapsuleTheme === 'light';

  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      {toolPanels.map((id, idx) => {
        const isActive = idx === activeToolIdx % toolPanels.length;
        const meta = TOOL_ACCENT_META[id];
        return (
          <button
            key={id}
            type="button"
            title={getToolLabel(id, isEn, prayerFeatureEnabled)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectToolIdx(idx);
            }}
            className={`h-1 rounded-full transition-all duration-200 cursor-pointer ${
              isActive
                ? `w-3.5 ${isLightCapsule ? meta.lightActiveDotClass : meta.activeDotClass}`
                : isLightCapsule
                  ? 'w-1 bg-zinc-900/20 hover:bg-zinc-900/45'
                  : 'w-1 bg-white/15 hover:bg-white/35'
            }`}
          />
        );
      })}
    </div>
  );
};
