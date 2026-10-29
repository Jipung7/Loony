const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  readClipboard: () => ipcRenderer.invoke('clipboard-read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  controlMedia: (action) => ipcRenderer.invoke('media-control', action),
  saveBridgeFile: (payload) => ipcRenderer.invoke('save-bridge-file', payload),
  openBridgeFolder: (filePath) => ipcRenderer.invoke('open-bridge-folder', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getBridgeInfo: () => ipcRenderer.invoke('get-bridge-info'),
  pushLocalMailbox: (envelope) => ipcRenderer.invoke('push-local-mailbox', envelope),
  onBridgeEnvelope: (callback) => {
    const handler = (_event, envelope) => callback(envelope);
    ipcRenderer.on('bridge-envelope', handler);
    return () => ipcRenderer.removeListener('bridge-envelope', handler);
  },
  onGlobalCursor: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('global-cursor', handler);
    return () => ipcRenderer.removeListener('global-cursor', handler);
  },
  onMediaStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('media-status', handler);
    return () => ipcRenderer.removeListener('media-status', handler);
  },
  onSystemSensor: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('system-sensor', handler);
    return () => ipcRenderer.removeListener('system-sensor', handler);
  },
  getAutoStart: () => ipcRenderer.invoke('get-autostart-status'),
  setAutoStart: (enable) => ipcRenderer.invoke('set-autostart-status', enable),
  onTriggerFullDashboard: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-full-dashboard', handler);
    return () => ipcRenderer.removeListener('trigger-full-dashboard', handler);
  },
  onToggleFullDashboard: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-full-dashboard', handler);
    return () => ipcRenderer.removeListener('toggle-full-dashboard', handler);
  },
  setGlobalShortcut: (enable) => ipcRenderer.invoke('set-global-shortcut', enable),
  onSystemClipboard: (callback) => {
    const handler = (_event, text) => callback(text);
    ipcRenderer.on('system-clipboard', handler);
    return () => ipcRenderer.removeListener('system-clipboard', handler);
  },
  getDisplaysInfo: () => ipcRenderer.invoke('get-displays-info'),
  setMonitorTarget: (mode, specificId) => ipcRenderer.send('set-monitor-target', { mode, specificId }),
  onDisplaysChanged: (callback) => {
    const handler = (_event, displays) => callback(displays);
    ipcRenderer.on('displays-changed', handler);
    return () => ipcRenderer.removeListener('displays-changed', handler);
  },
  setBridgeSyncKey: (key) => ipcRenderer.send('set-bridge-sync-key', key),
  secureEncrypt: (text) => ipcRenderer.invoke('secure-store-encrypt', text),
  secureDecrypt: (cipher) => ipcRenderer.invoke('secure-store-decrypt', cipher),
});
