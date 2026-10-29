import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { mapWeatherCode } from '../../../services/prayerAndWeather';

export interface TodayTabProps {
  isFullScreen: boolean;
}

/**
 * Tab Hari Ini (Agenda, Rutinitas Harian, & Kalender Interaktif)
 */
export const TodayTab: React.FC<TodayTabProps> = ({ isFullScreen }) => {
  const {
    habits,
    toggleHabitCompleted,
    addHabit,
    updateHabit,
    deleteHabit,
    schedules,
    addScheduleWithConflictCheck,
    updateSchedule,
    deleteSchedule,
    settings,
    prayerSchedule,
    nextPrayer,
    weather,
    t,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';

  // Date and Calendar View States
  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [calView, setCalView] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Schedule & Habit Add Form States
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [schedTitle, setSchedTitle] = useState('');
  const [schedStart, setSchedStart] = useState('16:00');

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitTime, setHabitTime] = useState('21:00');

  // Inline editing state
  const [editingItem, setEditingItem] = useState<{
    type: 'schedule' | 'habit';
    id: string;
    text: string;
    secondary: string;
  } | null>(null);

  // Calendar calculations
  const calendarData = useMemo(() => {
    const { year, month } = calView;
    const viewDate = new Date(year, month, 1);
    const monthName = viewDate.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
      month: 'long',
      year: 'numeric',
    });
    const firstDayIndex = (viewDate.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number; iso: string } | null> = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso });
    }
    const scheduledDatesSet = new Set(schedules.map((s) => s.date));
    return { monthName, cells, scheduledDatesSet };
  }, [calView, schedules, isEn]);

  const schedulesForSelectedDate = useMemo(() => {
    return schedules
      .filter((s) => s.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (selectedDate === todayISO) return isEn ? 'Today' : 'Hari Ini';
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return selectedDate;
    return new Date(y, m - 1, d).toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
    });
  }, [selectedDate, todayISO, isEn]);

  // Handlers
  const handlePrevMonth = () => {
    setCalView((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCalView((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleJumpToToday = () => {
    const d = new Date();
    setCalView({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDate(todayISO);
  };

  const [schedEnd] = useState('17:00');

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = schedTitle.trim();
    if (!trimmed) return;
    addScheduleWithConflictCheck({
      title: trimmed,
      date: selectedDate || todayISO,
      startTime: schedStart || '16:00',
      endTime: schedEnd,
    });
    setSchedTitle('');
    setShowAddSchedule(false);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = habitTitle.trim();
    if (!trimmed) return;
    addHabit(trimmed, '•', habitTime || '21:00');
    setHabitTitle('');
    setShowAddHabit(false);
  };

  const handleCommitInlineEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;
    const { type, id, text, secondary } = editingItem;
    const trimmed = text.trim();
    if (trimmed) {
      if (type === 'schedule') {
        updateSchedule(id, { title: trimmed, startTime: secondary || '09:00' });
      } else if (type === 'habit') {
        updateHabit(id, { title: trimmed, deadlineTime: secondary || '21:00' });
      }
    }
    setEditingItem(null);
  };

  return (
    <div className="h-full min-h-0 grid grid-cols-12 gap-6 overflow-hidden">
      {/* KOLOM 1: Rutinitas Harian */}
      <div
        className={`${
          isFullScreen ? 'col-span-4' : 'col-span-7'
        } h-full min-h-0 flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Clock className="w-3.5 h-3.5 text-rose-400/90" />
            <span>
              {isFullScreen
                ? isEn
                  ? 'Daily Routines'
                  : 'Rutinitas Harian'
                : selectedDate === todayISO
                  ? isEn
                    ? 'Events & Routines'
                    : 'Agenda & Rutinitas'
                  : isEn
                    ? `Events (${selectedDateLabel}) & Routines`
                    : `Agenda (${selectedDateLabel}) & Rutinitas`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setShowAddHabit((p) => !p);
                setShowAddSchedule(false);
              }}
              className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-zinc-300 hover:text-white cursor-pointer"
            >
              {isEn ? '+ Routine' : '+ Rutinitas'}
            </button>
            {!isFullScreen && (
              <button
                type="button"
                onClick={() => {
                  setShowAddSchedule((p) => !p);
                  setShowAddHabit(false);
                }}
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-zinc-300 hover:text-white cursor-pointer"
              >
                {isEn ? '+ Event' : '+ Agenda'}
              </button>
            )}
          </div>
        </div>

        {showAddHabit && (
          <form
            onSubmit={handleAddHabit}
            className="flex gap-1.5 mb-3 pb-2.5 border-b border-white/[0.04] shrink-0"
          >
            <input
              type="text"
              autoFocus
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              placeholder={isEn ? 'New routine name...' : 'Nama rutinitas baru...'}
              className="flex-1 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
            />
            <input
              type="time"
              value={habitTime}
              onChange={(e) => setHabitTime(e.target.value)}
              className="bg-white/[0.04] rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-[11px] font-semibold cursor-pointer"
            >
              {t.common.save}
            </button>
          </form>
        )}

        {!isFullScreen && showAddSchedule && (
          <form
            onSubmit={handleAddSchedule}
            className="flex gap-1.5 mb-3 pb-2.5 border-b border-white/[0.04] shrink-0"
          >
            <input
              type="text"
              autoFocus
              value={schedTitle}
              onChange={(e) => setSchedTitle(e.target.value)}
              placeholder={
                isEn
                  ? `Event for ${selectedDateLabel}...`
                  : `Agenda untuk ${selectedDateLabel}...`
              }
              className="flex-1 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
            />
            <input
              type="time"
              value={schedStart}
              onChange={(e) => setSchedStart(e.target.value)}
              className="bg-white/[0.04] rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-[11px] font-semibold cursor-pointer"
            >
              {t.common.save}
            </button>
          </form>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
          {habits.length === 0 &&
            (isFullScreen || schedulesForSelectedDate.length === 0) && (
              <div className="py-12 text-center text-xs text-zinc-600">
                {isFullScreen
                  ? isEn
                    ? 'No daily routines yet.'
                    : 'Belum ada rutinitas harian.'
                  : isEn
                    ? `No events (${selectedDateLabel}) or routines yet.`
                    : `Belum ada agenda (${selectedDateLabel}) atau rutinitas.`}
              </div>
            )}

          {habits.map((h) => {
            const isEditing =
              editingItem?.type === 'habit' && editingItem.id === h.id;
            return (
              <div
                key={h.id}
                className="group flex items-center justify-between gap-3 py-2.5 px-1.5 rounded-lg hover:bg-white/[0.02] transition"
              >
                {isEditing ? (
                  <form
                    onSubmit={handleCommitInlineEdit}
                    className="flex items-center gap-1.5 w-full"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingItem.text}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, text: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingItem(null);
                      }}
                      className="flex-1 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                    />
                    <input
                      type="time"
                      value={editingItem.secondary}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          secondary: e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingItem(null);
                      }}
                      className="bg-white/[0.06] rounded-md px-1.5 py-0.5 text-[11px] text-zinc-200 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                    >
                      OK
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleHabitCompleted(h.id)}
                        className={`w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 transition cursor-pointer ${
                          h.completedToday
                            ? 'bg-zinc-100 text-zinc-950'
                            : 'border border-zinc-600 hover:border-zinc-400 text-transparent'
                        }`}
                      >
                        {h.completedToday && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span
                        onClick={() =>
                          setEditingItem({
                            type: 'habit',
                            id: h.id,
                            text: h.title,
                            secondary: h.deadlineTime,
                          })
                        }
                        title="Klik untuk mengedit"
                        className={`truncate text-xs cursor-text hover:underline decoration-white/20 underline-offset-2 ${
                          h.completedToday
                            ? 'line-through text-zinc-500'
                            : 'text-zinc-200'
                        }`}
                      >
                        {h.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        onClick={() =>
                          setEditingItem({
                            type: 'habit',
                            id: h.id,
                            text: h.title,
                            secondary: h.deadlineTime,
                          })
                        }
                        title="Klik untuk mengubah jam"
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 tabular-nums cursor-pointer"
                      >
                        {h.deadlineTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteHabit(h.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {!isFullScreen &&
            schedulesForSelectedDate.map((s) => {
              const isEditing =
                editingItem?.type === 'schedule' && editingItem.id === s.id;
              return (
                <div
                  key={s.id}
                  className="group flex items-center justify-between gap-3 py-2.5 px-1.5 rounded-lg hover:bg-white/[0.02] transition"
                >
                  {isEditing ? (
                    <form
                      onSubmit={handleCommitInlineEdit}
                      className="flex items-center gap-1.5 w-full"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingItem.text}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, text: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                        className="flex-1 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                      />
                      <input
                        type="time"
                        value={editingItem.secondary}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            secondary: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                        className="bg-white/[0.06] rounded-md px-1.5 py-0.5 text-[11px] text-zinc-200 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80 shrink-0 mx-1" />
                        <span
                          onClick={() =>
                            setEditingItem({
                              type: 'schedule',
                              id: s.id,
                              text: s.title,
                              secondary: s.startTime,
                            })
                          }
                          title="Klik untuk mengedit agenda"
                          className="truncate text-xs text-zinc-200 cursor-text hover:underline decoration-white/20 underline-offset-2"
                        >
                          {s.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          onClick={() =>
                            setEditingItem({
                              type: 'schedule',
                              id: s.id,
                              text: s.title,
                              secondary: s.startTime,
                            })
                          }
                          title="Klik untuk mengubah jam"
                          className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 tabular-nums cursor-pointer"
                        >
                          {s.startTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteSchedule(s.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* KOLOM 2 KHUSUS FULL SCREEN: Agenda Terjadwal */}
      {isFullScreen && (
        <div className="col-span-4 h-full min-h-0 flex flex-col pl-6 border-l border-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-sky-400/90" />
              <span>
                {isEn
                  ? `Events (${selectedDateLabel})`
                  : `Agenda (${selectedDateLabel})`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSchedule((p) => !p)}
              className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-zinc-300 hover:text-white cursor-pointer"
            >
              {isEn ? '+ Event' : '+ Agenda'}
            </button>
          </div>

          {showAddSchedule && (
            <form
              onSubmit={handleAddSchedule}
              className="flex gap-1.5 mb-3 pb-2.5 border-b border-white/[0.04] shrink-0"
            >
              <input
                type="text"
                autoFocus
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
                placeholder={
                  isEn
                    ? `Event for ${selectedDateLabel}...`
                    : `Agenda untuk ${selectedDateLabel}...`
                }
                className="flex-1 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none"
              />
              <input
                type="time"
                value={schedStart}
                onChange={(e) => setSchedStart(e.target.value)}
                className="bg-white/[0.04] rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-[11px] font-semibold cursor-pointer"
              >
                {t.common.save}
              </button>
            </form>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.03] pr-1">
            {schedulesForSelectedDate.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-600">
                {isEn
                  ? `No events scheduled for ${selectedDateLabel}.`
                  : `Belum ada agenda terjadwal untuk ${selectedDateLabel}.`}
              </div>
            ) : (
              schedulesForSelectedDate.map((s) => {
                const isEditing =
                  editingItem?.type === 'schedule' && editingItem.id === s.id;
                return (
                  <div
                    key={s.id}
                    className="group flex items-center justify-between gap-3 py-2.5 px-1.5 rounded-lg hover:bg-white/[0.02] transition"
                  >
                    {isEditing ? (
                      <form
                        onSubmit={handleCommitInlineEdit}
                        className="flex items-center gap-1.5 w-full"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingItem.text}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, text: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingItem(null);
                          }}
                          className="flex-1 bg-white/[0.06] rounded-md px-2 py-0.5 text-xs text-zinc-100 focus:outline-none"
                        />
                        <input
                          type="time"
                          value={editingItem.secondary}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              secondary: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingItem(null);
                          }}
                          className="bg-white/[0.06] rounded-md px-1.5 py-0.5 text-[11px] text-zinc-200 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-950 text-[10px] font-semibold cursor-pointer"
                        >
                          OK
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80 shrink-0 mx-1" />
                          <span
                            onClick={() =>
                              setEditingItem({
                                type: 'schedule',
                                id: s.id,
                                text: s.title,
                                secondary: s.startTime,
                              })
                            }
                            title="Klik untuk mengedit agenda"
                            className="truncate text-xs text-zinc-200 cursor-text hover:underline decoration-white/20 underline-offset-2"
                          >
                            {s.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            onClick={() =>
                              setEditingItem({
                                type: 'schedule',
                                id: s.id,
                                text: s.title,
                                secondary: s.startTime,
                              })
                            }
                            title="Klik untuk mengubah jam"
                            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 tabular-nums cursor-pointer"
                          >
                            {s.startTime}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteSchedule(s.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Sub-Kolom Kanan: Kalender Interaktif & Jadwal Shalat / Cuaca */}
      <div
        className={`${
          isFullScreen ? 'col-span-4' : 'col-span-5'
        } h-full min-h-0 flex flex-col justify-between pl-6 border-l border-white/[0.04] overflow-hidden`}
      >
        <div>
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.05]">
            <span className="text-xs font-semibold text-zinc-200 capitalize">
              {calendarData.monthName}
            </span>
            <div className="flex items-center gap-1">
              {(selectedDate !== todayISO ||
                calView.year !== new Date().getFullYear() ||
                calView.month !== new Date().getMonth()) && (
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-1.5 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-[9.5px] text-zinc-300 cursor-pointer mr-0.5"
                >
                  {t.common.today}
                </button>
              )}
              <button
                type="button"
                onClick={handlePrevMonth}
                title={isEn ? 'Previous month' : 'Bulan sebelumnya'}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title={isEn ? 'Next month' : 'Bulan berikutnya'}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500 mb-1.5">
            {(isEn
              ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
              : ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']
            ).map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center text-[11px]">
            {calendarData.cells.map((cell, idx) => {
              if (!cell) {
                return <div key={idx} className="h-6 opacity-0" />;
              }
              const isToday = cell.iso === todayISO;
              const isSelected = cell.iso === selectedDate;
              const hasEvents = calendarData.scheduledDatesSet.has(cell.iso);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso)}
                  className={`relative h-6 flex flex-col items-center justify-center rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : isToday
                        ? 'ring-1 ring-zinc-400/60 text-zinc-100 font-semibold hover:bg-white/[0.06]'
                        : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  }`}
                >
                  <span className="leading-none">{cell.day}</span>
                  {hasEvents && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-sky-500' : 'bg-sky-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bawah Kalender: Jadwal Shalat / Cuaca */}
        {settings.prayerFeatureEnabled !== false ? (
          <div className="pt-3 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {isEn ? "Today's Prayer Times" : 'Waktu Shalat Hari Ini'}
              </span>
              <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                {prayerSchedule.locationLabel}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[
                { label: t.prayer.fajr, time: prayerSchedule.Fajr },
                { label: t.prayer.dhuhr, time: prayerSchedule.Dhuhr },
                { label: t.prayer.asr, time: prayerSchedule.Asr },
                { label: t.prayer.maghrib, time: prayerSchedule.Maghrib },
                { label: t.prayer.isha, time: prayerSchedule.Isha },
              ].map((p) => {
                const isNext =
                  nextPrayer.name.toLowerCase() === p.label.toLowerCase();
                return (
                  <div
                    key={p.label}
                    className={`py-1.5 rounded-lg ${
                      isNext ? 'bg-white/[0.07] text-zinc-100' : 'text-zinc-500'
                    }`}
                  >
                    <div className="text-[9px]">{p.label}</div>
                    <div className="text-[10.5px] font-semibold text-zinc-200 tabular-nums mt-0.5">
                      {p.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {isEn ? 'Current Location Weather' : 'Cuaca Lokasi Saat Ini'}
              </div>
              <div className="text-xs text-zinc-300 mt-0.5">
                {prayerSchedule.locationLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-zinc-100 tabular-nums">
                {weather.icon} {weather.tempC}°C
              </div>
              <div className="text-[10px] text-zinc-500">
                {weather.weatherCode !== undefined
                  ? mapWeatherCode(weather.weatherCode, settings.language || 'en')
                  : weather.conditionText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
