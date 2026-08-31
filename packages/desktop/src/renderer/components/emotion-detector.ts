// ============================================================
// Emotion Detector - Analiza tekstu i wykrywanie emocji
// Automatycznie ustawia emocje Lisi na podstawie treści
// ============================================================

import type { EmotionType } from './emotions';

/** Słowa kluczowe dla każdej emocji */
const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  happy: [
    'cieszę', 'super', 'świetnie', 'wspaniale', 'dobrze', 'fajnie', 'miło',
    'dziękuję', 'dzięki', 'kocham', 'lubię', 'uwielbiam', 'haha', 'hehe',
    'yay', 'tak!', 'amazing', 'awesome', 'great', 'love', 'happy',
    'desu~', 'sugoi', 'kawaii', 'yay', '✨', '💕', '😊', '😄', '🥰',
  ],
  excited: [
    'wow', 'niesamowite', 'nie mogę się doczekać', 'ekscytujące', 'podekscytowana',
    'omg', 'wow!', 'serio?!', 'naprawdę?!', 'ooo', 'aaaa',
    '🎉', '🎊', '🤩', '!!',
  ],
  shy: [
    'eeeee', 'yyy', 'hmm', 'no nie wiem', 'trochę', 'może',
    'przepraszam', 'sorki', 'embarrassing', 'awkward',
    '😅', '😳', '🙈',
  ],
  love: [
    'kocham', 'miłość', 'serduszko', 'skarbie', 'kochanie', 'misiek',
    'tęsknię', 'brakuje mi', 'sweetheart', 'darling',
    '❤️', '💕', '💗', '💖', '😍',
  ],
  sad: [
    'smutno', 'przykro', 'żal', 'tęsknię', 'brakuje', 'niestety',
    'szkoda', 'boli', 'trudno', 'ciężko', 'płaczę',
    '😢', '😭', '😿', ':(',
  ],
  angry: [
    'zły', 'wściekły', 'denerwuje', 'irytuje', 'nienawidzę',
    'głupi', 'beznadziejny', 'kurde', 'cholera', 'dość',
    '😠', '😡', '🤬',
  ],
  surprised: [
    'co?!', 'serio?', 'naprawdę?', 'niemożliwe', 'zaskoczona',
    'nie wierzę', 'o matko', 'ojej', 'wow', 'what',
    '😮', '😲', '🤯', '?!',
  ],
  thinking: [
    'myślę', 'zastanawiam', 'hmm', 'ciekawe', 'może',
    'prawdopodobnie', 'chyba', 'pewnie', 'zobaczymy',
    '🤔', 'hmm...',
  ],
  confused: [
    'nie rozumiem', 'co to znaczy', 'nie wiem', 'zdezorientowana',
    'pomieszanie', 'nie ogarniam', 'hę?', 'co?',
    '😕', '❓',
  ],
  sleepy: [
    'śpię', 'zmęczona', 'senna', 'ziewam', 'spać',
    'noc', 'późno', 'dobranoc', 'oyasumi',
    '😴', '💤', '🥱',
  ],
  playful: [
    'hehe', 'hihi', 'figlarna', 'psotna', 'żartuję',
    'zabawa', 'głupotki', 'lul', 'lol', 'xd',
    '😜', '🤪', '😝', 'nyaa~',
  ],
  embarrassed: [
    'wstyd', 'zawstydzona', 'styd mi', 'nie patrz',
    'cringe', 'bleh', 'fuj',
    '😳', '🙈', '///',
  ],
  worried: [
    'martwię', 'niepokoję', 'boję', 'strach', 'obawiam',
    'ostrożnie', 'uważaj', 'niebezpiecznie',
    '😟', '😨',
  ],
  proud: [
    'dumna', 'udało się', 'zrobiłam', 'sukces', 'osiągnięcie',
    'brawo', 'gratulacje', 'super robota',
    '😤', '💪', '🏆',
  ],
  smug: [
    'oczywiście', 'a nie mówiłam', 'wiedziałam', 'jak zwykle',
    'bez problemu', 'łatwe', 'proste',
    '😏', '💅',
  ],
  crying: [
    'płaczę', 'łzy', 'beczę', 'szlocham', '呜呜',
    '😭', '💧',
  ],
  neutral: [],
};

/**
 * Wykryj emocję z tekstu
 * Zwraca główną emocję i pewność (0-1)
 */
export function detectEmotion(text: string): { emotion: EmotionType; confidence: number } {
  const lower = text.toLowerCase();
  
  // Zlicz dopasowania dla każdej emocji
  const scores: Partial<Record<EmotionType, number>> = {};
  
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length; // Dłuższe dopasowania = wyższy priorytet
      }
    }
    if (score > 0) {
      scores[emotion as EmotionType] = score;
    }
  }
  
  // Znajdź emocję z najwyższym wynikiem
  let bestEmotion: EmotionType = 'neutral';
  let bestScore = 0;
  
  for (const [emotion, score] of Object.entries(scores)) {
    if (score! > bestScore) {
      bestScore = score!;
      bestEmotion = emotion as EmotionType;
    }
  }
  
  // Oblicz pewność (normalizuj)
  const maxPossibleScore = lower.length * 0.3; // Heurystyka
  const confidence = Math.min(1, bestScore / Math.max(1, maxPossibleScore));
  
  return { emotion: bestEmotion, confidence };
}

/**
 * Wykryj emocję z kontekstu rozmowy
 * Analizuje ostatnie wiadomości dla lepszego kontekstu
 */
export function detectEmotionFromContext(
  messages: Array<{ role: string; content: string }>
): EmotionType {
  // Analizuj ostatnie 3 wiadomości
  const recent = messages.slice(-3);
  
  const emotionScores: Partial<Record<EmotionType, number>> = {};
  
  for (let i = 0; i < recent.length; i++) {
    const msg = recent[i];
    const { emotion, confidence } = detectEmotion(msg.content);
    
    // Nowocześniejsze wiadomości mają wyższą wagę
    const recencyWeight = (i + 1) / recent.length;
    const roleWeight = msg.role === 'user' ? 1.0 : 0.8; // Reakcja na użytkownika
    
    emotionScores[emotion] = (emotionScores[emotion] || 0) + confidence * recencyWeight * roleWeight;
  }
  
  // Znajdź dominującą emocję
  let bestEmotion: EmotionType = 'neutral';
  let bestScore = 0;
  
  for (const [emotion, score] of Object.entries(emotionScores)) {
    if (score! > bestScore) {
      bestScore = score!;
      bestEmotion = emotion as EmotionType;
    }
  }
  
  return bestEmotion;
}

/**
 * Mapuj stan Lisi na emocję bazową
 */
export function stateToEmotion(state: string): EmotionType {
  switch (state) {
    case 'listening': return 'happy';
    case 'thinking': return 'thinking';
    case 'speaking': return 'happy';
    case 'executing': return 'proud';
    case 'error': return 'worried';
    default: return 'neutral';
  }
}
