import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';

export interface CalendarWeekDay {
  label: string;
  dateNum: number;
  isToday: boolean;
  hasSchedule: boolean;
}

export interface CapsuleCalendarData {
  monthName: string;
  fullMonthName: string;
  todayDate: number;
  cells: Array<number | null>;
  scheduledDays: Set<number>;
  weekStrip: CalendarWeekDay[];
}

export interface CalendarToolViewProps {
  calendarData: CapsuleCalendarData;
  isCalendarExpanded: boolean;
  onToggleCalendarExpanded: () => void;
  isEn: boolean;
}

/**
 * Tampilan alat Kalender 7-Hari di kapsul
 */
export const CalendarToolView: React.FC<CalendarToolViewProps> = ({
  calendarData,
  isCalendarExpanded,
  onToggleCalendarExpanded,
  isEn,
}) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleCalendarExpanded();
      }}
      className="w-full h-full flex items-center justify-between gap-1.5 px-1.5 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
    >
      <div className="flex flex-col items-start justify-center pr-1 shrink-0">
        <div className="flex items-center gap-1 text-zinc-200">
          <CalendarIcon className="w-3 h-3 text-sky-400" />
          <span className="text-[9.5px] font-bold uppercase tracking-wider">
            {calendarData.monthName}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-[8.5px] text-zinc-400">
          <span>{isCalendarExpanded ? (isEn ? 'Close' : 'Tutup') : (isEn ? 'Full' : 'Penuh')}</span>
          {isCalendarExpanded ? (
            <ChevronUp className="w-2.5 h-2.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-7 gap-1 items-center">
        {calendarData.weekStrip.map((d) => (
          <div
            key={d.label}
            className={`relative flex flex-col items-center justify-center py-0.5 rounded-lg transition-all ${
              d.isToday
                ? 'bg-zinc-100 text-zinc-950 font-bold'
                : 'bg-white/[0.03] text-zinc-300'
            }`}
          >
            <span
              className={`text-[7.5px] leading-tight ${
                d.isToday ? 'text-zinc-700' : 'text-zinc-500'
              }`}
            >
              {d.label}
            </span>
            <span className="text-[10px] leading-tight font-semibold">{d.dateNum}</span>
            {d.hasSchedule && !d.isToday && (
              <span className="w-1 h-1 rounded-full bg-sky-400 mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </button>
  );
};

export interface FullCalendarGridProps {
  calendarData: CapsuleCalendarData;
  isEn: boolean;
}

/**
 * Grid Kalender Penuh Bulanan saat tombol Full diklik di kapsul
 */
export const FullCalendarGrid: React.FC<FullCalendarGridProps> = ({
  calendarData,
  isEn,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      data-interactive="true"
      className="w-full pt-1.5 pb-1 px-2.5 mt-1 select-none"
    >
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className="text-[10px] font-bold text-zinc-200 capitalize">
          {calendarData.fullMonthName}
        </span>
        <span className="text-[9px] text-zinc-400">
          {calendarData.scheduledDays.size} {isEn ? 'events this month' : 'agenda bulan ini'}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[8.5px] font-semibold text-zinc-500 mb-0.5">
        {(isEn
          ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
          : ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']
        ).map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
        {calendarData.cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="h-5" />;
          }
          const isToday = day === calendarData.todayDate;
          const hasSchedule = calendarData.scheduledDays.has(day);
          return (
            <div
              key={day}
              className={`relative h-5 flex items-center justify-center rounded-md font-medium transition-colors ${
                isToday
                  ? 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              {day}
              {hasSchedule && !isToday && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-sky-400" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
