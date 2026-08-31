// ============================================================
// Auto Updater - Automatyczne aktualizacje z GitHub Releases
// ============================================================

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, app } from 'electron';
import log from 'electron-log';

// Konfiguracja logów
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export class AppUpdater {
  private mainWindow: BrowserWindow | null = null;
  private updateAvailable = false;
  private updateDownloaded = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupEvents();
  }

  private setupEvents(): void {
    // Sprawdź aktualizacje po starcie
    autoUpdater.on('checking-for-update', () => {
      log.info('[Updater] Sprawdzam aktualizacje...');
      this.sendStatus('checking');
    });

    // Znaleziono aktualizację
    autoUpdater.on('update-available', (info) => {
      log.info('[Updater] Dostępna aktualizacja:', info.version);
      this.updateAvailable = true;
      this.sendStatus('available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });

      // Pytaj użytkownika czy chce pobrać
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: '🦊 Aktualizacja Lisi',
        message: `Dostępna nowa wersja: ${info.version}`,
        detail: 'Czy chcesz pobrać aktualizację?',
        buttons: ['Pobierz', 'Później'],
        defaultId: 0,
        cancelId: 1,
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
          this.sendStatus('downloading');
        }
      });
    });

    // Brak aktualizacji
    autoUpdater.on('update-not-available', (info) => {
      log.info('[Updater] Brak aktualizacji');
      this.sendStatus('not-available');
    });

    // Postęp pobierania
    autoUpdater.on('download-progress', (progress) => {
      this.sendStatus('downloading', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
      });
    });

    // Pobrano aktualizację
    autoUpdater.on('update-downloaded', (info) => {
      log.info('[Updater] Aktualizacja pobrana:', info.version);
      this.updateDownloaded = true;
      this.sendStatus('downloaded', { version: info.version });

      // Pytaj czy zainstalować teraz
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: '🦊 Aktualizacja gotowa',
        message: `Wersja ${info.version} pobrana`,
        detail: 'Zainstalować teraz? Lisi zostanie zamknięta i uruchomiona ponownie.',
        buttons: ['Zainstaluj teraz', 'Przy następnym uruchomieniu'],
        defaultId: 0,
        cancelId: 1,
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    // Błąd
    autoUpdater.on('error', (err) => {
      log.error('[Updater] Błąd:', err);
      this.sendStatus('error', { message: err.message });
    });
  }

  /** Sprawdź aktualizacje ręcznie */
  checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[Updater] Błąd sprawdzania:', err);
    });
  }

  /** Wymuś instalację pobranej aktualizacji */
  installUpdate(): void {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall();
    }
  }

  /** Wyślij status do renderera */
  private sendStatus(status: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:status', { status, ...data });
    }
  }

  /** Pobierz aktualizację */
  downloadUpdate(): void {
    autoUpdater.downloadUpdate();
  }

  get hasUpdate(): boolean {
    return this.updateAvailable;
  }

  get isDownloaded(): boolean {
    return this.updateDownloaded;
  }
}
