/**
 * Salin teks ke papan klip secara universal.
 * Mendukung:
 * 1. Electron Desktop (window.electronAPI.writeClipboard)
 * 2. Browser Modern Secure Context / HTTPS (navigator.clipboard.writeText)
 * 3. Browser Mobile over Local HTTP (http://192.168.x.x) via document.execCommand('copy') fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Electron Desktop Environment
  if (window.electronAPI?.writeClipboard) {
    try {
      await window.electronAPI.writeClipboard(text);
      return true;
    } catch {
      // Fallback ke browser API
    }
  }

  // 2. Modern Async Clipboard API (Khusus HTTPS / Localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback ke execCommand di bawah
    }
  }

  // 3. Robust Mobile HTTP Fallback (document.execCommand)
  // Berjalan di 100% browser mobile bahkan di jaringan HTTP biasa (192.168.x.x)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (successful) return true;
  } catch (err) {
    console.error('Universal copy error:', err);
  }

  return false;
}
