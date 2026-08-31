// ============================================================
// Lisi Desktop - Preload Script
// Bezpieczne API między main a renderer
// ============================================================

import { contextBridge, ipcRenderer } from 'electron';

export interface LisiAPI {
  // Okno
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  
  // Kontrola ekranu
  screen: {
    openURL: (url: string) => Promise<void>;
    click: (x: number, y: number) => Promise<void>;
    doubleClick: (x: number, y: number) => Promise<void>;
    rightClick: (x: number, y: number) => Promise<void>;
    type: (text: string) => Promise<void>;
    pressKey: (key: string) => Promise<void>;
    scroll: (direction: 'up' | 'down', amount: number) => Promise<void>;
    moveMouse: (x: number, y: number) => Promise<void>;
    getSize: () => Promise<{ width: number; height: number }>;
  };
  
  // Przechwytywanie ekranu
  capture: {
    screen: () => Promise<string>;
    window: (name: string) => Promise<string>;
    startShare: () => Promise<void>;
    stopShare: () => Promise<void>;
    getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
    onFrame: (callback: (frame: { data: string; timestamp: number; width: number; height: number }) => void) => () => void;
  };
  
  // Pliki
  file: {
    read: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    write: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
  };
  
  // System
  system: {
    getInfo: () => Promise<{ platform: string; arch: string; hostname: string; username: string }>;
  };
}

contextBridge.exposeInMainWorld('lisi', {
  // Okno
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  
  // Kontrola ekranu
  screen: {
    openURL: (url: string) => ipcRenderer.invoke('screen:openURL', url),
    click: (x: number, y: number) => ipcRenderer.invoke('screen:click', x, y),
    doubleClick: (x: number, y: number) => ipcRenderer.invoke('screen:doubleClick', x, y),
    rightClick: (x: number, y: number) => ipcRenderer.invoke('screen:rightClick', x, y),
    type: (text: string) => ipcRenderer.invoke('screen:type', text),
    pressKey: (key: string) => ipcRenderer.invoke('screen:pressKey', key),
    scroll: (direction: 'up' | 'down', amount: number) => ipcRenderer.invoke('screen:scroll', direction, amount),
    moveMouse: (x: number, y: number) => ipcRenderer.invoke('screen:moveMouse', x, y),
    getSize: () => ipcRenderer.invoke('screen:getSize'),
  },
  
  // Przechwytywanie ekranu
  capture: {
    screen: () => ipcRenderer.invoke('screen:capture'),
    window: (name: string) => ipcRenderer.invoke('screen:captureWindow', name),
    startShare: () => ipcRenderer.invoke('screen:startShare'),
    stopShare: () => ipcRenderer.invoke('screen:stopShare'),
    getSources: () => ipcRenderer.invoke('screen:getSources'),
    onFrame: (callback: (frame: { data: string; timestamp: number; width: number; height: number }) => void) => {
      const handler = (_event: any, frame: any) => callback(frame);
      ipcRenderer.on('screen:frame', handler);
      return () => ipcRenderer.removeListener('screen:frame', handler);
    },
  },
  
  // Pliki
  file: {
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
  },
  
  // System
  system: {
    getInfo: () => ipcRenderer.invoke('system:getInfo'),
  },
} as LisiAPI);
