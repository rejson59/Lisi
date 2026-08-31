// ============================================================
// Settings Manager - Zarządzanie ustawieniami z synchronizacją
// ============================================================

import type { LisiSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import * as db from '../supabase/client';

type SettingsChangeHandler = (settings: LisiSettings) => void;

export class SettingsManager {
  private userId: string;
  private settings: LisiSettings;
  private changeHandlers: SettingsChangeHandler[] = [];
  private subscription: any = null;

  constructor(userId: string) {
    this.userId = userId;
    this.settings = {
      ...DEFAULT_SETTINGS,
      user_id: userId,
      gemini_api_key: '',
    } as LisiSettings;
  }

  /** Załaduj ustawienia z Supabase */
  async load(): Promise<LisiSettings> {
    try {
      const saved = await db.getSettings(this.userId);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...saved } as LisiSettings;
      } else {
        // Pierwszy raz - zapisz domyślne
        await this.save(this.settings);
      }
    } catch (err) {
      console.error('[Settings] Błąd ładowania:', err);
    }
    
    return this.settings;
  }

  /** Zapisz ustawienia do Supabase */
  async save(updates: Partial<LisiSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    
    try {
      await db.upsertSettings({
        ...this.settings,
        user_id: this.userId,
        updated_at: new Date().toISOString(),
      });
      this.notifyHandlers();
    } catch (err) {
      console.error('[Settings] Błąd zapisywania:', err);
    }
  }

  /** Pobierz bieżące ustawienia */
  get(): LisiSettings {
    return { ...this.settings };
  }

  /** Pobierz pojedynczą wartość */
  getValue<K extends keyof LisiSettings>(key: K): LisiSettings[K] {
    return this.settings[key];
  }

  /** Aktualizuj pojedynczą wartość */
  async setValue<K extends keyof LisiSettings>(key: K, value: LisiSettings[K]): Promise<void> {
    await this.save({ [key]: value });
  }

  /** Nasłuchuj zmian */
  onChange(handler: SettingsChangeHandler): () => void {
    this.changeHandlers.push(handler);
    return () => {
      this.changeHandlers = this.changeHandlers.filter((h) => h !== handler);
    };
  }

  /** Subskrybuj zmiany w czasie rzeczywistym z Supabase */
  startSync(): void {
    if (this.subscription) return;

    this.subscription = db.subscribeToSettings(this.userId, (newSettings) => {
      console.log('[Settings] Otrzymano aktualizację z innego urządzenia');
      this.settings = { ...DEFAULT_SETTINGS, ...newSettings } as LisiSettings;
      this.notifyHandlers();
    });
  }

  /** Zatrzymaj synchronizację */
  stopSync(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  /** Powiadom o zmianach */
  private notifyHandlers(): void {
    for (const handler of this.changeHandlers) {
      try {
        handler(this.get());
      } catch (err) {
        console.error('[Settings] Błąd w handlerze:', err);
      }
    }
  }

  /** Eksportuj ustawienia jako JSON */
  export(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /** Importuj ustawienia z JSON */
  async import(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json);
      await this.save(imported);
    } catch (err) {
      console.error('[Settings] Błąd importu:', err);
      throw new Error('Nieprawidłowy format ustawień');
    }
  }
}
