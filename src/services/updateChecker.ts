/**
 * Loony Gen 2 — Update Checker Service (GitHub Releases)
 * Memeriksa pembaruan rilis resmi Loony dari repositori GitHub: Jipung7/Loony
 */

export const CURRENT_APP_VERSION = '1.0.0';
export const GITHUB_REPO = 'Jipung7/Loony';
export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases`;

const STORAGE_KEY = 'loony_update_info';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 jam cache otomatis

export interface UpdateInfo {
  status: 'up-to-date' | 'update-available' | 'no-release' | 'offline' | 'error';
  currentVersion: string;
  latestVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseUrl?: string;
  publishedAt?: string;
  checkedAt: number;
  errorMessage?: string;
}

/**
 * Membandingkan dua string SemVer (Semantic Versioning), misal: '2.1.0' vs '2.0.0'
 * Returns:
 *   1 jika v1 > v2 (lebih baru)
 *  -1 jika v1 < v2 (lebih lama)
 *   0 jika v1 === v2 (sama)
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Mengambil cache hasil pemeriksaan terakhir dari localStorage
 */
export function getCachedUpdateInfo(): UpdateInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UpdateInfo;
  } catch {
    return null;
  }
}

/**
 * Menyimpan hasil pemeriksaan ke localStorage
 */
function saveUpdateCache(info: UpdateInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Memeriksa pembaruan rilis ke GitHub API.
 * @param forceManual Jika true, abaikan cache dan fetch langsung ke GitHub.
 */
export async function checkForUpdates(forceManual = false): Promise<UpdateInfo> {
  const now = Date.now();
  const cached = getCachedUpdateInfo();

  if (!forceManual && cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return cached;
  }

  // Jika komputer sedang offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineInfo: UpdateInfo = {
      status: 'offline',
      currentVersion: CURRENT_APP_VERSION,
      checkedAt: now,
      errorMessage: 'Perangkat sedang offline / tidak ada koneksi internet.',
    };
    saveUpdateCache(offlineInfo);
    return offlineInfo;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout

    const res = await fetch(GITHUB_LATEST_RELEASE_API, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // Repositori publik belum memiliki release yang diterbitkan
    if (res.status === 404) {
      const noReleaseInfo: UpdateInfo = {
        status: 'no-release',
        currentVersion: CURRENT_APP_VERSION,
        releaseUrl: GITHUB_RELEASES_PAGE,
        checkedAt: now,
      };
      saveUpdateCache(noReleaseInfo);
      return noReleaseInfo;
    }

    if (!res.ok) {
      const errInfo: UpdateInfo = {
        status: 'error',
        currentVersion: CURRENT_APP_VERSION,
        checkedAt: now,
        errorMessage: `HTTP ${res.status}: Gagal menghubungi GitHub API`,
      };
      saveUpdateCache(errInfo);
      return errInfo;
    }

    const data = await res.json();
    const tagName = (data.tag_name || '').trim();
    const cleanTag = tagName.replace(/^v/i, '');
    const releaseUrl = data.html_url || GITHUB_RELEASES_PAGE;
    const releaseName = data.name || tagName;
    const releaseNotes = data.body || '';
    const publishedAt = data.published_at || '';

    const hasNewer = compareSemver(cleanTag, CURRENT_APP_VERSION) > 0;

    const resultInfo: UpdateInfo = {
      status: hasNewer ? 'update-available' : 'up-to-date',
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: tagName,
      releaseName,
      releaseNotes,
      releaseUrl,
      publishedAt,
      checkedAt: now,
    };

    saveUpdateCache(resultInfo);
    return resultInfo;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAbort = msg.includes('abort') || msg.includes('timeout');
    const errInfo: UpdateInfo = {
      status: 'error',
      currentVersion: CURRENT_APP_VERSION,
      checkedAt: now,
      errorMessage: isAbort ? 'Koneksi ke GitHub timeout' : msg,
    };
    saveUpdateCache(errInfo);
    return errInfo;
  }
}
