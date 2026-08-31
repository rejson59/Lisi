// ============================================================
// Audio Utilities - Obsługa audio dla Gemini Live API
// ============================================================

/** Konwertuj ArrayBuffer na base64 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Konwertuj base64 na ArrayBuffer */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Konwertuj base64 PCM na Float32Array (16-bit signed) */
export function pcm16ToFloat32(base64: string): Float32Array {
  const buffer = base64ToArrayBuffer(base64);
  const int16 = new Int16Array(buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

/** Konwertuj Float32Array na PCM16 base64 */
export function float32ToPcm16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return arrayBufferToBase64(int16.buffer);
}

/**
 * Resample PCM audio z jednej częstotliwości na drugą
 */
export function resamplePcm(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return input;
  
  const ratio = fromRate / toRate;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    result[i] = input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction;
  }
  
  return result;
}

/**
 * AudioBufferManager - zarządza buforowaniem audio z Gemini
 * Odtwarza otrzymane kawałki audio w kolejności
 */
export class AudioBufferManager {
  private audioContext: AudioContext | null = null;
  private queue: Float32Array[] = [];
  private isPlaying = false;
  private sampleRate: number;
  private onPlayStart?: () => void;
  private onPlayEnd?: () => void;
  private gainNode: GainNode | null = null;
  private _volume = 1.0;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  /** Inicjalizuj AudioContext (wymaga interakcji użytkownika) */
  init(): void {
    if (this.audioContext) return;
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume;
    }
  }

  get volume(): number {
    return this._volume;
  }

  onPlay(handler: () => void): void {
    this.onPlayStart = handler;
  }

  onStop(handler: () => void): void {
    this.onPlayEnd = handler;
  }

  /** Dodaj kawałek audio do kolejki */
  enqueue(base64Audio: string): void {
    const float32 = pcm16ToFloat32(base64Audio);
    this.queue.push(float32);
    
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /** Wyczyść kolejkę i zatrzymaj odtwarzanie */
  clear(): void {
    this.queue = [];
    this.isPlaying = false;
    this.onPlayEnd?.();
  }

  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlayEnd?.();
      return;
    }

    if (!this.audioContext || !this.gainNode) {
      this.init();
    }

    this.isPlaying = true;
    this.onPlayStart?.();

    const chunk = this.queue.shift()!;
    
    try {
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }

      const audioBuffer = this.audioContext!.createBuffer(1, chunk.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(chunk);
      
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);
      
      source.onended = () => {
        this.playNext();
      };
      
      source.start();
    } catch (err) {
      console.error('[Audio] Błąd odtwarzania:', err);
      this.playNext();
    }
  }
}

/**
 * MicrophoneCapture - przechwytuje audio z mikrofonu
 * Wysyła PCM 16-bit do Gemini Live API
 */
export class MicrophoneCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onDataCallback?: (data: ArrayBuffer) => void;
  private isCapturing = false;
  private targetSampleRate = 16000;

  onData(callback: (data: ArrayBuffer) => void): void {
    this.onDataCallback = callback;
  }

  async start(): Promise<void> {
    if (this.isCapturing) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.targetSampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: this.targetSampleRate });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Używamy ScriptProcessorNode (prostsze, kompatybilne)
      // W produkcji lepiej użyć AudioWorklet
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Resample jeśli potrzeba
        const inputSampleRate = this.audioContext!.sampleRate;
        let processedData = inputData;
        
        if (inputSampleRate !== this.targetSampleRate) {
          processedData = resamplePcm(inputData, inputSampleRate, this.targetSampleRate);
        }
        
        // Konwertuj na PCM16
        const pcm16 = new Int16Array(processedData.length);
        for (let i = 0; i < processedData.length; i++) {
          const s = Math.max(-1, Math.min(1, processedData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        this.onDataCallback?.(pcm16.buffer);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isCapturing = true;
      console.log('[Microphone] Przechwytywanie rozpoczęte');
    } catch (err) {
      console.error('[Microphone] Błąd:', err);
      throw err;
    }
  }

  stop(): void {
    this.isCapturing = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('[Microphone] Przechwytywanie zatrzymane');
  }

  get capturing(): boolean {
    return this.isCapturing;
  }
}
