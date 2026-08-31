-- ============================================================
-- Lisi - Supabase Database Schema
-- Uruchom to w Supabase SQL Editor
-- ============================================================

-- Włącz rozszerzenia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Dla fuzzy text search

-- ============================================================
-- Tabela: settings (ustawienia użytkownika)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  
  -- API Keys
  gemini_api_key TEXT NOT NULL DEFAULT '',
  elevenlabs_api_key TEXT DEFAULT '',
  
  -- Osobowość
  system_prompt TEXT NOT NULL DEFAULT 'Jesteś Lisi — urocza lisia anime-waifu asystentka. Mówisz po polsku, jesteś przyjazna i pomocna.',
  
  -- Głos
  voice_id TEXT NOT NULL DEFAULT 'default',
  voice_language TEXT NOT NULL DEFAULT 'pl-PL',
  voice_speed REAL NOT NULL DEFAULT 1.0,
  voice_pitch REAL NOT NULL DEFAULT 1.0,
  
  -- Wygląd
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'anime')),
  avatar_size INTEGER NOT NULL DEFAULT 300,
  avatar_position TEXT NOT NULL DEFAULT 'center' CHECK (avatar_position IN ('center', 'bottom-right', 'bottom-left')),
  
  -- Funkcje
  wake_word_enabled BOOLEAN NOT NULL DEFAULT true,
  wake_word_phrase TEXT NOT NULL DEFAULT 'Hej Lisi',
  screen_control_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_memory_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Dane użytkownika
  user_name TEXT NOT NULL DEFAULT 'Kochanie',
  user_language TEXT NOT NULL DEFAULT 'pl',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks na user_id
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ============================================================
-- Tabela: memories (pamięć długotrwała)
-- ============================================================
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fact', 'preference', 'conversation_summary', 'interest', 'important')),
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  access_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_content_search ON memories USING gin(content gin_trgm_ops);

-- ============================================================
-- Tabela: conversation_summaries (podsumowania rozmów)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  mood TEXT DEFAULT 'neutral',
  message_count INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conv_summaries_user_id ON conversation_summaries(user_id);

-- ============================================================
-- Tabela: calendar_events (wydarzenia kalendarza)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes INTEGER,
  color TEXT DEFAULT '#6366f1',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_time ON calendar_events(start_time, end_time);

-- ============================================================
-- Tabela: tasks (zadania)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- ============================================================
-- Tabela: alarms (budziki)
-- ============================================================
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  time TEXT NOT NULL,  -- "HH:MM"
  label TEXT NOT NULL DEFAULT 'Budzik',
  enabled BOOLEAN NOT NULL DEFAULT true,
  days INTEGER[] DEFAULT '{}',  -- 0=Niedz, 1=Pon, ... 6=Sob
  sound_uri TEXT,
  volume INTEGER NOT NULL DEFAULT 80 CHECK (volume BETWEEN 0 AND 100),
  vibrate BOOLEAN NOT NULL DEFAULT true,
  gradual_volume BOOLEAN NOT NULL DEFAULT true,
  max_volume INTEGER NOT NULL DEFAULT 100 CHECK (max_volume BETWEEN 0 AND 100),
  snooze_minutes INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alarms_user_id ON alarms(user_id);
CREATE INDEX IF NOT EXISTS idx_alarms_enabled ON alarms(enabled);

-- ============================================================
-- Tabela: chat_messages (historia czatu)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audio_url TEXT,
  image_url TEXT,
  tool_call JSONB,
  tool_result JSONB
);

CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Włącz RLS na wszystkich tabelach
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu (użytkownik może czytać/edytować tylko swoje dane)
-- Na razie tworzymy polityki dla anon key z filtrem user_id

CREATE POLICY "Users can view own settings" ON settings
  FOR SELECT USING (true);  -- Tymczasowo otwarte, zmień na auth.uid()::text = user_id

CREATE POLICY "Users can update own settings" ON settings
  FOR ALL USING (true);

CREATE POLICY "Users can manage own memories" ON memories
  FOR ALL USING (true);

CREATE POLICY "Users can manage own summaries" ON conversation_summaries
  FOR ALL USING (true);

CREATE POLICY "Users can manage own calendar" ON calendar_events
  FOR ALL USING (true);

CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (true);

CREATE POLICY "Users can manage own alarms" ON alarms
  FOR ALL USING (true);

CREATE POLICY "Users can manage own chat" ON chat_messages
  FOR ALL USING (true);

-- ============================================================
-- Realtime (włącz dla synchronizacji między urządzeniami)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE alarms;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

-- ============================================================
-- Funkcja: automatyczne aktualizowanie updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Funkcja: wyszukiwanie w pamięci
-- ============================================================

CREATE OR REPLACE FUNCTION search_memories(
  p_user_id TEXT,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF memories AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM memories
  WHERE user_id = p_user_id
    AND content ILIKE '%' || p_query || '%'
  ORDER BY importance DESC, created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Gotowe! 🦊
