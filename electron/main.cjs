const { app, BrowserWindow, ipcMain, screen, clipboard, shell, Tray, Menu, nativeImage, globalShortcut, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { execFile, spawn } = require('child_process');

let mainWindow = null;
let cursorTimer = null;
let mediaTimer = null;
let clipboardTimer = null;
let sensorProc = null;
let bridgeServer = null;
let isPollingMedia = false;
let currentDisplayId = null;
let lastSystemClipboardText = '';
let tray = null;
let globalShortcutEnabled = true;
const SHORTCUT_COMBO = 'Alt+`';
let monitorTargetMode = 'follow-cursor';
let specificMonitorId = null;
let activeBridgeSyncKey = 'LOONY-BRIDGE-SYNC';

function getFormattedDisplays() {
  try {
    const primary = screen.getPrimaryDisplay();
    const all = screen.getAllDisplays();
    return all.map((d, index) => ({
      id: d.id,
      label: `Monitor ${index + 1}${d.id === primary.id ? ' (Utama)' : ''} — ${d.bounds.width}×${d.bounds.height}`,
      isPrimary: d.id === primary.id,
      width: d.bounds.width,
      height: d.bounds.height,
      scaleFactor: d.scaleFactor,
    }));
  } catch {
    return [];
  }
}

function applyGlobalShortcut(enable) {
  globalShortcutEnabled = Boolean(enable);
  try {
    globalShortcut.unregisterAll();
    if (globalShortcutEnabled) {
      globalShortcut.register(SHORTCUT_COMBO, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setIgnoreMouseEvents(false);
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('toggle-full-dashboard');
        }
      });
    }
  } catch (err) {
    writeLog(`applyGlobalShortcut error: ${err}`);
  }
}

const BRIDGE_PORT = 47831;
let sharedMailboxEnvelopes = [];
const LOG_FILE = path.join(__dirname, '../loony-runtime.log');

function writeLog(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`, 'utf8');
  } catch {}
}

function getBridgeDownloadDir() {
  try {
    const downloads = app.getPath('downloads');
    const dir = path.join(downloads, 'LoonyBridge');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    const fallback = path.join(os.homedir(), 'Downloads', 'LoonyBridge');
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    return fallback;
  }
}

function getLocalLanIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {}
  return '127.0.0.1';
}

function sanitizeBridgeFileName(rawName) {
  let clean = path.basename(String(rawName || `file-${Date.now()}`))
    .replace(/[\0\x00-\x1f\x7f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim();

  if (!clean || clean === '.' || clean === '..') {
    clean = `file-${Date.now()}`;
  }

  // Netralisasi nama perangkat terlarang Windows (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const parsed = path.parse(clean);
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(parsed.name)) {
    clean = `_${clean}`;
  }

  return clean;
}

function saveBase64FileToBridgeFolder(fileName, dataUrlOrBase64) {
  try {
    const dir = getBridgeDownloadDir();
    const resolvedDir = path.resolve(dir);
    const safeName = sanitizeBridgeFileName(fileName);
    const targetPath = path.resolve(resolvedDir, safeName);

    // Kunci Mutlak Path Traversal: Cegah berkas keluar dari folder LoonyBridge
    if (!targetPath.startsWith(resolvedDir + path.sep)) {
      writeLog(`[Security Block] Path traversal blocked: ${safeName}`);
      return null;
    }

    const base64Part = dataUrlOrBase64.includes(',')
      ? dataUrlOrBase64.split(',')[1]
      : dataUrlOrBase64;

    // Batas payload: maksimal ~50MB data berkas binary
    if (base64Part.length > 70 * 1024 * 1024) {
      writeLog(`[Security Block] File exceeded size limit: ${safeName}`);
      return null;
    }

    const buf = Buffer.from(base64Part, 'base64');
    fs.writeFileSync(targetPath, buf);
    return targetPath;
  } catch (err) {
    writeLog(`saveBase64FileToBridgeFolder error: ${err && err.message}`);
    return null;
  }
}

function isBridgeAuthorized(req, urlObj) {
  if (!activeBridgeSyncKey) return true;
  const headerKey = (req.headers['x-loony-key'] || req.headers['x-sync-key'] || '').toString().trim().toUpperCase();
  const queryKey = (urlObj.searchParams.get('syncKey') || urlObj.searchParams.get('pair') || urlObj.searchParams.get('token') || '').trim().toUpperCase();
  const provided = headerKey || queryKey;
  return provided === activeBridgeSyncKey;
}

function startLocalBridgeServer() {
  if (bridgeServer) return;
  try {
    const distDir = path.join(__dirname, '../dist');

    bridgeServer = http.createServer((req, res) => {
      // Izinkan CORS terkontrol agar Smartphone & Laptop bisa saling akses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-loony-key, x-sync-key');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const urlObj = new URL(req.url || '/', `http://localhost:${BRIDGE_PORT}`);

      // Endpoint Status / Health-check Cepat (aman, tanpa membocorkan isi data)
      if (urlObj.pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: true,
          name: 'Loony Desktop',
          lanIp: getLocalLanIp(),
          port: BRIDGE_PORT,
          authorized: isBridgeAuthorized(req, urlObj),
        }));
        return;
      }

      // Endpoint Unduh File Langsung dari Laptop (Wajib Lolos Autentikasi Pairing)
      if (urlObj.pathname === '/api/download' && req.method === 'GET') {
        if (!isBridgeAuthorized(req, urlObj)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid pairing key' }));
          return;
        }

        const rawFileName = urlObj.searchParams.get('file') || '';
        const safeName = sanitizeBridgeFileName(rawFileName);
        const dir = getBridgeDownloadDir();
        const resolvedDir = path.resolve(dir);
        const targetPath = path.resolve(resolvedDir, safeName);

        // Kunci Path Traversal pada download
        if (!targetPath.startsWith(resolvedDir + path.sep)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Access denied: Path traversal detected' }));
          return;
        }

        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
          const stat = fs.statSync(targetPath);
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': stat.size,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}"`,
          });
          fs.createReadStream(targetPath).pipe(res);
          return;
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'File tidak ditemukan di LoonyBridge' }));
          return;
        }
      }

      // Endpoint Upload File Langsung (Wajib Lolos Autentikasi Pairing)
      if (urlObj.pathname === '/api/upload' && req.method === 'POST') {
        if (!isBridgeAuthorized(req, urlObj)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid pairing key' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 50 * 1024 * 1024) req.destroy();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const fileName = payload.name || `file-${Date.now()}`;
            const dataUrl = payload.dataUrl || '';
            const savedPath = saveBase64FileToBridgeFolder(fileName, dataUrl);

            const fileEnvelope = {
              id: payload.id || `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'file-push',
              syncKey: payload.syncKey || activeBridgeSyncKey,
              deviceSource: payload.deviceSource || 'Mobile Companion',
              createdAt: new Date().toISOString(),
              file: {
                id: payload.id || `file-${Date.now()}`,
                name: fileName,
                size: payload.size || (dataUrl ? Math.round((dataUrl.length * 3) / 4) : 0),
                type: payload.type || 'application/octet-stream',
                dataUrl: dataUrl,
                localPath: savedPath || undefined,
                createdAt: new Date().toISOString(),
                isPinned: false,
              },
            };

            sharedMailboxEnvelopes.push(fileEnvelope);
            if (sharedMailboxEnvelopes.length > 100) {
              sharedMailboxEnvelopes = sharedMailboxEnvelopes.slice(-80);
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('bridge-envelope', fileEnvelope);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, path: savedPath, name: fileName }));
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Gagal memproses upload file' }));
          }
        });
        return;
      }

      // Endpoint Kotak Pos Jembatan Dua Arah (Laptop <-> HP) — Terproteksi Kunci Pairing
      if (urlObj.pathname === '/api/mailbox') {
        if (!isBridgeAuthorized(req, urlObj)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized: Invalid pairing key' }));
          return;
        }

        if (req.method === 'GET') {
          const syncKey = (urlObj.searchParams.get('syncKey') || activeBridgeSyncKey).trim().toUpperCase();
          const filtered = sharedMailboxEnvelopes.filter((env) => (env.syncKey || '').toUpperCase() === syncKey);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          const slice = filtered.slice(-60);
          res.end(JSON.stringify({ envelopes: slice, items: slice }));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 50 * 1024 * 1024) req.destroy();
          });
          req.on('end', () => {
            try {
              const envelope = JSON.parse(body);
              if (envelope && envelope.id) {
                // Pastikan envelope memiliki syncKey yang sah
                if (envelope.syncKey && envelope.syncKey.toUpperCase() !== activeBridgeSyncKey) {
                  res.writeHead(403, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ ok: false, error: 'Forbidden: Envelope syncKey mismatch' }));
                  return;
                }

                // Simpan otomatis file yang masuk ke folder LoonyBridge jika bertipe file-push
                if (envelope.type === 'file-push' && envelope.file && envelope.file.dataUrl) {
                  const savedPath = saveBase64FileToBridgeFolder(envelope.file.name, envelope.file.dataUrl);
                  if (savedPath) {
                    envelope.file.localPath = savedPath;
                  }
                }

                const exists = sharedMailboxEnvelopes.some((e) => e.id === envelope.id);
                if (!exists) {
                  sharedMailboxEnvelopes.push(envelope);
                  if (sharedMailboxEnvelopes.length > 100) {
                    sharedMailboxEnvelopes = sharedMailboxEnvelopes.slice(-80);
                  }
                  // Jika kiriman berasal dari perangkat lain, langsung beritahu jendela Windows
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('bridge-envelope', envelope);
                  }
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }
      }

      // Layani aplikasi Web / PWA untuk Smartphone dari folder dist/
      let reqPath = urlObj.pathname === '/' ? '/index.html' : urlObj.pathname;
      const filePath = path.join(distDir, decodeURIComponent(reqPath));

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
        };
        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const indexHtml = path.join(distDir, 'index.html');
        if (fs.existsSync(indexHtml)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexHtml).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    });

    bridgeServer.listen(BRIDGE_PORT, '0.0.0.0', () => {});
    bridgeServer.on('error', () => {});
  } catch {
    bridgeServer = null;
  }
}

function runMediaHelper(action = 'status') {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'media-helper.ps1');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', action],
      { windowsHide: true, timeout: 4000, encoding: 'utf8' },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        try {
          const line = stdout.trim().split(/\r?\n/).pop();
          const parsed = JSON.parse(line);
          resolve(parsed);
        } catch {
          resolve(null);
        }
      }
    );
  });
}

function startSystemSensor() {
  if (sensorProc) return;
  try {
    const sensorScript = path.join(__dirname, 'system-sensor.ps1');
    sensorProc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', sensorScript, '-LoonyPid', String(process.pid)],
      { windowsHide: true }
    );

    let buffer = '';
    sensorProc.stdout.setEncoding('utf8');
    sensorProc.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('system-sensor', data);
          }
        } catch {
          // ignore
        }
      }
    });

    sensorProc.on('exit', () => {
      sensorProc = null;
    });
  } catch {
    sensorProc = null;
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  let activeDisplay = primaryDisplay;
  try {
    const initialCursor = screen.getCursorScreenPoint();
    const near = screen.getDisplayNearestPoint(initialCursor);
    if (near && near.workArea && near.workArea.width > 0) {
      activeDisplay = near;
    }
  } catch {}
  currentDisplayId = activeDisplay.id;
  const { x, y, width, height } = activeDisplay.workArea;

  getBridgeDownloadDir();

  try {
    lastSystemClipboardText = (clipboard.readText() || '').trim();
  } catch {
    lastSystemClipboardText = '';
  }

  writeLog(`createWindow: display ${activeDisplay.id}, bounds: ${x},${y} ${width}x${height}`);

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    enableLargerThanScreen: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setSkipTaskbar(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Area luar kapsul tembus klik (click-through)
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Arahkan semua tautan eksternal (target="_blank" / window.open) ke browser default pengguna (Chrome, Edge, dll.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    writeLog('mainWindow: webContents finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    writeLog(`mainWindow did-fail-load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      writeLog(`[Renderer Console L${level}] ${message} (${sourceId}:${line})`);
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    writeLog(`Loading devUrl: ${devUrl}`);
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    writeLog(`Loading file: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.show();

  // Pantau posisi kursor global & kelola monitor kapsul (Ikuti Kursor / Monitor Utama / Monitor Tertentu)
  let lastCursorX = -1;
  let lastCursorY = -1;
  let cursorIdleTicks = 0;

  cursorTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const pt = screen.getCursorScreenPoint();
      let targetDisplay = null;
      if (monitorTargetMode === 'primary') {
        targetDisplay = screen.getPrimaryDisplay();
      } else if (monitorTargetMode === 'specific' && specificMonitorId) {
        const all = screen.getAllDisplays();
        targetDisplay = all.find((d) => d.id === specificMonitorId) || screen.getPrimaryDisplay();
      } else {
        targetDisplay = screen.getDisplayNearestPoint(pt);
      }

      if (targetDisplay && targetDisplay.id !== currentDisplayId) {
        currentDisplayId = targetDisplay.id;
        const wa = targetDisplay.workArea;
        // Izinkan resize sementara dan panggil setBounds 2x agar Windows Multi-DPI scaling
        // pada monitor kedua menerapkan ukuran penuh layar monitor tersebut secara akurat
        mainWindow.setResizable(true);
        mainWindow.setPosition(wa.x, wa.y, false);
        mainWindow.setBounds(
          {
            x: wa.x,
            y: wa.y,
            width: wa.width,
            height: wa.height,
          },
          false
        );
        mainWindow.setResizable(false);
        mainWindow.setSkipTaskbar(true);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }

      const bounds = targetDisplay ? targetDisplay.workArea : { x: 0, y: 0, width, height };
      const relX = pt.x - bounds.x;
      const relY = pt.y - bounds.y;

      const cursorMoved = (pt.x !== lastCursorX || pt.y !== lastCursorY);
      lastCursorX = pt.x;
      lastCursorY = pt.y;

      // Efisiensi Daya Laptop: Kirim IPC seketika saat kursor bergerak (32ms responsif).
      // Saat kursor diam, hemat CPU dengan mengirim heartbeat ~480ms saja.
      if (cursorMoved) {
        cursorIdleTicks = 0;
        mainWindow.webContents.send('global-cursor', {
          x: relX,
          y: relY,
          screenW: bounds.width,
          screenH: bounds.height,
        });
      } else {
        cursorIdleTicks++;
        if (cursorIdleTicks % 15 === 0) {
          mainWindow.webContents.send('global-cursor', {
            x: relX,
            y: relY,
            screenW: bounds.width,
            screenH: bounds.height,
          });
        }
      }
    } catch {
      // ignore
    }
  }, 32);

  // Penjaga Z-Order Topmost: Memastikan Loony tidak tertutup saat aplikasi lain (misal browser) di-maximize
  setInterval(() => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isAlwaysOnTop()) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        mainWindow.moveTop();
      }
    } catch {}
  }, 2500);

  // Pantau status musik / media sistem Windows (Spotify, Browser YouTube, VLC, dll.)
  const pollSystemMedia = async () => {
    if (isPollingMedia || !mainWindow || mainWindow.isDestroyed()) return;
    isPollingMedia = true;
    try {
      const info = await runMediaHelper('status');
      if (info && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-status', info);
      }
    } finally {
      isPollingMedia = false;
    }
  };

  setTimeout(pollSystemMedia, 800);
  mediaTimer = setInterval(pollSystemMedia, 2200);

  // Pantau perubahan Clipboard Windows (Ctrl+C di aplikasi mana pun)
  clipboardTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const current = (clipboard.readText() || '').trim();
      if (current && current !== lastSystemClipboardText) {
        lastSystemClipboardText = current;
        mainWindow.webContents.send('system-clipboard', current);
      }
    } catch {
      // ignore
    }
  }, 900);

  startSystemSensor();
  startLocalBridgeServer();

  ipcMain.on('set-ignore-mouse-events', (_event, ignore) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (ignore) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.handle('clipboard-read', () => clipboard.readText());
  ipcMain.handle('clipboard-write', (_event, text) => {
    const clean = (text || '').trim();
    lastSystemClipboardText = clean;
    clipboard.writeText(text || '');
    return true;
  });

  ipcMain.handle('media-control', async (_event, action) => {
    const info = await runMediaHelper(action || 'status');
    if (info && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-status', info);
    }
    return info;
  });

  ipcMain.handle('save-bridge-file', (_event, payload) => {
    if (!payload || !payload.name || !payload.dataUrl) return null;
    return saveBase64FileToBridgeFolder(payload.name, payload.dataUrl);
  });

  ipcMain.handle('open-bridge-folder', async () => {
    const dir = getBridgeDownloadDir();
    await shell.openPath(dir);
    return dir;
  });

  ipcMain.handle('open-external', async (_event, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('get-bridge-info', () => {
    const ip = getLocalLanIp();
    return {
      lanUrl: `http://${ip}:${BRIDGE_PORT}`,
      bridgeFolder: getBridgeDownloadDir(),
    };
  });

  ipcMain.handle('push-local-mailbox', (_event, envelope) => {
    if (envelope && envelope.id) {
      const exists = sharedMailboxEnvelopes.some((e) => e.id === envelope.id);
      if (!exists) {
        sharedMailboxEnvelopes.push(envelope);
        if (sharedMailboxEnvelopes.length > 100) {
          sharedMailboxEnvelopes = sharedMailboxEnvelopes.slice(-80);
        }
      }
    }
    return true;
  });

  ipcMain.handle('get-autostart-status', () => {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch {
      return false;
    }
  });

    ipcMain.handle('set-autostart-status', (_event, enable) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enable),
        openAsHidden: false,
      });
      updateTrayMenu();
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('set-global-shortcut', (_event, enable) => {
    applyGlobalShortcut(enable);
    return globalShortcutEnabled;
  });

  ipcMain.handle('get-displays-info', () => getFormattedDisplays());

  // Sinkronisasi Kunci Pairing Bridge dari Renderer ke Server Lokal
  ipcMain.on('set-bridge-sync-key', (_event, key) => {
    if (typeof key === 'string' && key.trim()) {
      activeBridgeSyncKey = key.trim().toUpperCase();
      writeLog(`Bridge sync key updated (length: ${activeBridgeSyncKey.length})`);
    }
  });

  // Enkripsi Kunci API / Rahasia Pengguna dengan Windows DPAPI (safeStorage)
  ipcMain.handle('secure-store-encrypt', (_event, plaintext) => {
    try {
      if (!plaintext || typeof plaintext !== 'string') return '';
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const buffer = safeStorage.encryptString(plaintext);
        return `enc:${buffer.toString('base64')}`;
      }
      return plaintext;
    } catch (err) {
      writeLog(`secure-store-encrypt error: ${err && err.message}`);
      return plaintext;
    }
  });

  // Dekripsi Kunci API / Rahasia Pengguna dengan Windows DPAPI (safeStorage)
  ipcMain.handle('secure-store-decrypt', (_event, cipher) => {
    try {
      if (!cipher || typeof cipher !== 'string') return '';
      if (!cipher.startsWith('enc:')) return cipher; // plaintext legacy key
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(cipher.slice(4), 'base64');
        return safeStorage.decryptString(buffer);
      }
      return cipher;
    } catch (err) {
      writeLog(`secure-store-decrypt error: ${err && err.message}`);
      return cipher;
    }
  });

  ipcMain.on('set-monitor-target', (_event, { mode, specificId }) => {
    monitorTargetMode = mode || 'follow-cursor';
    specificMonitorId = specificId || null;
    try {
      let targetDisplay = null;
      if (monitorTargetMode === 'primary') {
        targetDisplay = screen.getPrimaryDisplay();
      } else if (monitorTargetMode === 'specific' && specificMonitorId) {
        const all = screen.getAllDisplays();
        targetDisplay = all.find((d) => d.id === specificMonitorId) || screen.getPrimaryDisplay();
      } else {
        const pt = screen.getCursorScreenPoint();
        targetDisplay = screen.getDisplayNearestPoint(pt);
      }

      if (mainWindow && !mainWindow.isDestroyed() && targetDisplay && targetDisplay.id !== currentDisplayId) {
        currentDisplayId = targetDisplay.id;
        const wa = targetDisplay.workArea;
        mainWindow.setResizable(true);
        mainWindow.setPosition(wa.x, wa.y, false);
        mainWindow.setBounds(
          {
            x: wa.x,
            y: wa.y,
            width: wa.width,
            height: wa.height,
          },
          false
        );
        mainWindow.setResizable(false);
        mainWindow.setSkipTaskbar(true);
      }
    } catch {}
  });

  const notifyDisplaysChanged = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('displays-changed', getFormattedDisplays());
    }
  };
  screen.on('display-added', notifyDisplaysChanged);
  screen.on('display-removed', notifyDisplaysChanged);
  screen.on('display-metrics-changed', notifyDisplaysChanged);
}

function updateTrayMenu() {
  if (!tray) return;
  let isAutoStart = false;
  try {
    isAutoStart = app.getLoginItemSettings().openAtLogin;
  } catch {}

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Loony [■━■] Asisten',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Buka Dashboard Loony',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('trigger-full-dashboard');
        }
      },
    },
    {
      label: 'Buka Folder LoonyBridge',
      click: () => {
        const dir = getBridgeDownloadDir();
        shell.openPath(dir);
      },
    },
    { type: 'separator' },
    {
      label: 'Mulai Otomatis Saat Laptop Nyala',
      type: 'checkbox',
      checked: isAutoStart,
      click: (menuItem) => {
        try {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            openAsHidden: false,
          });
        } catch {}
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Keluar dari Loony',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createSystemTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, '../public/icon.png');
    let trayIcon = null;
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (!trayIcon.isEmpty()) {
        trayIcon = trayIcon.resize({ width: 18, height: 18 });
      }
    }

    tray = new Tray(trayIcon || iconPath);
    tray.setToolTip('Loony - Asisten AI & Produktivitas');

    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setIgnoreMouseEvents(false);
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('trigger-full-dashboard');
      }
    });

    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setIgnoreMouseEvents(false);
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('trigger-full-dashboard');
      }
    });

    updateTrayMenu();
  } catch (err) {
    console.error('Gagal membuat system tray:', err);
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('trigger-full-dashboard');
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createSystemTray();
    applyGlobalShortcut(true);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (cursorTimer) clearInterval(cursorTimer);
  if (mediaTimer) clearInterval(mediaTimer);
  if (clipboardTimer) clearInterval(clipboardTimer);
  if (sensorProc) {
    try {
      sensorProc.kill();
    } catch {}
    sensorProc = null;
  }
  if (bridgeServer) {
    try {
      bridgeServer.close();
    } catch {}
    bridgeServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
