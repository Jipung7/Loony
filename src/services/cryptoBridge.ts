import type { BridgeEnvelope } from './syncAndBridge';

/**
 * Lightweight Zero-Dependency E2EE Encryption for Loony Bridge
 * Uses standard Web Crypto API (AES-GCM-256) with PBKDF2 key derivation.
 * Provides end-to-end privacy when transiting through public cloud relays.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface EncryptedPayload {
  __loonyEnc: true;
  v: 1;
  iv: string; // base64
  salt: string; // base64
  ct: string; // base64
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const cleanPass = (passphrase || 'LOONY-BRIDGE-SYNC').trim().toUpperCase();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(cleanPass),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 30000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a BridgeEnvelope into a secure JSON string
 */
export async function encryptBridgeEnvelope(
  env: BridgeEnvelope,
  syncKey: string
): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return JSON.stringify(env);
  }

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(syncKey, salt);

    const jsonStr = JSON.stringify(env);
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      textEncoder.encode(jsonStr)
    );

    const payload: EncryptedPayload = {
      __loonyEnc: true,
      v: 1,
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
      ct: arrayBufferToBase64(cipherBuffer),
    };

    return JSON.stringify(payload);
  } catch (err) {
    console.warn('Gagal mengenkripsi payload bridge, menggunakan mode plaintext:', err);
    return JSON.stringify(env);
  }
}

/**
 * Decrypt a received payload string back into a BridgeEnvelope
 */
export async function decryptBridgeEnvelope(
  rawStr: string,
  syncKey: string
): Promise<BridgeEnvelope | null> {
  try {
    const parsed = JSON.parse(rawStr);

    // Jika bukan format terenkripsi (misal dikirim plaintext dari versi lama / LAN), langsung return
    if (!parsed || parsed.__loonyEnc !== true) {
      return parsed as BridgeEnvelope;
    }

    if (typeof crypto === 'undefined' || !crypto.subtle) {
      console.warn('Crypto.subtle tidak tersedia untuk mendekripsi payload.');
      return null;
    }

    const payload = parsed as EncryptedPayload;
    const salt = base64ToArrayBuffer(payload.salt);
    const iv = base64ToArrayBuffer(payload.iv);
    const cipherBytes = base64ToArrayBuffer(payload.ct);

    const key = await deriveAesKey(syncKey, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource
    );

    const decryptedStr = textDecoder.decode(decryptedBuffer);
    return JSON.parse(decryptedStr) as BridgeEnvelope;
  } catch (err) {
    // Jika salah kunci enkripsi atau data rusak
    return null;
  }
}
