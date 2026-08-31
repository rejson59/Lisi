// ============================================================
// Lisi Mobile - Główny komponent aplikacji
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import TasksScreen from './src/screens/TasksScreen';
import type { LisiSettings, ChatMessage, LisiState } from '../shared/src/types';
import { DEFAULT_SETTINGS } from '../shared/src/types';

const Stack = createNativeStackNavigator();

export default function App() {
  const [settings, setSettings] = useState<LisiSettings>(DEFAULT_SETTINGS as LisiSettings);
  const [lisiState, setLisiState] = useState<LisiState>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // ---- Inicjalizacja ----
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('lisi-settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) } as LisiSettings);
      }
    } catch (err) {
      console.error('Błąd ładowania ustawień:', err);
    }
  };

  const saveSettings = useCallback(async (newSettings: Partial<LisiSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AsyncStorage.setItem('lisi-settings', JSON.stringify(updated));
  }, [settings]);

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
    // Gemini integration handled in HomeScreen
  }, [addMessage]);

  // ---- Render ----
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home">
            {(props) => (
              <HomeScreen
                {...props}
                settings={settings}
                lisiState={lisiState}
                setLisiState={setLisiState}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                connected={connected}
                setConnected={setConnected}
                isListening={isListening}
                setIsListening={setIsListening}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
                addMessage={addMessage}
                sendMessage={sendMessage}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings">
            {(props) => (
              <SettingsScreen
                {...props}
                settings={settings}
                onSave={saveSettings}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Calendar" component={CalendarScreen} />
          <Stack.Screen name="Tasks" component={TasksScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
