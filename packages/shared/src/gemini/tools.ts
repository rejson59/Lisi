// ============================================================
// Lisi Tools - Definicje narzędzi dla Gemini Function Calling
// ============================================================

import type {
  GeminiTool,
  ToolDefinition,
  ToolContext,
  ToolResult,
  Platform,
} from '../types';

// ---- Helper: stwórz wynik narzędzia ----
function makeResult(callId: string, name: string, result: unknown, error?: string): ToolResult {
  return { call_id: callId, name, result, error };
}

// ============================================================
// TOOLS: Ekspresje twarzy (Desktop + Mobile)
// ============================================================

export const setEmotionTool: ToolDefinition = {
  name: 'set_emotion',
  category: 'system',
  description: `Ustawia wyraz twarzy i emocję. Używaj tego żeby wyrazić swoje uczucia podczas rozmowy.
Dostępne emocje:
- neutral - spokojna, domyślna
- happy - szczęśliwa, uśmiechnięta
- excited - podekscytowana, energiczna
- shy - nieśmiała, zawstydzona
- love - zakochana, zauroczona
- sad - smutna
- angry - zła
- surprised - zaskoczona
- thinking - myśląca, zamyślona
- confused - zdezorientowana
- sleepy - śpiąca, senna
- playful - figlarna, psotna
- embarrassed - zawstydzona (mocniej)
- worried - zmartwiona
- proud - dumna
- smug - pewna siebie, zadowolona
- crying - płacząca

Używaj tej funkcji naturalnie - np. happy gdy się cieszysz, shy gdy komplementują, surprised gdy coś Cię zaskoczy.
Możesz też ustawić czas trwania emocji (domyślnie 5 sekund, 0 = do następnej zmiany).`,
  platform: ['desktop', 'mobile'],
  parameters: {
    type: 'object',
    properties: {
      emotion: {
        type: 'string',
        description: 'Typ emocji do wyświetlenia',
        enum: [
          'neutral', 'happy', 'excited', 'shy', 'love', 'sad', 'angry',
          'surprised', 'thinking', 'confused', 'sleepy', 'playful',
          'embarrassed', 'worried', 'proud', 'smug', 'crying',
        ],
      },
      intensity: {
        type: 'number',
        description: 'Intensywność emocji (0.1 - 1.0, domyślnie 0.8)',
      },
      duration: {
        type: 'number',
        description: 'Czas trwania w sekundach (0 = do następnej zmiany, domyślnie 5)',
      },
    },
    required: ['emotion'],
  },
  handler: async (args, _ctx) => {
    // Ten handler jest wywoływany po stronie shared,
    // ale rzeczywista zmiana emocji dzieje się w renderer przez callback
    return makeResult('', 'set_emotion', {
      success: true,
      emotion: args.emotion,
      intensity: args.intensity || 0.8,
      duration: args.duration ?? 5,
    });
  },
};

// ============================================================
// TOOLS: System (Desktop + Mobile)
// ============================================================

export const getTimeTool: ToolDefinition = {
  name: 'get_current_time',
  category: 'system',
  description: 'Pobiera aktualną datę i godzinę',
  platform: ['desktop', 'mobile'],
  parameters: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, _ctx) => {
    const now = new Date();
    return makeResult('', 'get_current_time', {
      datetime: now.toISOString(),
      formatted: now.toLocaleString('pl-PL'),
      time: now.toLocaleTimeString('pl-PL'),
      date: now.toLocaleDateString('pl-PL'),
      day_of_week: now.toLocaleDateString('pl-PL', { weekday: 'long' }),
    });
  },
};

export const setTimerTool: ToolDefinition = {
  name: 'set_timer',
  category: 'system',
  description: 'Ustawia timer na określoną liczbę minut',
  platform: ['desktop', 'mobile'],
  parameters: {
    type: 'object',
    properties: {
      minutes: { type: 'number', description: 'Liczba minut' },
      label: { type: 'string', description: 'Etykieta timera' },
    },
    required: ['minutes'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'set_timer', {
      success: true,
      minutes: args.minutes,
      label: args.label || 'Timer',
      message: `Timer ustawiony na ${args.minutes} minut`,
    });
  },
};

// ============================================================
// TOOLS: Przeglądarka / Ekran (Desktop only)
// ============================================================

export const openBrowserTool: ToolDefinition = {
  name: 'open_browser',
  category: 'browser',
  description: 'Otwiera przeglądarkę i wchodzi na podaną stronę URL lub wyszukuje frazę w Google',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL do otwarcia (np. https://youtube.com)' },
      search_query: { type: 'string', description: 'Fraza do wyszukania w Google' },
    },
  },
  handler: async (args, ctx) => {
    if (!ctx.screenControl) throw new Error('Screen control niedostępny');
    
    if (args.url) {
      await ctx.screenControl.openURL(args.url as string);
      return makeResult('', 'open_browser', {
        success: true,
        message: `Otwieram ${args.url}`,
      });
    }
    
    if (args.search_query) {
      const query = encodeURIComponent(args.search_query as string);
      await ctx.screenControl.openURL(`https://www.google.com/search?q=${query}`);
      return makeResult('', 'open_browser', {
        success: true,
        message: `Szukam "${args.search_query}" w Google`,
      });
    }
    
    return makeResult('', 'open_browser', { success: false }, 'Podaj URL lub frazę do wyszukania');
  },
};

export const clickScreenTool: ToolDefinition = {
  name: 'click_screen',
  category: 'browser',
  description: 'Klika w określone miejsce na ekranie. Użyj opisu miejsca (np. "przycisk Play na YouTube")',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'Współrzędna X (piksele od lewej)' },
      y: { type: 'number', description: 'Współrzędna Y (piksele od góry)' },
      description: { type: 'string', description: 'Opis co ma zostać kliknięte' },
      button: { type: 'string', description: 'Przycisk myszy', enum: ['left', 'right', 'double'] },
    },
    required: ['x', 'y'],
  },
  handler: async (args, ctx) => {
    if (!ctx.screenControl) throw new Error('Screen control niedostępny');
    
    const x = args.x as number;
    const y = args.y as number;
    const button = (args.button as string) || 'left';
    
    if (button === 'double') {
      await ctx.screenControl.doubleClick(x, y);
    } else if (button === 'right') {
      await ctx.screenControl.rightClick(x, y);
    } else {
      await ctx.screenControl.click(x, y);
    }
    
    return makeResult('', 'click_screen', {
      success: true,
      message: `Klikam ${button === 'right' ? 'prawym' : button === 'double' ? 'podwójnie' : 'lewym'} w (${x}, ${y})`,
    });
  },
};

export const typeTextTool: ToolDefinition = {
  name: 'type_text',
  category: 'browser',
  description: 'Wpisuje tekst na klawiaturze',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Tekst do wpisania' },
      press_enter: { type: 'string', description: 'Czy nacisnąć Enter po wpisaniu', enum: ['true', 'false'] },
    },
    required: ['text'],
  },
  handler: async (args, ctx) => {
    if (!ctx.screenControl) throw new Error('Screen control niedostępny');
    
    await ctx.screenControl.type(args.text as string);
    
    if (args.press_enter === 'true') {
      await ctx.screenControl.pressKey('enter');
    }
    
    return makeResult('', 'type_text', {
      success: true,
      message: `Wpisuję: "${args.text}"`,
    });
  },
};

export const pressKeyTool: ToolDefinition = {
  name: 'press_key',
  category: 'browser',
  description: 'Naciska klawisz lub kombinację klawiszy',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Klawisz (np. "enter", "tab", "escape", "ctrl+c", "alt+tab")' },
    },
    required: ['key'],
  },
  handler: async (args, ctx) => {
    if (!ctx.screenControl) throw new Error('Screen control niedostępny');
    
    await ctx.screenControl.pressKey(args.key as string);
    
    return makeResult('', 'press_key', {
      success: true,
      message: `Naciskam ${args.key}`,
    });
  },
};

export const scrollTool: ToolDefinition = {
  name: 'scroll',
  category: 'browser',
  description: 'Przewija ekran w górę lub w dół',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      direction: { type: 'string', description: 'Kierunek', enum: ['up', 'down'] },
      amount: { type: 'number', description: 'Ilość (1-10, domyślnie 3)' },
    },
    required: ['direction'],
  },
  handler: async (args, ctx) => {
    if (!ctx.screenControl) throw new Error('Screen control niedostępny');
    
    const amount = (args.amount as number) || 3;
    await ctx.screenControl.scroll(args.direction as 'up' | 'down', amount);
    
    return makeResult('', 'scroll', {
      success: true,
      message: `Przewijam ${args.direction === 'up' ? 'w górę' : 'w dół'}`,
    });
  },
};

export const getScreenSizeTool: ToolDefinition = {
  name: 'get_screen_size',
  category: 'system',
  description: 'Pobiera rozmiar ekranu',
  platform: ['desktop'],
  parameters: { type: 'object', properties: {} },
  handler: async (_args, ctx) => {
    if (!ctx.screenControl) throw new Error('Screen control niedostępny');
    const size = await ctx.screenControl.getScreenSize();
    return makeResult('', 'get_screen_size', size);
  },
};

// ============================================================
// TOOLS: Kalendarz (Mobile)
// ============================================================

export const addCalendarEventTool: ToolDefinition = {
  name: 'add_calendar_event',
  category: 'calendar',
  description: 'Dodaje nowe wydarzenie do kalendarza',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Tytuł wydarzenia' },
      description: { type: 'string', description: 'Opis wydarzenia' },
      start_time: { type: 'string', description: 'Data i czas rozpoczęcia (ISO)' },
      end_time: { type: 'string', description: 'Data i czas zakończenia (ISO)' },
      location: { type: 'string', description: 'Lokalizacja' },
      all_day: { type: 'string', description: 'Czy całodniowe', enum: ['true', 'false'] },
      reminder_minutes: { type: 'number', description: 'Przypomnienie X minut przed' },
    },
    required: ['title', 'start_time', 'end_time'],
  },
  handler: async (args, ctx) => {
    return makeResult('', 'add_calendar_event', {
      success: true,
      message: `Dodaję wydarzenie: ${args.title}`,
      event: args,
    });
  },
};

export const listCalendarEventsTool: ToolDefinition = {
  name: 'list_calendar_events',
  category: 'calendar',
  description: 'Listuje wydarzenia z kalendarza na określony okres',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      start_date: { type: 'string', description: 'Data rozpoczęcia (ISO)' },
      end_date: { type: 'string', description: 'Data zakończenia (ISO)' },
    },
    required: ['start_date', 'end_date'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'list_calendar_events', {
      success: true,
      message: `Pobieram wydarzenia od ${args.start_date} do ${args.end_date}`,
    });
  },
};

export const deleteCalendarEventTool: ToolDefinition = {
  name: 'delete_calendar_event',
  category: 'calendar',
  description: 'Usuwa wydarzenie z kalendarza',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      event_id: { type: 'string', description: 'ID wydarzenia do usunięcia' },
      title: { type: 'string', description: 'Tytuł wydarzenia (jeśli nie znasz ID)' },
    },
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'delete_calendar_event', {
      success: true,
      message: `Usuwam wydarzenie: ${args.title || args.event_id}`,
    });
  },
};

// ============================================================
// TOOLS: Zadania (Mobile)
// ============================================================

export const addTaskTool: ToolDefinition = {
  name: 'add_task',
  category: 'task',
  description: 'Dodaje nowe zadanie do listy',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Tytuł zadania' },
      description: { type: 'string', description: 'Opis zadania' },
      priority: { type: 'string', description: 'Priorytet', enum: ['low', 'medium', 'high', 'urgent'] },
      due_date: { type: 'string', description: 'Termin (ISO)' },
      category: { type: 'string', description: 'Kategoria' },
    },
    required: ['title'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'add_task', {
      success: true,
      message: `Dodaję zadanie: ${args.title}`,
      task: args,
    });
  },
};

export const listTasksTool: ToolDefinition = {
  name: 'list_tasks',
  category: 'task',
  description: 'Listuje zadania (opcjonalnie filtrowane)',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      completed: { type: 'string', description: 'Filtruj po statusie', enum: ['true', 'false', 'all'] },
      priority: { type: 'string', description: 'Filtruj po priorytecie', enum: ['low', 'medium', 'high', 'urgent'] },
      category: { type: 'string', description: 'Filtruj po kategorii' },
    },
  },
  handler: async (_args, _ctx) => {
    return makeResult('', 'list_tasks', { success: true, tasks: [] });
  },
};

export const completeTaskTool: ToolDefinition = {
  name: 'complete_task',
  category: 'task',
  description: 'Oznacza zadanie jako ukończone',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: 'ID zadania' },
      title: { type: 'string', description: 'Tytuł zadania (jeśli nie znasz ID)' },
    },
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'complete_task', {
      success: true,
      message: `Oznaczam jako ukończone: ${args.title || args.task_id}`,
    });
  },
};

export const deleteTaskTool: ToolDefinition = {
  name: 'delete_task',
  category: 'task',
  description: 'Usuwa zadanie z listy',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      task_id: { type: 'string', description: 'ID zadania' },
      title: { type: 'string', description: 'Tytuł zadania' },
    },
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'delete_task', {
      success: true,
      message: `Usuwam zadanie: ${args.title || args.task_id}`,
    });
  },
};

// ============================================================
// TOOLS: Budziki (Mobile)
// ============================================================

export const setAlarmTool: ToolDefinition = {
  name: 'set_alarm',
  category: 'alarm',
  description: 'Ustawia budzik na określoną godzinę',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      time: { type: 'string', description: 'Godzina w formacie HH:MM' },
      label: { type: 'string', description: 'Etykieta budzika' },
      days: { type: 'string', description: 'Dni tygodnia (np. "1,2,3,4,5" dla pon-pt)' },
      gradual_volume: { type: 'string', description: 'Stopniowe zwiększanie głośności', enum: ['true', 'false'] },
    },
    required: ['time'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'set_alarm', {
      success: true,
      message: `Budzik ustawiony na ${args.time}`,
      alarm: args,
    });
  },
};

export const listAlarmsTool: ToolDefinition = {
  name: 'list_alarms',
  category: 'alarm',
  description: 'Listuje wszystkie ustawione budziki',
  platform: ['mobile'],
  parameters: { type: 'object', properties: {} },
  handler: async (_args, _ctx) => {
    return makeResult('', 'list_alarms', { success: true, alarms: [] });
  },
};

export const deleteAlarmTool: ToolDefinition = {
  name: 'delete_alarm',
  category: 'alarm',
  description: 'Usuwa budzik',
  platform: ['mobile'],
  parameters: {
    type: 'object',
    properties: {
      alarm_id: { type: 'string', description: 'ID budzika' },
      time: { type: 'string', description: 'Godzina budzika (jeśli nie znasz ID)' },
    },
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'delete_alarm', {
      success: true,
      message: `Usuwam budzik: ${args.time || args.alarm_id}`,
    });
  },
};

// ============================================================
// TOOLS: Pamięć (Desktop + Mobile)
// ============================================================

export const saveMemoryTool: ToolDefinition = {
  name: 'save_memory',
  category: 'memory',
  description: 'Zapisuje ciekawostkę lub fakt o użytkowniku do pamięci długotrwałej',
  platform: ['desktop', 'mobile'],
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Treść do zapamiętania' },
      category: { type: 'string', description: 'Kategoria', enum: ['fact', 'preference', 'interest', 'important'] },
      importance: { type: 'number', description: 'Ważność (1-10)' },
    },
    required: ['content', 'category'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'save_memory', {
      success: true,
      message: `Zapamiętuję: ${args.content}`,
      memory: args,
    });
  },
};

export const searchMemoryTool: ToolDefinition = {
  name: 'search_memory',
  category: 'memory',
  description: 'Przeszukuje pamięć długotrwałą',
  platform: ['desktop', 'mobile'],
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Fraza do wyszukania' },
      category: { type: 'string', description: 'Kategoria', enum: ['fact', 'preference', 'interest', 'important', 'all'] },
    },
    required: ['query'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'search_memory', {
      success: true,
      results: [],
      query: args.query,
    });
  },
};

// ============================================================
// TOOLS: Pliki (Desktop)
// ============================================================

export const readFileTool: ToolDefinition = {
  name: 'read_file',
  category: 'file',
  description: 'Czyta zawartość pliku',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Ścieżka do pliku' },
    },
    required: ['path'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'read_file', {
      success: true,
      path: args.path,
      content: '(implementacja w desktop)',
    });
  },
};

export const writeFileTool: ToolDefinition = {
  name: 'write_file',
  category: 'file',
  description: 'Zapisuje plik',
  platform: ['desktop'],
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Ścieżka do pliku' },
      content: { type: 'string', description: 'Zawartość pliku' },
    },
    required: ['path', 'content'],
  },
  handler: async (args, _ctx) => {
    return makeResult('', 'write_file', {
      success: true,
      message: `Zapisuję plik: ${args.path}`,
    });
  },
};

// ============================================================
// Eksport wszystkich narzędzi
// ============================================================

export const ALL_TOOLS: ToolDefinition[] = [
  // Emocje (NOWE - dostępne na obu platformach)
  setEmotionTool,
  // System
  getTimeTool,
  setTimerTool,
  // Browser (Desktop)
  openBrowserTool,
  clickScreenTool,
  typeTextTool,
  pressKeyTool,
  scrollTool,
  getScreenSizeTool,
  // Kalendarz (Mobile)
  addCalendarEventTool,
  listCalendarEventsTool,
  deleteCalendarEventTool,
  // Zadania (Mobile)
  addTaskTool,
  listTasksTool,
  completeTaskTool,
  deleteTaskTool,
  // Budziki (Mobile)
  setAlarmTool,
  listAlarmsTool,
  deleteAlarmTool,
  // Pamięć
  saveMemoryTool,
  searchMemoryTool,
  // Pliki (Desktop)
  readFileTool,
  writeFileTool,
];

/** Filtruj narzędzia po platformie */
export function getToolsForPlatform(platform: Platform): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => t.platform.includes(platform));
}

/** Konwertuj narzędzia na format Gemini Function Declarations */
export function toGeminiTools(tools: ToolDefinition[]): GeminiTool[] {
  return [
    {
      function_declarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

/** Znajdź handler narzędzia po nazwie */
export function findToolHandler(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
