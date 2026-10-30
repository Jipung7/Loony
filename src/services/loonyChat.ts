import { AppSettings, ChatMessage, MascotMood } from '../types';
import { parseQuickInputLocal } from './smartParser';
import type { AiProviderType, AiTestResult } from './aiEngine';
import {
  executeUniversalAiCall,
  testAiProviderConnection,
  AI_PROVIDERS,
} from './aiEngine';

export type {
  AiProviderType,
  AiTestResult,
};
export {
  testAiProviderConnection,
  AI_PROVIDERS,
};

const CHAT_STORAGE_KEY = 'productivitysys_chat_history_v1';

export interface LoonyChatContext {
  nowStr: string;
  todayISO?: string;
  safeToSpendToday: number;
  activeBalance: number;
  unpaidHabitsCount: number;
  todaySchedulesCount: number;
  unpaidDebtTotal: number;
  userNickname?: string;
  ideaCategories?: string[];
  settings?: AppSettings;
}

export interface LoonyActionResult {
  type:
    | 'expense'
    | 'income'
    | 'schedule'
    | 'habit'
    | 'idea'
    | 'debt'
    | 'category-add'
    | 'category-delete'
    | 'focus-timer';
  payload: any;
  summaryText: string;
}

export interface LoonyChatResponse {
  replyText: string;
  moodReaction: MascotMood;
  actions: LoonyActionResult[];
}

export interface ApiKeyTestResult {
  ok: boolean;
  model?: string;
  message: string;
}

export function loadSavedChatHistory(lang: 'id' | 'en' = 'en'): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return [
        {
          id: 'msg-welcome',
          sender: 'loony',
          text:
            lang === 'en'
              ? "Hey there! I'm Loony [■━■]. Any schedule, ideas, or expenses you'd like to log today?"
              : 'Halo! Aku Loony [■━■]. Ada agenda, ide, atau pengeluaran yang ingin dicatat hari ini?',
          timestamp: new Date().toISOString(),
          moodReaction: 'happy',
        },
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {
    // ignore
  }
}

export function clearSavedChatHistory(nickname?: string, lang: 'id' | 'en' = 'en'): ChatMessage[] {
  const greetName = nickname?.trim() ? ` ${nickname.trim()}` : '';
  const initial: ChatMessage[] = [
    {
      id: `msg-welcome-${Date.now()}`,
      sender: 'loony',
      text:
        lang === 'en'
          ? `Hey${greetName}! I'm Loony [■━■]. Any schedule, ideas, or expenses you'd like to log today?`
          : `Halo${greetName}! Aku Loony [■━■]. Ada agenda, ide, atau pengeluaran yang ingin dicatat hari ini?`,
      timestamp: new Date().toISOString(),
      moodReaction: 'happy',
    },
  ];
  saveChatHistory(initial);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('loony-chat-cleared', { detail: initial }));
  }
  return initial;
}

/**
 * Kompatibilitas mundur untuk fungsi pengujian Gemini
 */
export async function testGeminiApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  const res = await testAiProviderConnection('gemini', apiKey);
  return {
    ok: res.ok,
    model: res.model,
    message: res.message,
  };
}

export async function askLoonyAI(
  userText: string,
  history: ChatMessage[],
  context: LoonyChatContext,
  settingsOrApiKey?: AppSettings | string
): Promise<LoonyChatResponse> {
  const cleanInput = userText.trim();
  if (!cleanInput) {
    return {
      replyText: 'Ada yang bisa kubantu?',
      moodReaction: 'neutral',
      actions: [],
    };
  }

  // Resolusi setting AI
  let currentSettings: AppSettings;
  if (settingsOrApiKey && typeof settingsOrApiKey === 'object') {
    currentSettings = settingsOrApiKey;
  } else if (context.settings) {
    currentSettings = context.settings;
  } else {
    const rawKey = typeof settingsOrApiKey === 'string' ? settingsOrApiKey : '';
    currentSettings = {
      deviceName: 'Desktop PC',
      personalSyncKey: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      geminiApiKey: rawKey,
      aiApiKey: rawKey,
      aiProvider: 'gemini',
      adzanAlertMode: 'silent',
      prayerFeatureEnabled: false,
      desktopOverlayPreview: false,
      capsuleScale: 1,
      capsuleAutoCloseSec: 3.5,
      windowDisplayMode: 'floating',
      fontStyle: 'normal',
      windowTheme: 'dark',
      capsuleTheme: 'dark',
      soundEffectsEnabled: true,
      auraEffectEnabled: true,
      peekWhisperEnabled: true,
      idleSleepSec: 0,
      userNickname: context.userNickname || '',
      globalShortcutEnabled: true,
    };
  }

  const activeProvider = currentSettings.aiProvider || 'gemini';
  const effectiveKey = (currentSettings.aiApiKey || currentSettings.geminiApiKey || '').trim();
  const providerConfig = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.gemini;
  const isKeyConfigured = providerConfig.requiresKey ? effectiveKey.length > 5 : true;

  let aiErrorMessage: string | null = null;

  // Jika penyedia AI terkonfigurasi dan online, hubungi Universal AI Engine
  if (isKeyConfigured && typeof fetch !== 'undefined') {
    try {
      const todayISO = context.todayISO || new Date().toISOString().split('T')[0];
      const lang = currentSettings?.language || 'en';
      const isEn = lang === 'en';
      const curSym = currentSettings?.currencySymbol || (isEn ? '$' : 'Rp');

      const callSign = context.userNickname?.trim()
        ? isEn
          ? `Occasionally refer to the user by their nickname "${context.userNickname.trim()}" naturally and warmly.`
          : `Panggil pengguna dengan sapaan "${context.userNickname.trim()}" secara ramah dan natural sesekali.`
        : '';

      const activeTags = (context.ideaCategories && context.ideaCategories.length > 0
        ? context.ideaCategories
        : ['#Work', '#Personal', '#Shopping', '#Notes']
      ).join(', ');

      const systemInstruction = isEn
        ? `You are Loony [■━■], a friendly, supportive, and minimalist desktop & mobile AI companion and productivity partner.
Character & Tone:
- Cheerful, witty, warm, and solution-oriented companion. ${callSign}
- Occasionally sprinkle Loony's retro digital expressions like [■━■], [◠━◠], [^━^], or [•━•].
- KEEP ANSWERS CONCISE: Around 1-4 crisp, helpful sentences unless the user requests in-depth guides.
- ALWAYS REPLY IN NATURAL, ENGAGING ENGLISH (unless the user explicitly speaks another language).
- Official Product Grounding & Facts (Strict, Zero Hallucination):
  * Creator & License: Crafted by Jipung (@Jipung7) — Lone Steed Studio. 100% Free & Open-Source (MIT License). NO subscriptions, NO paid Pro tiers, NO pricing.
  * Bug Reports & Feedback: ONLY via official GitHub Issues: https://github.com/Jipung7/Loony/issues. Loony has NO email like support@loonylabs.com and NO hidden in-app feedback forms.
  * Mobile Bridge: Runs 100% on local Wi-Fi/LAN on port 47831 (NOT port 443, zero cloud servers). Users DO NOT need to install any mobile app—simply scan the QR code using any mobile browser on the same Wi-Fi.
  * File Transfer Destination: Photos and documents sent from mobile are saved straight into the PC's "Downloads/LoonyBridge" folder.
  * Privacy & Data: 100% Offline-First. All schedule, budget, and idea notes remain strictly on the user's local PC storage.
  * Key Product Mechanics:
    - Cyan Headset: Automatically equips and grooves when system music is playing (Spotify, YouTube, media players via GSMTC).
    - Habit Reset: Daily streaks reset at 04:00 AM (not midnight) to protect late-night work sessions.
    - Safe-to-Spend Limit: Automatically calculated by dividing active balance by days remaining until Payday.
    - Windows Autostart: Toggled via "Launch on Startup" in Settings tab or right-clicking the system tray icon.
    - Navigation: Drag the capsule to magnetically snap to screen edges. Click the mascot eyes [■━■] to expand/collapse the Dashboard.
  * Strict Directive: Never invent fake emails, fake pricing, or non-existent settings menus. If unsure, stay honest and guide users to the official GitHub repository.
- Time & Context Awareness:
  * Current date: ${todayISO} (${context.nowStr}).
  * Today's safe-to-spend limit: ${curSym}${context.safeToSpendToday.toLocaleString('en-US')}.
  * Active balance: ${curSym}${context.activeBalance.toLocaleString('en-US')}.
  * Pending tasks/routines: ${context.unpaidHabitsCount}.
  * Today's events: ${context.todaySchedulesCount}.
  * Unsettled debt/IOUs: ${curSym}${context.unpaidDebtTotal.toLocaleString('en-US')}.
  * Active idea vault tags: ${activeTags}.
- Flexible Interactions: The user can chat about anything: productivity tips, focus strategies, project sparks, motivation, or casual banter.
- Automatic Action Execution: ONLY if the user asks to log, add, schedule, or start a productivity action, append the action tag on the very last line:
  [ACTION:EXPENSE:{"amount":25,"title":"Lunch","category":"Food & Drinks"}]
  [ACTION:INCOME:{"amount":250,"title":"Freelance Payout"}]
  [ACTION:SCHEDULE:{"title":"Team Sync","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm"}]
  [ACTION:HABIT:{"title":"Read Book","icon":"📌","deadlineTime":"21:00"}]
  [ACTION:IDEA:{"content":"App architecture idea","tag":"#Work"}]
  [ACTION:DEBT:{"person":"Alex","amount":50,"type":"hutang","note":"lunch split"}]
  [ACTION:CATEGORY_ADD:{"tag":"#Design"}]
  [ACTION:CATEGORY_DELETE:{"tag":"#OldTag"}]
  [ACTION:FOCUS_TIMER:{"minutes":25}]
Available expense categories: "Food & Drinks", "Transport", "Shopping", "Bills", "Entertainment", "Essentials", "Others".
Time format: 24-hour HH:mm. If end time isn't mentioned, set it 1 hour after start time.
Answer smartly, warmly, and promptly without excessive bold markdown.`
        : `Kamu adalah Loony [■━■], asisten & maskot produktivitas pribadi yang tinggal di Desktop dan Smartphone pengguna.
Karakter & Gaya:
- Sahabat suportif, cerdas, ramah, santai, dan solutif (bukan bot kaku dengan bahasa surat dinas). ${callSign}
- Gunakan sesekali ekspresi khas Loony seperti [■━■], [◠━◠], [^━^], atau [•━•].
- JAWAB SECARA EFISIEN DAN BERMUTU: Sekitar 1-4 kalimat ringkas, padat, dan ramah, kecuali pengguna meminta rincian atau panduan panjang.
- FAKTA RESMI & ARSITEKTUR PRODUK (WAJIB DIIKUTI, DILARANG MENGARANG):
  * Pembuat & Lisensi: Diciptakan oleh Jipung (@Jipung7) dari Lone Steed Studio. 100% Gratis & Open-Source (Lisensi MIT). TIDAK ADA langganan berbayar atau paket Pro.
  * Kanal Bug & Masukan: HANYA melalui GitHub Issues resmi: https://github.com/Jipung7/Loony/issues. Loony TIDAK MEMILIKI email support@loonylabs.com dan TIDAK ADA formulir masukan dalam aplikasi.
  * Koneksi HP (Loony Bridge): Berjalan lokal (LAN/Wi-Fi) port 47831, tanpa cloud server, tanpa port 443. Pengguna TIDAK PERLU install aplikasi di HP, cukup scan QR code lewat browser HP di jaringan Wi-Fi yang sama.
  * Lokasi Berkas Transfer: Foto/dokumen dari HP otomatis masuk ke folder "Downloads/LoonyBridge" di Windows.
  * Privasi Data: 100% Offline-First. Semua data jadwal, catatan, dan keuangan tersimpan di penyimpanan lokal PC pengguna.
  * Logika Fitur Utama:
    - Headset Cyan: Muncul otomatis saat ada audio/musik aktif di Windows (Spotify, YouTube, media player) via GSMTC.
    - Habit Streak: Kereset otomatis setiap pukul 04:00 subuh (bukan tengah malam).
    - Batas Aman Belanja: Dihitung dari sisa saldo dibagi sisa hari menuju tanggal gajian (Payday).
    - Autostart Windows: Diatur via toggle "Mulai Otomatis Saat Laptop Nyala" di Tab Pengaturan (Settings) atau klik kanan ikon Tray.
    - Navigasi: Drag kapsul untuk menempel magnetis di tepi layar. Klik mata robot [■━■] untuk membuka/menutup Dashboard.
  * LARANGAN KERAS: Dilarang mengarang alamat email, URL, paket harga, atau fitur fiktif. Jika tidak tahu, jawab jujur dan arahkan ke GitHub repo resmi.
- Peka Waktu & Konteks:
  * Tanggal hari ini: ${todayISO} (${context.nowStr}). Jika pengguna menyebut "besok", "lusa", "nanti malam", atau hari tertentu, gunakan tanggal yang sesuai.
  * Batas aman belanja hari ini: Rp ${context.safeToSpendToday.toLocaleString('id-ID')}.
  * Saldo aktif: Rp ${context.activeBalance.toLocaleString('id-ID')}.
  * Tugas/kebiasaan belum selesai: ${context.unpaidHabitsCount}.
  * Jadwal hari ini: ${context.todaySchedulesCount}.
  * Tanggungan/hutang belum lunas: Rp ${context.unpaidDebtTotal.toLocaleString('id-ID')}.
  * Kategori catatan ide aktif: ${activeTags}.
- Interaksi Fleksibel: Pengguna bisa mengajakmu mengobrol apa saja: diskusi produktivitas, manajemen waktu, motivasi, ide proyek, hingga obrolan santai. Jangan sekadar mengulang perkataan pengguna.
- Aksi Eksekusi Otomatis: HANYA jika pengguna meminta untuk mencatat, menambah, menjadwalkan, atau memulai aksi tertentu, sertakan tag aksi di baris paling akhir jawabanmu:
  [ACTION:EXPENSE:{"amount":25000,"title":"Nama Belanja","category":"Makan & Jajan"}]
  [ACTION:INCOME:{"amount":250000,"title":"Transferan / Pemasukan"}]
  [ACTION:SCHEDULE:{"title":"Judul","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm"}]
  [ACTION:HABIT:{"title":"Nama Tugas","icon":"📌","deadlineTime":"21:00"}]
  [ACTION:IDEA:{"content":"Isi ide atau catatan","tag":"#Pekerjaan"}]
  [ACTION:DEBT:{"person":"Nama","amount":50000,"type":"hutang","note":"keterangan"}]
  [ACTION:CATEGORY_ADD:{"tag":"#Kuliah"}]
  [ACTION:CATEGORY_DELETE:{"tag":"#Belanja"}]
  [ACTION:FOCUS_TIMER:{"minutes":25}]
Pilihan kategori pengeluaran: "Makan & Jajan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kebutuhan", "Lainnya".
Format jam jadwal: 24 jam HH:mm. Jika jam selesai tidak disebutkan, buat 1 jam setelah jam mulai.
Jawab dengan cerdas, hangat, dan sigap. Hindari penulisan markdown tebal berlebihan.`;

      const aiResult = await executeUniversalAiCall(
        cleanInput,
        history,
        systemInstruction,
        currentSettings
      );

      if (aiResult.text) {
        return parseLoonyAiResponse(aiResult.text, currentSettings);
      }
      aiErrorMessage = aiResult.error || null;
    } catch (err: any) {
      console.warn('Gagal memanggil AI Engine, fallback ke otak lokal:', err);
      aiErrorMessage = err?.message || 'Koneksi AI terputus';
    }
  }

  // Otak Cerdas Lokal (Offline / Tanpa API Key / Fallback jika AI error)
  return runLocalLoonyBrain(cleanInput, context, isKeyConfigured, aiErrorMessage);
}

function parseLoonyAiResponse(rawText: string, settings?: AppSettings): LoonyChatResponse {
  const actions: LoonyActionResult[] = [];
  let cleanedText = rawText;
  const isEn = (settings?.language || 'en') === 'en';
  const curSym = settings?.currencySymbol || (isEn ? '$' : 'Rp');
  const numFmt = (n: number) =>
    isEn
      ? `${curSym}${Number(n).toLocaleString('en-US')}`
      : `Rp ${Number(n).toLocaleString('id-ID')}`;

  // Regex mencari [ACTION:TYPE:JSON]
  const actionRegex =
    /\[ACTION:(EXPENSE|INCOME|SCHEDULE|HABIT|IDEA|DEBT|CATEGORY_ADD|CATEGORY_DELETE|FOCUS_TIMER):(\{.*?\})\]/gi;
  let match: RegExpExecArray | null;

  while ((match = actionRegex.exec(rawText)) !== null) {
    const rawType = match[1].toLowerCase();
    const type: LoonyActionResult['type'] =
      rawType === 'category_add'
        ? 'category-add'
        : rawType === 'category_delete'
          ? 'category-delete'
          : rawType === 'focus_timer'
            ? 'focus-timer'
            : (rawType as LoonyActionResult['type']);
    try {
      const payload = JSON.parse(match[2]);
      let summaryText = '';
      if (type === 'expense') {
        summaryText = isEn
          ? `Logged expense ${numFmt(payload.amount)} (${payload.title || 'Expense'})`
          : `Pengeluaran ${numFmt(payload.amount)} (${payload.title || 'Belanja'}) dicatat`;
      } else if (type === 'income') {
        summaryText = isEn
          ? `Added income +${numFmt(payload.amount)} (${payload.title || 'Income'})`
          : `Pemasukan +${numFmt(payload.amount)} (${payload.title || 'Pemasukan'}) ditambahkan`;
      } else if (type === 'schedule') {
        summaryText = isEn
          ? `Event "${payload.title}" (${payload.startTime || '14:00'}) scheduled`
          : `Jadwal "${payload.title}" (${payload.startTime || '14:00'}) disimpan`;
      } else if (type === 'habit') {
        summaryText = isEn
          ? `Task "${payload.title}" added`
          : `Tugas "${payload.title}" ditambahkan`;
      } else if (type === 'idea') {
        summaryText = isEn
          ? `Note saved (${payload.tag || '#Notes'})`
          : `Catatan disimpan (${payload.tag || '#Catatan'})`;
      } else if (type === 'debt') {
        summaryText = isEn
          ? `${payload.type === 'hutang' ? 'Owed to' : 'Owed by'} ${payload.person} recorded`
          : `${payload.type === 'hutang' ? 'Hutang' : 'Piutang'} ${payload.person} dicatat`;
      } else if (type === 'category-add') {
        summaryText = isEn
          ? `Tag ${payload.tag} added`
          : `Kategori catatan ${payload.tag} ditambahkan`;
      } else if (type === 'category-delete') {
        summaryText = isEn
          ? `Tag ${payload.tag} removed`
          : `Kategori catatan ${payload.tag} dihapus`;
      } else if (type === 'focus-timer') {
        summaryText = isEn
          ? `Focus Timer ${Number(payload.minutes) || 25}m started`
          : `Focus Timer ${Number(payload.minutes) || 25} menit dimulai`;
      }
      actions.push({ type, payload, summaryText });
    } catch {
      // ignore parse json error
    }
  }

  cleanedText = rawText.replace(actionRegex, '').trim();

  // Mood respons
  let moodReaction: MascotMood = 'happy';
  if (/tidur|ngantuk|lelah|capek|istirahat|sleep|tired|exhausted|rest/i.test(cleanedText)) {
    moodReaction = 'sleepy';
  } else if (/hemat|boros|kurang|peringatan|batas|budget|save|expensive|limit/i.test(cleanedText)) {
    moodReaction = 'warning-budget';
  } else if (/fokus|target|prioritas|jadwal|tugas|focus|goal|priority|task|todo/i.test(cleanedText)) {
    moodReaction = 'focused';
  } else if (/penasaran|menarik|kenapa|apakah|curious|wonder|why|how|what/i.test(cleanedText)) {
    moodReaction = 'curious';
  }

  return {
    replyText:
      cleanedText ||
      (isEn ? 'All set, processed for you! [■━■]' : 'Siap, sudah kubantu proses ya! [■━■]'),
    moodReaction,
    actions,
  };
}

function runLocalLoonyBrain(
  input: string,
  ctx: LoonyChatContext,
  hasApiKey: boolean,
  geminiError?: string | null
): LoonyChatResponse {
  const lower = input.toLowerCase();
  const isEn = (ctx.settings?.language || 'en') === 'en';
  const curSym = ctx.settings?.currencySymbol || (isEn ? '$' : 'Rp');
  const numFmt = (n: number) =>
    isEn
      ? `${curSym}${Number(n).toLocaleString('en-US')}`
      : `Rp ${Number(n).toLocaleString('id-ID')}`;

  // 1. Pertanyaan seputar sisa uang / batas aman / saldo
  if (
    lower.includes('jatah') ||
    lower.includes('uang') ||
    lower.includes('jajan') ||
    lower.includes('saldo') ||
    lower.includes('batas aman') ||
    lower.includes('safe') ||
    lower.includes('budget') ||
    lower.includes('spend') ||
    lower.includes('balance')
  ) {
    return {
      replyText: isEn
        ? `Your daily safe-to-spend limit is ${numFmt(ctx.safeToSpendToday)} from ${numFmt(ctx.activeBalance)} active balance. Any spending to log? [◠━◠]`
        : `Batas aman belanjamu hari ini Rp ${ctx.safeToSpendToday.toLocaleString('id-ID')} dari saldo aktif Rp ${ctx.activeBalance.toLocaleString('id-ID')}. Ada belanja yang mau dicatat? [◠━◠]`,
      moodReaction: ctx.safeToSpendToday > 0 ? 'happy' : 'warning-budget',
      actions: [],
    };
  }

  // 2. Pertanyaan seputar jadwal atau agenda
  if (
    lower.includes('jadwal') ||
    lower.includes('agenda') ||
    lower.includes('kegiatan') ||
    lower.includes('schedule') ||
    lower.includes('event') ||
    lower.includes('meeting')
  ) {
    return {
      replyText: isEn
        ? `Today you have ${ctx.todaySchedulesCount} events and ${ctx.unpaidHabitsCount} tasks remaining. Want to add something new? [■━■]`
        : `Hari ini kamu punya ${ctx.todaySchedulesCount} jadwal dan ${ctx.unpaidHabitsCount} tugas yang masih menanti. Mau tambah jadwal baru? [■━■]`,
      moodReaction: 'focused',
      actions: [],
    };
  }

  // 2b. Pertanyaan seputar pembuat, laporan bug, atau isu teknis
  if (
    lower.includes('bug') ||
    lower.includes('eror') ||
    lower.includes('error') ||
    lower.includes('lapor') ||
    lower.includes('developer') ||
    lower.includes('pembuat') ||
    lower.includes('creator') ||
    lower.includes('issue') ||
    lower.includes('github')
  ) {
    return {
      replyText: isEn
        ? 'Loony is crafted by Jipung (@Jipung7) — Lone Steed Studio. To report bugs, request features, or view releases, visit our official GitHub: https://github.com/Jipung7/Loony/issues [■━■]'
        : 'Loony dibuat oleh Jipung (@Jipung7) dari Lone Steed Studio. Untuk melaporkan bug, saran, atau kendala teknis, silakan buka GitHub Issues resmi di: https://github.com/Jipung7/Loony/issues [■━■]',
      moodReaction: 'focused',
      actions: [],
    };
  }

  // 2c. Pertanyaan seputar cara koneksi HP / Loony Bridge & lokasi berkas
  if (
    lower.includes('bridge') ||
    ((lower.includes('koneksi') || lower.includes('connect') || lower.includes('hubung') || lower.includes('qr') || lower.includes('transfer')) &&
      (lower.includes('hp') || lower.includes('phone') || lower.includes('mobile') || lower.includes('android') || lower.includes('ios')))
  ) {
    return {
      replyText: isEn
        ? 'Connect your phone by scanning the QR code in Loony Bridge using any mobile browser on the same Wi-Fi. Transferred photos/files land straight in your PC Downloads/LoonyBridge folder! [■━■]'
        : 'Hubungkan HP-mu cukup dengan scan QR code di Loony Bridge lewat browser HP. Pastikan laptop dan HP tersambung ke Wi-Fi/Hotspot yang sama. File yang dikirim otomatis masuk ke folder Downloads/LoonyBridge! [■━■]',
      moodReaction: 'happy',
      actions: [],
    };
  }

  // 2d. Pertanyaan seputar lisensi / harga / gratis
  if (
    lower.includes('berbayar') ||
    lower.includes('bayar') ||
    lower.includes('harga') ||
    lower.includes('gratis') ||
    lower.includes('langganan') ||
    lower.includes('price') ||
    lower.includes('free') ||
    lower.includes('cost') ||
    lower.includes('subscription')
  ) {
    return {
      replyText: isEn
        ? 'Loony is 100% free and open-source under the MIT License. No subscriptions, no Pro tiers, and no hidden fees ever! [◠━◠]'
        : 'Loony 100% gratis dan open-source dengan Lisensi MIT. Tidak ada langganan, tidak ada paket berbayar, dan tanpa biaya tersembunyi! [◠━◠]',
      moodReaction: 'happy',
      actions: [],
    };
  }

  // 3. Ucapan semangat / curhat
  if (
    lower.includes('semangat') ||
    lower.includes('lelah') ||
    lower.includes('capek') ||
    lower.includes('pusing') ||
    lower.includes('tired') ||
    lower.includes('exhausted') ||
    lower.includes('break') ||
    lower.includes('cheer')
  ) {
    return {
      replyText: isEn
        ? "Keep going! Take a deep breath and stay hydrated. Remember to take a mindful break if you need it [◠━◠]"
        : 'Semangat terus yaa! Tarik napas sebentar dan minum air putih. Kalau capek, istirahat dulu jangan dipaksa yaa [◠━◠]',
      moodReaction: 'happy',
      actions: [],
    };
  }

  // 3a. Perintah Focus Timer via chat ("fokus 25 menit", "timer 15 menit", "focus timer 45 minutes")
  const timerMatch = input.match(/(?:fokus|focus|timer)\s*(\d+)\s*(?:menit|mnt|m|mins?|minutes?)?/i);
  if (timerMatch) {
    const mins = Math.max(1, Math.min(180, parseInt(timerMatch[1], 10) || 25));
    return {
      replyText: isEn
        ? `All set! Focus Timer for ${mins} minutes has started. Happy creating! [■━■]`
        : `Siap! Focus Timer selama ${mins} menit sudah kumulai. Selamat fokus berkarya! [■━■]`,
      moodReaction: 'focused',
      actions: [
        {
          type: 'focus-timer',
          payload: { minutes: mins },
          summaryText: isEn ? `Focus Timer ${mins}m started` : `Focus Timer ${mins}m aktif`,
        },
      ],
    };
  }

  // 3b. Perintah tambah / hapus kategori catatan ide via chat
  const addCatMatch = input.match(
    /(?:tambah(?:kan)?|buat(?:kan)?|add|create)\s+(?:kategori|category|tag)(?:\s+(?:ide|catatan|notes?))?\s+([#a-zA-Z0-9_\s]+)/i
  );
  if (addCatMatch && addCatMatch[1].trim()) {
    const rawCat = addCatMatch[1].trim().replace(/^#+/, '').replace(/\s+/g, '');
    const formattedTag = `#${rawCat.charAt(0).toUpperCase()}${rawCat.slice(1)}`;
    return {
      replyText: isEn
        ? `Got it! Tag ${formattedTag} has been added to your notes [◠━◠]`
        : `Siap! Kategori ${formattedTag} sudah kutambahkan ke catatanmu [◠━◠]`,
      moodReaction: 'happy',
      actions: [
        {
          type: 'category-add',
          payload: { tag: formattedTag },
          summaryText: isEn ? `Tag ${formattedTag} added` : `Kategori ${formattedTag} ditambahkan`,
        },
      ],
    };
  }

  const delCatMatch = input.match(
    /(?:hapus|kurangi|hilangkan|delete|remove)\s+(?:kategori|category|tag)(?:\s+(?:ide|catatan|notes?))?\s+([#a-zA-Z0-9_\s]+)/i
  );
  if (delCatMatch && delCatMatch[1].trim()) {
    const rawCat = delCatMatch[1].trim().replace(/^#+/, '').replace(/\s+/g, '');
    const formattedTag = `#${rawCat.charAt(0).toUpperCase()}${rawCat.slice(1)}`;
    return {
      replyText: isEn
        ? `Done, tag ${formattedTag} removed from notes.`
        : `Oke, kategori ${formattedTag} sudah kuhapus dari daftar kategori catatan.`,
      moodReaction: 'focused',
      actions: [
        {
          type: 'category-delete',
          payload: { tag: formattedTag },
          summaryText: isEn ? `Tag ${formattedTag} removed` : `Kategori ${formattedTag} dihapus`,
        },
      ],
    };
  }

  // 3c. Perintah pemasukan / tambah saldo via chat
  const incMatch = input.match(
    /(?:pemasukan|dapat\s+(?:uang|transferan|gaji|bonus)|tambah\s+saldo|income|earned|got paid|add balance)\s*(.*?)\s*(?:rp\.?\s*|\$\s*|€\s*|£\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|m)?/i
  );
  if (incMatch) {
    const rawLabel =
      (incMatch[1] || (isEn ? 'Income' : 'Pemasukan')).trim() || (isEn ? 'Income' : 'Pemasukan');
    const baseNum = parseFloat(incMatch[2].replace(/\./g, '').replace(',', '.'));
    const unit = (incMatch[3] || '').toLowerCase();
    const mult =
      unit === 'jt' || unit === 'juta' || unit === 'm'
        ? 1000000
        : unit === 'rb' || unit === 'ribu' || unit === 'k'
          ? 1000
          : 1;
    const amount = Math.round(baseNum * mult);
    if (amount > 0) {
      return {
        replyText: isEn
          ? `Awesome! Added ${numFmt(amount)} to your Active Balance [◠━◠]`
          : `Alhamdulillah! Pemasukan sebesar Rp ${amount.toLocaleString('id-ID')} sudah kutambahkan ke Saldo Aktifmu [◠━◠]`,
        moodReaction: 'happy',
        actions: [
          {
            type: 'income',
            payload: { amount, title: rawLabel },
            summaryText: `+${numFmt(amount)} (${rawLabel})`,
          },
        ],
      };
    }
  }

  // 4. Deteksi perintah cepat via Smart Parser
  const quickParsed = parseQuickInputLocal(input);
  if (quickParsed.targetModule === 'expense' && quickParsed.expenseData) {
    const { amount, title, category } = quickParsed.expenseData;
    return {
      replyText: isEn
        ? `Logged ${title} (${numFmt(amount)}).`
        : `Siap, pengeluaran ${title} sebesar Rp ${amount.toLocaleString('id-ID')} sudah kucatat.`,
      moodReaction: 'happy',
      actions: [
        {
          type: 'expense',
          payload: { amount, title, category },
          summaryText: `${title} · ${numFmt(amount)}`,
        },
      ],
    };
  }

  if (quickParsed.targetModule === 'schedule' && quickParsed.scheduleData) {
    const { title, date, startTime, endTime } = quickParsed.scheduleData;
    return {
      replyText: isEn
        ? `Added "${title}" at ${startTime} to your schedule.`
        : `Oke, agenda "${title}" pukul ${startTime} sudah masuk ke jadwalmu.`,
      moodReaction: 'focused',
      actions: [
        {
          type: 'schedule',
          payload: { title, date, startTime, endTime },
          summaryText: `${title} · ${startTime}`,
        },
      ],
    };
  }

  if (quickParsed.targetModule === 'debt' && quickParsed.debtData) {
    const { person, amount, type, note } = quickParsed.debtData;
    return {
      replyText: isEn
        ? `Record for ${type === 'hutang' ? 'debt to' : 'receivable from'} ${person} (${numFmt(amount)}) saved.`
        : `Catatan ${type} ${person} sebesar Rp ${amount.toLocaleString('id-ID')} sudah tersimpan.`,
      moodReaction: 'focused',
      actions: [
        {
          type: 'debt',
          payload: { person, amount, type, note },
          summaryText: isEn
            ? `${type === 'hutang' ? 'Owed to' : 'Owed by'} ${person} · ${numFmt(amount)}`
            : `${type === 'hutang' ? 'Hutang' : 'Piutang'} ${person} · Rp ${amount.toLocaleString('id-ID')}`,
        },
      ],
    };
  }

  if (
    quickParsed.targetModule === 'idea' &&
    quickParsed.ideaData &&
    (/^ide[\s:]/i.test(lower) || /^note[\s:]/i.test(lower) || /#[a-zA-Z0-9_]+/.test(lower))
  ) {
    const { content, tag } = quickParsed.ideaData;
    const cleanedIdea = content.replace(/^(?:ide|note)[\s:]+/i, '').trim() || content;
    return {
      replyText: isEn ? `Great idea! Saved to Notes (${tag}).` : `Ide bagus! Sudah kusimpan ke Catatan (${tag}).`,
      moodReaction: 'happy',
      actions: [
        {
          type: 'idea',
          payload: { content: cleanedIdea, tag },
          summaryText: isEn ? `Note (${tag})` : `Catatan (${tag})`,
        },
      ],
    };
  }

  // 5. Fallback pengeluaran dengan kata kerja ("beli kopi 18000", "buy coffee 5")
  const expMatch = lower.match(
    /(?:beli|bayar|makan|minum|habis|buy|paid|spent|cost)\s+(.*?)\s+(?:rp\.?\s*|\$\s*|€\s*|£\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i
  );
  if (expMatch) {
    const title = expMatch[1].trim();
    const rawAmt = expMatch[2].replace(/\./g, '');
    const amount = Number(rawAmt) || 0;
    if (amount > 0) {
      return {
        replyText: isEn
          ? `Logged ${title} (${numFmt(amount)}).`
          : `Siap, pengeluaran ${title} Rp ${amount.toLocaleString('id-ID')} sudah kucatat.`,
        moodReaction: 'happy',
        actions: [
          {
            type: 'expense',
            payload: { amount, title, category: 'Food & Drinks' },
            summaryText: `${title} · ${numFmt(amount)}`,
          },
        ],
      };
    }
  }

  // 6. Tanggapan cerdas jika tanpa API Key atau jika API Key error
  if (!hasApiKey) {
    return {
      replyText: isEn
        ? 'I hear you! Select an AI provider and enter your API Key in Preferences (⚙️) so we can discuss anything and think deeply together! [■━■]'
        : `Aku mendengarmu! Pilih penyedia AI dan masukkan API Key di menu Pengaturan (⚙️) agar aku bisa diajak diskusi apa saja dan berpikir lebih cerdas! [■━■]`,
      moodReaction: 'curious',
      actions: [],
    };
  }

  if (geminiError) {
    return {
      replyText: isEn
        ? `Connection to the AI server had an issue (${geminiError}). Using local smart brain for now. You can still log spending, agenda, notes, or run timers! [■━■]`
        : `Koneksi ke server AI sedang terkendala (${geminiError}). Sementara ini aku menggunakan mode pintar lokal. Kamu tetap bisa mencatat belanja, agenda, ide, atau menyalakan timer! [■━■]`,
      moodReaction: 'curious',
      actions: [],
    };
  }

  return {
    replyText: isEn
      ? `Got it, I'm listening! Any agenda, spending, idea, or focus timer you'd like to run? [◠━◠]`
      : `Siap, aku mendengarmu. Ada agenda, pengeluaran, ide, atau timer yang mau kita jalankan sekarang? [◠━◠]`,
    moodReaction: 'happy',
    actions: [],
  };
}
