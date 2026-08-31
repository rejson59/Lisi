// ============================================================
// Screen Capture - Przechwytywanie i strumieniowanie ekranu
// ============================================================

import { BrowserWindow, desktopCapturer, screen } from 'electron';

export class ScreenCapture {
  private mainWindow: BrowserWindow;
  private isStreaming = false;
  private streamInterval: ReturnType<typeof setInterval> | null = null;
  private fps = 2; // Klatki na sekundę dla strumienia (oszczędność bandwidth)

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /** Przechwyć jedną klatkę ekranu jako base64 JPEG */
  async captureScreen(): Promise<string> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: 1280,
          height: 720,
        },
      });

      if (sources.length === 0) {
        throw new Error('Brak dostępnych źródeł ekranu');
      }

      // Weź pierwszy ekran (główny)
      const mainSource = sources[0];
      const thumbnail = mainSource.thumbnail;
      
      // Konwertuj na JPEG base64
      const jpegBuffer = thumbnail.toJPEG(70);
      return jpegBuffer.toString('base64');
    } catch (err) {
      console.error('[ScreenCapture] Błąd przechwytywania:', err);
      throw err;
    }
  }

  /** Przechwyć konkretne okno */
  async captureWindow(windowName: string): Promise<string> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1280, height: 720 },
      });

      const source = sources.find((s) => 
        s.name.toLowerCase().includes(windowName.toLowerCase())
      );

      if (!source) {
        throw new Error(`Nie znaleziono okna: ${windowName}`);
      }

      const jpegBuffer = source.thumbnail.toJPEG(70);
      return jpegBuffer.toString('base64');
    } catch (err) {
      console.error('[ScreenCapture] Błąd przechwytywania okna:', err);
      throw err;
    }
  }

  /** Rozpocznij strumieniowanie ekranu (wysyła klatki przez IPC) */
  async startStream(): Promise<void> {
    if (this.isStreaming) return;
    
    this.isStreaming = true;
    console.log('[ScreenCapture] Rozpoczynam strumieniowanie');

    const intervalMs = 1000 / this.fps;

    this.streamInterval = setInterval(async () => {
      if (!this.isStreaming) return;

      try {
        const frame = await this.captureScreen();
        
        // Wyślij klatkę do renderera
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('screen:frame', {
            data: frame,
            timestamp: Date.now(),
            width: 1280,
            height: 720,
          });
        }
      } catch (err) {
        console.error('[ScreenCapture] Błąd strumieniowania:', err);
      }
    }, intervalMs);
  }

  /** Zatrzymaj strumieniowanie */
  stopStream(): void {
    this.isStreaming = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    console.log('[ScreenCapture] Strumieniowanie zatrzymane');
  }

  /** Ustaw FPS strumienia */
  setFPS(fps: number): void {
    this.fps = Math.max(1, Math.min(10, fps));
    
    // Restart jeśli strumieniowanie jest aktywne
    if (this.isStreaming) {
      this.stopStream();
      this.startStream();
    }
  }

  /** Sprawdź czy strumieniowanie jest aktywne */
  get streaming(): boolean {
    return this.isStreaming;
  }
}
