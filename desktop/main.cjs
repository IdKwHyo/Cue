const { app, BrowserWindow, ipcMain, safeStorage, desktopCapturer, session, systemPreferences, screen, globalShortcut, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createService } = require('../core/service.cjs');
const { createSpeaker } = require('./speaker.cjs');
const speaker = createSpeaker();
app.setName('Cue');
let win, service;
let scanScreen, logPath;
const page = pathToFileURL(path.join(__dirname, '../ui/index.html')).href;
function trusted(event) {
  if (event.sender !== win?.webContents || event.senderFrame?.url !== page) throw new Error('Untrusted request.');
}
function createWindow() {
  win = new BrowserWindow({ width: 700, height: 84, minWidth: 320, minHeight: 84, frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    title: 'Cue', backgroundColor: '#00000000', icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.setContentProtection(true);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  const area = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: area.x + Math.max(0, Math.round((area.width - Math.min(700, area.width)) / 2)), y: area.y + 24, width: Math.min(700, area.width), height: 84 });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.on('closed', () => speaker.stop());
  win.loadURL(page);
}
app.whenReady().then(async () => {
  logPath = path.join(app.getPath('userData'), 'capture.log');
  let logWrites = Promise.resolve();
  const log = data => {
    const line = JSON.stringify({ time: new Date().toISOString(), electron: process.versions.electron, os: require('node:os').release(), executable: process.execPath, ...data });
    console.info('[Cue capture]', line);
    logWrites = logWrites.then(async () => {
      try { if ((await fs.stat(logPath)).size > 1024 * 1024) await fs.rename(logPath, logPath + '.previous'); } catch {}
      await fs.appendFile(logPath, line + '\n', { mode: 0o600 });
    }).catch(error => console.warn('Could not write capture diagnostics:', error.message));
  };
  scanScreen = require('./capture.cjs').createCapture({ capturer: desktopCapturer, screen, windows: () => BrowserWindow.getAllWindows(), permission: () => systemPreferences.getMediaAccessStatus('screen'), log });
  log({ event: 'startup' });

  const configPath = path.join(app.getPath('userData'), 'settings.json');
  const canRemember = safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
  let initial = {};
  try {
    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'));
    initial = { model: saved.model, voiceProvider: saved.voiceProvider, transcriptionModel: saved.transcriptionModel, vocabulary: saved.vocabulary,
      key: saved.encryptedKey && canRemember ? safeStorage.decryptString(Buffer.from(saved.encryptedKey, 'base64')) : '',
      groqKey: saved.encryptedGroqKey && canRemember ? safeStorage.decryptString(Buffer.from(saved.encryptedGroqKey, 'base64')) : '' };
  } catch { /* First run, invalid config or keychain unavailable: ask for a key. */ }
  service = createService({ initial, canRemember, save: async s => {
    const data = JSON.stringify({ model: s.model, voiceProvider: s.voiceProvider, transcriptionModel: s.transcriptionModel, vocabulary: s.vocabulary,
      encryptedKey: s.key && canRemember ? safeStorage.encryptString(s.key).toString('base64') : '',
      encryptedGroqKey: s.groqKey && canRemember ? safeStorage.encryptString(s.groqKey).toString('base64') : '' });
    await fs.writeFile(configPath + '.tmp', data, { mode: 0o600 });
    await fs.rename(configPath + '.tmp', configPath);
  } });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => wc === win?.webContents && permission === 'media');
  session.defaultSession.setPermissionRequestHandler(async (wc, permission, callback, details) => {
    if (wc !== win?.webContents || permission !== 'media' || details.mediaTypes?.some(t => t !== 'audio')) return callback(false);
    callback(process.platform === 'darwin' ? await systemPreferences.askForMediaAccess('microphone') : true);
  });
  ipcMain.handle('assistant', async (event, action, payload) => { trusted(event); return service.call(action, payload); });
  ipcMain.handle('resize-overlay', (event, height) => {
    trusted(event); if (![84, 700, 760].includes(height)) throw new Error('Invalid overlay size.');
    const bounds = win.getBounds(), area = screen.getDisplayMatching(bounds).workArea;
    const h = Math.min(height, area.height);
    win.setBounds({ ...bounds, y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - h)), height: h });
  });
  ipcMain.handle('quit', event => { trusted(event); app.quit(); });
  ipcMain.handle('capture-log', async event => { trusted(event); const error = await shell.openPath(logPath); if (error) throw new Error(error); });
  ipcMain.handle('scan', event => { trusted(event); return scanScreen(); });
  ipcMain.handle('speak', (event, text) => { trusted(event); if (process.platform !== 'darwin') throw new Error('Native voice is supported on macOS.'); return speaker.speak(text); });
  ipcMain.handle('stop-speaking', event => { trusted(event); return speaker.stop(); });
  ipcMain.handle('pin', (event, value) => { trusted(event); win.setAlwaysOnTop(Boolean(value)); return win.isAlwaysOnTop(); });
  ipcMain.handle('sources', async event => {
    trusted(event);
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 480, height: 270 } });
    return sources.filter(s => s.name !== 'Cue').map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
  });
  ipcMain.handle('capture', async (event, id) => {
    trusted(event);
    if (typeof id !== 'string') throw new Error('Choose a screen or window.');
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 2560, height: 1600 } });
    const source = sources.find(s => s.id === id);
    if (!source || source.thumbnail.isEmpty()) throw new Error('Capture unavailable. Check Screen Recording permission in System Settings.');
    return { name: source.name, dataUrl: source.thumbnail.toDataURL() };
  });
  createWindow();
  const shortcutReady = globalShortcut.register('CommandOrControl+Shift+Space', async () => {
    if (!win || win.isDestroyed()) return;
    try { const capture = await scanScreen(); win.show(); win.webContents.send('scan-result', { capture }); }
    catch (error) { win.show(); win.webContents.send('scan-result', { error: error.message }); }
  });
  if (!shortcutReady) console.warn('Cue shortcut unavailable; use the Scan screen button.');
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); speaker.stop(); });
