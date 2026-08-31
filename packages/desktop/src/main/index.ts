// ============================================================
// Lisi Desktop - Electron Main Process
// ============================================================

import { app, BrowserWindow, ipcMain, screen, desktopCapturer, shell, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { ScreenController } from './screen-control';
import { ScreenCapture } from './screen-capture';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let screenController: ScreenController;
let screenCapture: ScreenCapture;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(800, height),
    minWidth: 800,
    minHeight: 600,
    frame: false,           // Bezramkowe okno
    transparent: true,      // Przezroczyste tło
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,   // Potrzebne dla ładowania modelu VRM
    },
  });

  // Załaduj aplikację
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Inicjalizuj moduły
  screenController = new ScreenController();
  screenCapture = new ScreenCapture(mainWindow);
}

function createTray(): void {
  // Stwórz ikonę tray (mała ikonka lisa)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Pokaż Lisi', click: () => mainWindow?.show() },
    { label: 'Ukryj Lisi', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Zamknij', click: () => app.quit() },
  ]);
  
  tray.setToolTip('Lisi - Twoja lisia asystentka');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ---- App Lifecycle ----
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerIPC();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ---- IPC Handlers ----
function registerIPC(): void {
  // Okno
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.hide());
  
  // Ekran - kontrola
  ipcMain.handle('screen:openURL', async (_event, url: string) => {
    await shell.openExternal(url);
  });
  
  ipcMain.handle('screen:click', async (_event, x: number, y: number) => {
    await screenController.click(x, y);
  });
  
  ipcMain.handle('screen:doubleClick', async (_event, x: number, y: number) => {
    await screenController.doubleClick(x, y);
  });
  
  ipcMain.handle('screen:rightClick', async (_event, x: number, y: number) => {
    await screenController.rightClick(x, y);
  });
  
  ipcMain.handle('screen:type', async (_event, text: string) => {
    await screenController.type(text);
  });
  
  ipcMain.handle('screen:pressKey', async (_event, key: string) => {
    await screenController.pressKey(key);
  });
  
  ipcMain.handle('screen:scroll', async (_event, direction: 'up' | 'down', amount: number) => {
    await screenController.scroll(direction, amount);
  });
  
  ipcMain.handle('screen:moveMouse', async (_event, x: number, y: number) => {
    await screenController.moveMouse(x, y);
  });
  
  ipcMain.handle('screen:getSize', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  });
  
  // Ekran - przechwytywanie
  ipcMain.handle('screen:capture', async () => {
    return await screenCapture.captureScreen();
  });
  
  ipcMain.handle('screen:startShare', async () => {
    return await screenCapture.startStream();
  });
  
  ipcMain.handle('screen:stopShare', async () => {
    screenCapture.stopStream();
  });
  
  ipcMain.handle('screen:getSources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  });
  
  // Pliki
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const fs = require('fs').promises;
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
  
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    const fs = require('fs').promises;
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
  
  // System info
  ipcMain.handle('system:getInfo', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      hostname: require('os').hostname(),
      username: require('os').userInfo().username,
    };
  });
}
