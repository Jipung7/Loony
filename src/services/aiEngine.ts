import { AiProviderType, AppSettings } from '../types';
export type { AiProviderType };

export interface AiProviderConfig {
  id: AiProviderType;
  name: string;
  nameEn?: string;
  badge: string;
  badgeEn?: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
  keyPlaceholderEn?: string;
  keyPrefixMatch?: RegExp;
  helpUrl: string;
  helpLabel: string;
  isOpenAiCompatible: boolean;
  requiresKey: boolean;
  description: string;
  descriptionEn?: string;
}

export const AI_PROVIDERS: Record<AiProviderType, AiProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Google AI (Gratis)',
    badgeEn: 'Google AI (Free)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'],
    keyPlaceholder: 'AQ... atau AIzaSy...',
    keyPlaceholderEn: 'AQ... or AIzaSy...',
    keyPrefixMatch: /^(AQ|AIzaSy)/i,
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpLabel: 'Google AI Studio ↗',
    isOpenAiCompatible: false,
    requiresKey: true,
    description: 'Gratis dari Google AI Studio. Cerdas, hemat, dan sangat fasih berbahasa Indonesia.',
    descriptionEn: 'Free from Google AI Studio. Smart, fast, and highly capable companion model.',
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    nameEn: 'Groq (Fast)',
    badge: 'Tercepat & Gratis',
    badgeEn: 'Ultra Fast & Free',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    keyPlaceholder: 'gsk_...',
    keyPrefixMatch: /^gsk_/i,
    helpUrl: 'https://console.groq.com/keys',
    helpLabel: 'Groq Console ↗',
    isOpenAiCompatible: true,
    requiresKey: true,
    description: 'Gratis, inferensi tercepat di dunia (~300-500 kata/detik). Didukung model mutakhir di Groq LPU.',
    descriptionEn: 'Free, blazing-fast inference (~300-500 words/sec) powered by Groq LPUs.',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Ratusan Model',
    badgeEn: 'Hundreds of Models',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    models: [
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-r1:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ],
    keyPlaceholder: 'sk-or-v1-...',
    keyPrefixMatch: /^sk-or-/i,
    helpUrl: 'https://openrouter.ai/keys',
    helpLabel: 'OpenRouter Keys ↗',
    isOpenAiCompatible: true,
    requiresKey: true,
    description: 'Satu kunci untuk ratusan model. Model openrouter/free otomatis memilihkan model gratis terbaik.',
    descriptionEn: 'One key for hundreds of models. Automatically routes to the best free model available.',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Hemat & Cerdas',
    badgeEn: 'Cost-Effective & Smart',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-flash'],
    keyPlaceholder: 'sk-...',
    keyPrefixMatch: /^sk-[a-zA-Z0-9]{20,}/i,
    helpUrl: 'https://platform.deepseek.com/api_keys',
    helpLabel: 'DeepSeek Platform ↗',
    isOpenAiCompatible: true,
    requiresKey: true,
    description: 'Model DeepSeek-V3 dan R1. Biaya resmi sangat murah dan penalaran sangat tajam.',
    descriptionEn: 'DeepSeek-V3 and R1 reasoning models. Highly affordable and exceptional at logic.',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    badge: 'Standar Industri',
    badgeEn: 'Industry Standard',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o'],
    keyPlaceholder: 'sk-proj-... atau sk-...',
    keyPlaceholderEn: 'sk-proj-... or sk-...',
    keyPrefixMatch: /^sk-proj-/i,
    helpUrl: 'https://platform.openai.com/api-keys',
    helpLabel: 'OpenAI Platform ↗',
    isOpenAiCompatible: true,
    requiresKey: true,
    description: 'ChatGPT GPT-4o-mini resmi. Membutuhkan akun OpenAI dengan saldo kredit.',
    descriptionEn: 'Official OpenAI GPT-4o-mini. Requires an OpenAI account with active balance.',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Lokal PC)',
    nameEn: 'Ollama (Local PC)',
    badge: 'Offline & Privat',
    badgeEn: 'Offline & Private',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'deepseek-r1:8b'],
    keyPlaceholder: 'Tanpa API Key (100% Offline)',
    keyPlaceholderEn: 'No API Key needed (100% Offline)',
    helpUrl: 'https://ollama.com',
    helpLabel: 'Ollama Website ↗',
    isOpenAiCompatible: true,
    requiresKey: false,
    description: '100% Berjalan di laptop sendiri tanpa internet dan tanpa biaya. Privasi data mutlak.',
    descriptionEn: 'Runs 100% locally on your PC without internet or fees. Total data privacy.',
  },
  custom: {
    id: 'custom',
    name: 'Kustom (OpenAI-Comp)',
    nameEn: 'Custom (OpenAI-Comp)',
    badge: 'Fleksibel',
    badgeEn: 'Flexible',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'default',
    models: [],
    keyPlaceholder: 'Kunci API (jika server membutuhkan)',
    keyPlaceholderEn: 'API Key (if server requires one)',
    helpUrl: '',
    helpLabel: '',
    isOpenAiCompatible: true,
    requiresKey: false,
    description: 'Gunakan proxy, LM Studio, LocalAI, vLLM, atau gateway AI mandiri milikmu.',
    descriptionEn: 'Connect to your custom proxy, LM Studio, LocalAI, vLLM, or self-hosted gateway.',
  },
};

export interface AiTestResult {
  ok: boolean;
  provider: AiProviderType;
  model?: string;
  message: string;
}

/**
 * Deteksi otomatis provider berdasarkan pola awalan API Key.
 */
export function detectProviderFromKey(key: string): AiProviderType | null {
  const k = (key || '').trim();
  if (k.startsWith('gsk_')) return 'groq';
  if (k.startsWith('sk-or-')) return 'openrouter';
  if (k.startsWith('sk-proj-')) return 'openai';
  if (k.startsWith('AQ') || k.startsWith('AIzaSy')) return 'gemini';
  return null;
}

/**
 * Normalisasi URL endpoint OpenAI-compatible agar selalu berakhir dengan /chat/completions
 */
function normalizeChatCompletionsUrl(baseUrl: string): string {
  const cleaned = baseUrl.trim().replace(/\/+$/, '');
  if (cleaned.endsWith('/chat/completions')) {
    return cleaned;
  }
  return `${cleaned}/chat/completions`;
}

/**
 * Dynamic Model Discovery untuk Google Gemini:
 * Mengambil daftar model yang aktif langsung dari akun Google API Key.
 * Mencegah error "model not found for API version v1beta" pada kunci baru AQ...
 */
async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  const trimmed = apiKey.trim();
  const versions = ['v1beta', 'v1'];
  
  for (const ver of versions) {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(trimmed)}`;
      const res = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': trimmed,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''));
        
        // Prioritaskan model flash
        const preferred = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
        const sorted = available.sort((a: string, b: string) => {
          const idxA = preferred.findIndex((p) => a.includes(p));
          const idxB = preferred.findIndex((p) => b.includes(p));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
        if (sorted.length > 0) return sorted;
      }
    } catch {
      // lanjut coba fallback
    }
  }

  // Fallback standar
  return ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
}

/**
 * Dynamic Model Discovery untuk Provider OpenAI-Compatible (Groq, OpenRouter, DeepSeek, OpenAI, Ollama):
 * Mengambil daftar model yang aktif langsung dari endpoint /models.
 */
export async function discoverOpenAiCompatibleModels(
  baseUrl: string,
  apiKey: string,
  provider: AiProviderType
): Promise<string[]> {
  const cleaned = (baseUrl || '').trim().replace(/\/+$/, '');
  const modelsUrl = cleaned.endsWith('/chat/completions')
    ? cleaned.replace(/\/chat\/completions$/, '/models')
    : cleaned.endsWith('/models')
    ? cleaned
    : `${cleaned}/models`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  } else if (provider === 'ollama') {
    headers['Authorization'] = 'Bearer ollama';
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/productivitysys';
    headers['X-Title'] = 'ProductivitySys Loony';
  }

  try {
    const res = await fetch(modelsUrl, {
      method: 'GET',
      headers,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawList: any[] = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
      ? data.models
      : [];

    const validChatModels = rawList
      .map((item) => (typeof item === 'string' ? item : item?.id || item?.name))
      .filter((id) => {
        if (!id || typeof id !== 'string') return false;
        const low = id.toLowerCase();
        // Singkirkan model non-chat (audio transcription, tts, embedding, guardrail, safety)
        if (low.includes('whisper') || low.includes('audio') || low.includes('tts') || low.includes('orpheus')) return false;
        if (low.includes('embed') || low.includes('guard') || low.includes('moderation') || low.includes('safeguard')) return false;
        if (low.includes('vision') && !low.includes('instruct') && !low.includes('chat') && !low.includes('qwen')) return false;
        return true;
      });

    if (provider === 'groq') {
      const preferred = [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.8-27b',
        'allam-2-7b',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
      ];
      validChatModels.sort((a, b) => {
        const idxA = preferred.findIndex((p) => a.toLowerCase().includes(p.toLowerCase()));
        const idxB = preferred.findIndex((p) => b.toLowerCase().includes(p.toLowerCase()));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } else if (provider === 'openrouter') {
      // Prioritaskan model gratis (:free) atau auto-router openrouter/free
      validChatModels.sort((a, b) => {
        const aFree = a === 'openrouter/free' ? 2 : a.endsWith(':free') ? 1 : 0;
        const bFree = b === 'openrouter/free' ? 2 : b.endsWith(':free') ? 1 : 0;
        return bFree - aFree;
      });
    } else if (provider === 'deepseek') {
      const preferred = ['deepseek-chat', 'deepseek-reasoner', 'deepseek-flash'];
      validChatModels.sort((a, b) => {
        const idxA = preferred.indexOf(a);
        const idxB = preferred.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } else if (provider === 'openai') {
      const preferred = ['gpt-4o-mini', 'gpt-4o'];
      validChatModels.sort((a, b) => {
        const idxA = preferred.indexOf(a);
        const idxB = preferred.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }

    return validChatModels;
  } catch {
    return [];
  }
}

/**
 * Universal Error Classifier untuk menghasilkan pesan error yang ramah dan solutif.
 */
export function classifyAiError(
  status: number | undefined,
  errData: any,
  provider: AiProviderType,
  fallbackMsg?: string
): string {
  const providerName = AI_PROVIDERS[provider]?.name || provider;
  const rawMsg = errData?.error?.message || errData?.message || fallbackMsg || '';

  if (status === 401 || status === 403) {
    return `Kunci API ditolak oleh ${providerName} (HTTP ${status}). Periksa kembali kunci API di Pengaturan.`;
  }
  if (status === 402 || rawMsg.toLowerCase().includes('insufficient_quota') || rawMsg.toLowerCase().includes('credit')) {
    return `Saldo kredit di ${providerName} habis (HTTP 402). Silakan gunakan provider gratis (Gemini/Groq) atau isi saldo.`;
  }
  if (status === 404) {
    if (provider === 'gemini') {
      return `Model Gemini tidak terdaftar di proyek kunci API. Gunakan tombol Tes untuk memindai model aktif.`;
    }
    if (provider === 'ollama') {
      return `Model belum diunduh di Ollama. Buka terminal dan jalankan: ollama run llama3.2`;
    }
    return `Model yang dipilih tidak ditemukan di ${providerName} (HTTP 404).`;
  }
  if (status === 429) {
    const detail = errData?.error?.message || errData?.message;
    if (detail) {
      return `Batas kuota/kecepatan tercapai di ${providerName} (HTTP 429): ${detail}`;
    }
    return `Batas kecepatan/kuota (Rate Limit) tercapai di ${providerName} (HTTP 429). Tunggu 15–30 detik sebelum mencoba lagi.`;
  }
  if (status === 500 || status === 502 || status === 503) {
    return `Server ${providerName} sedang sibuk atau mengalami kendala trafik (HTTP ${status}). Beralih ke otak lokal.`;
  }

  if (rawMsg) {
    return `${providerName}: ${rawMsg}`;
  }

  if (provider === 'ollama') {
    return `Tidak dapat terhubung ke Ollama di localhost:11434. Pastikan aplikasi Ollama sudah dinyalakan di komputermu.`;
  }

  return `Gagal terhubung ke ${providerName}. Periksa koneksi internet atau kunci API.`;
}

/**
 * Menguji koneksi provider AI secara langsung dengan panggilan cepat.
 */
export async function testAiProviderConnection(
  provider: AiProviderType,
  apiKey: string,
  customBaseUrl?: string,
  customModel?: string
): Promise<AiTestResult> {
  const cfg = AI_PROVIDERS[provider];
  const trimmedKey = (apiKey || '').trim();

  if (cfg.requiresKey && !trimmedKey) {
    return {
      ok: false,
      provider,
      message: `Kunci API ${cfg.name} masih kosong. Masukkan kunci API terlebih dahulu.`,
    };
  }

  // 1. Uji Google Gemini
  if (provider === 'gemini') {
    const discovered = await discoverGeminiModels(trimmedKey);
    const candidateModels = discovered.length > 0 ? discovered : cfg.models;

    let lastErr = '';
    for (const model of candidateModels.slice(0, 4)) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': trimmedKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Halo' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        });

        if (res.ok) {
          return {
            ok: true,
            provider,
            model,
            message: `Tersambung ke Google Gemini (${model})!`,
          };
        } else {
          const errData = await res.json().catch(() => null);
          lastErr = classifyAiError(res.status, errData, 'gemini');
          if (res.status === 429) {
            break;
          }
        }
      } catch (err: any) {
        lastErr = err?.message || 'Gagal tersambung ke server Google Gemini';
      }
    }

    return {
      ok: false,
      provider,
      message: lastErr || 'Gagal memverifikasi kunci Google Gemini.',
    };
  }

  // 2. Uji Provider Berstandar OpenAI (Groq, OpenRouter, DeepSeek, OpenAI, Ollama, Kustom)
  const baseUrl = customBaseUrl?.trim() || cfg.defaultBaseUrl;
  const endpoint = normalizeChatCompletionsUrl(baseUrl);

  // Ambil daftar model aktif secara dinamis langsung dari server provider
  const discovered = await discoverOpenAiCompatibleModels(baseUrl, trimmedKey, provider);

  // Kumpulkan urutan model yang akan diuji
  const candidateSet = new Set<string>();
  if (customModel?.trim()) {
    candidateSet.add(customModel.trim());
  }
  for (const m of discovered) {
    if (m) candidateSet.add(m);
  }
  if (cfg.defaultModel) {
    candidateSet.add(cfg.defaultModel);
  }
  for (const m of cfg.models) {
    if (m) candidateSet.add(m);
  }

  const candidateModels = Array.from(candidateSet).slice(0, 6);
  if (candidateModels.length === 0) {
    candidateModels.push('default');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (trimmedKey) {
    headers['Authorization'] = `Bearer ${trimmedKey}`;
  } else if (provider === 'ollama') {
    headers['Authorization'] = 'Bearer ollama';
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/productivitysys';
    headers['X-Title'] = 'ProductivitySys Loony';
  }

  let lastError = '';
  for (const model of candidateModels) {
    try {
      const isReasoner = model.toLowerCase().includes('reasoner') || model.toLowerCase().includes('r1');
      const reqBody: any = {
        model,
        messages: [{ role: 'user', content: 'Halo' }],
        max_tokens: 15,
      };
      if (!isReasoner) {
        reqBody.temperature = 0.7;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
      });

      if (res.ok) {
        return {
          ok: true,
          provider,
          model,
          message: `Tersambung ke ${cfg.name} (${model})!`,
        };
      }

      const errData = await res.json().catch(() => null);
      lastError = classifyAiError(res.status, errData, provider);

      // Jika kunci API ditolak (401/403) atau saldo habis (402), hentikan loop
      if (res.status === 401 || res.status === 403 || res.status === 402) {
        break;
      }
      // Jika 404 (model tidak ditemukan), lanjut coba model berikutnya di daftar kandidat!
    } catch (err: any) {
      lastError = classifyAiError(undefined, null, provider, err?.message);
    }
  }

  return {
    ok: false,
    provider,
    model: candidateModels[0],
    message: lastError || `Gagal memverifikasi koneksi ${cfg.name}.`,
  };
}

/**
 * Universal Chat Executor:
 * Mengirim pesan ke provider yang aktif dan mengembalikan jawaban teks murni.
 */
export async function executeUniversalAiCall(
  userText: string,
  history: Array<{ sender: 'user' | 'loony'; text: string }>,
  systemInstruction: string,
  settings: AppSettings
): Promise<{ text: string | null; providerUsed: string; modelUsed: string; error?: string }> {
  const provider = settings.aiProvider || 'gemini';
  const cfg = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
  const apiKey = (settings.aiApiKey || settings.geminiApiKey || '').trim();

  // -------------------------------------------------------------
  // JALUR 1: GOOGLE GEMINI (NATIVE REST DENGAN DYNAMIC DISCOVERY)
  // -------------------------------------------------------------
  if (provider === 'gemini') {
    if (!apiKey) {
      return { text: null, providerUsed: 'gemini', modelUsed: 'none', error: 'Kunci API Gemini belum diisi' };
    }

    const discovered = await discoverGeminiModels(apiKey);
    const candidateModels = discovered.length > 0 ? discovered : cfg.models;

    // Normalisasi riwayat percakapan untuk Gemini
    const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];
    for (const msg of history.slice(-8)) {
      const t = (msg.text || '').trim();
      if (!t) continue;
      rawTurns.push({ role: msg.sender === 'user' ? 'user' : 'model', text: t });
    }
    while (rawTurns.length > 0 && rawTurns[0].role === 'model') {
      rawTurns.shift();
    }
    rawTurns.push({ role: 'user', text: userText });

    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
    for (const turn of rawTurns) {
      const last = contents[contents.length - 1];
      if (last && last.role === turn.role) {
        last.parts[0].text += `\n${turn.text}`;
      } else {
        contents.push({ role: turn.role, parts: [{ text: turn.text }] });
      }
    }
    if (contents.length === 0 || contents[0].role !== 'user') {
      contents.unshift({ role: 'user', parts: [{ text: userText }] });
    }

    let lastError = '';
    for (const model of candidateModels.slice(0, 4)) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return { text: rawText, providerUsed: 'gemini', modelUsed: model };
          }
        } else {
          const errData = await res.json().catch(() => null);
          lastError = classifyAiError(res.status, errData, 'gemini');
          if (res.status === 429) {
            break;
          }
        }
      } catch (err: any) {
        lastError = err?.message || 'Koneksi ke Gemini terputus';
      }
    }

    return { text: null, providerUsed: 'gemini', modelUsed: candidateModels[0] || 'gemini', error: lastError };
  }

  // -------------------------------------------------------------
  // JALUR 2: OPENAI-COMPATIBLE PROVIDERS (Groq, OpenRouter, DeepSeek, OpenAI, Ollama, Kustom)
  // -------------------------------------------------------------
  const baseUrl = settings.aiCustomBaseUrl?.trim() || cfg.defaultBaseUrl;
  const endpoint = normalizeChatCompletionsUrl(baseUrl);
  const targetModel = settings.aiModel?.trim() || cfg.defaultModel;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === 'ollama') {
    headers['Authorization'] = 'Bearer ollama';
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/productivitysys';
    headers['X-Title'] = 'ProductivitySys Loony';
  }

  // Format pesan OpenAI chat completions
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
  ];

  for (const msg of history.slice(-8)) {
    const content = (msg.text || '').trim();
    if (!content) continue;
    messages.push({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content,
    });
  }

  messages.push({ role: 'user', content: userText });

  // Rantai model fallback untuk OpenAI-compatible provider
  const candidateSet = new Set<string>();
  if (targetModel?.trim()) candidateSet.add(targetModel.trim());
  if (cfg.defaultModel) candidateSet.add(cfg.defaultModel);
  for (const m of cfg.models) {
    if (m) candidateSet.add(m);
  }

  let candidateModels = Array.from(candidateSet);
  let lastError = '';

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const isReasoner = model.toLowerCase().includes('reasoner') || model.toLowerCase().includes('r1');
      const reqBody: any = {
        model,
        messages,
        max_tokens: 800,
      };
      if (!isReasoner) {
        reqBody.temperature = 0.7;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
      });

      if (res.ok) {
        const data = await res.json();
        const choice = data?.choices?.[0]?.message;
        const content = choice?.content || choice?.reasoning_content;
        if (content) {
          return { text: content, providerUsed: provider, modelUsed: model };
        }
      } else {
        const errData = await res.json().catch(() => null);
        lastError = classifyAiError(res.status, errData, provider);

        // Jika model 404 pada panggilan pertama, coba ambil daftar model aktif secara langsung
        if (res.status === 404 && i === 0 && candidateModels.length <= 4) {
          try {
            const freshModels = await discoverOpenAiCompatibleModels(baseUrl, apiKey, provider);
            for (const fm of freshModels) {
              if (!candidateModels.includes(fm)) {
                candidateModels.push(fm);
              }
            }
          } catch {}
        }

        if (res.status === 401 || res.status === 403 || res.status === 402) {
          break;
        }
      }
    } catch (err: any) {
      lastError = classifyAiError(undefined, null, provider, err?.message);
    }
  }

  return { text: null, providerUsed: provider, modelUsed: candidateModels[0] || targetModel, error: lastError };
}
