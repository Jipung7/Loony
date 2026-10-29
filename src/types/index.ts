export type IslandMode =
  | 'idle'
  | 'hover'
  | 'mini-bridge'
  | 'mini-capture'
  | 'mini-calendar'
  | 'mini-budget'
  | 'mini-habits'
  | 'full-dashboard';

export type DockPosition = 'top' | 'left' | 'right' | 'float';

export type MascotMood =
  | 'neutral'
  | 'happy'
  | 'focused'
  | 'sleepy'
  | 'drowsy'
  | 'sleeping'
  | 'warning-budget'
  | 'reminder-habit'
  | 'prayer-calm'
  | 'curious';

export type LoonyMorphFace =
  | 'file-in'
  | 'clipboard-copy'
  | 'task-done'
  | 'alert-upcoming'
  | 'income-added'
  | 'budget-warning';

export type LoonySignLabel =
  | 'TASK'
  | 'SCHEDULE'
  | 'BUDGET'
  | 'NOTIF'
  | 'PHONE'
  | LoonyMorphFace
  | null;

export type IdeaTag = string;

export const DEFAULT_IDEA_CATEGORIES_ID: string[] = [
  '#Pekerjaan',
  '#Pribadi',
  '#Belanja',
  '#Catatan',
];

export const DEFAULT_IDEA_CATEGORIES_EN: string[] = [
  '#Work',
  '#Personal',
  '#Shopping',
  '#Notes',
];

export const DEFAULT_IDEA_CATEGORIES: string[] = DEFAULT_IDEA_CATEGORIES_ID;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'loony';
  text: string;
  timestamp: string;
  actionSummary?: string;
  moodReaction?: MascotMood;
}

export type DeviceSourceType = 'Desktop PC' | 'Mobile Companion' | string;

export interface ClipboardItem {
  id: string;
  content: string;
  deviceSource: DeviceSourceType;
  createdAt: string;
  type: 'text' | 'link';
}

export interface BridgeFileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  mode: 'cloud-small' | 'webrtc-p2p';
  url?: string;
  dataUrl?: string; // Base64 DataURL for instant 2-way transit & auto-save
  localPath?: string; // Saved path on Windows (Downloads\LoonyBridge\...)
  pinned: boolean;
  deviceSource: DeviceSourceType;
  createdAt: string;
  expiresAt: string; // 24 hours from creation unless pinned
  transferProgress?: number; // 0-100 for P2P or upload
}

export interface IdeaItem {
  id: string;
  content: string;
  tag: IdeaTag;
  aiSummary?: string;
  pinned: boolean;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  notes?: string;
  hasConflict?: boolean;
  suggestedSlot?: string;
}

export interface HabitItem {
  id: string;
  title: string;
  icon: string;
  deadlineTime: string; // HH:mm e.g., "21:00"
  completedToday: boolean;
  streak: number;
  lastCompletedDate?: string; // Cycle key based on 04:00 AM reset
}

export interface DebtItem {
  id: string;
  person: string;
  amount: number;
  type: 'hutang' | 'piutang'; // hutang = kita berhutang (potong safe-to-spend), piutang = orang berhutang ke kita
  note: string;
  dueDate?: string;
  isPaid: boolean;
  createdAt: string;
}

export interface MandatoryBill {
  id: string;
  title: string;
  amount: number;
  isPaidThisMonth: boolean;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
  cycleDate: string; // YYYY-MM-DD
}

export interface BudgetConfig {
  activeBalance: number; // Saldo aktif saat ini
  cycleEndDay: number; // Tanggal gajian / reset bulanan (1-31, misal 25 atau 1)
  mandatoryBills: MandatoryBill[];
}

export interface PrayerSchedule {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  fetchedDate: string;
}

export interface WeatherInfo {
  tempC: number;
  conditionText: string;
  icon: string;
  weatherCode?: number;
}

export type AdzanAlertMode = 'full-adzan' | 'soft-chime' | 'silent';
export type WindowDisplayMode = 'floating' | 'fullscreen';
export type AppFontStyle = 'rounded' | 'normal' | 'system';
export type ThemeMode = 'dark' | 'light' | 'system';
export type MonitorTargetMode = 'follow-cursor' | 'primary' | 'specific';
export type FullscreenBehavior = 'hide' | 'always-on-top';

export interface DisplayInfo {
  id: number;
  label: string;
  isPrimary: boolean;
  width: number;
  height: number;
  scaleFactor: number;
}

export type AiProviderType =
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'deepseek'
  | 'openai'
  | 'ollama'
  | 'custom';

export interface AppSettings {
  deviceName: DeviceSourceType;
  personalSyncKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
  aiProvider?: AiProviderType;
  aiApiKey?: string;
  aiModel?: string;
  aiCustomBaseUrl?: string;
  adzanAlertMode: AdzanAlertMode;
  prayerFeatureEnabled: boolean; // Opsi mengaktifkan/mematikan fitur waktu shalat sepenuhnya
  desktopOverlayPreview: boolean;
  capsuleScale: number; // Ukuran kapsul kecil (0.75 - 1.4, default 1.0)
  capsuleAutoCloseSec: number; // Waktu tunggu kapsul terbuka sebelum menutup (detik, default 3.5)
  windowDisplayMode: WindowDisplayMode; // 'floating' (mengambang) | 'fullscreen' (layar penuh)
  fontStyle: AppFontStyle; // 'rounded' (Bawaan Loony) | 'normal' (Sans-Serif Bersih) | 'system' (Bawaan OS)
  windowTheme: ThemeMode; // Tema Jendela Ruang Kerja ('dark' | 'light' | 'system')
  capsuleTheme: ThemeMode; // Tema Kapsul Kecil ('dark' | 'light' | 'system')
  soundEffectsEnabled: boolean; // Efek suara interaksi magnet & elus kepala
  soundVolume?: number; // Volume efek suara interaksi (0 - 100, default 70)
  auraEffectEnabled: boolean; // Efek cahaya breathing aura belakang kapsul
  indicatorStyle?: 'subtle-glow' | 'led-dot' | 'none'; // Opsi 1: Ambient Redup | Opsi 3: Titik LED Taktil | Nonaktif
  peekWhisperEnabled: boolean; // Bisikan kapsul saat lagu/clipboard berubah
  idleSleepSec: number; // Detik diam sebelum Loony mengantuk (30, 45, 90, atau 0 = tidak tidur)
  userNickname: string; // Panggilan pengguna saat ngobrol dengan Loony
  globalShortcutEnabled: boolean; // Pintasan global Alt + ~ untuk membuka/menutup Jendela Besar
  hasCompletedOnboarding?: boolean; // Status penyelesaian onboarding awal
  monitorTargetMode?: MonitorTargetMode; // 'follow-cursor' (default) | 'primary' | 'specific'
  specificMonitorId?: number; // ID monitor yang dipilih jika mode === 'specific'
  fullscreenBehavior?: FullscreenBehavior; // 'hide' (default: sembunyikan saat layar penuh/game) | 'always-on-top'
  language?: AppLanguage; // 'en' (default global) | 'id' (Bahasa Indonesia)
  currencySymbol?: string; // '$', 'Rp', '€', '£', '¥', dsb.
}

export type AppLanguage = 'en' | 'id';

export interface ParsedQuickInput {
  targetModule: 'expense' | 'schedule' | 'debt' | 'idea';
  confidence: 'local-regex' | 'gemini-ai';
  previewLabel: string;
  expenseData?: { amount: number; title: string; category: string };
  scheduleData?: { title: string; date: string; startTime: string; endTime: string };
  debtData?: { person: string; amount: number; type: 'hutang' | 'piutang'; note: string };
  ideaData?: { content: string; tag: IdeaTag; aiSummary?: string };
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      setIgnoreMouseEvents: (ignore: boolean) => void;
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<boolean>;
      captureBackdrop?: () => Promise<string | null>;
      controlMedia?: (
        action: 'status' | 'play-pause' | 'next' | 'prev' | 'focus-app'
      ) => Promise<{ title: string; artist: string; isPlaying: boolean; source: string } | null>;
      onGlobalCursor?: (
        callback: (data: { x: number; y: number; screenW: number; screenH: number }) => void
      ) => () => void;
      onMediaStatus?: (
        callback: (data: { title: string; artist: string; isPlaying: boolean; source: string }) => void
      ) => () => void;
      onSystemSensor?: (
        callback: (data: { isTyping: boolean; newNotification: boolean; isFullscreen?: boolean; isAfk?: boolean }) => void
      ) => () => void;
      onSystemClipboard?: (callback: (text: string) => void) => () => void;
      saveBridgeFile?: (payload: {
        name: string;
        dataUrl?: string;
        textContent?: string;
      }) => Promise<{ ok: boolean; savedPath?: string; folder?: string; error?: string }>;
      openBridgeFolder?: (filePath?: string) => Promise<boolean>;
      getBridgeInfo?: () => Promise<{
        localIps: string[];
        port: number;
        lanUrl: string;
        bridgeFolder: string;
      }>;
      pushLocalMailbox?: (envelope: Record<string, unknown>) => Promise<boolean>;
      onBridgeEnvelope?: (callback: (envelope: Record<string, unknown>) => void) => () => void;
      getAutoStart?: () => Promise<boolean>;
      setAutoStart?: (enable: boolean) => Promise<boolean>;
      onTriggerFullDashboard?: (callback: () => void) => () => void;
      onToggleFullDashboard?: (callback: () => void) => () => void;
      setGlobalShortcut?: (enable: boolean) => Promise<boolean>;
      openExternal?: (url: string) => Promise<boolean>;
      getDisplaysInfo?: () => Promise<DisplayInfo[]>;
      setMonitorTarget?: (mode: MonitorTargetMode, specificId?: number) => void;
      onDisplaysChanged?: (callback: (displays: DisplayInfo[]) => void) => () => void;
      setBridgeSyncKey?: (key: string) => void;
      secureEncrypt?: (text: string) => Promise<string>;
      secureDecrypt?: (cipher: string) => Promise<string>;
    };
    AndroidBridge?: {
      expandOverlay?: () => void;
      collapseOverlay?: () => void;
      closeApp?: () => void;
      isNotificationSensorEnabled?: () => boolean;
      openNotificationSettings?: () => void;
      requestLocationPermission?: () => void;
    };
    onDynamicPortTrigger?: () => void;
  }
}
