// ============================================================
// Settings Screen - Ekran ustawień (Mobile)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LisiSettings } from '../../../shared/src/types';

interface SettingsScreenProps {
  navigation: NativeStackNavigationProp<any>;
  settings: LisiSettings;
  onSave: (settings: Partial<LisiSettings>) => void;
}

export default function SettingsScreen({ navigation, settings, onSave }: SettingsScreenProps) {
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleChange = <K extends keyof LisiSettings>(key: K, value: LisiSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    Alert.alert('Zapisano', 'Ustawienia zostały zapisane~ ✨');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Ustawienia</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Zapisz</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Profil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Twój profil</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Twoje imię</Text>
            <TextInput
              style={styles.input}
              value={localSettings.user_name}
              onChangeText={(v) => handleChange('user_name', v)}
              placeholder="Jak mam się do Ciebie zwracać?"
              placeholderTextColor="#606078"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Język</Text>
            <View style={styles.selectRow}>
              {['pl', 'en', 'ja', 'de'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.selectOption,
                    localSettings.user_language === lang && styles.selectOptionActive,
                  ]}
                  onPress={() => handleChange('user_language', lang)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    localSettings.user_language === lang && styles.selectOptionTextActive,
                  ]}>
                    {lang === 'pl' ? '🇵🇱 PL' : lang === 'en' ? '🇬🇧 EN' : lang === 'ja' ? '🇯🇵 JP' : '🇩🇪 DE'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Osobowość */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🦊 Osobowość Lisi</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>System Prompt</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={localSettings.system_prompt}
              onChangeText={(v) => handleChange('system_prompt', v)}
              placeholder="Opisz jak Lisi ma się zachowywać..."
              placeholderTextColor="#606078"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>Ten prompt definiuje osobowość Lisi~ ✨</Text>
          </View>
        </View>

        {/* API */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 Klucze API</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Gemini API Key *</Text>
            <TextInput
              style={styles.input}
              value={localSettings.gemini_api_key}
              onChangeText={(v) => handleChange('gemini_api_key', v)}
              placeholder="Wklej klucz z Google AI Studio"
              placeholderTextColor="#606078"
              secureTextEntry
            />
            <Text style={styles.hint}>
              Pobierz za darmo z aistudio.google.com/apikey
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Supabase URL</Text>
            <TextInput
              style={styles.input}
              value={(localSettings as any).supabase_url || ''}
              onChangeText={(v) => setLocalSettings((prev) => ({ ...prev, supabase_url: v } as any))}
              placeholder="https://xxx.supabase.co"
              placeholderTextColor="#606078"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Supabase Anon Key</Text>
            <TextInput
              style={styles.input}
              value={(localSettings as any).supabase_anon_key || ''}
              onChangeText={(v) => setLocalSettings((prev) => ({ ...prev, supabase_anon_key: v } as any))}
              placeholder="eyJ..."
              placeholderTextColor="#606078"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Głos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Głos</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Głos</Text>
            <View style={styles.selectRow}>
              {[
                { id: 'default', label: 'Domyślny' },
                { id: 'Kore', label: 'Kore (żeński)' },
                { id: 'Aoede', label: 'Aoede (żeński)' },
                { id: 'Puck', label: 'Puck (męski)' },
              ].map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.selectOption,
                    localSettings.voice_id === voice.id && styles.selectOptionActive,
                  ]}
                  onPress={() => handleChange('voice_id', voice.id)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    localSettings.voice_id === voice.id && styles.selectOptionTextActive,
                  ]}>
                    {voice.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Funkcje */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Funkcje</Text>
          
          <View style={styles.toggleField}>
            <View style={styles.toggleInfo}>
              <Text style={styles.label}>Fraza wybudzania</Text>
              <Text style={styles.hint}>"Hej Lisi" aktywuje nasłuchiwanie</Text>
            </View>
            <Switch
              value={localSettings.wake_word_enabled}
              onValueChange={(v) => handleChange('wake_word_enabled', v)}
              trackColor={{ false: '#3a3a50', true: '#ff6b9d' }}
              thumbColor={localSettings.wake_word_enabled ? '#fff' : '#888'}
            />
          </View>

          {localSettings.wake_word_enabled && (
            <View style={styles.field}>
              <Text style={styles.label}>Fraza</Text>
              <TextInput
                style={styles.input}
                value={localSettings.wake_word_phrase}
                onChangeText={(v) => handleChange('wake_word_phrase', v)}
                placeholder="Hej Lisi"
                placeholderTextColor="#606078"
              />
            </View>
          )}

          <View style={styles.toggleField}>
            <View style={styles.toggleInfo}>
              <Text style={styles.label}>Kontrola ekranu</Text>
              <Text style={styles.hint}>Lisi może klikać i nawigować</Text>
            </View>
            <Switch
              value={localSettings.screen_control_enabled}
              onValueChange={(v) => handleChange('screen_control_enabled', v)}
              trackColor={{ false: '#3a3a50', true: '#ff6b9d' }}
              thumbColor={localSettings.screen_control_enabled ? '#fff' : '#888'}
            />
          </View>

          <View style={styles.toggleField}>
            <View style={styles.toggleInfo}>
              <Text style={styles.label}>Automatyczna pamięć</Text>
              <Text style={styles.hint}>Lisi zapamiętuje ciekawostki o Tobie</Text>
            </View>
            <Switch
              value={localSettings.auto_memory_enabled}
              onValueChange={(v) => handleChange('auto_memory_enabled', v)}
              trackColor={{ false: '#3a3a50', true: '#ff6b9d' }}
              thumbColor={localSettings.auto_memory_enabled ? '#fff' : '#888'}
            />
          </View>
        </View>

        {/* Wygląd */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Wygląd</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Motyw</Text>
            <View style={styles.selectRow}>
              {[
                { id: 'dark', label: '🌙 Ciemny' },
                { id: 'light', label: '☀️ Jasny' },
                { id: 'anime', label: '🌸 Anime' },
              ].map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.selectOption,
                    localSettings.theme === theme.id && styles.selectOptionActive,
                  ]}
                  onPress={() => handleChange('theme', theme.id as any)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    localSettings.theme === theme.id && styles.selectOptionTextActive,
                  ]}>
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Przycisk zapisz na dole */}
        <TouchableOpacity style={styles.saveButtonFull} onPress={handleSave}>
          <Text style={styles.saveButtonFullText}>💾 Zapisz ustawienia</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#e8e8f0',
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff9a56',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff6b9d',
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b9d',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#a0a0b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(30,30,50,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e8e8f0',
    fontSize: 14,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: '#606078',
    marginTop: 4,
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30,30,50,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectOptionActive: {
    backgroundColor: 'rgba(255,107,157,0.2)',
    borderColor: '#ff6b9d',
  },
  selectOptionText: {
    color: '#a0a0b8',
    fontSize: 13,
  },
  selectOptionTextActive: {
    color: '#ff6b9d',
    fontWeight: '600',
  },
  toggleField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  saveButtonFull: {
    backgroundColor: '#ff6b9d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonFullText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
