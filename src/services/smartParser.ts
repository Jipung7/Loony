import { IdeaTag, ParsedQuickInput } from '../types';

function parseAmountToken(rawNum: string, unit?: string): number {
  const cleaned = rawNum
    .replace(/[\$€£¥]/g, '')
    .replace(/rp\.?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  const u = (unit || '').toLowerCase();
  if (u === 'rb' || u === 'ribu' || u === 'k') return Math.round(val * 1000);
  if (u === 'jt' || u === 'juta' || u === 'm') return Math.round(val * 1000000);
  return Math.round(val);
}

function inferIdeaTagLocal(text: string, isEn = false): IdeaTag {
  const lower = text.toLowerCase();
  if (
    /\b(kerja|kantor|klien|client|meeting|proyek|project|tugas|laporan|target|bisnis|presentasi|email|revisi|work|task|code|coding|dev)\b/.test(
      lower
    )
  ) {
    return isEn ? '#Work' : '#Pekerjaan';
  }
  if (
    /\b(beli|belanja|checkout|tokopedia|shopee|harga|diskon|stok|kebutuhan|pasar|supermarket|kado|buy|shopping|order|amazon|price)\b/.test(
      lower
    )
  ) {
    return isEn ? '#Shopping' : '#Belanja';
  }
  if (
    /\b(keluarga|rumah|kesehatan|olahraga|liburan|diri|hobi|tujuan|rencana|film|buku|family|home|health|gym|workout|vacation|book)\b/.test(
      lower
    )
  ) {
    return isEn ? '#Personal' : '#Pribadi';
  }
  return isEn ? '#Notes' : '#Catatan';
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function addOneHour(timeHHMM: string): string {
  const [h, m] = timeHHMM.split(':').map(Number);
  const nextH = ((h || 0) + 1) % 24;
  return `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

/**
 * Local Instant Smart Parser (< 50ms)
 * Mendeteksi Pengeluaran, Hutang/Piutang, Jadwal Natural, atau Ide.
 */
export function parseQuickInputLocal(raw: string, isEn = false): ParsedQuickInput {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // 1. Cek pola Hutang / Piutang: e.g. "hutang Budi 50rb makan siang" atau "piutang Andi 100rb"
  const debtMatch = text.match(
    /^(hutang|pinjam|ngutang|piutang|dipinjam)\s+([a-zA-Z0-9_]+)\s+(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\s*(.*)$/i
  );
  if (debtMatch) {
    const keyword = debtMatch[1].toLowerCase();
    const person = debtMatch[2];
    const amount = parseAmountToken(debtMatch[3], debtMatch[4]);
    const note = debtMatch[5]?.trim() || 'Catatan cepat';
    const type: 'hutang' | 'piutang' =
      keyword === 'piutang' || keyword === 'dipinjam' ? 'piutang' : 'hutang';

    return {
      targetModule: 'debt',
      confidence: 'local-regex',
      previewLabel: `${type === 'hutang' ? '⚠️ Hutang ke' : '💸 Piutang'} ${person}: Rp ${amount.toLocaleString('id-ID')} (${note})`,
      debtData: { person, amount, type, note },
    };
  }

  // 2. Cek pola Jadwal / Agenda Natural:
  // Contoh: "Besok jam 16.00 rapat tim", "Tomorrow at 14:00 team sync", "Hari ini 19:30 mabar"
  const hasTimeMatch = text.match(/\b(?:jam|pukul|pkl|at)?\s*([01]?\d|2[0-3])[.:]([0-5]\d)\b/i);
  const hasScheduleKeyword =
    /\b(besok|lusa|hari ini|nanti|jadwal|rapat|meeting|kuliah|kelas|janjian|deadline|acara|presentasi|agenda|tomorrow|today|sync|call|appointment|event)\b/i.test(
      lower
    );

  if (hasTimeMatch && (hasScheduleKeyword || lower.startsWith('jam ') || lower.startsWith('at '))) {
    const hour = String(Number(hasTimeMatch[1])).padStart(2, '0');
    const minute = hasTimeMatch[2];
    const startTime = `${hour}:${minute}`;
    const endTime = addOneHour(startTime);

    let date = addDaysISO(0);
    let dayLabel = 'Hari ini / Today';
    if (/\b(besok|tomorrow)\b/i.test(lower)) {
      date = addDaysISO(1);
      dayLabel = 'Besok / Tomorrow';
    } else if (/\blusa\b/i.test(lower)) {
      date = addDaysISO(2);
      dayLabel = 'Lusa';
    }

    const cleanedTitle = text
      .replace(/\b(besok|lusa|hari ini|nanti malam|nanti sore|nanti|jadwal|jam|pukul|pkl|tomorrow|today|at)\b/gi, '')
      .replace(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const finalTitle = cleanedTitle || 'Event';

    return {
      targetModule: 'schedule',
      confidence: 'local-regex',
      previewLabel: `📅 ${dayLabel} (${startTime}–${endTime}): ${finalTitle}`,
      scheduleData: {
        title: finalTitle,
        date,
        startTime,
        endTime,
      },
    };
  }

  // 3. Cek pola Pengeluaran 1-Baris:
  // Contoh: "18000 es kopi", "18rb es kopi", "$15 lunch", "lunch $15", "lunch 15"
  const expenseStartMatch = text.match(
    /^(?:rp\.?\s*|\$\s*|€\s*|£\s*|¥\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\s+(.+)$/i
  );
  const expenseEndMatch = text.match(
    /^(.+?)\s+(?:rp\.?\s*|\$\s*|€\s*|£\s*|¥\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?$/i
  );

  if (expenseStartMatch) {
    const amount = parseAmountToken(expenseStartMatch[1], expenseStartMatch[2]);
    const title = expenseStartMatch[3].trim();
    if (amount > 0 && title.length > 0) {
      return {
        targetModule: 'expense',
        confidence: 'local-regex',
        previewLabel: `💸 ${title} (${amount})`,
        expenseData: {
          amount,
          title,
          category: inferExpenseCategory(title),
        },
      };
    }
  } else if (expenseEndMatch) {
    const title = expenseEndMatch[1].trim();
    const amount = parseAmountToken(expenseEndMatch[2], expenseEndMatch[3]);
    if (amount > 0 && title.length > 0) {
      return {
        targetModule: 'expense',
        confidence: 'local-regex',
        previewLabel: `💸 ${title} (${amount})`,
        expenseData: {
          amount,
          title,
          category: inferExpenseCategory(title),
        },
      };
    }
  }

  // 4. Default: Masuk ke Idea Vault dengan Tag Otomatis atau #Hashtag Kustom
  const hashtagMatch = text.match(/#([a-zA-Z0-9_]+)/);
  let explicitTag: IdeaTag | null = null;
  if (hashtagMatch) {
    const rawTag = hashtagMatch[1];
    explicitTag = `#${rawTag.charAt(0).toUpperCase()}${rawTag.slice(1)}`;
  }

  const tag = explicitTag || inferIdeaTagLocal(text, isEn);
  const cleanIdeaContent = hashtagMatch ? text.replace(hashtagMatch[0], '').replace(/\s+/g, ' ').trim() || text : text;

  return {
    targetModule: 'idea',
    confidence: 'local-regex',
    previewLabel: `💡 ${isEn ? 'Note' : 'Catatan'} (${tag}): ${cleanIdeaContent.slice(0, 48)}${cleanIdeaContent.length > 48 ? '...' : ''}`,
    ideaData: {
      content: cleanIdeaContent,
      tag,
    },
  };
}

function inferExpenseCategory(title: string): string {
  const lower = title.toLowerCase();
  if (
    /\b(kopi|coffee|makan|food|lunch|dinner|breakfast|snack|drink|minum|jajan|bakso|ayam|nasi|teh|cafe|restaurant|burger|pizza|gofood|grabfood)\b/.test(
      lower
    )
  )
    return 'Makan & Jajan';
  if (
    /\b(bensin|gas|fuel|parkir|parking|ojol|grab|uber|lyft|taxi|tol|kereta|train|bus|subway|transport|flight)\b/.test(
      lower
    )
  )
    return 'Transportasi';
  if (
    /\b(kuota|pulsa|listrik|bill|water|wifi|internet|topup|ml|steam|game|netflix|spotify|subscription|movie|cinema)\b/.test(
      lower
    )
  )
    return 'Digital & Hiburan';
  return 'Harian';
}

/**
 * Gemini API Smart Enhancement (Gemini 2.0 / 2.5 / 1.5 Flash)
 * Digunakan untuk parsing cepat kalimat bebas/ide kompleks jika pengguna telah mengisi Gemini API Key.
 */
export async function analyzeWithGeminiAI(
  rawText: string,
  apiKey: string
): Promise<ParsedQuickInput | null> {
  const trimmed = (apiKey || '').trim();
  if (!trimmed || !rawText.trim()) return null;

  const todayISO = new Date().toISOString().split('T')[0];
  const prompt = `Kamu adalah AI otak dari asisten meja ProductivitySys.
Analisis kalimat input pengguna berikut (Tanggal hari ini: ${todayISO}):
"${rawText}"

Tentukan apakah kalimat ini merupakan:
1. "expense" (pengeluaran uang harian)
2. "schedule" (jadwal acara/kegiatan)
3. "debt" (catatan hutang atau piutang)
4. "idea" (ide cerita, konsep game, ide projek, atau catatan random)

Kembalikan HANYA JSON murni tanpa markdown:
{
  "targetModule": "expense" | "schedule" | "debt" | "idea",
  "previewLabel": "ringkasan singkat 1 baris",
  "expenseData": { "amount": number, "title": string, "category": string },
  "scheduleData": { "title": string, "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm" },
  "debtData": { "person": string, "amount": number, "type": "hutang" | "piutang", "note": string },
  "ideaData": { "content": string, "tag": "#Pekerjaan" | "#Pribadi" | "#Belanja" | "#Catatan", "aiSummary": string }
}`;

  if (trimmed.startsWith('gsk_')) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmed}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const textOut = data?.choices?.[0]?.message?.content;
        if (textOut) {
          const parsed = JSON.parse(textOut);
          return { ...parsed, confidence: 'gemini-ai' };
        }
      }
    } catch {
      // fallback
    }
  }

  const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(trimmed)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': trimmed,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOut) {
          const parsed = JSON.parse(textOut);
          return {
            ...parsed,
            confidence: 'gemini-ai',
          };
        }
      }
    } catch {
      // lanjut coba model berikutnya
    }
  }

  return null;
}
