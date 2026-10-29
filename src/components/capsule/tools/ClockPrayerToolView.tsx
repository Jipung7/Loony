import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { AppSettings, PrayerSchedule, WeatherInfo } from '../../../types';
import { mapWeatherCode, NextPrayerStatus } from '../../../services/prayerAndWeather';

export interface ClockPrayerToolViewProps {
  clockText: string;
  secondsText: string;
  settings: AppSettings;
  nextPrayer: NextPrayerStatus;
  weather: WeatherInfo;
  isPrayerExpanded: boolean;
  onTogglePrayerExpanded: () => void;
}

/**
 * Tampilan alat Jam & Jadwal Shalat (atau Jam & Cuaca jika Shalat dinonaktifkan)
 */
export const ClockPrayerToolView: React.FC<ClockPrayerToolViewProps> = ({
  clockText,
  secondsText,
  settings,
  nextPrayer,
  weather,
  onTogglePrayerExpanded,
}) => {
  return (
    <div className="w-full flex items-center justify-between gap-2 px-1.5">
      <div className="flex items-center gap-1.5 shrink-0">
        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <div className="flex items-baseline gap-1 tracking-tight">
          <span className="text-xl font-bold text-zinc-100 leading-none tabular-nums">
            {clockText}
          </span>
          <span className="text-[10px] font-semibold text-zinc-400 tabular-nums">
            {secondsText}
          </span>
        </div>
      </div>

      {settings.prayerFeatureEnabled !== false ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePrayerExpanded();
          }}
          className="capsule-btn flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-200 cursor-pointer truncate max-w-[185px]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-semibold truncate">
            {nextPrayer.name} {nextPrayer.time}
          </span>
          <span className="text-[9.5px] text-zinc-400 shrink-0">
            ({nextPrayer.countdownText})
          </span>
        </button>
      ) : (
        <div className="capsule-btn flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-200 truncate max-w-[185px]">
          <span>{weather.icon}</span>
          <span className="font-semibold tabular-nums">{weather.tempC}°C</span>
          <span className="text-[10px] text-zinc-400 truncate">
            {weather.weatherCode !== undefined
              ? mapWeatherCode(weather.weatherCode, settings.language || 'en')
              : weather.conditionText}
          </span>
        </div>
      )}
    </div>
  );
};

export interface PrayerExpandedStripProps {
  prayerSchedule: PrayerSchedule;
  nextPrayer: NextPrayerStatus;
  isEn: boolean;
}

/**
 * Strip Jadwal Shalat 5 Waktu saat diperluas
 */
export const PrayerExpandedStrip: React.FC<PrayerExpandedStripProps> = ({
  prayerSchedule,
  nextPrayer,
  isEn,
}) => {
  const prayers = [
    { label: isEn ? 'Fajr' : 'Subuh', time: prayerSchedule.Fajr },
    { label: isEn ? 'Dhuhr' : 'Dzuhur', time: prayerSchedule.Dhuhr },
    { label: isEn ? 'Asr' : 'Ashar', time: prayerSchedule.Asr },
    { label: 'Maghrib', time: prayerSchedule.Maghrib },
    { label: isEn ? 'Isha' : 'Isya', time: prayerSchedule.Isha },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      data-interactive="true"
      className="w-full pt-1.5 pb-1 px-2 mt-1 grid grid-cols-5 gap-1 select-none"
    >
      {prayers.map((p) => {
        const isNext = nextPrayer.name.toLowerCase() === p.label.toLowerCase();
        return (
          <div
            key={p.label}
            className={`flex flex-col items-center justify-center py-1 rounded-lg text-center transition-all ${
              isNext
                ? 'bg-white/10 text-zinc-100 font-bold'
                : 'bg-white/[0.03] text-zinc-400'
            }`}
          >
            <span className="text-[8.5px] font-medium opacity-80">{p.label}</span>
            <span className="text-[10px] font-semibold text-zinc-100">{p.time}</span>
          </div>
        );
      })}
    </motion.div>
  );
};
