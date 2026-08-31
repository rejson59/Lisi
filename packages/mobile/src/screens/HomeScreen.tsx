// ============================================================
// Home Screen - Główny ekran z Lisi
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Voice from 'react-native-voice';
import * as Speech from 'expo-speech';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LisiSettings, ChatMessage, LisiState } from '../../../shared/src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<any>;
  settings: LisiSettings;
  lisiState: LisiState;
  setLisiState: (state: LisiState) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  addMessage: (role: ChatMessage['role'], content: string) => void;
  sendMessage: (text: string) => void;
}

export default function HomeScreen({
  navigation,
  settings,
  lisiState,
  setLisiState,
  chatMessages,
  setChatMessages,
  connected,
  setConnected,
  isListening,
  setIsListening,
  isMuted,
  setIsMuted,
  addMessage,
  sendMessage,
}: HomeScreenProps) {
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [partialText, setPartialText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const geminiRef = useRef<any>(null);

  // ---- Animacje ----
  useEffect(() => {
    // Animacja pulsowania (nasłuchiwanie)
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  useEffect(() => {
    // Animacja unoszenia (idle)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ---- Voice Recognition (Wake Word) ----
  useEffect(() => {
    if (!settings.wake_word_enabled) return;

    Voice.onSpeechResults = (event) => {
      const text = event.value?.[0]?.toLowerCase() || '';
      
      // Sprawdź frazę wybudzania
      if (text.includes(settings.wake_word_phrase.toLowerCase())) {
        console.log('[Wake] Wykryto frazę wybudzania!');
        startListening();
      }
    };

    Voice.onSpeechPartialResults = (event) => {
      setPartialText(event.value?.[0] || '');
    };

    // Uruchom ciągłe nasłuchiwanie w tle
    startWakeWordListening();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [settings.wake_word_enabled, settings.wake_word_phrase]);

  const startWakeWordListening = async () => {
    try {
      await Voice.start('pl-PL');
    } catch (err) {
      console.error('[Wake] Błąd nasłuchiwanie:', err);
    }
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      setLisiState('listening');
      await Voice.start('pl-PL');
    } catch (err) {
      console.error('[Voice] Błąd:', err);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
      setLisiState('idle');
      
      // Wyślij rozpoznany tekst
      if (partialText) {
        sendMessage(partialText);
        setPartialText('');
      }
      
      // Wznów nasłuchiwanie wake word
      if (settings.wake_word_enabled) {
        setTimeout(() => startWakeWordListening(), 500);
      }
    } catch (err) {
      console.error('[Voice] Błąd zatrzymywania:', err);
    }
  };

  // ---- Gemini Integration ----
  useEffect(() => {
    initializeGemini();
  }, [settings.gemini_api_key]);

  const initializeGemini = async () => {
    if (!settings.gemini_api_key) return;

    try {
      const { GeminiLiveClient, getToolsForPlatform, toGeminiTools } = await import('../../../shared/src/index');
      
      const client = new GeminiLiveClient(settings.gemini_api_key, {
        system_instruction: {
          parts: [{ text: settings.system_prompt }],
        },
        tools: toGeminiTools(getToolsForPlatform('mobile')),
      });

      client.on('onConnected', () => {
        setConnected(true);
        addMessage('system', 'Połączono z Lisi~ ✨');
      });

      client.on('onDisconnected', () => {
        setConnected(false);
      });

      client.on('onTextResponse', (text: string) => {
        addMessage('assistant', text);
        setLisiState('speaking');
        
        // TTS
        if (!isMuted) {
          Speech.speak(text, {
            language: settings.voice_language,
            rate: settings.voice_speed,
            pitch: settings.voice_pitch,
            onDone: () => setLisiState('idle'),
          });
        }
      });

      client.on('onToolCall', async (calls) => {
        setLisiState('executing');
        for (const call of calls) {
          addMessage('system', `🔧 ${call.name}...`);
        }
      });

      await client.connect();
      geminiRef.current = client;
    } catch (err) {
      console.error('[Gemini] Błąd:', err);
    }
  };

  // ---- Send Message ----
  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    
    sendMessage(inputText);
    setInputText('');
    
    if (geminiRef.current?.connected) {
      geminiRef.current.sendText(inputText);
    }
  }, [inputText, sendMessage]);

  // ---- Render ----
  const getStateText = () => {
    switch (lisiState) {
      case 'listening': return 'Nasłuchuję... 🎤';
      case 'thinking': return 'Myślę... 🤔';
      case 'speaking': return 'Mówię~ ✨';
      case 'executing': return 'Wykonuję zadanie... ⚡';
      case 'error': return 'Coś poszło nie tak 😿';
      default: return connected ? 'Gotowa~ 🦊' : 'Łączenie...';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦊 Lisi</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Calendar')}
          >
            <Text style={styles.headerBtnText}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={styles.headerBtnText}>✅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.headerBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Avatar Lisi */}
      <View style={styles.avatarContainer}>
        <Animated.View
          style={[
            styles.avatarWrapper,
            {
              transform: [
                { scale: pulseAnim },
                { translateY: floatAnim },
              ],
            },
          ]}
        >
          {/* Placeholder dla modelu 3D - w produkcji użyj WebView z Three.js */}
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarEmoji}>🦊</Text>
            <Text style={styles.avatarName}>Lisi</Text>
          </View>
        </Animated.View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: connected ? '#4ade80' : '#f87171' }]} />
          <Text style={styles.statusText}>{getStateText()}</Text>
        </View>

        {/* Partial text (rozpoznawanie mowy) */}
        {isListening && partialText ? (
          <View style={styles.partialTextContainer}>
            <Text style={styles.partialText}>{partialText}</Text>
          </View>
        ) : null}
      </View>

      {/* Chat (rozwijany) */}
      {showChat && (
        <View style={styles.chatContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatMessages}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
          >
            {chatMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.chatBubble,
                  msg.role === 'user' ? styles.chatBubbleUser : 
                  msg.role === 'assistant' ? styles.chatBubbleAssistant :
                  styles.chatBubbleSystem,
                ]}
              >
                {msg.role === 'assistant' && (
                  <Text style={styles.chatBubbleName}>🦊 Lisi</Text>
                )}
                <Text style={[
                  styles.chatBubbleText,
                  msg.role === 'user' && { color: '#fff' },
                  msg.role === 'system' && { color: '#606078', fontSize: 12 },
                ]}>
                  {msg.content}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Napisz do Lisi..."
              placeholderTextColor="#606078"
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={handleSend}>
              <Text style={styles.chatSendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Control Bar */}
      <View style={styles.controlBar}>
        {/* Nasłuchiwanie */}
        <TouchableOpacity
          style={[styles.controlBtn, isListening && styles.controlBtnActive]}
          onPress={isListening ? stopListening : startListening}
        >
          <Text style={styles.controlBtnText}>{isListening ? '⏹️' : '🎤'}</Text>
        </TouchableOpacity>

        {/* Wyciszenie */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.controlBtnText}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>

        {/* Udostępnianie ekranu */}
        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlBtnText}>🖥️</Text>
        </TouchableOpacity>

        {/* Udostępnianie obrazu */}
        <TouchableOpacity style={styles.controlBtn}>
          <Text style={styles.controlBtnText}>🖼️</Text>
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.controlSeparator} />

        {/* Chat toggle */}
        <TouchableOpacity
          style={[styles.controlBtn, showChat && styles.controlBtnActive]}
          onPress={() => setShowChat(!showChat)}
        >
          <Text style={styles.controlBtnText}>💬</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff9a56',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 18,
  },
  avatarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 200,
    height: 280,
    borderRadius: 20,
    backgroundColor: 'rgba(255,154,86,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,154,86,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 80,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff9a56',
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#a0a0b8',
  },
  partialTextContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    maxWidth: '80%',
  },
  partialText: {
    color: '#e8e8f0',
    fontSize: 14,
    fontStyle: 'italic',
  },
  chatContainer: {
    maxHeight: SCREEN_HEIGHT * 0.35,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chatMessages: {
    padding: 16,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#ff6b9d',
    borderBottomRightRadius: 4,
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30,30,50,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  chatBubbleSystem: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  chatBubbleName: {
    fontSize: 11,
    color: '#ff9a56',
    fontWeight: '600',
    marginBottom: 4,
  },
  chatBubbleText: {
    fontSize: 14,
    color: '#e8e8f0',
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(30,30,50,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e8e8f0',
    fontSize: 14,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ff6b9d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnText: {
    color: '#fff',
    fontSize: 18,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,25,0.95)',
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#ff6b9d',
  },
  controlBtnText: {
    fontSize: 20,
  },
  controlSeparator: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
  },
});
