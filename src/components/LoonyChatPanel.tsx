import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CornerDownLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HoloMascotEyes } from './HoloMascotEyes';
import { ChatMessage, MascotMood } from '../types';
import {
  askLoonyAI,
  loadSavedChatHistory,
  LoonyChatContext,
  saveChatHistory,
  AI_PROVIDERS,
} from '../services/loonyChat';
import { soundEngine } from '../services/soundEngine';

interface LoonyChatPanelProps {
  onOpenTools?: () => void;
  onActionExecuted?: (type: 'expense' | 'schedule' | 'habit' | 'idea' | 'debt') => void;
  isMobile?: boolean;
}

const STARTER_PROMPTS_EN = [
  "Today's budget?",
  "Today's schedule",
  'lunch $15',
  'meeting at 15:00',
];

const STARTER_PROMPTS_ID = [
  'Batas aman hari ini?',
  'Agenda hari ini',
  'kopi 18rb',
  'rapat jam 15:00',
];

export const LoonyChatPanel: React.FC<LoonyChatPanelProps> = ({
  onOpenTools,
  onActionExecuted,
  isMobile = false,
}) => {
  const {
    mascotMood,
    setManualMoodOverride,
    settings,
    safeToSpend,
    schedules,
    habits,
    isPlayingMusic,
    loonySignLabel,
    addExpense,
    addIncome,
    addScheduleWithConflictCheck,
    addHabit,
    addIdea,
    ideaCategories,
    addIdeaCategory,
    deleteIdeaCategory,
    addDebt,
    startFocusTimer,
    t,
  } = useApp();

  const isEn = (settings.language || 'en') === 'en';
  const starterPrompts = isEn ? STARTER_PROMPTS_EN : STARTER_PROMPTS_ID;

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadSavedChatHistory(isEn ? 'en' : 'id')
  );
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [localMood, setLocalMood] = useState<MascotMood>('happy');
  const [isPetted, setIsPetted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const petTimerRef = useRef<number | null>(null);
  const petTrackerRef = useRef({
    lastX: 0,
    lastDir: 0,
    reversals: 0,
    lastTime: 0,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    saveChatHistory(messages);
  }, [messages, isThinking]);

  useEffect(() => {
    // Sinkronkan pesan pembuka jika hanya ada 1 pesan bawaan saat preferensi bahasa berganti
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id.startsWith('msg-welcome')) {
        const nickname = settings.userNickname || '';
        const greetName = nickname.trim() ? ` ${nickname.trim()}` : '';
        const expected = isEn
          ? `Hey${greetName}! I'm Loony [■━■]. Any schedule, ideas, or expenses you'd like to log today?`
          : `Halo${greetName}! Aku Loony [■━■]. Ada agenda, ide, atau pengeluaran yang ingin dicatat hari ini?`;
        if (prev[0].text !== expected) {
          return [{ ...prev[0], text: expected }];
        }
      }
      return prev;
    });
  }, [isEn, settings.userNickname]);

  useEffect(() => {
    window.electronAPI?.setIgnoreMouseEvents(false);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    const onChatCleared = (e: Event) => {
      const customEv = e as CustomEvent<ChatMessage[]>;
      if (customEv.detail && Array.isArray(customEv.detail)) {
        setMessages(customEv.detail);
      } else {
        setMessages(loadSavedChatHistory(isEn ? 'en' : 'id'));
      }
    };
    window.addEventListener('loony-chat-cleared', onChatCleared);
    return () => {
      clearTimeout(t);
      window.removeEventListener('loony-chat-cleared', onChatCleared);
    };
  }, [isEn]);

  // Interaksi Elus Kepala Loony di Panggung Kiri
  const handleStagePointerMove = (e: React.PointerEvent) => {
    const now = performance.now();
    const tracker = petTrackerRef.current;
    const dx = e.clientX - tracker.lastX;
    if (Math.abs(dx) < 6) return;

    const dir = dx > 0 ? 1 : -1;
    if (now - tracker.lastTime > 750) {
      tracker.reversals = 0;
    } else if (tracker.lastDir !== 0 && dir !== tracker.lastDir) {
      tracker.reversals += 1;
    }

    tracker.lastX = e.clientX;
    tracker.lastDir = dir;
    tracker.lastTime = now;

    if (tracker.reversals >= 3 && !isPetted) {
      tracker.reversals = 0;
      setIsPetted(true);
      soundEngine.playHappyPatChime();
      if (petTimerRef.current) clearTimeout(petTimerRef.current);
      petTimerRef.current = window.setTimeout(() => {
        setIsPetted(false);
      }, 2400);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setLocalMood('focused');
      setManualMoodOverride('focused');
    } else {
      setLocalMood('happy');
      setManualMoodOverride(null);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isThinking) return;

    setInputText('');
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setLocalMood('curious');
    setManualMoodOverride('curious');

    const ctx: LoonyChatContext = {
      nowStr: new Date().toLocaleString(isEn ? 'en-US' : 'id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      todayISO: new Date().toISOString().split('T')[0],
      safeToSpendToday: safeToSpend.remainingSafeToday,
      activeBalance: safeToSpend.activeBalance,
      unpaidHabitsCount: habits.filter((h) => !h.completedToday).length,
      todaySchedulesCount: schedules.length,
      unpaidDebtTotal: safeToSpend.unpaidMyDebtTotal,
      userNickname: settings.userNickname,
      ideaCategories,
    };

    try {
      const response = await askLoonyAI(textToSend, messages, ctx, settings);

      const actionSummaries: string[] = [];
      for (const act of response.actions) {
        if (act.type === 'expense' && act.payload?.amount) {
          addExpense(
            Number(act.payload.amount),
            act.payload.title || (isEn ? 'Expense' : 'Belanja'),
            act.payload.category
          );
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('expense');
        } else if (act.type === 'income' && act.payload?.amount) {
          addIncome(
            Number(act.payload.amount),
            act.payload.title || (isEn ? 'Income' : 'Pemasukan')
          );
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('expense');
        } else if (act.type === 'schedule' && act.payload?.title) {
          addScheduleWithConflictCheck({
            title: act.payload.title,
            date: act.payload.date || new Date().toISOString().split('T')[0],
            startTime: act.payload.startTime || '14:00',
            endTime: act.payload.endTime || '15:00',
          });
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('schedule');
        } else if (act.type === 'habit' && act.payload?.title) {
          addHabit(act.payload.title, act.payload.icon || '•', act.payload.deadlineTime || '21:00');
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('habit');
        } else if (act.type === 'idea' && act.payload?.content) {
          const targetTag = act.payload.tag || ideaCategories[0] || (isEn ? '#Note' : '#Catatan');
          addIdeaCategory(targetTag);
          addIdea(act.payload.content, targetTag);
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('idea');
        } else if (act.type === 'category-add' && act.payload?.tag) {
          addIdeaCategory(act.payload.tag);
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('idea');
        } else if (act.type === 'category-delete' && act.payload?.tag) {
          deleteIdeaCategory(act.payload.tag);
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('idea');
        } else if (act.type === 'debt' && act.payload?.person) {
          addDebt(
            act.payload.person,
            Number(act.payload.amount) || 0,
            act.payload.type || 'hutang',
            act.payload.note || ''
          );
          actionSummaries.push(act.summaryText);
          onActionExecuted?.('debt');
        } else if (act.type === 'focus-timer') {
          startFocusTimer(Number(act.payload?.minutes) || 25);
          actionSummaries.push(act.summaryText);
        }
      }

      const loonyMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'loony',
        text: response.replyText,
        timestamp: new Date().toISOString(),
        actionSummary: actionSummaries.length > 0 ? actionSummaries.join(' • ') : undefined,
        moodReaction: response.moodReaction,
      };

      setMessages((prev) => [...prev, loonyMsg]);
      setLocalMood(response.moodReaction);
      setManualMoodOverride(response.moodReaction);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'loony',
        text: isEn
          ? "Loony's AI thoughts got momentarily disconnected. Let's try again!"
          : 'Koneksi ke otak AI-ku sedang terputus sebentar. Coba lagi yuk!',
        timestamp: new Date().toISOString(),
        moodReaction: 'curious',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      window.setTimeout(() => setManualMoodOverride(null), 4000);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  };

  const showStarterPrompts = messages.length <= 1 && !inputText.trim();

  const activeAiProvider = settings.aiProvider || 'gemini';
  const effectiveAiKey = (settings.aiApiKey || settings.geminiApiKey || '').trim();
  const activeAiConfig = AI_PROVIDERS[activeAiProvider] || AI_PROVIDERS.gemini;
  const isAiOnline = activeAiConfig.requiresKey ? effectiveAiKey.length > 5 : true;
  const activeAiLabel = activeAiConfig.name;

  return (
    <div className="flex flex-col h-full w-full select-none text-zinc-100 font-marshmallow overflow-hidden">
      {/* =====================================================================
          1. PANGGUNG LOONY (LOONY'S STAGE) — TERBUKA & BERSIH TANPA HEADER KAKU
         ===================================================================== */}
      <div
        onPointerMove={handleStagePointerMove}
        className="group/stage relative flex flex-col items-center justify-center pt-5 pb-4 px-4 shrink-0 border-b border-white/[0.04]"
      >
        <div className="py-1 flex items-center justify-center">
          <HoloMascotEyes
            mood={localMood || mascotMood}
            size="md"
            isCapsuleIdle={false}
            isPlayingMusic={isPlayingMusic}
            signLabel={loonySignLabel}
            isPetted={isPetted}
          />
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 tracking-wide">
          <span>
            {isPetted
              ? (isEn ? 'Purring happily ^━^' : 'Senang dielus ^━^')
              : isThinking
                ? (isEn ? 'Thinking...' : 'Sedang memikirkan...')
                : inputText.trim()
                  ? (isEn ? 'Listening to you...' : 'Mendengarkanmu...')
                  : (isEn ? 'Loony is ready' : 'Loony siap bantu')}
          </span>
          <span className="text-[10px] text-zinc-600">·</span>
          <span
            className={`text-[10px] inline-flex items-center gap-1 ${
              isAiOnline ? 'text-cyan-400 font-medium' : 'text-zinc-500'
            }`}
            title={
              isAiOnline
                ? (isEn ? `${activeAiLabel} Engine Active` : `Otak ${activeAiLabel} Aktif`)
                : (isEn ? 'Offline Smart Brain' : 'Mode Pintar Lokal (Offline)')
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAiOnline
                  ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.7)]'
                  : 'bg-zinc-600'
              }`}
            />
            {isAiOnline ? activeAiLabel : (isEn ? 'Offline' : 'Lokal')}
          </span>
        </div>
      </div>

      {/* =====================================================================
          2. ALIRAN DIALOG ("COMPANION DIALOGUE" — TANPA TEMBOK KOTAK WHATSAPP)
         ===================================================================== */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => {
          const isLatestLoony =
            msg.sender === 'loony' &&
            idx === messages.map((m) => m.sender).lastIndexOf('loony');

          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] px-3 py-1.5 rounded-2xl rounded-tr-sm bg-white/[0.06] text-zinc-200 text-xs leading-relaxed">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col items-start">
              <div className="flex items-stretch gap-2.5 max-w-[94%]">
                <div
                  className={`w-[2px] rounded-full shrink-0 my-0.5 transition-colors ${
                    isLatestLoony ? 'bg-zinc-300' : 'bg-zinc-700/70'
                  }`}
                />
                <div
                  className={`text-xs leading-relaxed ${
                    isLatestLoony ? 'text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {msg.text}
                </div>
              </div>

              {/* Baris Bukti Aksi (Micro-Receipt) */}
              {msg.actionSummary && (
                <div className="ml-3 mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-[10.5px] text-zinc-300">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{msg.actionSummary}</span>
                </div>
              )}
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-2.5 text-zinc-500 text-xs">
            <div className="w-[2px] h-4 rounded-full bg-zinc-600 animate-pulse" />
            <span className="text-[11px] text-zinc-500">{isEn ? 'Thinking...' : 'Mengetik...'}</span>
          </div>
        )}

        {/* Contoh perintah tipis — HANYA tampil saat obrolan baru dimulai */}
        {showStarterPrompts && (
          <div className="pt-2 space-y-1.5">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
              {isEn ? 'TRY ASKING OR TAPPING' : 'COBA KETIK ATAU KLIK'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {starterPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* =====================================================================
          3. SATU INPUT TERPADU (OBROLAN + PERINTAH CEPAT MENYATU)
         ===================================================================== */}
      <div className="p-3 pt-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 rounded-xl bg-white/[0.04] focus-within:bg-white/[0.07] px-3 py-2 transition"
        >
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onFocus={() => window.electronAPI?.setIgnoreMouseEvents(false)}
            onMouseDown={() => window.electronAPI?.setIgnoreMouseEvents(false)}
            placeholder={
              isEn
                ? "Ask anything or quick capture, e.g. 'lunch $15'..."
                : "Ketik pesan atau perintah cepat, misal: 'kopi 18rb'..."
            }
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none cursor-text pointer-events-auto"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            title={isEn ? 'Send (Enter)' : 'Kirim (Enter)'}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Hanya untuk tampilan Mobile yang masih memakai 1 layar bergantian */}
        {isMobile && onOpenTools && (
          <div className="pt-2 flex items-center justify-center">
            <button
              type="button"
              onClick={onOpenTools}
              className="px-3.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>{isEn ? 'Open Workspace' : 'Buka Ruang Kerja'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
