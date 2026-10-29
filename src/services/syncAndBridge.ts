import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  BridgeFileItem,
  ClipboardItem,
  DebtItem,
  DeviceSourceType,
  ExpenseItem,
  HabitItem,
  IdeaItem,
  ScheduleItem,
} from '../types';
import { encryptBridgeEnvelope, decryptBridgeEnvelope } from './cryptoBridge';

const TEN_MB = 10 * 1024 * 1024;
const INLINE_FILE_LIMIT = 2.5 * 1024 * 1024; // 2.5 MB inline base64 for instant cloud/local mailbox transit
const OUTBOX_STORAGE_KEY = 'loony_bridge_outbox_v1';
const PROCESSED_IDS_KEY = 'loony_bridge_processed_ids_v1';

export type BridgeEnvelopeType =
  | 'clipboard-push'
  | 'file-push'
  | 'module-sync';

export interface ModuleSyncPayload {
  kind:
    | 'expense'
    | 'expense-delete'
    | 'schedule'
    | 'schedule-delete'
    | 'debt'
    | 'debt-paid'
    | 'debt-delete'
    | 'idea'
    | 'idea-delete'
    | 'idea-pin'
    | 'habit-add'
    | 'habit-toggle'
    | 'habit-delete'
    | 'webrtc-signal';
  signalPayload?: Record<string, unknown>;
  expense?: ExpenseItem;
  expenseId?: string;
  schedule?: ScheduleItem;
  scheduleId?: string;
  debt?: DebtItem;
  debtId?: string;
  idea?: IdeaItem;
  ideaId?: string;
  habit?: HabitItem;
  habitId?: string;
}

export interface BridgeEnvelope {
  id: string;
  type: BridgeEnvelopeType;
  syncKey: string;
  deviceSource: DeviceSourceType;
  createdAt: string;
  clipboard?: ClipboardItem;
  file?: BridgeFileItem;
  moduleSync?: ModuleSyncPayload;
}

function hashSyncTopic(syncKey: string): string {
  const clean = (syncKey || 'LOONY-BRIDGE-SYNC').trim().toUpperCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  return `loony_bridge_${hex}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function getLocalApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (window.electronAPI) return '';
  const savedLan = localStorage.getItem('loony_bridge_lan_url');
  if (savedLan && savedLan.startsWith('http')) {
    return savedLan.replace(/\/+$/, '');
  }
  if (
    window.location &&
    window.location.origin &&
    window.location.origin.startsWith('http') &&
    !window.location.origin.includes('localhost')
  ) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Mengelola Jembatan 2 Arah (Desktop PC ⇄ Mobile Companion):
 * 1. Offline Outbox Queue (antrean lokal saat tidak ada internet, otomatis terkirim begitu online)
 * 2. Cloud Mailbox Otomatis (Zero-Setup via ntfy.sh cached topic stream — menyimpan pesan saat perangkat tujuan mati/shutdown)
 * 3. Local LAN Mailbox (/api/mailbox di port 47831 untuk transfer instan via Wi-Fi/Hotspot)
 * 4. Supabase Realtime + WebRTC P2P (opsional jika kredensial Supabase diisi)
 */
export class SyncAndBridgeManager {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private eventSource: EventSource | null = null;
  private pollTimer: number | null = null;
  private unsubElectronIPC: (() => void) | null = null;

  private syncKey = 'LOONY-BRIDGE-SYNC';
  private deviceName: DeviceSourceType = 'Desktop PC';
  private processedIds: Set<string> = new Set();

  private onRemoteClipboard?: (item: ClipboardItem) => void;
  private onRemoteFile?: (item: BridgeFileItem) => void;
  private onRemoteModuleSync?: (payload: ModuleSyncPayload) => void;
  private onP2PProgress?: (fileId: string, progress: number) => void;
  private onOutboxChange?: (pendingCount: number) => void;

  constructor() {
    try {
      const raw = localStorage.getItem(PROCESSED_IDS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.slice(-300).forEach((id) => this.processedIds.add(String(id)));
        }
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushOutbox();
        this.pullMissedEnvelopes();
      });
    }
  }

  public configure(params: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    syncKey: string;
    deviceName: DeviceSourceType;
    onRemoteClipboard?: (item: ClipboardItem) => void;
    onRemoteFile?: (item: BridgeFileItem) => void;
    onRemoteModuleSync?: (payload: ModuleSyncPayload) => void;
    onP2PProgress?: (fileId: string, progress: number) => void;
    onOutboxChange?: (pendingCount: number) => void;
  }): void {
    this.syncKey = (params.syncKey || 'LOONY-BRIDGE-SYNC').trim();
    this.deviceName = params.deviceName;
    this.onRemoteClipboard = params.onRemoteClipboard;
    this.onRemoteFile = params.onRemoteFile;
    this.onRemoteModuleSync = params.onRemoteModuleSync;
    this.onP2PProgress = params.onP2PProgress;
    this.onOutboxChange = params.onOutboxChange;

    this.notifyOutboxCount();

    // 1. Bersihkan koneksi lama
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollTimer) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.unsubElectronIPC) {
      this.unsubElectronIPC();
      this.unsubElectronIPC = null;
    }

    // 2. Langganan IPC Lokal Electron (jika berjalan di Windows Desktop)
    if (window.electronAPI?.onBridgeEnvelope) {
      this.unsubElectronIPC = window.electronAPI.onBridgeEnvelope((raw) => {
        this.receiveEnvelope(raw as unknown as BridgeEnvelope);
      });
    }

    // 3. Jalankan Cloud Mailbox Zero-Setup (ntfy.sh SSE + Catch-up Poll saat baru menyala)
    this.setupZeroConfigCloudMailbox();

    // 4. Polling berkala (tiap 6 detik) untuk flush antrean outbox & cek mailbox lokal/cloud
    this.pollTimer = window.setInterval(() => {
      this.flushOutbox();
      this.pullLocalServerMailbox();
    }, 6000);

    // Tarik pesan yang tertunda saat perangkat baru dinyalakan
    this.flushOutbox();
    this.pullMissedEnvelopes();
    this.pullLocalServerMailbox();

    // 5. Konfigurasi Supabase (jika ada URL & Anon Key tambahan)
    if (params.supabaseUrl && params.supabaseAnonKey && this.syncKey) {
      try {
        this.supabase = createClient(params.supabaseUrl, params.supabaseAnonKey);
        this.setupSupabaseRealtimeChannel();
      } catch {
        this.supabase = null;
      }
    } else {
      this.supabase = null;
    }
  }

  public isCloudConnected(): boolean {
    return Boolean(this.syncKey && (navigator.onLine || this.supabase));
  }

  public getOutboxCount(): number {
    return this.loadOutbox().length;
  }

  private loadOutbox(): BridgeEnvelope[] {
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveOutbox(queue: BridgeEnvelope[]): void {
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue.slice(-50)));
    } catch {
      // ignore quota error
    }
    this.notifyOutboxCount();
  }

  private notifyOutboxCount(): void {
    if (this.onOutboxChange) {
      this.onOutboxChange(this.getOutboxCount());
    }
  }

  private markProcessed(id: string): void {
    this.processedIds.add(id);
    try {
      const arr = Array.from(this.processedIds).slice(-300);
      localStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }

  private setupZeroConfigCloudMailbox(): void {
    if (!this.syncKey || typeof EventSource === 'undefined') return;
    const topic = hashSyncTopic(this.syncKey);
    try {
      const es = new EventSource(`https://ntfy.sh/${topic}/sse`);
      es.onmessage = async (evt) => {
        try {
          const outer = JSON.parse(evt.data);
          if (outer && outer.attachment && outer.attachment.url) {
            this.handleIncomingAttachment(outer);
            return;
          }
          if (outer && typeof outer.message === 'string') {
            const env = await decryptBridgeEnvelope(outer.message, this.syncKey);
            if (env) {
              this.receiveEnvelope(env);
            }
          }
        } catch {
          // ignore non-JSON
        }
      };
      this.eventSource = es;
    } catch {
      // ignore offline at boot
    }
  }

  /**
   * Menarik pesan yang dikirim saat perangkat ini sedang MATI (shutdown) atau offline
   * dari cache Cloud Mailbox (menyimpan riwayat 12 jam terakhir).
   */
  public async pullMissedEnvelopes(): Promise<void> {
    if (!this.syncKey || !navigator.onLine) return;
    const topic = hashSyncTopic(this.syncKey);
    try {
      const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=12h`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const outer = JSON.parse(line);
          if (outer && outer.attachment && outer.attachment.url) {
            this.handleIncomingAttachment(outer);
            continue;
          }
          if (outer && typeof outer.message === 'string') {
            const env = await decryptBridgeEnvelope(outer.message, this.syncKey);
            if (env) {
              this.receiveEnvelope(env);
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore network error
    }
  }

  private async handleIncomingAttachment(outer: any): Promise<void> {
    if (!outer.attachment || !outer.attachment.url) return;
    const att = outer.attachment;
    const fileId = `file-${outer.id || Date.now()}`;
    if (this.processedIds.has(fileId)) return;
    this.markProcessed(fileId);

    let senderDevice: DeviceSourceType =
      this.deviceName === 'Desktop PC' ? 'Mobile Companion' : 'Desktop PC';

    if (outer.title && outer.title.includes('Desktop PC')) {
      senderDevice = 'Desktop PC';
    } else if (outer.title && outer.title.includes('Mobile Companion')) {
      senderDevice = 'Mobile Companion';
    }

    if (senderDevice === this.deviceName) return;

    try {
      const res = await fetch(att.url);
      if (!res.ok) return;
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        const item: BridgeFileItem = {
          id: fileId,
          name: att.name || 'file-transit',
          size: att.size || blob.size,
          mimeType: att.type || blob.type || 'application/octet-stream',
          mode: 'cloud-small',
          url: att.url,
          dataUrl: dataUrl || undefined,
          pinned: false,
          deviceSource: senderDevice,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          transferProgress: 100,
        };
        if (this.onRemoteFile) {
          this.onRemoteFile(item);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      // ignore network error
    }
  }

  /**
   * Jika dibuka dari browser HP via Wi-Fi/Hotspot lokal (http://<IP-Laptop>:47831),
   * tarik pesan langsung dari server lokal Laptop!
   */
  private async pullLocalServerMailbox(): Promise<void> {
    if (window.electronAPI) return; // Electron sudah dapat via IPC langsung
    try {
      const apiBase = getLocalApiBase();
      const res = await fetch(`${apiBase}/api/mailbox?syncKey=${encodeURIComponent(this.syncKey)}`, {
        cache: 'no-store',
        headers: {
          'x-loony-key': this.syncKey,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: BridgeEnvelope[] = Array.isArray(data?.envelopes)
        ? data.envelopes
        : Array.isArray(data?.items)
        ? data.items
        : [];
      for (const env of list) {
        this.receiveEnvelope(env);
      }
    } catch {
      // ignore when not connected to local LAN server
    }
  }

  private receiveEnvelope(env: BridgeEnvelope): void {
    if (!env || !env.id || !env.type) return;
    if (env.syncKey && env.syncKey !== this.syncKey) return;
    if (this.processedIds.has(env.id)) return;

    this.markProcessed(env.id);

    // Abaikan pantulan dari perangkat yang sama
    if (env.deviceSource === this.deviceName) return;

    if (env.type === 'clipboard-push' && env.clipboard && this.onRemoteClipboard) {
      this.onRemoteClipboard(env.clipboard);
    } else if (env.type === 'file-push' && env.file && this.onRemoteFile) {
      this.onRemoteFile(env.file);
    } else if (env.type === 'module-sync' && env.moduleSync) {
      if (env.moduleSync.kind === 'webrtc-signal' && env.moduleSync.signalPayload) {
        this.handleWebRTCSignal(env.moduleSync.signalPayload);
        return;
      }
      if (this.onRemoteModuleSync) {
        this.onRemoteModuleSync(env.moduleSync);
      }
    }
  }

  /**
   * Mengirim envelope ke:
   * 1. Server Lokal (IPC Electron atau /api/mailbox)
   * 2. Cloud Mailbox (ntfy.sh topic — tahan saat perangkat lawan mati/shutdown)
   * 3. Supabase Realtime (jika aktif)
   * Jika sedang tidak ada internet dan bukan LAN lokal, otomatis disimpan di Outbox Queue!
   */
  private async dispatchEnvelope(env: BridgeEnvelope): Promise<void> {
    this.markProcessed(env.id);

    // Simpan ke mailbox lokal Electron agar HP di LAN yang sama langsung dapat
    if (window.electronAPI?.pushLocalMailbox) {
      window.electronAPI.pushLocalMailbox(env as unknown as Record<string, unknown>).catch(() => {});
    } else {
      // Jika dari HP di LAN lokal, POST ke /api/mailbox
      const apiBase = getLocalApiBase();
      fetch(`${apiBase}/api/mailbox?syncKey=${encodeURIComponent(this.syncKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-loony-key': this.syncKey,
        },
        body: JSON.stringify(env),
      }).catch(() => {});
    }

    // Kirim via Supabase jika ada
    if (this.channel) {
      this.channel
        .send({
          type: 'broadcast',
          event: env.type,
          payload: env,
        })
        .catch(() => {});
    }

    // Kirim ke Cloud Mailbox Zero-Setup (ntfy.sh)
    const sentToCloud = await this.postToCloudMailbox(env);
    if (!sentToCloud) {
      const queue = this.loadOutbox();
      if (!queue.some((q) => q.id === env.id)) {
        queue.push(env);
        this.saveOutbox(queue);
      }
    }
  }

  private async postToCloudMailbox(env: BridgeEnvelope): Promise<boolean> {
    if (!navigator.onLine || !this.syncKey) return false;
    const topic = hashSyncTopic(this.syncKey);
    try {
      let envToSend = env;
      // Untuk file dengan dataUrl besar yang melebihi 2.5KB, kita buat slim envelope untuk metadata di ntfy
      if (env.type === 'file-push' && env.file?.dataUrl && env.file.dataUrl.length > 2500) {
        envToSend = {
          ...env,
          file: {
            ...env.file,
            dataUrl: undefined,
          },
        };
      }

      // Enkripsi E2EE dengan PIN pasangan sebelum dikirim ke ntfy.sh
      const payloadToSend = await encryptBridgeEnvelope(envToSend, this.syncKey);

      const res = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        body: payloadToSend,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async flushOutbox(): Promise<void> {
    if (!navigator.onLine) return;
    const queue = this.loadOutbox();
    if (queue.length === 0) return;

    const remaining: BridgeEnvelope[] = [];
    for (const env of queue) {
      const ok = await this.postToCloudMailbox(env);
      if (!ok) {
        remaining.push(env);
      }
    }
    this.saveOutbox(remaining);
  }

  private setupSupabaseRealtimeChannel(): void {
    if (!this.supabase || !this.syncKey) return;

    this.channel = this.supabase.channel(`productivity_bridge_${this.syncKey}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on('broadcast', { event: 'clipboard-push' }, ({ payload }) => {
        if (payload && payload.type === 'clipboard-push') {
          this.receiveEnvelope(payload as BridgeEnvelope);
        } else if (payload && this.onRemoteClipboard) {
          this.onRemoteClipboard(payload as ClipboardItem);
        }
      })
      .on('broadcast', { event: 'file-push' }, ({ payload }) => {
        if (payload && payload.type === 'file-push') {
          this.receiveEnvelope(payload as BridgeEnvelope);
        } else if (payload && this.onRemoteFile) {
          this.onRemoteFile(payload as BridgeFileItem);
        }
      })
      .on('broadcast', { event: 'module-sync' }, ({ payload }) => {
        if (payload && payload.type === 'module-sync') {
          this.receiveEnvelope(payload as BridgeEnvelope);
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        await this.handleWebRTCSignal(payload);
      })
      .subscribe();
  }

  public async broadcastClipboard(item: ClipboardItem): Promise<void> {
    const env: BridgeEnvelope = {
      id: `env-clip-${item.id}`,
      type: 'clipboard-push',
      syncKey: this.syncKey,
      deviceSource: this.deviceName,
      createdAt: new Date().toISOString(),
      clipboard: item,
    };
    await this.dispatchEnvelope(env);
  }

  public async broadcastModuleSync(moduleSync: ModuleSyncPayload): Promise<void> {
    const env: BridgeEnvelope = {
      id: `env-mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'module-sync',
      syncKey: this.syncKey,
      deviceSource: this.deviceName,
      createdAt: new Date().toISOString(),
      moduleSync,
    };
    await this.dispatchEnvelope(env);
  }

  /**
   * Menentukan jalur pengiriman file otomatis (Laptop ⇄ HP):
   * - Menyertakan dataUrl Base64 untuk file <= 2.5 MB agar langsung tersimpan otomatis ke Downloads\LoonyBridge di Laptop atau langsung ter-download di HP!
   * - < 10 MB: Cloud / Local Mailbox Transit (Auto-delete 24 Jam, bisa di-Pin)
   * - >= 10 MB: WebRTC P2P Langsung antar perangkat (0 byte kuota Cloud)
   */
  public async sendFile(file: File): Promise<BridgeFileItem> {
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Jika file > 15 MB, otomatis alihkan ke jalur WebRTC P2P (0 kuota cloud)
    if (file.size > 15 * 1024 * 1024) {
      const p2pItem: BridgeFileItem = {
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        mode: 'webrtc-p2p',
        url: undefined,
        dataUrl: undefined,
        pinned: false,
        deviceSource: this.deviceName,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        transferProgress: 0,
      };
      await this.initiateWebRTCP2PTransfer(file, p2pItem);
      return p2pItem;
    }

    let dataUrl: string | undefined;
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch {
      dataUrl = undefined;
    }

    let publicUrl = dataUrl || URL.createObjectURL(file);

    // Upload attachment ke ntfy.sh (Maksimal 15 MB) agar perangkat lain bisa langsung download & simpan otomatis
    if (this.syncKey && typeof fetch !== 'undefined') {
      try {
        const topic = hashSyncTopic(this.syncKey);
        const res = await fetch(`https://ntfy.sh/${topic}`, {
          method: 'PUT',
          headers: {
            Filename: file.name,
            Title: `[Loony] ${this.deviceName} mengirim ${file.name}`,
          },
          body: file,
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson?.attachment?.url) {
            publicUrl = resJson.attachment.url;
          }
        }
      } catch (err) {
        console.warn('Gagal upload file attachment ke ntfy:', err);
      }
    }

    if (this.supabase && this.syncKey) {
      try {
        const storagePath = `${this.syncKey}/${id}-${file.name}`;
        const { error } = await this.supabase.storage
          .from('bridge_transit')
          .upload(storagePath, file, { upsert: true });

        if (!error) {
          const { data } = this.supabase.storage
            .from('bridge_transit')
            .getPublicUrl(storagePath);
          if (data?.publicUrl) publicUrl = data.publicUrl;
        }
      } catch {
        // Gunakan publicUrl yang sudah ada
      }
    }

    const item: BridgeFileItem = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      mode: 'cloud-small',
      url: publicUrl,
      dataUrl,
      pinned: false,
      deviceSource: this.deviceName,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      transferProgress: 100,
    };

    const env: BridgeEnvelope = {
      id: `env-file-${item.id}`,
      type: 'file-push',
      syncKey: this.syncKey,
      deviceSource: this.deviceName,
      createdAt: now.toISOString(),
      file: item,
    };
    await this.dispatchEnvelope(env);

    return item;
  }

  private async sendWebRTCSignal(signal: Record<string, unknown>): Promise<void> {
    const env: BridgeEnvelope = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'module-sync',
      syncKey: this.syncKey,
      deviceSource: this.deviceName,
      createdAt: new Date().toISOString(),
      moduleSync: {
        kind: 'webrtc-signal',
        signalPayload: { ...signal, from: this.deviceName },
      },
    };
    await this.dispatchEnvelope(env);
  }

  private async initiateWebRTCP2PTransfer(file: File, meta: BridgeFileItem): Promise<void> {
    if (typeof RTCPeerConnection === 'undefined') return;

    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      this.dataChannel = this.peerConnection.createDataChannel('fileTransit');
      this.dataChannel.binaryType = 'arraybuffer';

      this.peerConnection.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendWebRTCSignal({ type: 'candidate', candidate: e.candidate });
        }
      };

      this.dataChannel.onopen = async () => {
        try {
          const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
          const buffer = await file.arrayBuffer();
          let offset = 0;
          while (offset < buffer.byteLength) {
            if (!this.dataChannel || this.dataChannel.readyState !== 'open') break;
            if (this.dataChannel.bufferedAmount > 1024 * 1024) {
              await new Promise((r) => setTimeout(r, 30));
            }
            const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
            this.dataChannel.send(chunk);
            offset += chunk.byteLength;
            const pct = Math.round((offset / buffer.byteLength) * 100);
            if (this.onP2PProgress) this.onP2PProgress(meta.id, pct);
          }
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({ type: 'eof', meta }));
          }
        } catch (err) {
          console.warn('Gagal streaming chunk WebRTC:', err);
        }
      };

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.sendWebRTCSignal({
        type: 'offer',
        sdp: offer,
        meta,
      });
    } catch (err) {
      console.warn('WebRTC P2P init error:', err);
    }
  }

  private setupIncomingWebRTCReceiver(): void {
    if (typeof RTCPeerConnection === 'undefined' || !this.peerConnection) return;

    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      channel.binaryType = 'arraybuffer';
      const receivedChunks: ArrayBuffer[] = [];

      channel.onmessage = (msgEvent) => {
        if (typeof msgEvent.data === 'string') {
          try {
            const data = JSON.parse(msgEvent.data);
            if (data.type === 'eof' && data.meta) {
              const blob = new Blob(receivedChunks, { type: data.meta.mimeType || 'application/octet-stream' });
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                const receivedItem: BridgeFileItem = {
                  ...data.meta,
                  dataUrl,
                  transferProgress: 100,
                  createdAt: new Date().toISOString(),
                };
                if (this.onRemoteFile) {
                  this.onRemoteFile(receivedItem);
                }
              };
              reader.readAsDataURL(blob);
            }
          } catch {}
          return;
        }
        if (msgEvent.data instanceof ArrayBuffer) {
          receivedChunks.push(msgEvent.data);
        }
      };
    };
  }

  private async handleWebRTCSignal(payload: Record<string, unknown>): Promise<void> {
    if (!payload || payload.from === this.deviceName) return;

    try {
      if (payload.type === 'offer' && payload.sdp) {
        if (!this.peerConnection) {
          this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
        }
        this.setupIncomingWebRTCReceiver();

        this.peerConnection.onicecandidate = (e) => {
          if (e.candidate) {
            this.sendWebRTCSignal({ type: 'candidate', candidate: e.candidate });
          }
        };

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        await this.sendWebRTCSignal({
          type: 'answer',
          sdp: answer,
        });

        if (payload.meta && this.onRemoteFile) {
          const incoming = payload.meta as BridgeFileItem;
          this.onRemoteFile({ ...incoming, transferProgress: 0 });
        }
      } else if (payload.type === 'answer' && payload.sdp && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
      } else if (payload.type === 'candidate' && payload.candidate && this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate as RTCIceCandidateInit));
      }
    } catch (err) {
      console.warn('Gagal memproses sinyal WebRTC:', err);
    }
  }
}

export const syncBridgeManager = new SyncAndBridgeManager();

/**
 * Filter otomatis untuk membersihkan file Cloud (< 10 MB) yang sudah melewati 24 jam
 * kecuali file yang ditandai `pinned: true`.
 */
export function filterActiveBridgeFiles(files: BridgeFileItem[]): BridgeFileItem[] {
  const nowMs = Date.now();
  return files.filter((f) => {
    if (f.pinned) return true;
    const expMs = new Date(f.expiresAt).getTime();
    return expMs > nowMs;
  });
}
