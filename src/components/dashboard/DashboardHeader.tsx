import React, { useState } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Disc3,
  ExternalLink,
  SkipBack,
  SkipForward,
  Undo2,
  Minimize2,
  Maximize2,
  Settings,
  X,
} from 'lucide-react';
import type { AppSettings, WeatherInfo } from '../../types';
import type { UpdateInfo } from '../../services/updateChecker';
import { mapWeatherCode } from '../../services/prayerAndWeather';

export type MorphStage = 'leaping' | 'expanded' | 'shrinking' | 'returning';

export interface DashboardHeaderProps {
  isFullScreen: boolean;
  stage: MorphStage;
  clockStr: string;
  weather: WeatherInfo;
  settings: AppSettings;
  updateSettings: (next: Partial<AppSettings>) => void;
  nextPrayer: { name: string; time: string };
  isEn: boolean;
  focusTimerFormatted: string;
  focusTimerTotalSeconds: number;
  isFocusTimerRunning: boolean;
  toggleFocusTimer: () => void;
  startFocusTimer: (mins: number) => void;
  resetFocusTimer: () => void;
  musicTrackName?: string;
  isPlayingMusic: boolean;
  openMusicSourceApp: () => void;
  prevMusicTrack: () => void;
  toggleMusicPlayer: () => void;
  nextMusicTrack: () => void;
  lastUndo: { label: string; undo: () => void } | null;
  triggerUndo: () => void;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  updateInfo: UpdateInfo | null;
  onCloseWindow: () => void;
  t: {
    nav: { settings: string };
    common: { reset: string };
  };
}

/**
 * Top Bar Tipis Dashboard Loony
 * Menampilkan status ambient di kiri dan kontrol audio/jendela di kanan
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  isFullScreen,
  stage,
  clockStr,
  weather,
  settings,
  updateSettings,
  nextPrayer,
  isEn,
  focusTimerFormatted,
  focusTimerTotalSeconds,
  isFocusTimerRunning,
  toggleFocusTimer,
  startFocusTimer,
  resetFocusTimer,
  musicTrackName,
  isPlayingMusic,
  openMusicSourceApp,
  prevMusicTrack,
  toggleMusicPlayer,
  nextMusicTrack,
  lastUndo,
  triggerUndo,
  showSettings,
  setShowSettings,
  updateInfo,
  onCloseWindow,
  t,
}) => {
  const [showFocusTimerPopover, setShowFocusTimerPopover] = useState(false);

  return (
    <div
      className={`relative z-10 w-full flex items-center justify-between border-b border-white/[0.04] shrink-0 transition-opacity duration-150 ${
        isFullScreen ? 'px-7 py-3' : 'px-5 py-2.5'
      } ${stage === 'expanded' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Kiri: Jam, Cuaca, dan Jadwal Shalat Berikutnya */}
      <div className="flex items-center gap-2.5 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200 tabular-nums">{clockStr}</span>
        <span className="text-zinc-700">·</span>
        <span>
          {weather.icon} {weather.tempC}°C
        </span>
        {settings.prayerFeatureEnabled !== false ? (
          <>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
              <span>
                {nextPrayer.name} {nextPrayer.time}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400">
              {weather.weatherCode !== undefined
                ? mapWeatherCode(weather.weatherCode, settings.language || 'en')
                : weather.conditionText}
            </span>
          </>
        )}
      </div>

      {/* Kanan: Focus Timer + Mini Media Control + Undo + Mode Layar + Pengaturan + Tutup */}
      <div className="flex items-center gap-1.5">
        {/* Focus Timer */}
        <div className="relative flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition">
          <button
            type="button"
            onClick={() => setShowFocusTimerPopover((p) => !p)}
            title={isEn ? 'Configure Focus Timer' : 'Atur Focus Timer'}
            className="flex items-center gap-1.5 text-left cursor-pointer"
          >
            <Timer
              className={`w-3.5 h-3.5 shrink-0 ${
                isFocusTimerRunning ? 'text-indigo-400 animate-pulse' : 'text-indigo-400/90'
              }`}
            />
            <span className="text-[11px] font-semibold tabular-nums text-zinc-200">
              {focusTimerFormatted}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleFocusTimer}
            title={
              isFocusTimerRunning
                ? isEn
                  ? 'Pause Focus Timer'
                  : 'Jeda Focus Timer'
                : isEn
                  ? 'Start Focus Timer'
                  : 'Mulai Focus Timer'
            }
            className="p-0.5 text-zinc-300 hover:text-white cursor-pointer pl-1 border-l border-white/[0.06]"
          >
            {isFocusTimerRunning ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>

          {showFocusTimerPopover && (
            <div className="absolute right-0 top-full mt-1.5 z-40 flex items-center gap-1 p-1.5 rounded-xl bg-[#12121a] border border-white/[0.08] shadow-xl">
              {[15, 25, 45, 5].map((mins) => {
                const active = Math.round(focusTimerTotalSeconds / 60) === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      startFocusTimer(mins);
                      setShowFocusTimerPopover(false);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition ${
                      active
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  resetFocusTimer();
                  setShowFocusTimerPopover(false);
                }}
                title={t.common.reset}
                className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Media Player */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition mr-1">
          <button
            type="button"
            onClick={openMusicSourceApp}
            title={isEn ? 'Click to open media player' : 'Klik untuk membuka aplikasi / browser pemutar media'}
            className="flex items-center gap-1.5 max-w-[180px] text-left cursor-pointer group"
          >
            <Disc3
              className={`w-3.5 h-3.5 text-cyan-400/90 shrink-0 ${
                isPlayingMusic ? 'animate-vinyl-spin' : ''
              }`}
            />
            {(() => {
              const isNoMedia =
                !isPlayingMusic ||
                !musicTrackName ||
                musicTrackName === 'Belum ada media diputar' ||
                musicTrackName === 'No media playing';
              const displayTrackName = isNoMedia
                ? isEn
                  ? 'No media playing'
                  : 'Belum ada media diputar'
                : musicTrackName;
              return (
                <span className="truncate text-[11px] font-medium text-zinc-300 group-hover:text-zinc-100">
                  {displayTrackName}
                </span>
              );
            })()}
            <ExternalLink className="w-2.5 h-2.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </button>

          <div className="flex items-center gap-0.5 pl-1 border-l border-white/[0.06]">
            <button
              type="button"
              onClick={prevMusicTrack}
              className="p-1 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={toggleMusicPlayer}
              className="p-1 text-zinc-200 hover:text-white cursor-pointer"
            >
              {isPlayingMusic ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={nextMusicTrack}
              className="p-1 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Undo Button */}
        {lastUndo && (
          <button
            type="button"
            onClick={triggerUndo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer transition"
            title={lastUndo.label}
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-400/90" />
          </button>
        )}

        {/* Toggle Mode Mengambang vs Layar Penuh */}
        <button
          type="button"
          onClick={() =>
            updateSettings({
              windowDisplayMode: isFullScreen ? 'floating' : 'fullscreen',
            })
          }
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer transition"
          title={
            isFullScreen
              ? isEn
                ? 'Switch to Floating Window'
                : 'Ubah ke Jendela Mengambang'
              : isEn
                ? 'Switch to Full Screen'
                : 'Ubah ke Layar Penuh'
          }
        >
          {isFullScreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Tombol Pengaturan */}
        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          className={`p-1.5 rounded-lg cursor-pointer transition relative ${
            showSettings
              ? 'bg-zinc-100 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]'
          }`}
          title={t.nav.settings}
        >
          <Settings className="w-3.5 h-3.5" />
          {updateInfo?.status === 'update-available' && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-[#0f0f16] animate-pulse" />
          )}
        </button>

        {/* Tombol Tutup Window */}
        <button
          type="button"
          onClick={onCloseWindow}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer transition"
          title={isEn ? 'Close (Esc)' : 'Tutup (Esc)'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
