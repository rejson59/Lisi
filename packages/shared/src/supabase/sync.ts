// ============================================================
// Supabase Sync - Synchronizacja danych między urządzeniami
// ============================================================

import type { LisiSettings, Alarm, Task, CalendarEvent } from '../types';
import * as db from './client';

type SyncCallback = (table: string, data: any) => void;

export class SupabaseSync {
  private userId: string;
  private subscriptions: any[] = [];
  private onSync: SyncCallback | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Ustaw callback na zmiany */
  onChange(callback: SyncCallback): void {
    this.onSync = callback;
  }

  /** Rozpocznij synchronizację wszystkich tabel */
  startSync(): void {
    // Settings
    this.subscriptions.push(
      db.subscribeToSettings(this.userId, (settings) => {
        this.onSync?.('settings', settings);
      })
    );

    // Alarms
    this.subscriptions.push(
      db.subscribeToAlarms(this.userId, (alarm) => {
        this.onSync?.('alarms', alarm);
      })
    );

    // Tasks
    const supabase = db.getSupabase();
    this.subscriptions.push(
      supabase
        .channel('task-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${this.userId}` },
          (payload) => this.onSync?.('tasks', payload.new)
        )
        .subscribe()
    );

    // Calendar Events
    this.subscriptions.push(
      supabase
        .channel('calendar-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${this.userId}` },
          (payload) => this.onSync?.('calendar_events', payload.new)
        )
        .subscribe()
    );

    // Chat Messages
    this.subscriptions.push(
      supabase
        .channel('chat-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${this.userId}` },
          (payload) => this.onSync?.('chat_messages', payload.new)
        )
        .subscribe()
    );

    console.log('[Sync] Rozpoczęto synchronizację');
  }

  /** Zatrzymaj synchronizację */
  stopSync(): void {
    for (const sub of this.subscriptions) {
      sub?.unsubscribe?.();
    }
    this.subscriptions = [];
    console.log('[Sync] Zatrzymano synchronizację');
  }

  /** Wymuś pełną synchronizację (pobierz wszystko z Supabase) */
  async fullSync(): Promise<{
    settings: LisiSettings | null;
    alarms: Alarm[];
    tasks: Task[];
    events: CalendarEvent[];
  }> {
    const [settings, alarms, tasks, events] = await Promise.all([
      db.getSettings(this.userId),
      db.getAlarms(this.userId),
      db.getTasks(this.userId),
      db.getCalendarEvents(
        this.userId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dni wstecz
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()  // rok do przodu
      ),
    ]);

    return { settings, alarms, tasks, events };
  }
}
