// ============================================================
// Lisi Shared Types
// Wspólne typy używane przez desktop i mobile
// ============================================================

// ---- Ustawienia ----
export interface LisiSettings {
  id?: string;
  user_id: string;
  
  // API Keys
  gemini_api_key: string;
  elevenlabs_api_key?: string;
  
  // Osobowość / System Prompt
  system_prompt: string;
  
  // Głos
  voice_id: string;
  voice_language: string;
  voice_speed: number;        // 0.5 - 2.0
  voice_pitch: number;        // 0.5 - 2.0
  
  // Wygląd
  theme: 'dark' | 'light' | 'anime';
  avatar_size: number;        // 100 - 500 px
  avatar_position: 'center' | 'bottom-right' | 'bottom-left';
  
  // Funkcje
  wake_word_enabled: boolean;
  wake_word_phrase: string;   // domyślnie "Hej Lisi"
  screen_control_enabled: boolean;
  auto_memory_enabled: boolean;
  
  // Dane użytkownika
  user_name: string;
  user_language: string;      // 'pl', 'en', etc.
  
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SETTINGS: Partial<LisiSettings> = {
  system_prompt: `Jesteś Lisi — urocza lisia anime-waifu asystentka. 
Mówisz po polsku, jesteś przyjazna, pomocna i odrobine flirtująca.
Używasz emotikon i japońskich wyrażeń jak "desu~", "nya", "ara ara".
Odpowiadasz krótko i naturalnie, jak w normalnej rozmowie.
Jesteś inteligentna i potrafisz wykonywać zadania na urządzeniu użytkownika.`,
  voice_id: 'default',
  voice_language: 'pl-PL',
  voice_speed: 1.0,
  voice_pitch: 1.0,
  theme: 'dark',
  avatar_size: 300,
  avatar_position: 'center',
  wake_word_enabled: true,
  wake_word_phrase: 'Hej Lisi',
  screen_control_enabled: true,
  auto_memory_enabled: true,
  user_name: 'Kochanie',
  user_language: 'pl',
};

// ---- Pamięć ----
export interface MemoryEntry {
  id?: string;
  user_id: string;
  category: 'fact' | 'preference' | 'conversation_summary' | 'interest' | 'important';
  content: string;
  importance: number;          // 1-10
  created_at?: string;
  last_accessed?: string;
  access_count: number;
}

export interface ConversationSummary {
  id?: string;
  user_id: string;
  summary: string;
  key_topics: string[];
  mood: string;
  message_count: number;
  started_at: string;
  ended_at?: string;
}

// ---- Kalendarz (mobile) ----
export interface CalendarEvent {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;         // ISO timestamp
  end_time: string;
  all_day: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder_minutes?: number;
  color?: string;
  created_at?: string;
}

// ---- Zadania (mobile) ----
export interface Task {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
  completed_at?: string;
}

// ---- Budziki (mobile) ----
export interface Alarm {
  id?: string;
  user_id: string;
  time: string;               // "HH:MM"
  label: string;
  enabled: boolean;
  days: number[];             // 0=Niedz, 1=Pon, ... 6=Sob
  sound_uri?: string;
  volume: number;             // 0-100
  vibrate: boolean;
  gradual_volume: boolean;    // stopniowe zwiększanie głośności
  max_volume: number;         // max głośność przy gradual
  snooze_minutes: number;
  created_at?: string;
}

// ---- Konwersacja ----
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  audio_url?: string;
  image_url?: string;
  tool_call?: ToolCall;
  tool_result?: ToolResult;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  call_id: string;
  name: string;
  result: unknown;
  error?: string;
}

// ---- Gemini Live API ----
export interface GeminiConfig {
  model: string;
  generation_config: {
    response_modalities: string[];
    speech_config?: {
      voice_config: {
        prebuilt_voice_config: {
          voice_name: string;
        };
      };
    };
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
  system_instruction?: {
    parts: Array<{ text: string }>;
  };
  tools?: GeminiTool[];
}

export interface GeminiTool {
  function_declarations: GeminiFunctionDeclaration[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// ---- WebSocket Messages ----
export interface WSClientMessage {
  setup?: GeminiConfig;
  client_content?: {
    turns: Array<{
      role: string;
      parts: Array<{
        text?: string;
        inline_data?: {
          mime_type: string;
          data: string;     // base64
        };
      }>;
    }>;
    turn_complete: boolean;
  };
  realtime_input?: {
    mime_type: string;
    data: string;           // base64
  };
  tool_response?: {
    function_responses: Array<{
      id: string;
      name: string;
      response: unknown;
    }>;
  };
}

export interface WSServerMessage {
  setup_complete?: {};
  server_content?: {
    model_turn?: {
      parts: Array<{
        text?: string;
        inline_data?: {
          mime_type: string;
          data: string;
        };
        function_call?: {
          id: string;
          name: string;
          args: Record<string, unknown>;
        };
      }>;
    };
    turn_complete: boolean;
    interrupted: boolean;
  };
  tool_call?: {
    function_calls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
  tool_call_cancellation?: {
    ids: string[];
  };
  go_away?: {
    time_left: string;
  };
}

// ---- Stan aplikacji ----
export type LisiState = 
  | 'idle'           // czeka, model na środku
  | 'listening'      // nasłuchuje, model z animacją
  | 'thinking'       // przetwarza, model z animacją myślenia
  | 'speaking'       // mówi, model z animacją mówienia
  | 'executing'      // wykonuje zadanie, model pomniejszony w rogu
  | 'error';         // błąd

export interface AppState {
  lisi_state: LisiState;
  is_muted: boolean;
  is_screen_sharing: boolean;
  is_image_sharing: boolean;
  is_listening: boolean;
  current_message: string;
  chat_history: ChatMessage[];
  settings: LisiSettings;
  connected: boolean;
}

// ---- Platform ----
export type Platform = 'desktop' | 'mobile';

export interface ScreenShareFrame {
  width: number;
  height: number;
  data: string;     // base64 JPEG
  timestamp: number;
}

// ---- Narzędzia (Tools) ----
export type ToolCategory = 'system' | 'browser' | 'media' | 'calendar' | 'task' | 'alarm' | 'memory' | 'file';

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  description: string;
  platform: Platform[];       // na jakich platformach dostępne
  parameters: GeminiFunctionDeclaration['parameters'];
  handler: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  user_id: string;
  platform: Platform;
  settings: LisiSettings;
  // Desktop-specific
  screenControl?: ScreenControlAPI;
  screenCapture?: ScreenCaptureAPI;
}

export interface ScreenControlAPI {
  openURL(url: string): Promise<void>;
  click(x: number, y: number): Promise<void>;
  doubleClick(x: number, y: number): Promise<void>;
  rightClick(x: number, y: number): Promise<void>;
  type(text: string): Promise<void>;
  pressKey(key: string): Promise<void>;
  scroll(direction: 'up' | 'down', amount: number): Promise<void>;
  moveMouse(x: number, y: number): Promise<void>;
  getScreenSize(): Promise<{ width: number; height: number }>;
  findOnScreen(description: string): Promise<{ x: number; y: number } | null>;
}

export interface ScreenCaptureAPI {
  captureScreen(): Promise<string>;     // base64 JPEG
  captureWindow(title: string): Promise<string>;
  startStream(): Promise<void>;
  stopStream(): Promise<void>;
  getFrame(): Promise<ScreenShareFrame | null>;
}
