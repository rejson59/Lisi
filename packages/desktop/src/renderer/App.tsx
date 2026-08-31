// ============================================================
// Lisi Desktop - Main App Component
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VRMViewer } from './components/VRMViewer';
import { ChatPanel } from './components/ChatPanel';
import { ControlBar } from './components/ControlBar';
import { SettingsPanel } from './components/SettingsPanel';
import { Titlebar } from './components/Titlebar';
import type { LisiSettings, ChatMessage, LisiState, ScreenShareFrame } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';

// Deklaracja globalnego API z preload
declare global {
  interface Window {
    lisi: import('../../preload/index').LisiAPI;
  }
}

export default function App() {
  // ---- State ----
  const [settings, setSettings] = useState<LisiSettings>(DEFAULT_SETTINGS as LisiSettings);
  const [lisiState, setLisiState] = useState<LisiState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isImageSharing, setIsImageSharing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentText, setCurrentText] = useState('');

  // ---- Refs ----
  const geminiRef = useRef<any>(null);
  const micRef = useRef<any>(null);
  const audioRef = useRef<any>(null);

  // ---- Inicjalizacja ----
  useEffect(() => {
    initializeApp();
    return () => cleanup();
  }, []);

  const initializeApp = async () => {
    // Załaduj ustawienia z localStorage (tymczasowe, potem Supabase)
    const savedSettings = localStorage.getItem('lisi-settings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } as LisiSettings);
      } catch (e) {
        console.error('Błąd ładowania ustawień:', e);
      }
    }

    // Inicjalizuj Gemini jeśli jest klucz API
    const apiKey = settings.gemini_api_key || localStorage.getItem('gemini-api-key');
    if (apiKey) {
      await initializeGemini(apiKey);
    }
  };

  const initializeGemini = async (apiKey: string) => {
    try {
      // Dynamiczny import Gemini client
      const { GeminiLiveClient, getToolsForPlatform, toGeminiTools, AudioBufferManager, MicrophoneCapture } = await import('@shared/index');
      
      const client = new GeminiLiveClient(apiKey, {
        system_instruction: {
          parts: [{ text: settings.system_prompt }],
        },
        tools: toGeminiTools(getToolsForPlatform('desktop')),
      });

      // Event handlers
      client.on('onConnected', () => {
        setConnected(true);
        addMessage('system', 'Połączono z Lisi~ ✨');
      });

      client.on('onDisconnected', () => {
        setConnected(false);
        addMessage('system', 'Rozłączono. Próbuję ponownie...');
      });

      client.on('onTextResponse', (text: string) => {
        setCurrentText((prev) => prev + text);
        setLisiState('speaking');
      });

      client.on('onTurnComplete', () => {
        if (currentText) {
          addMessage('assistant', currentText);
          setCurrentText('');
        }
        setLisiState('idle');
      });

      client.on('onToolCall', async (calls) => {
        setLisiState('executing');
        // Tool calls będą obsługiwane przez tool handler
        for (const call of calls) {
          addMessage('system', `🔧 Wykonuję: ${call.name}...`);
        }
      });

      client.on('onError', (error) => {
        console.error('Gemini error:', error);
        setLisiState('error');
      });

      // Połącz
      await client.connect();
      geminiRef.current = client;

      // Inicjalizuj audio
      const audioManager = new AudioBufferManager();
      audioManager.onPlay(() => setLisiState('speaking'));
      audioManager.onStop(() => setLisiState('idle'));
      audioRef.current = audioManager;

      const micCapture = new MicrophoneCapture();
      micCapture.onData((data) => {
        if (client.connected && !isMuted) {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
          client.sendAudio(base64);
        }
      });
      micRef.current = micCapture;

    } catch (err) {
      console.error('Błąd inicjalizacji Gemini:', err);
      addMessage('system', '❌ Błąd połączenia. Sprawdź klucz API w ustawieniach.');
    }
  };

  const cleanup = () => {
    geminiRef.current?.disconnect();
    micRef.current?.stop();
    audioRef.current?.clear();
  };

  // ---- Chat ----
  const addMessage = useCallback((role: ChatMessage['role'], content: string) => {
    const msg: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    
    addMessage('user', text);
    setLisiState('thinking');
    
    if (geminiRef.current?.connected) {
      geminiRef.current.sendText(text);
    } else {
      addMessage('system', 'Nie połączono z Gemini. Sprawdź klucz API.');
      setLisiState('idle');
    }
  }, [addMessage]);

  // ---- Mikrofon ----
  const toggleMicrophone = useCallback(async () => {
    if (isListening) {
      micRef.current?.stop();
      setIsListening(false);
      setLisiState('idle');
    } else {
      try {
        await micRef.current?.start();
        setIsListening(true);
        setLisiState('listening');
      } catch (err) {
        console.error('Błąd mikrofonu:', err);
        addMessage('system', '❌ Nie mogę uzyskać dostępu do mikrofonu');
      }
    }
  }, [isListening, addMessage]);

  // ---- Screen Share ----
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await window.lisi.capture.stopShare();
      setIsScreenSharing(false);
      setCurrentFrame(null);
    } else {
      await window.lisi.capture.startShare();
      setIsScreenSharing(true);
      
      // Nasłuchuj klatek
      const unsubscribe = window.lisi.capture.onFrame((frame) => {
        setCurrentFrame(`data:image/jpeg;base64,${frame.data}`);
        
        // Wyślij klatkę do Gemini jeśli połączono
        if (geminiRef.current?.connected) {
          geminiRef.current.sendRealtimeVideo(frame.data);
        }
      });
      
      // Cleanup on unmount
      return unsubscribe;
    }
  }, [isScreenSharing]);

  // ---- Image Share ----
  const toggleImageShare = useCallback(() => {
    setIsImageSharing(!isImageSharing);
  }, [isImageSharing]);

  // ---- Mute ----
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 1 : 0;
    }
  }, [isMuted]);

  // ---- Settings ----
  const saveSettings = useCallback(async (newSettings: Partial<LisiSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('lisi-settings', JSON.stringify(updated));
    
    // Aktualizuj Gemini jeśli zmieniono klucz lub system prompt
    if (newSettings.gemini_api_key && newSettings.gemini_api_key !== settings.gemini_api_key) {
      await initializeGemini(newSettings.gemini_api_key);
    }
    
    if (newSettings.system_prompt && geminiRef.current) {
      geminiRef.current.updateSystemInstruction(newSettings.system_prompt);
    }
  }, [settings]);

  // ---- Render ----
  return (
    <div className={`app-container state-${lisiState}`}>
      <Titlebar />
      
      {/* Sidebar */}
      <div className="sidebar">
        <button
          className={`sidebar-btn ${showChat ? 'active' : ''}`}
          onClick={() => setShowChat(!showChat)}
          title="Czat"
        >
          💬
        </button>
        <button
          className="sidebar-btn"
          onClick={() => setShowSettings(true)}
          title="Ustawienia"
        >
          ⚙️
        </button>
        <div className="sidebar-divider" />
        <button
          className={`sidebar-btn ${isListening ? 'active' : ''}`}
          onClick={toggleMicrophone}
          title={isListening ? 'Zatrzymaj nasłuchiwanie' : 'Rozpocznij nasłuchiwanie'}
        >
          🎤
        </button>
        <button
          className={`sidebar-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Zatrzymj udostępnianie' : 'Udostępnij ekran'}
        >
          🖥️
        </button>
      </div>

      {/* Główny obszar z modelem VRM */}
      <div className={`avatar-area ${lisiState === 'executing' ? 'minimized' : 'centered'}`}>
        <div className={`vrm-container ${lisiState === 'executing' ? 'minimized' : 'centered'}`}>
          <VRMViewer
            modelPath="./Lisi.vrm"
            state={lisiState}
            isSpeaking={lisiState === 'speaking'}
            isListening={isListening}
          />
        </div>
        
        {/* Status */}
        <div className="status-indicator" style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)' }}>
          <div className={`status-dot ${connected ? '' : 'disconnected'}`} />
          <span>
            {connected 
              ? lisiState === 'listening' ? 'Nasłuchuję...' 
                : lisiState === 'thinking' ? 'Myślę...' 
                : lisiState === 'speaking' ? 'Mówię...' 
                : lisiState === 'executing' ? 'Wykonuję zadanie...'
                : 'Gotowa~ ✨'
              : 'Łączenie...'
            }
          </span>
        </div>
      </div>

      {/* Panel czatu */}
      <ChatPanel
        messages={chatMessages}
        visible={showChat}
        onSend={sendMessage}
        currentText={currentText}
      />

      {/* Pasek kontrolny */}
      <ControlBar
        isMuted={isMuted}
        isScreenSharing={isScreenSharing}
        isImageSharing={isImageSharing}
        isListening={isListening}
        onToggleMute={toggleMute}
        onToggleScreenShare={toggleScreenShare}
        onToggleImageShare={toggleImageShare}
        onToggleListening={toggleMicrophone}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Podgląd udostępnionego ekranu */}
      {isScreenSharing && currentFrame && (
        <div className="screen-share-preview">
          <img src={currentFrame} alt="Screen share" />
        </div>
      )}

      {/* Panel ustawień */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
