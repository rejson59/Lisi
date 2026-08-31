// ============================================================
// Alarm Service - Obsługa budzików z funkcją wybudzania Lisi
// ============================================================

import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { Alarm } from '../../../shared/src/types';

// Konfiguracja notyfikacji
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface AlarmCallbacks {
  onAlarmTriggered: (alarm: Alarm) => void;
  onWakeUpConfirmed: () => void;
  onVolumeIncrease: (volume: number) => void;
}

export class AlarmService {
  private activeAlarm: Alarm | null = null;
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private currentVolume = 0.3; // Start cicho
  private volumeIncreaseInterval: ReturnType<typeof setInterval> | null = null;
  private wakeUpAttempts = 0;
  private maxWakeUpAttempts = 20;
  private callbacks: Partial<AlarmCallbacks> = {};
  private scheduledNotifications: string[] = [];

  constructor() {
    this.setupNotifications();
  }

  // ---- Inicjalizacja ----
  
  private async setupNotifications(): Promise<void> {
    // Poproś o uprawnienia
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Alarm] Brak uprawnień do notyfikacji');
    }

    // Obsługa otrzymanych notyfikacji
    Notifications.addNotificationReceivedListener((notification) => {
      const alarmId = notification.request.content.data?.alarmId as string;
      if (alarmId) {
        console.log('[Alarm] Otrzymano notyfikację:', alarmId);
        // Alarm zostanie obsłużony przez onAlarmTriggered
      }
    });

    // Obsługa kliknięcia w notyfikację
    Notifications.addNotificationResponseReceivedListener((response) => {
      const alarmId = response.notification.request.content.data?.alarmId as string;
      if (alarmId) {
        console.log('[Alarm] Kliknięto notyfikację:', alarmId);
      }
    });
  }

  // ---- Callbacks ----

  on<K extends keyof AlarmCallbacks>(event: K, callback: AlarmCallbacks[K]): void {
    this.callbacks[event] = callback;
  }

  // ---- Zarządzanie budzikami ----

  /** Zaplanuj budzik */
  async scheduleAlarm(alarm: Alarm): Promise<string> {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    
    // Oblicz czas następnego alarmu
    const now = new Date();
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);
    
    // Jeśli czas minął, ustaw na jutro
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    // Sprawdź dni tygodnia
    if (alarm.days.length > 0) {
      while (!alarm.days.includes(alarmTime.getDay())) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }
    }

    const secondsUntilAlarm = Math.floor((alarmTime.getTime() - now.getTime()) / 1000);

    // Zaplanuj notyfikację
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🦊 Lisi - Budzik!',
        body: alarm.label || `Pora wstawać! ${alarm.time}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        data: { alarmId: alarm.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilAlarm,
      },
    });

    this.scheduledNotifications.push(notificationId);
    console.log(`[Alarm] Zaplanowano budzik: ${alarm.time} za ${secondsUntilAlarm}s`);
    
    return notificationId;
  }

  /** Anuluj budzik */
  async cancelAlarm(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    this.scheduledNotifications = this.scheduledNotifications.filter((id) => id !== notificationId);
  }

  /** Anuluj wszystkie budziki */
  async cancelAllAlarms(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.scheduledNotifications = [];
  }

  // ---- Wybudzanie ----

  /** Rozpocznij proces wybudzania */
  async startWakeUp(alarm: Alarm): Promise<void> {
    this.activeAlarm = alarm;
    this.isPlaying = true;
    this.currentVolume = 0.3; // Zaczynamy cicho
    this.wakeUpAttempts = 0;

    console.log('[Alarm] Rozpoczynam wybudzanie');
    this.callbacks.onAlarmTriggered?.(alarm);

    // Inicjalizuj audio
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });

    // Rozpocznij odtwarzanie dźwięku
    await this.playAlarmSound();

    // Rozpocznij zwiększanie głośności
    this.startVolumeIncrease();

    // Rozpocznij mówienie do użytkownika
    this.startWakeUpSpeech();
  }

  /** Zatrzymaj wybudzanie (użytkownik odpowiedział) */
  async stopWakeUp(): Promise<void> {
    this.isPlaying = false;
    this.activeAlarm = null;

    // Zatrzymaj dźwięk
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }

    // Zatrzymaj zwiększanie głośności
    if (this.volumeIncreaseInterval) {
      clearInterval(this.volumeIncreaseInterval);
      this.volumeIncreaseInterval = null;
    }

    // Zatrzymaj mowę
    Speech.stop();

    this.callbacks.onWakeUpConfirmed?.();
    console.log('[Alarm] Wybudzanie zatrzymane');
  }

  /** Potwierdź że użytkownik wstał */
  confirmWakeUp(): void {
    this.stopWakeUp();
  }

  // ---- Prywatne metody ----

  private async playAlarmSound(): Promise<void> {
    try {
      // Użyj domyślnego dźwięku alarmu
      // W produkcji załaduj z assets/sounds/alarm.mp3
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/alarm.mp3'),
        {
          isLooping: true,
          volume: this.currentVolume,
          shouldPlay: true,
        }
      );
      
      this.sound = sound;
    } catch (err) {
      console.error('[Alarm] Błąd odtwarzania dźwięku:', err);
      
      // Fallback: użyj TTS jako alarmu
      this.playTTSEmergency();
    }
  }

  private playTTSEmergency(): void {
    if (!this.isPlaying) return;
    
    Speech.speak('Pora wstawać! Hej, obudź się!', {
      language: 'pl-PL',
      rate: 0.8,
      pitch: 1.2,
      volume: this.currentVolume,
      onDone: () => {
        if (this.isPlaying) {
          setTimeout(() => this.playTTSEmergency(), 3000);
        }
      },
    });
  }

  private startVolumeIncrease(): void {
    // Zwiększaj głośność co 15 sekund jeśli nie odpowiedział
    this.volumeIncreaseInterval = setInterval(() => {
      if (!this.isPlaying) return;

      this.wakeUpAttempts++;
      
      // Zwiększ głośność stopniowo
      if (this.wakeUpAttempts > 3) {
        this.currentVolume = Math.min(1.0, this.currentVolume + 0.1);
        console.log(`[Alarm] Głośność: ${(this.currentVolume * 100).toFixed(0)}%`);
        
        this.callbacks.onVolumeIncrease?.(this.currentVolume);
        
        // Aktualizuj głośność dźwięku
        if (this.sound) {
          this.sound.setVolumeAsync(this.currentVolume);
        }
      }

      // Max próby
      if (this.wakeUpAttempts >= this.maxWakeUpAttempts) {
        console.log('[Alarm] Osiągnięto max prób wybudzania');
        // Nie zatrzymuj - kontynuuj z max głośnością
      }
    }, 15000); // Co 15 sekund
  }

  private startWakeUpSpeech(): void {
    if (!this.isPlaying) return;

    const messages = [
      'Hej! Pora wstawać~',
      'Obudź się! Jest już rano!',
      'Hej Kochanie, czas wstawać!',
      'Lisi Cię budzi! Wstawaj~',
      'Proszę, obudź się!',
      'Już późno! Musisz wstać!',
      'Hej hej! Słońce już wstało!',
      'Nie śpij już! Lisi czeka~',
    ];

    const message = messages[this.wakeUpAttempts % messages.length];
    
    Speech.speak(message, {
      language: 'pl-PL',
      rate: 0.9,
      pitch: 1.1,
      volume: this.currentVolume,
      onDone: () => {
        if (this.isPlaying) {
          // Czekaj dłużej między wiadomośmi im więcej prób
          const delay = Math.min(10000, 3000 + this.wakeUpAttempts * 1000);
          setTimeout(() => this.startWakeUpSpeech(), delay);
        }
      },
    });
  }

  // ---- Getters ----

  get isActive(): boolean {
    return this.isPlaying;
  }

  get volume(): number {
    return this.currentVolume;
  }

  get attempts(): number {
    return this.wakeUpAttempts;
  }
}
