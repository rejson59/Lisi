// ============================================================
// Wake Word Service - Nasłuchiwanie frazy "Hej Lisi"
// ============================================================

import Voice from 'react-native-voice';
import { AppState, AppStateStatus } from 'react-native';

type WakeWordCallback = () => void;

export class WakeWordService {
  private isListening = false;
  private wakeWord = 'hej lisi';
  private onWakeWord: WakeWordCallback | null = null;
  private appState: AppStateStatus = 'active';
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.setupVoiceRecognition();
    this.setupAppStateListener();
  }

  // ---- Inicjalizacja ----

  private setupVoiceRecognition(): void {
    Voice.onSpeechResults = (event) => {
      const results = event.value || [];
      
      for (const result of results) {
        const lower = result.toLowerCase().trim();
        
        // Sprawdź czy zawiera frazę wybudzania
        if (lower.includes(this.wakeWord)) {
          console.log('[WakeWord] Wykryto frazę wybudzania!');
          this.onWakeWord?.();
          break;
        }
      }
    };

    Voice.onSpeechError = (event) => {
      console.warn('[WakeWord] Błąd rozpoznawania:', event.error);
      // Automatycznie restartuj po błędzie
      if (this.isListening) {
        this.scheduleRestart(1000);
      }
    };

    Voice.onSpeechEnd = () => {
      // Rozpoznawanie zakończone - restartuj jeśli nadal nasłuchujemy
      if (this.isListening) {
        this.scheduleRestart(500);
      }
    };
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextState) => {
      this.appState = nextState;
      
      if (nextState === 'active' && this.isListening) {
        // Aplikacja wróciła na pierwszy plan - restartuj nasłuchiwanie
        this.restartListening();
      }
    });
  }

  // ---- Publiczne metody ----

  /** Rozpocznij nasłuchiwanie frazy wybudzania */
  async start(wakeWord?: string, callback?: WakeWordCallback): Promise<void> {
    if (wakeWord) this.wakeWord = wakeWord.toLowerCase();
    if (callback) this.onWakeWord = callback;
    
    this.isListening = true;
    await this.startListening();
    
    console.log(`[WakeWord] Nasłuchiwanie rozpoczęte: "${this.wakeWord}"`);
  }

  /** Zatrzymaj nasłuchiwanie */
  async stop(): Promise<void> {
    this.isListening = false;
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (err) {
      console.warn('[WakeWord] Błąd zatrzymywania:', err);
    }
    
    console.log('[WakeWord] Nasłuchiwanie zatrzymane');
  }

  /** Zmień frazę wybudzania */
  setWakeWord(word: string): void {
    this.wakeWord = word.toLowerCase();
    console.log(`[WakeWord] Nowa fraza: "${this.wakeWord}"`);
  }

  /** Ustaw callback */
  onWake(callback: WakeWordCallback): void {
    this.onWakeWord = callback;
  }

  // ---- Getters ----

  get active(): boolean {
    return this.isListening;
  }

  get currentWakeWord(): string {
    return this.wakeWord;
  }

  // ---- Prywatne metody ----

  private async startListening(): Promise<void> {
    try {
      const available = await Voice.isAvailable();
      if (!available) {
        console.warn('[WakeWord] Rozpoznawanie mowy niedostępne');
        return;
      }

      await Voice.start('pl-PL');
    } catch (err) {
      console.error('[WakeWord] Błąd uruchamiania:', err);
      this.scheduleRestart(2000);
    }
  }

  private async restartListening(): Promise<void> {
    try {
      await Voice.stop();
    } catch (err) {
      // Ignoruj błędy
    }
    
    setTimeout(() => {
      if (this.isListening) {
        this.startListening();
      }
    }, 300);
  }

  private scheduleRestart(delay: number): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    
    this.restartTimeout = setTimeout(() => {
      if (this.isListening) {
        this.restartListening();
      }
    }, delay);
  }
}
