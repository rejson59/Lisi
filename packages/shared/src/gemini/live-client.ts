// ============================================================
// Gemini Live API WebSocket Client
// Komunikacja z Gemini 3.1 Live Preview przez WebSocket
// ============================================================

import type {
  GeminiConfig,
  WSClientMessage,
  WSServerMessage,
  ToolCall,
  ToolResult,
  LisiState,
} from '../types';

type EventHandler<T = unknown> = (data: T) => void;

interface LiveClientEvents {
  onStateChange: (state: LisiState) => void;
  onTextResponse: (text: string) => void;
  onAudioResponse: (audioData: string, mimeType: string) => void;
  onToolCall: (calls: Array<{ id: string; name: string; args: Record<string, unknown> }>) => void;
  onError: (error: Error) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private config: GeminiConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Partial<LiveClientEvents> = {};
  private pendingAudioChunks: string[] = [];
  private currentAudioMimeType = 'audio/pcm;rate=24000';
  private setupPromise: Promise<void> | null = null;
  private setupResolve: (() => void) | null = null;
  private setupReject: ((err: Error) => void) | null = null;

  private static readonly WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

  constructor(apiKey: string, config: Partial<GeminiConfig> = {}) {
    this.apiKey = apiKey;
    this.config = {
      model: 'models/gemini-2.0-flash-live-001',
      generation_config: {
        response_modalities: ['AUDIO', 'TEXT'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: 'Aoede',
            },
          },
        },
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
      },
      ...config,
    };
  }

  // ---- Event Handlers ----
  on<K extends keyof LiveClientEvents>(event: K, handler: LiveClientEvents[K]): void {
    this.eventHandlers[event] = handler;
  }

  off<K extends keyof LiveClientEvents>(event: K): void {
    delete this.eventHandlers[event];
  }

  // ---- Połączenie ----
  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      const url = `${GeminiLiveClient.WS_URL}?key=${this.apiKey}`;
      
      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        reject(new Error(`Nie udało się utworzyć WebSocket: ${err}`));
        return;
      }

      this.setupResolve = resolve;
      this.setupReject = reject;

      this.ws.onopen = () => {
        console.log('[Gemini] WebSocket połączony, wysyłam konfigurację...');
        this.sendSetup();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.error('[Gemini] WebSocket błąd:', event);
        const error = new Error('WebSocket error');
        this.eventHandlers.onError?.(error);
        if (this.setupReject) {
          this.setupReject(error);
          this.setupReject = null;
          this.setupResolve = null;
        }
      };

      this.ws.onclose = (event) => {
        console.log('[Gemini] WebSocket zamknięty:', event.code, event.reason);
        this.isConnected = false;
        this.eventHandlers.onDisconnected?.();
        
        // Automatyczne ponowne połączenie
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`[Gemini] Ponowne połączenie za ${delay}ms (próba ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };
    });
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // zapobiegaj reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  // ---- Wysyłanie wiadomości ----
  
  /** Wyślij konfigurację początkową */
  private sendSetup(): void {
    const message: WSClientMessage = {
      setup: this.config,
    };
    this.sendRaw(message);
  }

  /** Wyślij wiadomość tekstową */
  sendText(text: string): void {
    if (!this.isConnected) {
      console.warn('[Gemini] Nie połączono, nie mogę wysłać tekstu');
      return;
    }

    const message: WSClientMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turn_complete: true,
      },
    };
    this.sendRaw(message);
  }

  /** Wyślij dane audio (base64 PCM) */
  sendAudio(audioData: string, mimeType = 'audio/pcm;rate=16000'): void {
    if (!this.isConnected) return;

    const message: WSClientMessage = {
      realtime_input: {
        mime_type: mimeType,
        data: audioData,
      },
    };
    this.sendRaw(message);
  }

  /** Wyślij klatkę obrazu (base64) */
  sendImage(imageData: string, mimeType = 'image/jpeg'): void {
    if (!this.isConnected) return;

    const message: WSClientMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData,
                },
              },
            ],
          },
        ],
        turn_complete: true,
      },
    };
    this.sendRaw(message);
  }

  /** Wyślij obraz + tekst razem */
  sendImageWithText(imageData: string, text: string, mimeType = 'image/jpeg'): void {
    if (!this.isConnected) return;

    const message: WSClientMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData,
                },
              },
              { text },
            ],
          },
        ],
        turn_complete: true,
      },
    };
    this.sendRaw(message);
  }

  /** Wyślij wynik wywołania narzędzia */
  sendToolResponse(results: ToolResult[]): void {
    if (!this.isConnected) return;

    const message: WSClientMessage = {
      tool_response: {
        function_responses: results.map((r) => ({
          id: r.call_id,
          name: r.name,
          response: r.result,
        })),
      },
    };
    this.sendRaw(message);
  }

  /** Wyślij strumień audio w czasie rzeczywistym (realtime_input) */
  sendRealtimeAudio(chunk: ArrayBuffer, mimeType = 'audio/pcm;rate=16000'): void {
    if (!this.isConnected) return;

    const base64 = this.arrayBufferToBase64(chunk);
    const message: WSClientMessage = {
      realtime_input: {
        mime_type: mimeType,
        data: base64,
      },
    };
    this.sendRaw(message);
  }

  /** Wyślij klatkę wideo w czasie rzeczywistym */
  sendRealtimeVideo(frameData: string, mimeType = 'image/jpeg'): void {
    if (!this.isConnected) return;

    const message: WSClientMessage = {
      realtime_input: {
        mime_type: mimeType,
        data: frameData,
      },
    };
    this.sendRaw(message);
  }

  // ---- Odbieranie wiadomości ----
  private handleMessage(rawData: string | ArrayBuffer): void {
    try {
      let textData: string;
      if (typeof rawData === 'string') {
        textData = rawData;
      } else {
        textData = new TextDecoder().decode(rawData);
      }

      const message: WSServerMessage = JSON.parse(textData);

      // Setup complete
      if (message.setup_complete) {
        console.log('[Gemini] Konfiguracja zakończona pomyślnie');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.eventHandlers.onConnected?.();
        this.setupResolve?.();
        this.setupResolve = null;
        this.setupReject = null;
        return;
      }

      // Tool call
      if (message.tool_call?.function_calls) {
        console.log('[Gemini] Tool call:', message.tool_call.function_calls);
        this.eventHandlers.onToolCall?.(message.tool_call.function_calls);
        return;
      }

      // Server content (odpowiedzi)
      if (message.server_content) {
        const content = message.server_content;

        if (content.interrupted) {
          console.log('[Gemini] Przerwano');
          this.eventHandlers.onInterrupted?.();
          return;
        }

        if (content.model_turn?.parts) {
          for (const part of content.model_turn.parts) {
            if (part.text) {
              this.eventHandlers.onTextResponse?.(part.text);
            }
            if (part.inline_data) {
              this.eventHandlers.onAudioResponse?.(
                part.inline_data.data,
                part.inline_data.mime_type
              );
            }
          }
        }

        if (content.turn_complete) {
          this.eventHandlers.onTurnComplete?.();
        }
      }

      // Go away (ostrzeżenie o końcu sesji)
      if (message.go_away) {
        console.warn('[Gemini] Sesja kończy się:', message.go_away.time_left);
      }
    } catch (err) {
      console.error('[Gemini] Błąd parsowania wiadomości:', err);
    }
  }

  // ---- Narzędzia ----
  updateTools(tools: GeminiConfig['tools']): void {
    this.config.tools = tools;
    // Jeśli połączono, wyślij nową konfigurację
    if (this.isConnected) {
      this.sendSetup();
    }
  }

  updateSystemInstruction(instruction: string): void {
    this.config.system_instruction = {
      parts: [{ text: instruction }],
    };
  }

  // ---- Stan ----
  get connected(): boolean {
    return this.isConnected;
  }

  get state(): LisiState {
    return this.isConnected ? 'idle' : 'error';
  }

  // ---- Pomocnicze ----
  private sendRaw(message: WSClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Gemini] WebSocket nie jest otwarty');
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
