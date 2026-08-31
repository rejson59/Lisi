// ============================================================
// Lip Sync Engine - Analiza audio w czasie rzeczywistym
// Mapuje dźwięk na kształty ust (visemes)
// ============================================================

/**
 * Visemes - kształty ust odpowiadające dźwiękom
 * Standard VRM: aa, ih, ou, ee, oh
 * 
 *  aa = otwarte (A, Ą)
 *  ih = szerokie (I, Y, E, Ę)
 *  ou = okrągłe (O, U, Ó)
 *  ee = uśmiech (śmiech, C, S, Z)
 *  oh = zaskoczenie (Ó, dziwienie)
 */
export interface VisemeWeights {
  aa: number;  // あ - otwarte usta
  ih: number;  // い - szerokie
  ou: number;  // う - okrągłe
  ee: number;  // え - uśmiech/ściągnięte
  oh: number;  // お - lekko otwarte
}

export interface LipSyncFrame {
  visemes: VisemeWeights;
  volume: number;       // 0-1, ogólna głośność
  pitch: number;        // 0-1, wysokość dźwięku
  isVoiced: boolean;    // czy jest dźwięk
}

export class LipSyncEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private sourceNode: MediaStreamAudioSourceNode | AudioBufferSourceNode | null = null;
  
  // Smoothing
  private prevVolume = 0;
  private prevVisemes: VisemeWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  private smoothingFactor = 0.3;  // 0 = brak wygładzania, 1 = pełne wygładzanie
  
  // Thresholds
  private silenceThreshold = 0.02;   // poniżej tego = cisza
  private volumeBoost = 2.5;         // wzmocnienie głośności
  
  private isActive = false;

  /** Inicjalizuj z AudioContext (dzielenie z AudioBufferManager) */
  init(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.frequencyData = new Uint8Array(bufferLength);
    
    this.isActive = true;
  }

  /** Podłącz źródło audio do analizy (np. output z Gemini) */
  connectSource(source: AudioNode): void {
    if (!this.analyser) return;
    source.connect(this.analyser);
  }

  /** Podłącz mikrofon do analizy */
  async connectMicrophone(): Promise<void> {
    if (!this.audioContext || !this.analyser) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);
    } catch (err) {
      console.error('[LipSync] Błąd mikrofonu:', err);
    }
  }

  /** Odłącz mikrofon */
  disconnectMicrophone(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  /** Pobierz aktualną klatkę lip sync */
  getFrame(): LipSyncFrame {
    if (!this.analyser || !this.dataArray || !this.frequencyData) {
      return this.getSilentFrame();
    }

    // Pobierz dane czasowe (waveform)
    this.analyser.getByteTimeDomainData(this.dataArray);
    // Pobierz dane częstotliwościowe (spectrum)
    this.analyser.getByteFrequencyData(this.frequencyData);

    // Oblicz głośność (RMS)
    const volume = this.calculateVolume(this.dataArray);
    
    // Oblicz wysokość dźwięku (dominująca częstotliwość)
    const pitch = this.calculatePitch(this.frequencyData);
    
    // Czy jest dźwięk?
    const isVoiced = volume > this.silenceThreshold;

    // Mapuj na visemes
    const rawVisemes = this.mapToVisemes(volume, pitch, this.frequencyData);
    
    // Wygładź przejścia
    const visemes = this.smoothVisemes(rawVisemes);
    
    // Aktualizuj poprzednie wartości
    this.prevVisemes = { ...visemes };
    this.prevVolume = volume;

    return { visemes, volume, pitch, isVoiced };
  }

  /** Resetuj stan */
  reset(): void {
    this.prevVolume = 0;
    this.prevVisemes = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  }

  dispose(): void {
    this.disconnectMicrophone();
    this.analyser?.disconnect();
    this.isActive = false;
  }

  // ---- Prywatne metody ----

  /** Oblicz głośność RMS */
  private calculateVolume(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return Math.min(1, rms * this.volumeBoost);
  }

  /** Oblicz dominującą częstotliwość (0-1) */
  private calculatePitch(frequencyData: Uint8Array): number {
    let maxAmplitude = 0;
    let maxIndex = 0;
    
    // Szukaj w zakresie ludzkiego głosu (80Hz - 1000Hz)
    const minBin = Math.floor(80 * this.analyser!.fftSize / this.audioContext!.sampleRate);
    const maxBin = Math.floor(1000 * this.analyser!.fftSize / this.audioContext!.sampleRate);
    
    for (let i = minBin; i < maxBin && i < frequencyData.length; i++) {
      if (frequencyData[i] > maxAmplitude) {
        maxAmplitude = frequencyData[i];
        maxIndex = i;
      }
    }
    
    // Normalizuj do 0-1
    return maxAmplitude > 20 ? maxIndex / maxBin : 0;
  }

  /**
   * Mapuj cechy audio na visemes
   * 
   * Niskie częstotliwości + głośno → aa (otwarte)
   * Średnie częstotliwości → ih (szerokie) / ee (ściągnięte)
   * Wysokie częstotliwości → ou (okrągłe)
   * Cisza → zamknięte usta
   */
  private mapToVisemes(volume: number, pitch: number, frequencyData: Uint8Array): VisemeWeights {
    if (volume < this.silenceThreshold) {
      return { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    }

    // Analizuj pasma częstotliwości
    const bands = this.analyzeFrequencyBands(frequencyData);
    
    // Mapuj na visemes na podstawie charakterystyki dźwięku
    const visemes: VisemeWeights = {
      // aa - niskie częstotliwości, otwarte usta (samogłoski A, Ą)
      aa: this.clamp(bands.low * volume * 1.5),
      
      // ih - średnie częstotliwości, szerokie (I, Y, E, Ę, C, S, Z)
      ih: this.clamp(bands.mid * volume * 1.3),
      
      // ou - wysokie częstotliwości, okrągłe (O, U, Ó)
      ou: this.clamp(bands.high * volume * 1.2),
      
      // ee - bardzo wysokie, uśmiech (spółgłoski dentalne, śmiech)
      ee: this.clamp(bands.veryHigh * volume * 1.0),
      
      // oh - zaskoczenie, lekko otwarte (mieszane)
      oh: this.clamp(volume * 0.3 * (1 - Math.abs(pitch - 0.5) * 2)),
    };

    // Normalizuj - zawsze jakiś visem powinien dominować
    const maxVal = Math.max(visemes.aa, visemes.ih, visemes.ou, visemes.ee, visemes.oh, 0.01);
    if (maxVal > 0) {
      const scale = volume / maxVal;
      visemes.aa *= scale;
      visemes.ih *= scale;
      visemes.ou *= scale;
      visemes.ee *= scale;
      visemes.oh *= scale;
    }

    return visemes;
  }

  /** Analizuj pasma częstotliwości */
  private analyzeFrequencyBands(frequencyData: Uint8Array): {
    low: number;      // 80-300 Hz (samogłoski)
    mid: number;      // 300-2000 Hz (spółgłoski, formanty)
    high: number;     // 2000-5000 Hz (syczące, szumiące)
    veryHigh: number; // 5000+ Hz (sybilanty)
  } {
    const sampleRate = this.audioContext!.sampleRate;
    const binCount = frequencyData.length;
    const binWidth = sampleRate / (binCount * 2);
    
    let low = 0, mid = 0, high = 0, veryHigh = 0;
    let lowCount = 0, midCount = 0, highCount = 0, veryHighCount = 0;
    
    for (let i = 0; i < binCount; i++) {
      const freq = i * binWidth;
      const value = frequencyData[i] / 255;
      
      if (freq < 300) { low += value; lowCount++; }
      else if (freq < 2000) { mid += value; midCount++; }
      else if (freq < 5000) { high += value; highCount++; }
      else { veryHigh += value; veryHighCount++; }
    }
    
    return {
      low: lowCount > 0 ? low / lowCount : 0,
      mid: midCount > 0 ? mid / midCount : 0,
      high: highCount > 0 ? high / highCount : 0,
      veryHigh: veryHighCount > 0 ? veryHigh / veryHighCount : 0,
    };
  }

  /** Wygładź przejścia między visemami */
  private smoothVisemes(raw: VisemeWeights): VisemeWeights {
    const s = this.smoothingFactor;
    return {
      aa: this.prevVisemes.aa * s + raw.aa * (1 - s),
      ih: this.prevVisemes.ih * s + raw.ih * (1 - s),
      ou: this.prevVisemes.ou * s + raw.ou * (1 - s),
      ee: this.prevVisemes.ee * s + raw.ee * (1 - s),
      oh: this.prevVisemes.oh * s + raw.oh * (1 - s),
    };
  }

  /** Cicha klatka */
  private getSilentFrame(): LipSyncFrame {
    return {
      visemes: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 },
      volume: 0,
      pitch: 0,
      isVoiced: false,
    };
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
