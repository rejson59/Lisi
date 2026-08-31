// ============================================================
// Supabase Client - Inicjalizacja i operacje na bazie danych
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  LisiSettings,
  MemoryEntry,
  ConversationSummary,
  CalendarEvent,
  Task,
  Alarm,
  ChatMessage,
  DEFAULT_SETTINGS,
} from '../types';

// Typy dla bazy danych Supabase
export interface Database {
  public: {
    Tables: {
      settings: {
        Row: LisiSettings;
        Insert: Partial<LisiSettings>;
        Update: Partial<LisiSettings>;
      };
      memories: {
        Row: MemoryEntry;
        Insert: Partial<MemoryEntry>;
        Update: Partial<MemoryEntry>;
      };
      conversation_summaries: {
        Row: ConversationSummary;
        Insert: Partial<ConversationSummary>;
        Update: Partial<ConversationSummary>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Partial<CalendarEvent>;
        Update: Partial<CalendarEvent>;
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task>;
        Update: Partial<Task>;
      };
      alarms: {
        Row: Alarm;
        Insert: Partial<Alarm>;
        Update: Partial<Alarm>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage>;
        Update: Partial<ChatMessage>;
      };
    };
  };
}

let supabaseInstance: SupabaseClient<Database> | null = null;

/** Inicjalizuj klienta Supabase */
export function initSupabase(url: string, anonKey: string): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  
  return supabaseInstance;
}

/** Pobierz instancję klienta */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    throw new Error('Supabase nie został zainicjalizowany. Wywołaj initSupabase() najpierw.');
  }
  return supabaseInstance;
}

// ============================================================
// Operacje na ustawieniach
// ============================================================

export async function getSettings(userId: string): Promise<LisiSettings | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Nie znaleziono
    throw error;
  }
  return data;
}

export async function upsertSettings(settings: Partial<LisiSettings> & { user_id: string }): Promise<LisiSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('settings')
    .upsert(settings, { onConflict: 'user_id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================
// Operacje na pamięci
// ============================================================

export async function saveMemory(memory: Omit<MemoryEntry, 'id' | 'created_at' | 'last_accessed' | 'access_count'>): Promise<MemoryEntry> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('memories')
    .insert({ ...memory, access_count: 0 })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function searchMemories(userId: string, query: string, limit = 10): Promise<MemoryEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .textSearch('content', query)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  // Aktualizuj last_accessed
  if (data && data.length > 0) {
    const ids = data.map((m) => m.id!).filter(Boolean);
    await supabase
      .from('memories')
      .update({ last_accessed: new Date().toISOString() })
      .in('id', ids);
  }
  
  return data || [];
}

export async function getRecentMemories(userId: string, limit = 20): Promise<MemoryEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('memories').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Operacje na podsumowaniach konwersacji
// ============================================================

export async function saveConversationSummary(summary: Omit<ConversationSummary, 'id'>): Promise<ConversationSummary> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('conversation_summaries')
    .insert(summary)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getRecentSummaries(userId: string, limit = 5): Promise<ConversationSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('conversation_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

// ============================================================
// Operacje na kalendarzu
// ============================================================

export async function addCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<CalendarEvent> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCalendarEvents(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .order('start_time', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Operacje na zadaniach
// ============================================================

export async function addTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'>): Promise<Task> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getTasks(userId: string, filters?: { completed?: boolean; priority?: string; category?: string }): Promise<Task[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId);
  
  if (filters?.completed !== undefined) {
    query = query.eq('completed', filters.completed);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  
  const { data, error } = await query
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function completeTask(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('tasks')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Operacje na budzikach
// ============================================================

export async function addAlarm(alarm: Omit<Alarm, 'id' | 'created_at'>): Promise<Alarm> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('alarms')
    .insert(alarm)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAlarms(userId: string): Promise<Alarm[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('alarms')
    .select('*')
    .eq('user_id', userId)
    .order('time', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function updateAlarm(id: string, updates: Partial<Alarm>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('alarms')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAlarm(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('alarms').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Operacje na wiadomościach czatu
// ============================================================

export async function saveChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getChatHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId) // Potrzebne dodanie user_id do ChatMessage
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return (data || []).reverse();
}

// ============================================================
// Realtime Subscriptions
// ============================================================

export function subscribeToSettings(userId: string, callback: (settings: LisiSettings) => void) {
  const supabase = getSupabase();
  return supabase
    .channel('settings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'settings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as LisiSettings);
        }
      }
    )
    .subscribe();
}

export function subscribeToAlarms(userId: string, callback: (alarm: Alarm) => void) {
  const supabase = getSupabase();
  return supabase
    .channel('alarm-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'alarms',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as Alarm);
        }
      }
    )
    .subscribe();
}
