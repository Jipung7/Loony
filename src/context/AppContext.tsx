import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppLanguage,
  AppSettings,
  BridgeFileItem,
  BudgetConfig,
  ClipboardItem,
  DebtItem,
  DEFAULT_IDEA_CATEGORIES,
  DEFAULT_IDEA_CATEGORIES_EN,
  DisplayInfo,
  DockPosition,
  ExpenseItem,
  HabitItem,
  IdeaItem,
  IdeaTag,
  IslandMode,
  LoonySignLabel,
  MandatoryBill,
  MascotMood,
  ParsedQuickInput,
  PrayerSchedule,
  ScheduleItem,
  WeatherInfo,
} from '../types';
import {
  fetchPrayerScheduleAuto,
  fetchWeatherAuto,
  getNextPrayerStatus,
  mapWeatherCode,
  NextPrayerStatus,
} from '../services/prayerAndWeather';
import { analyzeWithGeminiAI, parseQuickInputLocal } from '../services/smartParser';
import { filterActiveBridgeFiles, syncBridgeManager } from '../services/syncAndBridge';
import { soundEngine } from '../services/soundEngine';
import {
  getDictionary,
  formatCurrency,
  interpolate,
  TranslationDictionary,
} from '../locales';

/**
 * Mengembalikan Cycle Date berdasarkan waktu reset 04:00 Pagi.
 * Jika sekarang pukul 01:30 dini hari tanggal 26, maka masih dihitung siklus tanggal 25.
 */
export function getHabitCycleDateKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return shifted.toISOString().split('T')[0];
}

function getTodayISO(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

export interface SafeToSpendMetrics {
  activeBalance: number;
  unpaidMandatoryTotal: number;
  unpaidMyDebtTotal: number;
  pendingReceivableTotal: number; // Piutang orang ke kita (belum masuk saldo aman sampai Lunas)
  netPoolBeforeToday: number;
  remainingDaysInCycle: number;
  baseDailyAllowance: number; // Jatah hari ini sebelum dikurangi belanja hari ini
  spentToday: number;
  remainingSafeToday: number; // Sisa jatah jajan hari ini
  projectedTomorrowAllowance: number; // Rebalance otomatis untuk besok berdasarkan belanja hari ini
  usageRatio: number; // 0.0 - 1.0+
  statusLevel: 'safe' | 'warning' | 'danger';
}

interface UndoAction {
  label: string;
  undo: () => void;
}

interface AppContextValue {
  islandMode: IslandMode;
  setIslandMode: React.Dispatch<React.SetStateAction<IslandMode>>;
  dockPosition: DockPosition;
  setDockPosition: React.Dispatch<React.SetStateAction<DockPosition>>;
  islandOffset: { x: number; y: number };
  setIslandOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  resetIslandOffset: () => void;
  mascotMood: MascotMood;
  loonySignLabel: LoonySignLabel;
  triggerTimedReaction: (mood: MascotMood, sign: LoonySignLabel, durationMs?: number) => void;
  setExternalCuriousActive: React.Dispatch<React.SetStateAction<boolean>>;
  setManualMoodOverride: React.Dispatch<React.SetStateAction<MascotMood | null>>;
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  isSystemFullscreen: boolean;
  resolvedWindowTheme: 'dark' | 'light';
  resolvedCapsuleTheme: 'dark' | 'light';
  availableDisplays: DisplayInfo[];
  t: TranslationDictionary;
  formatMoney: (amount: number) => string;
  interpolate: (template: string, params: Record<string, string | number>) => string;

  // Modul 1: Instant Bridge
  clipboardHistory: ClipboardItem[];
  bridgeFiles: BridgeFileItem[];
  outboxPendingCount: number;
  pushClipboardText: (text: string) => void;
  sendBridgeFile: (file: File) => Promise<void>;
  togglePinBridgeFile: (fileId: string) => void;
  deleteBridgeFile: (fileId: string) => void;
  openBridgeFolder: (filePath?: string) => void;

  // Modul 2: Idea Vault
  ideas: IdeaItem[];
  ideaCategories: IdeaTag[];
  addIdea: (content: string, tag?: IdeaTag, aiSummary?: string) => void;
  togglePinIdea: (id: string) => void;
  deleteIdea: (id: string) => void;
  updateIdeaTag: (id: string, tag: IdeaTag) => void;
  updateIdea: (id: string, partial: Partial<Omit<IdeaItem, 'id'>>) => void;
  addIdeaCategory: (rawName: string) => IdeaTag;
  deleteIdeaCategory: (tag: IdeaTag) => void;

  // Modul 3: Smart Schedule & Conflict Checker
  schedules: ScheduleItem[];
  addScheduleWithConflictCheck: (item: Omit<ScheduleItem, 'id'>) => {
    added: ScheduleItem;
    conflictWith?: ScheduleItem;
  };
  updateSchedule: (id: string, partial: Partial<Omit<ScheduleItem, 'id'>>) => void;
  deleteSchedule: (id: string) => void;

  // Modul 4: Anti-Lupa (Habits 04:00 Reset + Persistent Debt/IOU)
  habits: HabitItem[];
  urgentHabitsHMinus1: HabitItem[];
  toggleHabitCompleted: (id: string) => void;
  addHabit: (title: string, icon: string, deadlineTime: string) => void;
  updateHabit: (id: string, partial: Partial<Omit<HabitItem, 'id'>>) => void;
  deleteHabit: (id: string) => void;
  debts: DebtItem[];
  addDebt: (person: string, amount: number, type: 'hutang' | 'piutang', note: string, dueDate?: string) => void;
  markDebtPaid: (id: string) => void;
  deleteDebt: (id: string) => void;

  // Modul 5: Safe-to-Spend Daily Budget
  budgetConfig: BudgetConfig;
  expenses: ExpenseItem[];
  safeToSpend: SafeToSpendMetrics;
  addExpense: (amount: number, title: string, category?: string) => void;
  addIncome: (amount: number, title?: string) => void;
  updateExpense: (id: string, partial: Partial<Omit<ExpenseItem, 'id'>>) => void;
  deleteExpense: (id: string) => void;
  updateBudgetBalance: (newBalance: number, cycleEndDay?: number) => void;
  toggleMandatoryBillPaid: (id: string) => void;
  addMandatoryBill: (title: string, amount: number) => void;
  updateMandatoryBill: (id: string, partial: Partial<Omit<MandatoryBill, 'id'>>) => void;
  deleteMandatoryBill: (id: string) => void;

  // Smart Quick Capture Omnibox
  executeQuickCapture: (rawText: string) => Promise<ParsedQuickInput>;
  lastUndo: UndoAction | null;
  triggerUndo: () => void;

  // Dynamic Island Companion: Prayer, Weather, Music
  prayerSchedule: PrayerSchedule;
  nextPrayer: NextPrayerStatus;
  weather: WeatherInfo;
  isPrayerAlertRinging: boolean;
  mutePrayerAlertNow: () => void;
  triggerTestAdzan: () => void;
  refreshLocationAndPrayer: () => Promise<void>;
  isPlayingMusic: boolean;
  musicTrackName: string;
  musicArtistName: string;
  toggleMusicPlayer: () => void;
  nextMusicTrack: () => void;
  prevMusicTrack: () => void;
  openMusicSourceApp: () => void;

  // Backup & Restore Data Lokal
  exportBackupData: () => string;
  importBackupData: (rawJson: string) => boolean;
  resetFactoryData: () => void;
  isStateHydrated: boolean;

  // Focus Timer
  focusTimerSecondsLeft: number;
  focusTimerTotalSeconds: number;
  isFocusTimerRunning: boolean;
  lastFocusTimerCompletedAt: number;
  startFocusTimer: (minutes: number) => void;
  toggleFocusTimer: () => void;
  resetFocusTimer: (minutes?: number) => void;
}

const STORAGE_KEY = 'productivitysys_state_v3';
const SNAPSHOT_KEY = 'productivitysys_snapshot_v3';
const LAST_SNAPSHOT_TIME_KEY = 'productivitysys_snapshot_time';

const isIndonesianUser =
  typeof navigator !== 'undefined' &&
  (navigator.language?.toLowerCase().startsWith('id') ||
    (Array.isArray(navigator.languages) &&
      navigator.languages.some((l) => l.toLowerCase().startsWith('id'))));

const detectedLang: AppLanguage = isIndonesianUser ? 'id' : 'en';

const DEFAULT_SETTINGS: AppSettings = {
  deviceName: /Android|Mobile/i.test(navigator.userAgent) ? 'Mobile Companion' : 'Desktop PC',
  personalSyncKey: 'LOONY-BRIDGE-SYNC',
  supabaseUrl: '',
  supabaseAnonKey: '',
  geminiApiKey: '',
  aiProvider: 'gemini',
  aiApiKey: '',
  aiModel: '',
  aiCustomBaseUrl: '',
  adzanAlertMode: 'soft-chime',
  prayerFeatureEnabled: isIndonesianUser,
  desktopOverlayPreview: false,
  capsuleScale: 1,
  capsuleAutoCloseSec: 3.5,
  windowDisplayMode: 'floating',
  fontStyle: 'normal',
  windowTheme: 'dark',
  capsuleTheme: 'dark',
  soundEffectsEnabled: true,
  soundVolume: 70,
  auraEffectEnabled: true,
  indicatorStyle: 'subtle-glow',
  peekWhisperEnabled: true,
  idleSleepSec: 45,
  userNickname: '',
  globalShortcutEnabled: true,
  hasCompletedOnboarding: false,
  monitorTargetMode: 'follow-cursor',
  fullscreenBehavior: 'hide',
  language: detectedLang,
  currencySymbol: isIndonesianUser ? 'Rp' : '$',
};

const DEFAULT_CLIPBOARD: ClipboardItem[] = [];
const DEFAULT_IDEAS: IdeaItem[] = [];
const DEFAULT_SCHEDULES: ScheduleItem[] = [];
const DEFAULT_HABITS: HabitItem[] = [];
const DEFAULT_DEBTS: DebtItem[] = [];
const DEFAULT_BUDGET: BudgetConfig = {
  activeBalance: 0,
  cycleEndDay: 25,
  mandatoryBills: [],
};
const DEFAULT_EXPENSES: ExpenseItem[] = [];

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [islandMode, setIslandMode] = useState<IslandMode>('idle');
  const [dockPosition, setDockPosition] = useState<DockPosition>('top');
  const [islandOffset, setIslandOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [manualMoodOverride, setManualMoodOverride] = useState<MascotMood | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>(DEFAULT_CLIPBOARD);
  const [bridgeFiles, setBridgeFiles] = useState<BridgeFileItem[]>([]);
  const [outboxPendingCount, setOutboxPendingCount] = useState<number>(0);
  const [ideas, setIdeas] = useState<IdeaItem[]>(DEFAULT_IDEAS);
  const [ideaCategories, setIdeaCategories] = useState<IdeaTag[]>(DEFAULT_IDEA_CATEGORIES);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(DEFAULT_SCHEDULES);
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [debts, setDebts] = useState<DebtItem[]>(DEFAULT_DEBTS);
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(DEFAULT_BUDGET);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(DEFAULT_EXPENSES);
  const [availableDisplays, setAvailableDisplays] = useState<DisplayInfo[]>([]);
  const [lastUndo, setLastUndo] = useState<UndoAction | null>(null);

  const [prayerSchedule, setPrayerSchedule] = useState<PrayerSchedule>({
    Fajr: '04:32',
    Dhuhr: '11:54',
    Asr: '15:14',
    Maghrib: '17:58',
    Isha: '19:09',
    locationLabel: 'Mendeteksi Lokasi GPS/IP...',
    latitude: -6.2088,
    longitude: 106.8456,
    fetchedDate: getTodayISO(),
  });

  const [weather, setWeather] = useState<WeatherInfo>({
    tempC: 28,
    conditionText: detectedLang === 'en' ? 'Partly Cloudy' : 'Cerah Berawan',
    icon: '⛅',
    weatherCode: 2,
  });

  const [nowTick, setNowTick] = useState<Date>(new Date());
  const [isPrayerAlertRinging, setIsPrayerAlertRinging] = useState(false);
  const [lastTriggeredPrayerKey, setLastTriggeredPrayerKey] = useState('');
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const isEn = (settings.language || 'en') === 'en';
  const [musicTrackName, setMusicTrackName] = useState(
    isEn ? 'No media playing' : 'Belum ada media diputar'
  );
  const [musicArtistName, setMusicArtistName] = useState('Windows Media');

  // Focus Timer State
  const [focusTimerTotalSeconds, setFocusTimerTotalSeconds] = useState<number>(25 * 60);
  const [focusTimerSecondsLeft, setFocusTimerSecondsLeft] = useState<number>(25 * 60);
  const [isFocusTimerRunning, setIsFocusTimerRunning] = useState<boolean>(false);
  const [lastFocusTimerCompletedAt, setLastFocusTimerCompletedAt] = useState<number>(0);

  // Efek sinkronisasi nama track saat tidak ada media berputar ketika preferensi bahasa berganti
  useEffect(() => {
    if (!isPlayingMusic) {
      setMusicTrackName(isEn ? 'No media playing' : 'Belum ada media diputar');
      setMusicArtistName('Windows Media');
    }
  }, [isEn, isPlayingMusic]);

  // Langganan status musik/media real-time dari sistem Windows (Spotify, Browser, VLC, dll.)
  useEffect(() => {
    if (!window.electronAPI?.onMediaStatus) return;
    const unsub = window.electronAPI.onMediaStatus((info) => {
      if (info && info.title && info.title.trim() !== '') {
        setMusicTrackName(info.title.trim());
        setMusicArtistName(info.artist?.trim() || (isEn ? 'Playing' : 'Sedang Diputar'));
        setIsPlayingMusic(Boolean(info.isPlaying));
      } else {
        setMusicTrackName(isEn ? 'No media playing' : 'Belum ada media diputar');
        setMusicArtistName('Windows Media');
        setIsPlayingMusic(false);
      }
    });
    return () => unsub();
  }, [isEn]);

  // 1. Load state dari LocalStorage saat pertama kali buka
  useEffect(() => {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      // Resiliensi Data: Jika berkas utama kosong atau belum ada, coba pulihkan dari rolling snapshot
      if (!raw && localStorage.getItem(SNAPSHOT_KEY)) {
        raw = localStorage.getItem(SNAPSHOT_KEY);
        console.warn('Loony: Memulihkan sesi otomatis dari snapshot cadangan terakhir.');
      }
      if (raw) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          const snapshot = localStorage.getItem(SNAPSHOT_KEY);
          if (snapshot) {
            try {
              parsed = JSON.parse(snapshot);
              console.warn('Loony: Berkas utama korup, berhasil dipulihkan dari snapshot.');
            } catch {}
          }
        }
        if (!parsed) return;
        let currentLoadedLang: AppLanguage = 'en';
        if (parsed.settings) {
          const loadedSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
          if (loadedSettings.hasCompletedOnboarding === undefined) {
            loadedSettings.hasCompletedOnboarding = true;
          }
          currentLoadedLang = loadedSettings.language || 'en';
          // Auto-Pairing Instan untuk pengguna awam jika membuka tautan ?pair=KODE
          if (typeof window !== 'undefined' && window.location.search) {
            const params = new URLSearchParams(window.location.search);
            const pairCode = params.get('pair');
            if (pairCode && pairCode.trim()) {
              loadedSettings.personalSyncKey = pairCode.trim().toUpperCase();
            }
          }
          // Dekripsi kunci API terlindungi (Windows DPAPI safeStorage) saat aplikasi dibuka
          if (window.electronAPI?.secureDecrypt) {
            if (loadedSettings.geminiApiKey?.startsWith('enc:')) {
              window.electronAPI.secureDecrypt(loadedSettings.geminiApiKey).then((plain) => {
                if (plain) setSettings((prev) => ({ ...prev, geminiApiKey: plain }));
              });
            }
            if (loadedSettings.aiApiKey?.startsWith('enc:')) {
              window.electronAPI.secureDecrypt(loadedSettings.aiApiKey).then((plain) => {
                if (plain) setSettings((prev) => ({ ...prev, aiApiKey: plain }));
              });
            }
          }
          setSettings(loadedSettings);
          if (loadedSettings.personalSyncKey) {
            window.electronAPI?.setBridgeSyncKey?.(loadedSettings.personalSyncKey);
          }
        }
        if (parsed.dockPosition) setDockPosition(parsed.dockPosition);
        if (parsed.islandOffset) {
          const rawX = Number(parsed.islandOffset.x) || 0;
          const rawY = Number(parsed.islandOffset.y) || 0;
          const w = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1920;
          const h = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 1080;
          setIslandOffset({
            x: rawX > 1 ? Math.min(0.92, Math.max(0.08, rawX / w)) : rawX,
            y: rawY > 1 ? Math.min(0.9, Math.max(0.05, rawY / h)) : rawY,
          });
        }
        if (parsed.clipboardHistory) setClipboardHistory(parsed.clipboardHistory);
        if (parsed.bridgeFiles) setBridgeFiles(filterActiveBridgeFiles(parsed.bridgeFiles));
        
        const isLoadedEn = currentLoadedLang === 'en';
        if (Array.isArray(parsed.ideaCategories) && parsed.ideaCategories.length > 0) {
          // Bersihkan kategori bawaan lama jika masih tersimpan
          const legacySet = new Set(['#Projek', '#KonsepGame', '#IdeCerita', '#Random']);
          let filteredCats = (parsed.ideaCategories as string[]).filter((c) => !legacySet.has(c));
          if (filteredCats.length === 0) {
            filteredCats = isLoadedEn ? DEFAULT_IDEA_CATEGORIES_EN : DEFAULT_IDEA_CATEGORIES;
          } else if (isLoadedEn) {
            const mapIdToEn: Record<string, string> = {
              '#Pekerjaan': '#Work',
              '#Pribadi': '#Personal',
              '#Belanja': '#Shopping',
              '#Catatan': '#Notes',
            };
            filteredCats = filteredCats.map((c) => mapIdToEn[c] || c);
          }
          setIdeaCategories(filteredCats);
        } else {
          setIdeaCategories(isLoadedEn ? DEFAULT_IDEA_CATEGORIES_EN : DEFAULT_IDEA_CATEGORIES);
        }
        if (Array.isArray(parsed.ideas)) {
          // Migrasikan tag lama pada item ide agar selaras dengan kategori umum baru
          const migratedIdeas = (parsed.ideas as IdeaItem[]).map((item) => {
            let tag = item.tag;
            if (tag === '#Projek') tag = '#Pekerjaan';
            if (
              tag === '#KonsepGame' ||
              tag === '#IdeCerita' ||
              tag === '#Random'
            ) {
              tag = '#Catatan';
            }
            if (isLoadedEn) {
              const mapIdToEn: Record<string, string> = {
                '#Pekerjaan': '#Work',
                '#Pribadi': '#Personal',
                '#Belanja': '#Shopping',
                '#Catatan': '#Notes',
              };
              tag = mapIdToEn[tag] || tag;
            }
            return { ...item, tag };
          });
          setIdeas(migratedIdeas);
        }
        if (parsed.schedules) setSchedules(parsed.schedules);
        if (parsed.habits) setHabits(parsed.habits);
        if (parsed.debts) setDebts(parsed.debts);
        if (parsed.budgetConfig) setBudgetConfig(parsed.budgetConfig);
        if (parsed.expenses) setExpenses(parsed.expenses);
      } else if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const pairCode = params.get('pair');
        if (pairCode && pairCode.trim()) {
          setSettings((prev) => ({ ...prev, personalSyncKey: pairCode.trim().toUpperCase() }));
        }
      }
    } catch {
      // Gunakan default jika kosong/corrupt
    }
    setIsStateHydrated(true);
  }, []);

  // Terapkan gaya font pilihan pengguna ke elemen root HTML & sinkronkan status SFX & volume
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-style', settings.fontStyle || 'normal');
    }
    soundEngine.setSfxEnabled(settings.soundEffectsEnabled !== false);
    soundEngine.setSfxVolume(settings.soundVolume ?? 70);
  }, [settings.fontStyle, settings.soundEffectsEnabled, settings.soundVolume]);

  // Deteksi tema sistem OS secara ringan (event-driven, 0% beban polling)
  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolvedWindowTheme: 'dark' | 'light' =
    settings.windowTheme === 'light'
      ? 'light'
      : settings.windowTheme === 'system'
        ? systemPrefersLight
          ? 'light'
          : 'dark'
        : 'dark';

  const resolvedCapsuleTheme: 'dark' | 'light' =
    settings.capsuleTheme === 'light'
      ? 'light'
      : settings.capsuleTheme === 'system'
        ? systemPrefersLight
          ? 'light'
          : 'dark'
        : 'dark';

  const t = useMemo(
    () => getDictionary(settings.language || 'en'),
    [settings.language]
  );

  const formatMoney = useMemo(() => {
    return (amount: number) =>
      formatCurrency(
        amount,
        settings.currencySymbol,
        settings.language || 'en'
      );
  }, [settings.currencySymbol, settings.language]);

  // 2. Simpan otomatis ke LocalStorage (Offline-First) & Enkripsi Kunci Rahasia
  useEffect(() => {
    let isCancelled = false;

    const persistState = async () => {
      try {
        const serializedSettings = { ...settings };

        // Sinkronisasi kunci pairing bridge ke proses background server Electron
        if (settings.personalSyncKey) {
          window.electronAPI?.setBridgeSyncKey?.(settings.personalSyncKey);
        }

        // Enkripsi kunci API jika berjalan di Electron agar tidak tersimpan sebagai teks biasa di disk
        if (window.electronAPI?.secureEncrypt) {
          if (settings.geminiApiKey && !settings.geminiApiKey.startsWith('enc:')) {
            const enc = await window.electronAPI.secureEncrypt(settings.geminiApiKey);
            if (enc && !isCancelled) serializedSettings.geminiApiKey = enc;
          }
          if (settings.aiApiKey && !settings.aiApiKey.startsWith('enc:')) {
            const enc = await window.electronAPI.secureEncrypt(settings.aiApiKey);
            if (enc && !isCancelled) serializedSettings.aiApiKey = enc;
          }
        }

        if (isCancelled) return;

        const serializedPayload = JSON.stringify({
          settings: serializedSettings,
          dockPosition,
          islandOffset,
          clipboardHistory,
          bridgeFiles: filterActiveBridgeFiles(bridgeFiles),
          ideas,
          ideaCategories,
          schedules,
          habits,
          debts,
          budgetConfig,
          expenses,
        });

        localStorage.setItem(STORAGE_KEY, serializedPayload);

        // Rolling Auto-Snapshot: Simpan cadangan bergulir berkala (tiap 4 jam) agar data tidak pernah hilang
        const now = Date.now();
        const lastSnapTime = Number(localStorage.getItem(LAST_SNAPSHOT_TIME_KEY)) || 0;
        if (!lastSnapTime || now - lastSnapTime > 4 * 3600 * 1000) {
          localStorage.setItem(SNAPSHOT_KEY, serializedPayload);
          localStorage.setItem(LAST_SNAPSHOT_TIME_KEY, String(now));
        }
      } catch {
        // ignore quota error
      }
    };

    persistState();

    return () => {
      isCancelled = true;
    };
  }, [
    settings,
    dockPosition,
    islandOffset,
    clipboardHistory,
    bridgeFiles,
    ideas,
    ideaCategories,
    schedules,
    habits,
    debts,
    budgetConfig,
    expenses,
  ]);

  // 3. Konfigurasi Jembatan 2 Arah (Offline Outbox + Cloud Mailbox + LAN Lokal + Supabase)
  useEffect(() => {
    syncBridgeManager.configure({
      supabaseUrl: settings.supabaseUrl,
      supabaseAnonKey: settings.supabaseAnonKey,
      syncKey: settings.personalSyncKey,
      deviceName: settings.deviceName,
      onOutboxChange: (count) => {
        setOutboxPendingCount(count);
      },
      onRemoteClipboard: (incoming) => {
        setClipboardHistory((prev) => {
          const filtered = prev.filter((item) => item.id !== incoming.id && item.content !== incoming.content);
          return [incoming, ...filtered].slice(0, 20);
        });
        // Salin otomatis ke system clipboard penerima agar tinggal Ctrl+V / Paste!
        if (window.electronAPI?.writeClipboard) {
          window.electronAPI.writeClipboard(incoming.content).catch(() => {});
        }
        triggerTimedReaction('happy', 'clipboard-copy', 1800);
      },
      onRemoteFile: async (incoming) => {
        let finalFile = { ...incoming };
        let fileDataUrl = incoming.dataUrl;

        // Jika dataUrl belum ada tapi ada url cloud (ntfy.sh / supabase), fetch dulu menjadi dataUrl!
        if (!fileDataUrl && incoming.url && incoming.url.startsWith('http')) {
          try {
            const res = await fetch(incoming.url);
            if (res.ok) {
              const blob = await res.blob();
              fileDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
              });
              finalFile.dataUrl = fileDataUrl;
            }
          } catch {
            // ignore network fetch error
          }
        }

        // Jika diterima di Laptop Windows (Electron) dan ada dataUrl, simpan otomatis ke Downloads\LoonyBridge!
        if (window.electronAPI?.saveBridgeFile && fileDataUrl) {
          try {
            const saved = await window.electronAPI.saveBridgeFile({
              name: incoming.name,
              dataUrl: fileDataUrl,
            });
            if (saved?.ok && saved.savedPath) {
              finalFile = { ...finalFile, localPath: saved.savedPath };
            }
          } catch {
            // ignore
          }
        }
        setBridgeFiles((prev) => {
          const filtered = prev.filter((f) => f.id !== finalFile.id);
          return filterActiveBridgeFiles([finalFile, ...filtered]);
        });
        soundEngine.playFileReceivedPop();
        triggerTimedReaction('happy', 'file-in', 2800);
      },
      onRemoteModuleSync: (payload) => {
        if (payload.kind === 'expense' && payload.expense) {
          const exp = payload.expense;
          setExpenses((prev) => (prev.some((e) => e.id === exp.id) ? prev : [exp, ...prev]));
        } else if (payload.kind === 'expense-delete' && payload.expenseId) {
          setExpenses((prev) => prev.filter((e) => e.id !== payload.expenseId));
        } else if (payload.kind === 'schedule' && payload.schedule) {
          const sched = payload.schedule;
          setSchedules((prev) =>
            prev.some((s) => s.id === sched.id)
              ? prev
              : [...prev, sched].sort((a, b) =>
                  `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
                )
          );
        } else if (payload.kind === 'schedule-delete' && payload.scheduleId) {
          setSchedules((prev) => prev.filter((s) => s.id !== payload.scheduleId));
        } else if (payload.kind === 'debt' && payload.debt) {
          const d = payload.debt;
          setDebts((prev) => (prev.some((item) => item.id === d.id) ? prev : [d, ...prev]));
        } else if (payload.kind === 'debt-paid' && payload.debtId) {
          setDebts((prev) =>
            prev.map((d) => (d.id === payload.debtId ? { ...d, isPaid: true } : d))
          );
        } else if (payload.kind === 'debt-delete' && payload.debtId) {
          setDebts((prev) => prev.filter((d) => d.id !== payload.debtId));
        } else if (payload.kind === 'idea' && payload.idea) {
          const idea = payload.idea;
          setIdeas((prev) => (prev.some((i) => i.id === idea.id) ? prev : [idea, ...prev]));
        } else if (payload.kind === 'idea-delete' && payload.ideaId) {
          setIdeas((prev) => prev.filter((i) => i.id !== payload.ideaId));
        } else if (payload.kind === 'idea-pin' && payload.ideaId) {
          setIdeas((prev) =>
            prev.map((i) => (i.id === payload.ideaId ? { ...i, pinned: !i.pinned } : i))
          );
        } else if (payload.kind === 'habit-add' && payload.habit) {
          const h = payload.habit;
          setHabits((prev) => (prev.some((item) => item.id === h.id) ? prev : [...prev, h]));
        } else if (payload.kind === 'habit-toggle' && payload.habitId) {
          const cycleKey = getHabitCycleDateKey();
          setHabits((prev) =>
            prev.map((h) => {
              if (h.id !== payload.habitId) return h;
              const nextCompleted = !h.completedToday;
              return {
                ...h,
                completedToday: nextCompleted,
                streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
                lastCompletedDate: nextCompleted ? cycleKey : '',
              };
            })
          );
        } else if (payload.kind === 'habit-delete' && payload.habitId) {
          setHabits((prev) => prev.filter((h) => h.id !== payload.habitId));
        }
        triggerTimedReaction('reminder-habit', 'PHONE', 6500);
      },
      onP2PProgress: (fileId, progress) => {
        setBridgeFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, transferProgress: progress } : f))
        );
      },
    });
  }, [
    settings.supabaseUrl,
    settings.supabaseAnonKey,
    settings.personalSyncKey,
    settings.deviceName,
  ]);

  // 4. Auto-Geolocation Prayer Schedule & Weather saat aplikasi dibuka
  const refreshLocationAndPrayer = async (targetLang?: AppLanguage) => {
    const lang = targetLang || settings.language || 'en';
    const sched = await fetchPrayerScheduleAuto();
    setPrayerSchedule(sched);
    const w = await fetchWeatherAuto(sched.latitude, sched.longitude, lang);
    setWeather(w);
  };

  useEffect(() => {
    const currentLang = settings.language || 'en';
    // Perbarui teks kondisi cuaca seketika sesuai preferensi bahasa aktif
    setWeather((prev) => ({
      ...prev,
      conditionText: mapWeatherCode(prev.weatherCode ?? 2, currentLang),
    }));
    refreshLocationAndPrayer(currentLang);
  }, [settings.language]);

  // Sinkronisasi data cuaca riil berkala setiap 30 menit
  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshLocationAndPrayer();
    }, 1000 * 60 * 30);
    return () => window.clearInterval(timer);
  }, []);

  // 5. Detak Jam 1 Detik + Reset Harian Jam 04:00 Pagi + Auto-Clean File 24 Jam
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = new Date();
      setNowTick(current);

      // Cek Reset Rutinitas Harian jam 04:00 Pagi
      const currentCycleKey = getHabitCycleDateKey(current);
      setHabits((prev) => {
        let changed = false;
        const next = prev.map((h) => {
          if (h.completedToday && h.lastCompletedDate && h.lastCompletedDate !== currentCycleKey) {
            changed = true;
            return { ...h, completedToday: false };
          }
          return h;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 6. Hitung Status Shalat Berikutnya & Trigger Adzan Otomatis
  const nextPrayer = useMemo(
    () => getNextPrayerStatus(prayerSchedule, nowTick, settings.language || 'en'),
    [prayerSchedule, nowTick, settings.language]
  );

  useEffect(() => {
    if (settings.prayerFeatureEnabled === false) {
      if (isPrayerAlertRinging) {
        soundEngine.stopPrayerAlert();
        setIsPrayerAlertRinging(false);
      }
      return;
    }
    if (nextPrayer.isPrayerMomentNow) {
      const key = `${prayerSchedule.fetchedDate}-${nextPrayer.name}`;
      if (lastTriggeredPrayerKey !== key) {
        setLastTriggeredPrayerKey(key);
        if (settings.adzanAlertMode !== 'silent') {
          setIsPrayerAlertRinging(true);
          soundEngine.playPrayerAlert(settings.adzanAlertMode);
        }
      }
    }
  }, [
    settings.prayerFeatureEnabled,
    isPrayerAlertRinging,
    nextPrayer.isPrayerMomentNow,
    nextPrayer.name,
    prayerSchedule.fetchedDate,
    lastTriggeredPrayerKey,
    settings.adzanAlertMode,
  ]);

  const mutePrayerAlertNow = () => {
    soundEngine.stopPrayerAlert();
    setIsPrayerAlertRinging(false);
  };

  const triggerTestAdzan = () => {
    setIsPrayerAlertRinging(true);
    soundEngine.playPrayerAlert(settings.adzanAlertMode === 'silent' ? 'soft-chime' : settings.adzanAlertMode);
  };

  // 7. Cek Rutinitas Anti-Lupa yang mendekati H-1 Jam Batas
  const urgentHabitsHMinus1 = useMemo(() => {
    const nowMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();
    return habits.filter((h) => {
      if (h.completedToday) return false;
      const [dh, dm] = h.deadlineTime.split(':').map(Number);
      const deadlineMin = dh * 60 + dm;
      const diff = deadlineMin - nowMinutes;
      // Antara 0 s/d 60 menit sebelum batas, atau baru lewat kurang dari 90 menit
      return diff <= 60 && diff >= -90;
    });
  }, [habits, nowTick]);

  // 8. Perhitungan Safe-to-Spend (Auto-Rebalance Harian + Proteksi Hutang)
  const safeToSpend = useMemo<SafeToSpendMetrics>(() => {
    const todayKey = getTodayISO(nowTick);

    // Pengeluaran hari ini
    const spentToday = expenses
      .filter((e) => e.cycleDate === todayKey)
      .reduce((acc, item) => acc + item.amount, 0);

    // Tagihan wajib yang belum dibayar bulan ini
    const unpaidMandatoryTotal = budgetConfig.mandatoryBills
      .filter((b) => !b.isPaidThisMonth)
      .reduce((acc, b) => acc + b.amount, 0);

    // Hutang kita yang belum lunas (memotong jatah aman)
    const unpaidMyDebtTotal = debts
      .filter((d) => !d.isPaid && d.type === 'hutang')
      .reduce((acc, d) => acc + d.amount, 0);

    // Piutang orang ke kita (belum dihitung masuk saldo aktif sampai ditandai Lunas)
    const pendingReceivableTotal = debts
      .filter((d) => !d.isPaid && d.type === 'piutang')
      .reduce((acc, d) => acc + d.amount, 0);

    // Hitung sisa hari sampai tanggal cycleEndDay (misal tanggal 25)
    const year = nowTick.getFullYear();
    const month = nowTick.getMonth();
    const todayDate = nowTick.getDate();
    let targetDate = new Date(year, month, budgetConfig.cycleEndDay);
    if (todayDate >= budgetConfig.cycleEndDay) {
      targetDate = new Date(year, month + 1, budgetConfig.cycleEndDay);
    }
    const diffMs = targetDate.getTime() - new Date(year, month, todayDate).getTime();
    const remainingDaysInCycle = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    // Pool dana bersih sebelum dikurangi belanja hari ini:
    // (activeBalance diasumsikan adalah saldo sebelum belanja hari ini dikurangi, atau kita hitung pool awal hari ini)
    const netPoolBeforeToday = Math.max(
      0,
      budgetConfig.activeBalance - unpaidMandatoryTotal - unpaidMyDebtTotal
    );

    const baseDailyAllowance = Math.round(netPoolBeforeToday / remainingDaysInCycle);
    const remainingSafeToday = baseDailyAllowance - spentToday;

    // Proyeksi Jatah Besok (Auto-Rebalance):
    // Jika hari ini boros, sisa pool berkurang lebih banyak -> jatah besok menyusut otomatis.
    // Jika hari ini hemat, sisa pool lebih banyak -> jatah besok bertambah longgar.
    const nextDaysCount = Math.max(1, remainingDaysInCycle - 1);
    const remainingPoolAfterToday = Math.max(0, netPoolBeforeToday - spentToday);
    const projectedTomorrowAllowance = Math.round(remainingPoolAfterToday / nextDaysCount);

    const usageRatio =
      baseDailyAllowance > 0 ? spentToday / baseDailyAllowance : spentToday > 0 ? 1 : 0;

    let statusLevel: SafeToSpendMetrics['statusLevel'] = 'safe';
    if (usageRatio >= 1 || remainingSafeToday < 0) {
      statusLevel = 'danger';
    } else if (usageRatio >= 0.8) {
      statusLevel = 'warning';
    }

    return {
      activeBalance: budgetConfig.activeBalance,
      unpaidMandatoryTotal,
      unpaidMyDebtTotal,
      pendingReceivableTotal,
      netPoolBeforeToday,
      remainingDaysInCycle,
      baseDailyAllowance,
      spentToday,
      remainingSafeToday,
      projectedTomorrowAllowance,
      usageRatio,
      statusLevel,
    };
  }, [budgetConfig, debts, expenses, nowTick]);

  // 9. Mesin Pemicu Ekspresi & Papan Kecil Otomatis "Loony"
  const [isGlobalTyping, setIsGlobalTyping] = useState(false);
  const [isSystemFullscreen, setIsSystemFullscreen] = useState(false);
  const [externalCuriousActive, setExternalCuriousActive] = useState(false);
  const [timedReaction, setTimedReaction] = useState<{
    mood: MascotMood;
    sign: LoonySignLabel;
  } | null>(null);
  const timedReactionTimerRef = React.useRef<number | null>(null);

  // Daftar ID tugas/jadwal yang sudah pernah dilihat (kapsul sudah dibuka) agar tidak nyangkut selamanya
  const [acknowledgedKeys, setAcknowledgedKeys] = useState<string[]>(() => {
    // Saat aplikasi pertama kali nyala, tandai tugas/jadwal contoh yang jamnya sudah lewat agar tidak langsung marah saat boot
    const initNow = new Date();
    const initMin = initNow.getHours() * 60 + initNow.getMinutes();
    const keys: string[] = [];
    DEFAULT_HABITS.forEach((h) => {
      const [dh, dm] = h.deadlineTime.split(':').map(Number);
      if (dh * 60 + dm - initMin <= 60) {
        keys.push(`hab-${h.id}`);
      }
    });
    DEFAULT_SCHEDULES.forEach((s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      if (sh * 60 + sm - initMin <= 30) {
        keys.push(`sched-${s.id}`);
      }
    });
    return keys;
  });

  const triggerTimedReaction = (mood: MascotMood, sign: LoonySignLabel, durationMs = 7000) => {
    if (timedReactionTimerRef.current) {
      window.clearTimeout(timedReactionTimerRef.current);
    }
    setTimedReaction({ mood, sign });
    timedReactionTimerRef.current = window.setTimeout(() => {
      setTimedReaction(null);
      timedReactionTimerRef.current = null;
    }, durationMs);
  };

  // Sensor Sistem Windows: Deteksi mengetik global, fullscreen apps/game & Notifikasi Sistem Windows
  useEffect(() => {
    if (!window.electronAPI?.onSystemSensor) return;
    const unsub = window.electronAPI.onSystemSensor((data) => {
      setIsGlobalTyping(Boolean(data.isTyping));
      if (typeof data.isFullscreen === 'boolean') {
        setIsSystemFullscreen(data.isFullscreen);
      }
      if (data.newNotification) {
        triggerTimedReaction('reminder-habit', 'NOTIF', 7000);
      }
    });
    return () => unsub();
  }, []);

  // Sensor Clipboard Sistem Windows (Ctrl+C di aplikasi mana pun -> masuk Clipboard + Loony Heran)
  useEffect(() => {
    if (!window.electronAPI?.onSystemClipboard) return;
    const unsub = window.electronAPI.onSystemClipboard((copiedText) => {
      const clean = (copiedText || '').trim();
      if (!clean) return;
      const isLink = /^https?:\/\/\S+$/i.test(clean);
      const newItem: ClipboardItem = {
        id: `clip-${Date.now()}`,
        content: clean,
        deviceSource: settings.deviceName,
        createdAt: new Date().toISOString(),
        type: isLink ? 'link' : 'text',
      };
      setClipboardHistory((prev) =>
        [newItem, ...prev.filter((i) => i.content !== clean)].slice(0, 20)
      );
      triggerTimedReaction('happy', 'clipboard-copy', 1600);
    });
    return () => unsub();
  }, [settings.deviceName]);

  // Trigger Buka Dashboard Penuh dari Windows System Tray / Icon Taskbar
  useEffect(() => {
    if (!window.electronAPI?.onTriggerFullDashboard) return;
    const unsub = window.electronAPI.onTriggerFullDashboard(() => {
      setIslandMode('full-dashboard');
      if (window.electronAPI?.setIgnoreMouseEvents) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
    });
    return () => unsub();
  }, [setIslandMode]);


  // Toggle Buka/Tutup Dashboard Penuh lewat Global Shortcut (Alt + `)
  useEffect(() => {
    if (!window.electronAPI?.onToggleFullDashboard) return;
    const unsub = window.electronAPI.onToggleFullDashboard(() => {
      setIslandMode((prev) => {
        const next = prev === 'full-dashboard' ? 'idle' : 'full-dashboard';
        if (window.electronAPI?.setIgnoreMouseEvents) {
          window.electronAPI.setIgnoreMouseEvents(next === 'idle');
        }
        return next;
      });
    });
    return () => unsub();
  }, []);

  // Sinkronisasi preferensi Global Shortcut ke proses Electron
  useEffect(() => {
    if (window.electronAPI?.setGlobalShortcut) {
      window.electronAPI.setGlobalShortcut(settings.globalShortcutEnabled !== false);
    }
  }, [settings.globalShortcutEnabled]);

  // Sinkronisasi target monitor penempatan kapsul ke proses Electron
  useEffect(() => {
    if (window.electronAPI?.setMonitorTarget) {
      window.electronAPI.setMonitorTarget(
        settings.monitorTargetMode || 'follow-cursor',
        settings.specificMonitorId
      );
    }
  }, [settings.monitorTargetMode, settings.specificMonitorId]);

  // Pantau daftar monitor aktif (Multi-Monitor Detection)
  useEffect(() => {
    if (window.electronAPI?.getDisplaysInfo) {
      window.electronAPI
        .getDisplaysInfo()
        .then((ds) => {
          if (Array.isArray(ds)) setAvailableDisplays(ds);
        })
        .catch(() => {});
    }
    if (window.electronAPI?.onDisplaysChanged) {
      const unsub = window.electronAPI.onDisplaysChanged((ds) => {
        if (Array.isArray(ds)) setAvailableDisplays(ds);
      });
      return () => unsub();
    }
  }, []);

  // Detak Focus Timer (1 detik)
  useEffect(() => {
    if (!isFocusTimerRunning) return;
    const timer = window.setInterval(() => {
      setFocusTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsFocusTimerRunning(false);
          setLastFocusTimerCompletedAt(Date.now());
          soundEngine.playFocusTimerCompleteChime();
          triggerTimedReaction('happy', null, 6500);
          return focusTimerTotalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isFocusTimerRunning, focusTimerTotalSeconds]);

  const startFocusTimer = (minutes: number) => {
    const total = Math.max(1, Math.round(minutes)) * 60;
    setFocusTimerTotalSeconds(total);
    setFocusTimerSecondsLeft(total);
    setIsFocusTimerRunning(true);
  };

  const toggleFocusTimer = () => {
    setIsFocusTimerRunning((prev) => !prev);
  };

  const resetFocusTimer = (minutes?: number) => {
    setIsFocusTimerRunning(false);
    if (minutes && minutes > 0) {
      const total = Math.round(minutes) * 60;
      setFocusTimerTotalSeconds(total);
      setFocusTimerSecondsLeft(total);
    } else {
      setFocusTimerSecondsLeft(focusTimerTotalSeconds);
    }
  };

  // Cek Tugas/Rutinitas & Jadwal yang sedang aktif memicu peringatan persistent (sampai kapsul dibuka)
  const persistentAlert = useMemo<{ mood: MascotMood; sign: LoonySignLabel; key: string } | null>(
    () => {
      const nowMin = nowTick.getHours() * 60 + nowTick.getMinutes();
      const todayStrKey = getTodayISO(nowTick);

      // 1) Cek Tugas/Rutinitas yang TELAT (lewat jam deadline hari ini & belum selesai) -> Marah + TASK
      for (const h of habits) {
        if (h.completedToday) continue;
        const key = `hab-overdue-${h.id}`;
        if (acknowledgedKeys.includes(key) || acknowledgedKeys.includes(`hab-${h.id}`)) continue;
        const [dh, dm] = h.deadlineTime.split(':').map(Number);
        const diff = nowMin - (dh * 60 + dm);
        if (diff >= 0 && diff <= 120) {
          return { mood: 'warning-budget', sign: 'TASK', key };
        }
      }

      // 2) Cek Jadwal hari ini yang TERLEWAT (lewat jam mulai 1-60 menit) -> Marah + SCHEDULE
      for (const s of schedules) {
        if (s.date !== todayStrKey) continue;
        const key = `sched-missed-${s.id}`;
        if (acknowledgedKeys.includes(key) || acknowledgedKeys.includes(`sched-${s.id}`)) continue;
        const [sh, sm] = s.startTime.split(':').map(Number);
        const diff = nowMin - (sh * 60 + sm);
        if (diff >= 1 && diff <= 60) {
          return { mood: 'warning-budget', sign: 'SCHEDULE', key };
        }
      }

      // 3) Cek Pengingat Jadwal (0-30 menit sebelum mulai) -> Tanda Seru (!) + SCHEDULE
      for (const s of schedules) {
        if (s.date !== todayStrKey) continue;
        const key = `sched-soon-${s.id}`;
        if (acknowledgedKeys.includes(key) || acknowledgedKeys.includes(`sched-${s.id}`)) continue;
        const [sh, sm] = s.startTime.split(':').map(Number);
        const untilStart = sh * 60 + sm - nowMin;
        if (untilStart >= 0 && untilStart <= 30) {
          return { mood: 'reminder-habit', sign: 'SCHEDULE', key };
        }
      }

      // 4) Cek Pengingat Rutinitas (0-30 menit sebelum deadline) -> Tanda Seru (!) + TASK
      for (const h of habits) {
        if (h.completedToday) continue;
        const key = `hab-soon-${h.id}`;
        if (acknowledgedKeys.includes(key) || acknowledgedKeys.includes(`hab-${h.id}`)) continue;
        const [dh, dm] = h.deadlineTime.split(':').map(Number);
        const untilDeadline = dh * 60 + dm - nowMin;
        if (untilDeadline >= 0 && untilDeadline <= 30) {
          return { mood: 'reminder-habit', sign: 'TASK', key };
        }
      }

      return null;
    },
    [habits, schedules, nowTick, acknowledgedKeys]
  );

  // Begitu ada tugas/jadwal mendekati waktu atau telat, picu notifikasi animasi (morphing) sesaat (3.2 detik)
  // dan tandai kunci telah diperingatkan agar tidak menyandera mata Loony sampai kursor masuk ke kapsul.
  useEffect(() => {
    if (persistentAlert) {
      const k = persistentAlert.key;
      if (!acknowledgedKeys.includes(k)) {
        soundEngine.playTaskReminderPing();
        triggerTimedReaction('warning-budget', 'alert-upcoming', 3200);
        setAcknowledgedKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
      }
    }
  }, [persistentAlert, acknowledgedKeys]);

  // Begitu pengguna membuka kapsul (hover) atau jendela penuh, pastikan peringatan yang sedang aktif langsung di-clear
  useEffect(() => {
    if (islandMode !== 'idle' && persistentAlert) {
      const k = persistentAlert.key;
      setAcknowledgedKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
    }
  }, [islandMode, persistentAlert]);

  const { mascotMood, loonySignLabel } = useMemo<{
    mascotMood: MascotMood;
    loonySignLabel: LoonySignLabel;
  }>(() => {
    if (manualMoodOverride) {
      return { mascotMood: manualMoodOverride, loonySignLabel: null };
    }
    // Prioritas 1: Saat pengguna sedang mengetik (di mana saja) atau sedang drag file -> Heran
    if (isGlobalTyping || externalCuriousActive) {
      return { mascotMood: 'curious', loonySignLabel: null };
    }
    // Prioritas 2: Reaksi sesaat notifikasi sistem (Morphing berkas, copy, centang, alert, cuan, budget)
    if (timedReaction) {
      return { mascotMood: timedReaction.mood, loonySignLabel: timedReaction.sign };
    }
    // Prioritas 3: Pengingat Jadwal / Tugas Telat (hanya mood jika ada, tanpa mengunci morphing mata)
    if (persistentAlert) {
      return { mascotMood: persistentAlert.mood, loonySignLabel: null };
    }
    // Prioritas 4: Waktu Shalat / Larut Malam -> Sayu
    if (
      settings.prayerFeatureEnabled !== false &&
      (nextPrayer.isPrayerMomentNow || isPrayerAlertRinging)
    ) {
      return { mascotMood: 'prayer-calm', loonySignLabel: null };
    }
    const hour = nowTick.getHours();
    if (hour >= 23 || hour < 4) {
      return { mascotMood: 'sleepy', loonySignLabel: null };
    }
    if (isFocusTimerRunning) {
      return { mascotMood: 'focused', loonySignLabel: null };
    }
    // Prioritas 5: Normal / Standar
    return { mascotMood: 'neutral', loonySignLabel: null };
  }, [
    manualMoodOverride,
    isGlobalTyping,
    externalCuriousActive,
    timedReaction,
    persistentAlert,
    settings.prayerFeatureEnabled,
    nextPrayer.isPrayerMomentNow,
    isPrayerAlertRinging,
    nowTick,
    isFocusTimerRunning,
  ]);

  const resetIslandOffset = () => {
    setIslandOffset({ x: 0, y: 0 });
    setDockPosition('top');
  };

  // --- Actions Modul 1: Instant Bridge ---
  const pushClipboardText = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const isLink = /^https?:\/\/\S+$/i.test(clean);
    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      content: clean,
      deviceSource: settings.deviceName,
      createdAt: new Date().toISOString(),
      type: isLink ? 'link' : 'text',
    };
    setClipboardHistory((prev) => [newItem, ...prev.filter((i) => i.content !== clean)].slice(0, 20));
    syncBridgeManager.broadcastClipboard(newItem);

    if (window.electronAPI?.writeClipboard) {
      window.electronAPI.writeClipboard(clean);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).catch(() => {});
    }
    triggerTimedReaction('happy', 'clipboard-copy', 1600);
  };

  const sendBridgeFile = async (file: File) => {
    const item = await syncBridgeManager.sendFile(file);
    setBridgeFiles((prev) => filterActiveBridgeFiles([item, ...prev]));
    triggerTimedReaction('happy', 'file-in', 2800);
  };

  const togglePinBridgeFile = (fileId: string) => {
    setBridgeFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, pinned: !f.pinned } : f))
    );
  };

  const deleteBridgeFile = (fileId: string) => {
    setBridgeFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const openBridgeFolder = (filePath?: string) => {
    if (window.electronAPI?.openBridgeFolder) {
      window.electronAPI.openBridgeFolder(filePath).catch(() => {});
    }
  };

  // --- Actions Modul 2: Idea Vault ---
  const formatCategoryTag = (raw: string): IdeaTag => {
    const cleaned = raw.trim().replace(/^#+/, '').replace(/\s+/g, '');
    if (!cleaned) return '#Catatan';
    return `#${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
  };

  const addIdeaCategory = (rawName: string): IdeaTag => {
    const formatted = formatCategoryTag(rawName);
    setIdeaCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === formatted.toLowerCase());
      return exists ? prev : [...prev, formatted];
    });
    return formatted;
  };

  const deleteIdeaCategory = (tagToDelete: IdeaTag) => {
    setIdeaCategories((prev) => prev.filter((c) => c !== tagToDelete));
  };

  const addIdea = (content: string, tag?: IdeaTag, aiSummary?: string) => {
    const parsed = parseQuickInputLocal(content);
    const rawTag = tag || parsed.ideaData?.tag || ideaCategories[0] || '#Catatan';
    const finalTag = formatCategoryTag(rawTag);
    setIdeaCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === finalTag.toLowerCase());
      return exists ? prev : [...prev, finalTag];
    });
    const newIdea: IdeaItem = {
      id: `idea-${Date.now()}`,
      content: content.trim(),
      tag: finalTag,
      aiSummary,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    setIdeas((prev) => [newIdea, ...prev]);
    syncBridgeManager.broadcastModuleSync({ kind: 'idea', idea: newIdea });
    setLastUndo({
      label: `Ide ditambahkan ke ${finalTag}`,
      undo: () => setIdeas((prev) => prev.filter((i) => i.id !== newIdea.id)),
    });
  };

  const togglePinIdea = (id: string) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)));
    syncBridgeManager.broadcastModuleSync({ kind: 'idea-pin', ideaId: id });
  };

  const deleteIdea = (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    syncBridgeManager.broadcastModuleSync({ kind: 'idea-delete', ideaId: id });
  };

  const updateIdeaTag = (id: string, tag: IdeaTag) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, tag } : i)));
  };

  const updateIdea = (id: string, partial: Partial<Omit<IdeaItem, 'id'>>) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...partial } : i))
    );
  };

  // --- Actions Modul 3: Smart Schedule & Deteksi Bentrok ---
  const addScheduleWithConflictCheck = (item: Omit<ScheduleItem, 'id'>) => {
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const newStart = toMin(item.startTime);
    const newEnd = Math.max(newStart + 30, toMin(item.endTime));

    const sameDaySchedules = schedules.filter((s) => s.date === item.date);
    const conflictWith = sameDaySchedules.find((s) => {
      const sStart = toMin(s.startTime);
      const sEnd = toMin(s.endTime);
      return newStart < sEnd && newEnd > sStart;
    });

    let suggestedSlot: string | undefined;
    if (conflictWith) {
      // Cari slot kosong 1 jam terdekat setelah jadwal yang bentrok
      let candidateStart = toMin(conflictWith.endTime);
      while (
        sameDaySchedules.some((s) => {
          const sStart = toMin(s.startTime);
          const sEnd = toMin(s.endTime);
          return candidateStart < sEnd && candidateStart + 60 > sStart;
        }) &&
        candidateStart < 22 * 60
      ) {
        candidateStart += 30;
      }
      const sh = String(Math.floor(candidateStart / 60)).padStart(2, '0');
      const sm = String(candidateStart % 60).padStart(2, '0');
      const eh = String(Math.floor((candidateStart + 60) / 60)).padStart(2, '0');
      const em = String((candidateStart + 60) % 60).padStart(2, '0');
      suggestedSlot = `${sh}:${sm} – ${eh}:${em}`;
    }

    const added: ScheduleItem = {
      ...item,
      id: `sched-${Date.now()}`,
      hasConflict: Boolean(conflictWith),
      suggestedSlot,
    };

    setSchedules((prev) =>
      [...prev, added].sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
      )
    );
    syncBridgeManager.broadcastModuleSync({ kind: 'schedule', schedule: added });

    setLastUndo({
      label: `Jadwal "${added.title}" disimpan`,
      undo: () => setSchedules((prev) => prev.filter((s) => s.id !== added.id)),
    });

    if (conflictWith) {
      triggerTimedReaction('warning-budget', 'alert-upcoming', 3000);
    }

    return { added, conflictWith };
  };

  const updateSchedule = (id: string, partial: Partial<Omit<ScheduleItem, 'id'>>) => {
    setSchedules((prev) =>
      prev
        .map((s) => (s.id === id ? { ...s, ...partial } : s))
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    );
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    syncBridgeManager.broadcastModuleSync({ kind: 'schedule-delete', scheduleId: id });
  };

  // --- Actions Modul 4: Sistem Anti-Lupa (Habits & Debt/IOU) ---
  const toggleHabitCompleted = (id: string) => {
    const cycleKey = getHabitCycleDateKey();
    let justCompleted = false;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const nextCompleted = !h.completedToday;
        if (nextCompleted) justCompleted = true;
        return {
          ...h,
          completedToday: nextCompleted,
          streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1),
          lastCompletedDate: nextCompleted ? cycleKey : '',
        };
      })
    );
    if (justCompleted) {
      triggerTimedReaction('happy', 'task-done', 2200);
    }
    syncBridgeManager.broadcastModuleSync({ kind: 'habit-toggle', habitId: id });
  };

  const addHabit = (title: string, icon: string, deadlineTime: string) => {
    const newHabit: HabitItem = {
      id: `hab-${Date.now()}`,
      title: title.trim(),
      icon: icon || '✨',
      deadlineTime: deadlineTime || '21:00',
      completedToday: false,
      streak: 0,
    };
    setHabits((prev) => [...prev, newHabit]);
    syncBridgeManager.broadcastModuleSync({ kind: 'habit-add', habit: newHabit });
  };

  const updateHabit = (id: string, partial: Partial<Omit<HabitItem, 'id'>>) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...partial } : h))
    );
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    syncBridgeManager.broadcastModuleSync({ kind: 'habit-delete', habitId: id });
  };

  const addDebt = (
    person: string,
    amount: number,
    type: 'hutang' | 'piutang',
    note: string,
    dueDate?: string
  ) => {
    const newDebt: DebtItem = {
      id: `debt-${Date.now()}`,
      person: person.trim(),
      amount,
      type,
      note: note.trim(),
      dueDate,
      isPaid: false,
      createdAt: new Date().toISOString(),
    };
    setDebts((prev) => [newDebt, ...prev]);
    syncBridgeManager.broadcastModuleSync({ kind: 'debt', debt: newDebt });
    setLastUndo({
      label:
        settings.language === 'en'
          ? `${type === 'hutang' ? 'Debt' : 'Loan'} ${person} ${formatMoney(amount)} recorded`
          : `${type === 'hutang' ? 'Hutang' : 'Piutang'} ${person} ${formatMoney(amount)} dicatat`,
      undo: () => setDebts((prev) => prev.filter((d) => d.id !== newDebt.id)),
    });
  };

  const markDebtPaid = (id: string) => {
    let receivedPiutang = false;
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== id || d.isPaid) return d;
        if (d.type === 'piutang') receivedPiutang = true;
        // Jika Piutang orang ke kita lunas, otomatis menambah Saldo Aktif!
        // Jika Hutang kita lunas, dipotong dari Saldo Aktif (dan otomatis lepas dari daftar potongan hutang).
        setBudgetConfig((bc) => ({
          ...bc,
          activeBalance:
            d.type === 'piutang' ? bc.activeBalance + d.amount : Math.max(0, bc.activeBalance - d.amount),
        }));
        return { ...d, isPaid: true };
      })
    );
    if (receivedPiutang) {
      triggerTimedReaction('happy', 'income-added', 2400);
    }
    syncBridgeManager.broadcastModuleSync({ kind: 'debt-paid', debtId: id });
  };

  const deleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    syncBridgeManager.broadcastModuleSync({ kind: 'debt-delete', debtId: id });
  };

  // --- Actions Modul 5: Asisten Rem Boros (Safe-to-Spend) ---
  const addExpense = (amount: number, title: string, category = 'Makan & Jajan') => {
    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      amount,
      category,
      createdAt: new Date().toISOString(),
      cycleDate: getTodayISO(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    syncBridgeManager.broadcastModuleSync({ kind: 'expense', expense: newExp });
    if (safeToSpend.remainingSafeToday - amount < 0) {
      triggerTimedReaction('warning-budget', 'budget-warning', 3000);
    }
    setLastUndo({
      label:
        settings.language === 'en'
          ? `Expense ${formatMoney(amount)} (${title}) recorded`
          : `Pengeluaran ${formatMoney(amount)} (${title}) tercatat`,
      undo: () => setExpenses((prev) => prev.filter((e) => e.id !== newExp.id)),
    });
  };

  const addIncome = (amount: number, title = 'Pemasukan') => {
    if (!amount || amount <= 0) return;
    setBudgetConfig((prev) => ({
      ...prev,
      activeBalance: prev.activeBalance + amount,
    }));
    triggerTimedReaction('happy', 'income-added', 2400);
    setLastUndo({
      label:
        settings.language === 'en'
          ? `Income +${formatMoney(amount)} (${title}) added`
          : `Pemasukan +${formatMoney(amount)} (${title}) ditambahkan`,
      undo: () =>
        setBudgetConfig((prev) => ({
          ...prev,
          activeBalance: Math.max(0, prev.activeBalance - amount),
        })),
    });
  };

  const updateExpense = (id: string, partial: Partial<Omit<ExpenseItem, 'id'>>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...partial } : e))
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    syncBridgeManager.broadcastModuleSync({ kind: 'expense-delete', expenseId: id });
  };

  const updateBudgetBalance = (newBalance: number, cycleEndDay?: number) => {
    setBudgetConfig((prev) => ({
      ...prev,
      activeBalance: Math.max(0, newBalance),
      cycleEndDay: cycleEndDay ?? prev.cycleEndDay,
    }));
  };

  const toggleMandatoryBillPaid = (id: string) => {
    setBudgetConfig((prev) => ({
      ...prev,
      mandatoryBills: prev.mandatoryBills.map((b) =>
        b.id === id ? { ...b, isPaidThisMonth: !b.isPaidThisMonth } : b
      ),
    }));
  };

  const addMandatoryBill = (title: string, amount: number) => {
    const bill: MandatoryBill = {
      id: `bill-${Date.now()}`,
      title: title.trim(),
      amount,
      isPaidThisMonth: false,
    };
    setBudgetConfig((prev) => ({
      ...prev,
      mandatoryBills: [...prev.mandatoryBills, bill],
    }));
  };

  const updateMandatoryBill = (id: string, partial: Partial<Omit<MandatoryBill, 'id'>>) => {
    setBudgetConfig((prev) => ({
      ...prev,
      mandatoryBills: prev.mandatoryBills.map((b) =>
        b.id === id ? { ...b, ...partial } : b
      ),
    }));
  };

  const deleteMandatoryBill = (id: string) => {
    setBudgetConfig((prev) => ({
      ...prev,
      mandatoryBills: prev.mandatoryBills.filter((b) => b.id !== id),
    }));
  };

  // --- Smart Quick Capture Omnibox Execution ---
  const executeQuickCapture = async (rawText: string): Promise<ParsedQuickInput> => {
    const localResult = parseQuickInputLocal(rawText);

    // Jika Gemini API Key tersedia, gunakan AI sebagai Otak Utama Loony untuk kalimat yang agak kompleks/natural,
    // atau langsung eksekusi instan (<50ms) jika pola lokal sudah sangat eksplisit.
    let finalResult = localResult;
    const effectiveAiKey = (settings.aiApiKey || settings.geminiApiKey || '').trim();
    if (effectiveAiKey) {
      const aiResult = await analyzeWithGeminiAI(rawText, effectiveAiKey);
      if (aiResult) {
        finalResult = aiResult;
      }
    }

    if (finalResult.targetModule === 'expense' && finalResult.expenseData) {
      addExpense(
        finalResult.expenseData.amount,
        finalResult.expenseData.title,
        finalResult.expenseData.category
      );
    } else if (finalResult.targetModule === 'schedule' && finalResult.scheduleData) {
      addScheduleWithConflictCheck(finalResult.scheduleData);
    } else if (finalResult.targetModule === 'debt' && finalResult.debtData) {
      addDebt(
        finalResult.debtData.person,
        finalResult.debtData.amount,
        finalResult.debtData.type,
        finalResult.debtData.note
      );
    } else if (finalResult.ideaData) {
      addIdea(
        finalResult.ideaData.content,
        finalResult.ideaData.tag,
        finalResult.ideaData.aiSummary
      );
    }

    return finalResult;
  };

  const triggerUndo = () => {
    if (!lastUndo) return;
    lastUndo.undo();
    setLastUndo(null);
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    if (partial.language && partial.language !== settings.language) {
      const toEn = partial.language === 'en';
      const tagMap: Record<string, string> = toEn
        ? {
            '#Pekerjaan': '#Work',
            '#Pribadi': '#Personal',
            '#Belanja': '#Shopping',
            '#Catatan': '#Notes',
          }
        : {
            '#Work': '#Pekerjaan',
            '#Personal': '#Pribadi',
            '#Shopping': '#Belanja',
            '#Notes': '#Catatan',
            '#Note': '#Catatan',
          };

      setIdeaCategories((prev) => prev.map((c) => tagMap[c] || c));
      setIdeas((prev) =>
        prev.map((item) => ({
          ...item,
          tag: tagMap[item.tag] || item.tag,
        }))
      );
      if (!isPlayingMusic) {
        setMusicTrackName(toEn ? 'No media playing' : 'Belum ada media diputar');
      }
    }
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const toggleMusicPlayer = async () => {
    if (window.electronAPI?.controlMedia) {
      setIsPlayingMusic((prev) => !prev);
      const info = await window.electronAPI.controlMedia('play-pause');
      if (info && info.title && info.title.trim() !== '') {
        setMusicTrackName(info.title.trim());
        setMusicArtistName(info.artist?.trim() || (isEn ? 'Playing' : 'Sedang Diputar'));
        setIsPlayingMusic(Boolean(info.isPlaying));
      }
      return;
    }
    const playing = soundEngine.toggleLofiFocusPlayer();
    setIsPlayingMusic(playing);
  };

  const nextMusicTrack = async () => {
    if (window.electronAPI?.controlMedia) {
      const info = await window.electronAPI.controlMedia('next');
      if (info && info.title && info.title.trim() !== '') {
        setMusicTrackName(info.title.trim());
        setMusicArtistName(info.artist?.trim() || (isEn ? 'Playing' : 'Sedang Diputar'));
        setIsPlayingMusic(Boolean(info.isPlaying));
      }
    }
  };

  const prevMusicTrack = async () => {
    if (window.electronAPI?.controlMedia) {
      const info = await window.electronAPI.controlMedia('prev');
      if (info && info.title && info.title.trim() !== '') {
        setMusicTrackName(info.title.trim());
        setMusicArtistName(info.artist?.trim() || (isEn ? 'Playing' : 'Sedang Diputar'));
        setIsPlayingMusic(Boolean(info.isPlaying));
      }
    }
  };

  const openMusicSourceApp = async () => {
    if (window.electronAPI?.controlMedia) {
      await window.electronAPI.controlMedia('focus-app');
    }
  };

  const exportBackupData = (): string => {
    const payload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      settings,
      dockPosition,
      islandOffset,
      ideas,
      ideaCategories,
      schedules,
      habits,
      debts,
      budgetConfig,
      expenses,
      clipboardHistory,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importBackupData = (rawJson: string): boolean => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object') return false;
      if (parsed.settings) {
        setSettings((prev) => ({ ...prev, ...parsed.settings }));
      }
      if (Array.isArray(parsed.ideas)) setIdeas(parsed.ideas);
      if (Array.isArray(parsed.ideaCategories) && parsed.ideaCategories.length > 0) {
        setIdeaCategories(parsed.ideaCategories);
      }
      if (Array.isArray(parsed.schedules)) setSchedules(parsed.schedules);
      if (Array.isArray(parsed.habits)) setHabits(parsed.habits);
      if (Array.isArray(parsed.debts)) setDebts(parsed.debts);
      if (parsed.budgetConfig && typeof parsed.budgetConfig === 'object') {
        setBudgetConfig((prev) => ({ ...prev, ...parsed.budgetConfig }));
      }
      if (Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
      if (Array.isArray(parsed.clipboardHistory)) setClipboardHistory(parsed.clipboardHistory);
      return true;
    } catch {
      return false;
    }
  };

  const resetFactoryData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSettings({
      ...DEFAULT_SETTINGS,
      hasCompletedOnboarding: false,
    });
    setIdeas([]);
    setIdeaCategories(DEFAULT_IDEA_CATEGORIES);
    setSchedules([]);
    setHabits([]);
    setDebts([]);
    setBudgetConfig(DEFAULT_BUDGET);
    setExpenses([]);
    setClipboardHistory([]);
    setBridgeFiles([]);
    setFocusTimerSecondsLeft(25 * 60);
    setFocusTimerTotalSeconds(25 * 60);
    setIsFocusTimerRunning(false);
    setIslandMode('idle');
  };

  return (
    <AppContext.Provider
      value={{
        islandMode,
        setIslandMode,
        dockPosition,
        setDockPosition,
        islandOffset,
        setIslandOffset,
        resetIslandOffset,
        mascotMood,
        loonySignLabel,
        triggerTimedReaction,
        setExternalCuriousActive,
        setManualMoodOverride,
        settings,
        updateSettings,
        isSystemFullscreen,
        resolvedWindowTheme,
        resolvedCapsuleTheme,
        clipboardHistory,
        bridgeFiles,
        outboxPendingCount,
        pushClipboardText,
        sendBridgeFile,
        togglePinBridgeFile,
        deleteBridgeFile,
        openBridgeFolder,
        ideas,
        ideaCategories,
        addIdea,
        togglePinIdea,
        deleteIdea,
        updateIdeaTag,
        updateIdea,
        addIdeaCategory,
        deleteIdeaCategory,
        schedules,
        addScheduleWithConflictCheck,
        updateSchedule,
        deleteSchedule,
        habits,
        urgentHabitsHMinus1,
        toggleHabitCompleted,
        addHabit,
        updateHabit,
        deleteHabit,
        debts,
        addDebt,
        markDebtPaid,
        deleteDebt,
        budgetConfig,
        expenses,
        safeToSpend,
        addExpense,
        addIncome,
        updateExpense,
        deleteExpense,
        updateBudgetBalance,
        toggleMandatoryBillPaid,
        addMandatoryBill,
        updateMandatoryBill,
        deleteMandatoryBill,
        executeQuickCapture,
        lastUndo,
        triggerUndo,
        prayerSchedule,
        nextPrayer,
        weather,
        isPrayerAlertRinging,
        mutePrayerAlertNow,
        triggerTestAdzan,
        refreshLocationAndPrayer,
        isPlayingMusic,
        musicTrackName,
        musicArtistName,
        toggleMusicPlayer,
        nextMusicTrack,
        prevMusicTrack,
        openMusicSourceApp,
        exportBackupData,
        importBackupData,
        resetFactoryData,
        isStateHydrated,
        focusTimerSecondsLeft,
        focusTimerTotalSeconds,
        isFocusTimerRunning,
        lastFocusTimerCompletedAt,
        startFocusTimer,
        toggleFocusTimer,
        resetFocusTimer,
        availableDisplays,
        t,
        formatMoney,
        interpolate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
