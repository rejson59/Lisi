// ============================================================
// Memory Manager - Zarządzanie pamięcią długotrwałą Lisi
// ============================================================

import type { MemoryEntry, ConversationSummary, ChatMessage } from '../types';
import * as db from '../supabase/client';

export class MemoryManager {
  private userId: string;
  private recentMemories: MemoryEntry[] = [];
  private recentSummaries: ConversationSummary[] = [];
  private currentConversation: ChatMessage[] = [];
  private summaryThreshold = 20; // Podsumuj co 20 wiadomości

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Załaduj pamięć z bazy */
  async load(): Promise<void> {
    try {
      this.recentMemories = await db.getRecentMemories(this.userId, 50);
      this.recentSummaries = await db.getRecentSummaries(this.userId, 5);
    } catch (err) {
      console.error('[Memory] Błąd ładowania pamięci:', err);
    }
  }

  /** Zapisz nową informację o użytkowniku */
  async remember(content: string, category: MemoryEntry['category'], importance = 5): Promise<void> {
    try {
      const memory = await db.saveMemory({
        user_id: this.userId,
        category,
        content,
        importance,
      });
      this.recentMemories.unshift(memory);
      
      // Ogranicz pamięć w RAM
      if (this.recentMemories.length > 100) {
        this.recentMemories = this.recentMemories.slice(0, 100);
      }
    } catch (err) {
      console.error('[Memory] Błąd zapisywania:', err);
    }
  }

  /** Przeszukaj pamięć */
  async search(query: string): Promise<MemoryEntry[]> {
    try {
      return await db.searchMemories(this.userId, query, 10);
    } catch (err) {
      console.error('[Memory] Błąd wyszukiwania:', err);
      return [];
    }
  }

  /** Dodaj wiadomość do bieżącej konwersacji */
  addToConversation(message: ChatMessage): void {
    this.currentConversation.push(message);
    
    // Automatyczne podsumowanie po przekroczeniu progu
    if (this.currentConversation.length >= this.summaryThreshold) {
      this.summarizeConversation();
    }
  }

  /** Podsumuj bieżącą konwersację */
  async summarizeConversation(): Promise<void> {
    if (this.currentConversation.length < 5) return;

    try {
      // Stwórz podsumowanie z ostatnich wiadomości
      const messages = this.currentConversation.slice(-this.summaryThreshold);
      const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
      const assistantMessages = messages.filter((m) => m.role === 'assistant').map((m) => m.content);

      // Ekstrahuj kluczowe tematy
      const keyTopics = this.extractTopics(userMessages.join(' '));

      const summary: Omit<ConversationSummary, 'id'> = {
        user_id: this.userId,
        summary: `Rozmowa o: ${keyTopics.join(', ')}`,
        key_topics: keyTopics,
        mood: 'neutral',
        message_count: messages.length,
        started_at: messages[0]?.timestamp || new Date().toISOString(),
        ended_at: new Date().toISOString(),
      };

      const saved = await db.saveConversationSummary(summary);
      this.recentSummaries.unshift(saved);

      // Wyczyść bieżącą konwersację (zachowaj ostatnie 5)
      this.currentConversation = this.currentConversation.slice(-5);

      console.log('[Memory] Podsumowanie konwersacji zapisane');
    } catch (err) {
      console.error('[Memory] Błąd podsumowywania:', err);
    }
  }

  /** Wygeneruj kontekst pamięci dla system prompt */
  getMemoryContext(): string {
    const parts: string[] = [];

    // Ostatnie fakty o użytkowniku
    if (this.recentMemories.length > 0) {
      parts.push('## Co wiem o użytkowniku:');
      const topMemories = this.recentMemories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 15);
      for (const mem of topMemories) {
        parts.push(`- [${mem.category}] ${mem.content}`);
      }
    }

    // Ostatnie podsumowania konwersacji
    if (this.recentSummaries.length > 0) {
      parts.push('\n## Ostatnie rozmowy:');
      for (const sum of this.recentSummaries.slice(0, 3)) {
        parts.push(`- ${sum.summary} (${new Date(sum.started_at).toLocaleDateString('pl-PL')})`);
      }
    }

    // Bieżąca konwersacja
    if (this.currentConversation.length > 0) {
      parts.push('\n## Bieżąca rozmowa:');
      const recent = this.currentConversation.slice(-10);
      for (const msg of recent) {
        const role = msg.role === 'user' ? 'Użytkownik' : 'Lisi';
        parts.push(`${role}: ${msg.content.substring(0, 200)}`);
      }
    }

    return parts.join('\n');
  }

  /** Ekstrahuj tematy z tekstu */
  private extractTopics(text: string): string[] {
    // Prosta ekstrakcja - w produkcji można użyć NLP
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'i', 'nie', 'to', 'jest', 'na', 'w', 'z', 'do', 'że', 'się',
      'o', 'jak', 'ale', 'co', 'za', 'od', 'po', 'tak', 'już',
      'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    ]);
    
    const wordCount = new Map<string, number>();
    for (const word of words) {
      const cleaned = word.replace(/[^a-ząćęłńóśźż0-9]/gi, '');
      if (cleaned.length > 2 && !stopWords.has(cleaned)) {
        wordCount.set(cleaned, (wordCount.get(cleaned) || 0) + 1);
      }
    }

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /** Wyczyść pamięć z RAM */
  clear(): void {
    this.currentConversation = [];
  }
}
