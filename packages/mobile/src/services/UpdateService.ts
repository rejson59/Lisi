// ============================================================
// Update Service - Automatyczne aktualizacje OTA (Mobile)
// ============================================================

import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

export interface UpdateInfo {
  available: boolean;
  manifest?: any;
}

export class UpdateService {
  private isChecking = false;

  /** Sprawdź aktualizacje przy starcie */
  async checkOnStartup(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('[Update] Pomijam sprawdzanie w trybie deweloperskim');
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('[Update] Dostępna aktualizacja OTA');
        
        // Pobierz w tle
        const result = await Updates.fetchUpdateAsync();
        
        if (result.isNew) {
          // Pytaj użytkownika
          Alert.alert(
            '🦊 Aktualizacja Lisi',
            'Nowa wersja została pobrana. Zrestartować aplikację?',
            [
              { text: 'Później', style: 'cancel' },
              {
                text: 'Restart',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      }
    } catch (err) {
      console.error('[Update] Błąd sprawdzania:', err);
    }
  }

  /** Sprawdź aktualizacje ręcznie */
  async checkManually(): Promise<UpdateInfo> {
    if (this.isChecking) return { available: false };
    this.isChecking = true;

    try {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        const result = await Updates.fetchUpdateAsync();
        this.isChecking = false;
        
        return {
          available: result.isNew,
          manifest: update.manifest,
        };
      }
      
      this.isChecking = false;
      return { available: false };
    } catch (err) {
      console.error('[Update] Błąd:', err);
      this.isChecking = false;
      return { available: false };
    }
  }

  /** Wymuś restart z nową wersją */
  async applyUpdate(): Promise<void> {
    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.error('[Update] Błąd restartu:', err);
    }
  }

  /** Pobierz info o bieżącej wersji */
  getCurrentVersion(): string {
    return Updates.runtimeVersion || '1.0.0';
  }

  /** Czy w trybie deweloperskim */
  get isDev(): boolean {
    return __DEV__;
  }
}
