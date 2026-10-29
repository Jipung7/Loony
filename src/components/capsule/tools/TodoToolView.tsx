import React from 'react';
import { Check, ListTodo } from 'lucide-react';

export interface CapsuleTaskItem {
  id: string;
  title: string;
  time: string;
  done: boolean;
  isHabit: boolean;
}

export interface TodoToolViewProps {
  pendingTask: CapsuleTaskItem | null;
  onToggleHabitCompleted: (id: string) => void;
  isEn: boolean;
}

/**
 * Tampilan alat To-Do & Kebiasaan di kapsul
 */
export const TodoToolView: React.FC<TodoToolViewProps> = ({
  pendingTask,
  onToggleHabitCompleted,
  isEn,
}) => {
  return (
    <div className="w-full flex items-center px-1">
      {pendingTask ? (
        <div className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/[0.05] px-2.5 py-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {pendingTask.isHabit ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHabitCompleted(pendingTask.id);
                }}
                className={`w-4 h-4 rounded-md flex items-center justify-center transition cursor-pointer shrink-0 ${
                  pendingTask.done
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-white/10 hover:bg-white/20 text-transparent'
                }`}
              >
                <Check className="w-3 h-3" />
              </button>
            ) : (
              <ListTodo className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span
              className={`truncate font-medium ${
                pendingTask.done ? 'line-through text-zinc-500' : 'text-zinc-100'
              }`}
            >
              {pendingTask.title}
            </span>
          </div>
          <span className="text-[10px] font-medium text-zinc-400 shrink-0 tabular-nums">
            {pendingTask.time}
          </span>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-1.5 px-3 text-center">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-200">
            {isEn ? 'All tasks done for today!' : 'Semua tugas hari ini beres!'}
          </span>
        </div>
      )}
    </div>
  );
};
