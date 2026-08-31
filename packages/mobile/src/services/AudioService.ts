// ============================================================
// Audio Service - Obsługa audio na mobile (mikrofon + odtwarzanie)
// ============================================================

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

type AudioCallback = (data: string) => void; // base64 PCM

export class AudioService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isRecording = false;
  private onDataCallback: AudioCallback | null = null;
  private volume = 1.0;

  // ---- Inicjalizacja ----

  async initialize(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Audio] Brak uprawnień do mikrofonu');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      return true;
    } catch (err) {
      console.error('[Audio] Błąd inicjalizacji:', err);
      return false;
    }
  }

  // ---- Nagrywanie ----

  /** Rozpocznij nagrywanie z mikrofonu */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // Callback ze statusem nagrywania
          if (status.isRecording) {
            // Można tu dodawać analizę audio w czasie rzeczywistym
          }
        },
        100 // Interwał w ms
      );

      this.recording = recording;
      this.isRecording = true;
      console.log('[Audio] Nagrywanie rozpoczęte');
    } catch (err) {
      console.error('[Audio] Błąd nagrywania:', err);
      throw err;
    }
  }

  /** Zatrzymaj nagrywanie i zwróć URI */
  async stopRecording(): Promise<string | null> {
    if (!this.recording || !this.isRecording) return null;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      this.isRecording = false;
      
      console.log('[Audio] Nagrywanie zatrzymane:', uri);
      return uri;
    } catch (err) {
      console.error('[Audio] Błąd zatrzymywania:', err);
      return null;
    }
  }

  // ---- Odtwarzanie ----

  /** Odtwórz dźwięk z URI */
  async playSound(uri: string): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { volume: this.volume, shouldPlay: true }
      );

      this.sound = sound;
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
        }
      });
    } catch (err) {
      console.error('[Audio] Błąd odtwarzania:', err);
    }
  }

  /** Odtwórz dźwięk z assetu */
  async playAsset(assetModule: any): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        assetModule,
        { volume: this.volume, shouldPlay: true }
      );

      this.sound = sound;
    } catch (err) {
      console.error('[Audio] Błąd odtwarzania assetu:', err);
    }
  }

  // ---- TTS (Text-to-Speech) ----

  /** Mów tekst używając TTS */
  speak(text: string, options?: {
    language?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  }): void {
    Speech.speak(text, {
      language: options?.language || 'pl-PL',
      rate: options?.rate || 1.0,
      pitch: options?.pitch || 1.0,
      volume: options?.volume ?? this.volume,
      onStart: options?.onStart,
      onDone: options?.onDone,
      onError: options?.onError,
    });
  }

  /** Zatrzymaj mowę */
  stopSpeaking(): void {
    Speech.stop();
  }

  // ---- Głośność ----

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    
    if (this.sound) {
      this.sound.setVolumeAsync(this.volume);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  // ---- Cleanup ----

  async cleanup(): Promise<void> {
    if (this.recording && this.isRecording) {
      await this.stopRecording();
    }
    
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    
    Speech.stop();
  }

  // ---- Getters ----

  get recording_active(): boolean {
    return this.isRecording;
  }
}
