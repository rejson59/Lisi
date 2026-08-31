// ============================================================
// useGemini Hook - Hook do zarządzania połączeniem Gemini
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { LisiState, ChatMessage, ToolResult } from '@shared/types';

interface UseGeminiOptions {
  apiKey: string;
  systemPrompt: string;
  onMessage?: (message: ChatMessage) => void;
  onStateChange?: (state: LisiState) => void;
  onToolCall?: (calls: Array<{ id: string; name: string; args: Record<string, unknown> }>) => void;
}

interface UseGeminiReturn {
  connected: boolean;
  state: LisiState;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendText: (text: string) => void;
  sendAudio: (data: ArrayBuffer) => void;
  sendImage: (base64: string, text?: string) => void;
  sendToolResponse: (results: ToolResult[]) => void;
}

export function useGemini(options: UseGeminiOptions): UseGeminiReturn {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<LisiState>('idle');
  const clientRef = useRef<any>(null);
  const optionsRef = useRef(options);
  
  // Aktualizuj ref
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(async () => {
    if (clientRef.current?.connected) return;

    try {
      const { GeminiLiveClient, getToolsForPlatform, toGeminiTools } = await import('@shared/index');
      
      const client = new GeminiLiveClient(options.apiKey, {
        system_instruction: {
          parts: [{ text: options.systemPrompt }],
        },
        tools: toGeminiTools(getToolsForPlatform('desktop')),
      });

      client.on('onConnected', () => {
        setConnected(true);
        setState('idle');
      });

      client.on('onDisconnected', () => {
        setConnected(false);
        setState('error');
      });

      client.on('onTextResponse', (text: string) => {
        setState('speaking');
        optionsRef.current.onMessage?.({
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
        });
      });

      client.on('onTurnComplete', () => {
        setState('idle');
      });

      client.on('onToolCall', (calls) => {
        setState('executing');
        optionsRef.current.onToolCall?.(calls);
      });

      client.on('onError', (error) => {
        console.error('[Gemini] Error:', error);
        setState('error');
      });

      await client.connect();
      clientRef.current = client;
    } catch (err) {
      console.error('[Gemini] Connection error:', err);
      setState('error');
    }
  }, [options.apiKey, options.systemPrompt]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setConnected(false);
    setState('idle');
  }, []);

  const sendText = useCallback((text: string) => {
    if (!clientRef.current?.connected) return;
    setState('thinking');
    clientRef.current.sendText(text);
  }, []);

  const sendAudio = useCallback((data: ArrayBuffer) => {
    if (!clientRef.current?.connected) return;
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    clientRef.current.sendAudio(base64);
  }, []);

  const sendImage = useCallback((base64: string, text?: string) => {
    if (!clientRef.current?.connected) return;
    if (text) {
      clientRef.current.sendImageWithText(base64, text);
    } else {
      clientRef.current.sendImage(base64);
    }
  }, []);

  const sendToolResponse = useCallback((results: ToolResult[]) => {
    if (!clientRef.current?.connected) return;
    clientRef.current.sendToolResponse(results);
    setState('idle');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    connected,
    state,
    connect,
    disconnect,
    sendText,
    sendAudio,
    sendImage,
    sendToolResponse,
  };
}
