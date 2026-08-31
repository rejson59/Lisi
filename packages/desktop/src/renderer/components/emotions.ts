// ============================================================
// Emotion Engine - Zarządzanie emocjami i wyrazami twarzy
// Obsługuje przejścia między emocjami i ich mieszanie
// ============================================================

/**
 * Dostępne emocje Lisi
 * Każda emocja to zestaw wag dla blend shapes VRM
 */
export type EmotionType = 
  | 'neutral'      // Spokojna, domyślna
  | 'happy'        // Szczęśliwa, uśmiechnięta
  | 'excited'      // Podekscytowana, energiczna
  | 'shy'          // Zawstydzona, nieśmiała
  | 'love'         // Zakochana, zauroczona
  | 'sad'          // Smutna
  | 'angry'        // Zła
  | 'surprised'    // Zaskoczona
  | 'thinking'     // Myśląca, zamyślona
  | 'confused'     // Zdezorientowana
  | 'sleepy'       // Śpiąca, senna
  | 'playful'      // Figlarna, psotna
  | 'embarrassed'  // Zawstydzona (mocniej)
  | 'worried'      // Zmartwiona
  | 'proud'        // Dumna
  | 'smug'         // Pewna siebie, zadowolona
  | 'crying';      // Płacząca

/** Wagi blend shapes dla każdej emocji */
export interface EmotionWeights {
  // Podstawowe wyrazy VRM
  happy: number;      // Uśmiech
  angry: number;      // Złość (brwi ściągnięte)
  sad: number;        // Smutek (brwi opuszczone)
  relaxed: number;    // Rozluźnienie
  surprised: number;  // Zaskoczenie (oczy szerokie)
  
  // Dodatkowe (jeśli model obsługuje)
  aa: number;         // Usta otwarte
  ih: number;         // Usta szerokie
  ou: number;         // Usta okrągłe
  ee: number;         // Usta ściągnięte
  oh: number;         // Usta lekko otwarte
  
  // Oczy
  blinkLeft: number;  // Lewe oko zamknięte
  blinkRight: number; // Prawe oko zamknięte
  
  // Brwi
  browUp: number;     // Brwi uniesione
  browDown: number;   // Brwi opuszczone
  
  // Dodatkowe
  lookUp: number;     // Patrzenie w górę
  lookDown: number;   // Patrzenie w dół
  lookLeft: number;   // Patrzenie w lewo
  lookRight: number;  // Patrzenie w prawo
}

/** Definicje emocji - wagi dla każdej emocji */
const EMOTION_PRESETS: Record<EmotionType, Partial<EmotionWeights>> = {
  neutral: {
    happy: 0, angry: 0, sad: 0, relaxed: 0.1, surprised: 0,
    browUp: 0, browDown: 0,
  },
  
  happy: {
    happy: 0.8, angry: 0, sad: 0, relaxed: 0.3, surprised: 0,
    ee: 0.3, browUp: 0.1,
  },
  
  excited: {
    happy: 0.9, angry: 0, sad: 0, relaxed: 0, surprised: 0.3,
    aa: 0.2, browUp: 0.4,
  },
  
  shy: {
    happy: 0.3, angry: 0, sad: 0, relaxed: 0.2, surprised: 0.1,
    lookDown: 0.3, lookLeft: 0.2, browUp: 0.1,
  },
  
  love: {
    happy: 0.7, angry: 0, sad: 0, relaxed: 0.4, surprised: 0,
    ee: 0.2, browUp: 0.15, lookUp: 0.1,
  },
  
  sad: {
    happy: 0, angry: 0, sad: 0.7, relaxed: 0, surprised: 0,
    browDown: 0.4, lookDown: 0.2,
  },
  
  angry: {
    happy: 0, angry: 0.8, sad: 0, relaxed: 0, surprised: 0,
    browDown: 0.6, browUp: 0,
  },
  
  surprised: {
    happy: 0.1, angry: 0, sad: 0, relaxed: 0, surprised: 0.9,
    aa: 0.4, browUp: 0.6,
  },
  
  thinking: {
    happy: 0, angry: 0, sad: 0, relaxed: 0.2, surprised: 0,
    lookUp: 0.4, lookRight: 0.2, browUp: 0.2,
  },
  
  confused: {
    happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0.2,
    browUp: 0.3, browDown: 0.1, lookLeft: 0.2,
  },
  
  sleepy: {
    happy: 0, angry: 0, sad: 0.2, relaxed: 0.6, surprised: 0,
    blinkLeft: 0.4, blinkRight: 0.4, lookDown: 0.3,
  },
  
  playful: {
    happy: 0.6, angry: 0, sad: 0, relaxed: 0.2, surprised: 0.1,
    ih: 0.2, browUp: 0.2, lookUp: 0.1,
  },
  
  embarrassed: {
    happy: 0.2, angry: 0, sad: 0, relaxed: 0, surprised: 0.3,
    lookDown: 0.4, lookLeft: 0.3, browUp: 0.3,
  },
  
  worried: {
    happy: 0, angry: 0, sad: 0.4, relaxed: 0, surprised: 0.1,
    browDown: 0.3, browUp: 0.2, lookDown: 0.1,
  },
  
  proud: {
    happy: 0.7, angry: 0, sad: 0, relaxed: 0.3, surprised: 0,
    browUp: 0.2, lookUp: 0.1,
  },
  
  smug: {
    happy: 0.5, angry: 0, sad: 0, relaxed: 0.4, surprised: 0,
    ee: 0.3, browUp: 0.1, lookLeft: 0.1,
  },
  
  crying: {
    happy: 0, angry: 0, sad: 0.9, relaxed: 0, surprised: 0,
    aa: 0.2, browDown: 0.5, lookDown: 0.3,
  },
};

/** Stan emocji z wagą (dla mieszania) */
interface EmotionState {
  type: EmotionType;
  weight: number;      // 0-1, jak mocno ta emocja jest aktywna
  startTime: number;
  duration: number;    // ms, 0 = nieskończona
}

export class EmotionEngine {
  private activeEmotions: EmotionState[] = [];
  private transitionSpeed = 0.05;  // Szybkość przejścia (0-1 per frame)
  private currentWeights: EmotionWeights = this.getDefaultWeights();
  private targetWeights: EmotionWeights = this.getDefaultWeights();
  
  // Naturalne ruchy
  private blinkTimer = 0;
  private nextBlinkTime = 3000 + Math.random() * 4000; // 3-7 sekund
  private isBlinking = false;
  private blinkProgress = 0;
  private microMovementTime = 0;
  
  // Emocje kontekstowe
  private contextEmotion: EmotionType = 'neutral';

  /** Ustaw emocję (główna) */
  setEmotion(type: EmotionType, duration = 0, weight = 1.0): void {
    // Usuń poprzednie emocje tego samego typu
    this.activeEmotions = this.activeEmotions.filter((e) => e.type !== type);
    
    // Dodaj nową
    this.activeEmotions.push({
      type,
      weight,
      startTime: performance.now(),
      duration,
    });
    
    // Ogranicz do 3 aktywnych emocji
    if (this.activeEmotions.length > 3) {
      this.activeEmotions.shift();
    }
    
    this.updateTargetWeights();
  }

  /** Dodaj emocję (miesza się z istniejącymi) */
  addEmotion(type: EmotionType, weight = 0.5, duration = 2000): void {
    this.activeEmotions.push({
      type,
      weight,
      startTime: performance.now(),
      duration,
    });
    
    this.updateTargetWeights();
  }

  /** Wróć do neutralnej */
  resetToNeutral(): void {
    this.activeEmotions = [];
    this.contextEmotion = 'neutral';
    this.updateTargetWeights();
  }

  /** Ustaw emocję kontekstową (trwała, niska waga) */
  setContextEmotion(type: EmotionType): void {
    this.contextEmotion = type;
    this.updateTargetWeights();
  }

  /** Pobierz aktualne wagi (wywoływaj co klatkę) */
  update(delta: number): EmotionWeights {
    const now = performance.now();
    
    // Usuń wygasłe emocje
    this.activeEmotions = this.activeEmotions.filter((e) => {
      if (e.duration > 0 && now - e.startTime > e.duration) {
        return false;
      }
      return true;
    });
    
    // Aktualizuj target
    this.updateTargetWeights();
    
    // Interpoluj do targetu (smooth transition)
    this.currentWeights = this.interpolateWeights(
      this.currentWeights,
      this.targetWeights,
      this.transitionSpeed
    );
    
    // Dodaj naturalne mruganie
    this.updateBlinking(delta);
    
    // Dodaj mikro-ruchy (naturalność)
    this.updateMicroMovements(delta);
    
    return { ...this.currentWeights };
  }

  /** Pobierz aktualną dominującą emocję */
  getCurrentEmotion(): EmotionType {
    if (this.activeEmotions.length === 0) return this.contextEmotion;
    
    let maxWeight = 0;
    let dominant: EmotionType = this.contextEmotion;
    
    for (const emotion of this.activeEmotions) {
      if (emotion.weight > maxWeight) {
        maxWeight = emotion.weight;
        dominant = emotion.type;
      }
    }
    
    return dominant;
  }

  // ---- Prywatne metody ----

  private updateTargetWeights(): void {
    const base = this.getDefaultWeights();
    
    // Zacznij od emocji kontekstowej
    const contextPreset = EMOTION_PRESETS[this.contextEmotion];
    for (const [key, value] of Object.entries(contextPreset)) {
      (base as any)[key] = value as number * 0.3; // Niska waga kontekstowa
    }
    
    // Nałóż aktywne emocje
    for (const emotion of this.activeEmotions) {
      const preset = EMOTION_PRESETS[emotion.type];
      for (const [key, value] of Object.entries(preset)) {
        (base as any)[key] = Math.min(1, 
          ((base as any)[key] || 0) + (value as number) * emotion.weight
        );
      }
    }
    
    this.targetWeights = base;
  }

  private interpolateWeights(
    current: EmotionWeights,
    target: EmotionWeights,
    speed: number
  ): EmotionWeights {
    const result: EmotionWeights = {} as any;
    
    for (const key of Object.keys(current) as Array<keyof EmotionWeights>) {
      const curr = current[key];
      const tgt = target[key];
      result[key] = curr + (tgt - curr) * speed;
    }
    
    return result;
  }

  /** Naturalne mruganie */
  private updateBlinking(delta: number): void {
    this.blinkTimer += delta * 1000;
    
    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkTime) {
      // Rozpocznij mruganie
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.blinkTimer = 0;
      this.nextBlinkTime = 2000 + Math.random() * 5000; // 2-7 sekund
    }
    
    if (this.isBlinking) {
      this.blinkProgress += delta * 8; // Szybkość mrugania
      
      if (this.blinkProgress >= 1) {
        // Zakończ mruganie
        this.isBlinking = false;
        this.currentWeights.blinkLeft = 0;
        this.currentWeights.blinkRight = 0;
      } else {
        // Krzywa mrugania: szybko zamknij, wolniej otwórz
        const blinkCurve = this.blinkProgress < 0.3
          ? this.blinkProgress / 0.3          // Zamknij (0-0.3)
          : 1 - (this.blinkProgress - 0.3) / 0.7; // Otwórz (0.3-1)
        
        const blinkAmount = Math.min(1, blinkCurve);
        this.currentWeights.blinkLeft = blinkAmount;
        this.currentWeights.blinkRight = blinkAmount;
      }
    }
    
    // Podwójne mruganie (rzadko, naturalne)
    if (!this.isBlinking && Math.random() < 0.001) {
      this.nextBlinkTime = 100; // Szybkie drugie mruganie
    }
  }

  /** Mikro-ruchy dla naturalności */
  private updateMicroMovements(delta: number): void {
    this.microMovementTime += delta;
    const t = this.microMovementTime;
    
    // Delikatne ruchy oczu (jakby patrzyła na użytkownika)
    const eyeX = Math.sin(t * 0.3) * 0.08 + Math.sin(t * 0.7) * 0.04;
    const eyeY = Math.sin(t * 0.2) * 0.05 + Math.cos(t * 0.5) * 0.03;
    
    this.currentWeights.lookLeft = Math.max(0, -eyeX);
    this.currentWeights.lookRight = Math.max(0, eyeX);
    this.currentWeights.lookUp = Math.max(0, -eyeY);
    this.currentWeights.lookDown = Math.max(0, eyeY);
  }

  private getDefaultWeights(): EmotionWeights {
    return {
      happy: 0, angry: 0, sad: 0, relaxed: 0.1, surprised: 0,
      aa: 0, ih: 0, ou: 0, ee: 0, oh: 0,
      blinkLeft: 0, blinkRight: 0,
      browUp: 0, browDown: 0,
      lookUp: 0, lookDown: 0, lookLeft: 0, lookRight: 0,
    };
  }
}
