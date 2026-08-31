// ============================================================
// Calendar Screen - Ekran kalendarza (Mobile)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CalendarEvent } from '../../../shared/src/types';

interface CalendarScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
  });

  // Załaduj wydarzenia z Supabase
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    // TODO: Załaduj z Supabase
    // Tymczasowo przykładowe dane
    setEvents([
      {
        id: '1',
        user_id: 'local',
        title: 'Spotkanie z przyjaciółmi',
        description: 'Kawa w centrum',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 7200000).toISOString(),
        all_day: false,
        color: '#ff6b9d',
      },
      {
        id: '2',
        user_id: 'local',
        title: 'Trening',
        description: 'Siłownia',
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 90000000).toISOString(),
        all_day: false,
        color: '#4ade80',
      },
    ]);
  };

  const addEvent = async () => {
    if (!newEvent.title.trim()) {
      Alert.alert('Błąd', 'Podaj tytuł wydarzenia');
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      user_id: 'local',
      title: newEvent.title,
      description: newEvent.description,
      location: newEvent.location,
      start_time: `${newEvent.date}T${newEvent.startTime}:00`,
      end_time: `${newEvent.date}T${newEvent.endTime}:00`,
      all_day: false,
      color: '#ff6b9d',
    };

    setEvents((prev) => [...prev, event].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ));
    
    // TODO: Zapisz w Supabase
    
    setShowAddModal(false);
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
    });
  };

  const deleteEvent = (id: string) => {
    Alert.alert('Usuń wydarzenie', 'Na pewno?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          // TODO: Usuń z Supabase
        },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const isTomorrow = (iso: string) => {
    const d = new Date(iso);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.toDateString() === tomorrow.toDateString();
  };

  const getDayLabel = (iso: string) => {
    if (isToday(iso)) return 'Dzisiaj';
    if (isTomorrow(iso)) return 'Jutro';
    return formatDate(iso);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 Kalendarz</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Lista wydarzeń */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>Brak wydarzeń</Text>
            <Text style={styles.emptyHint}>Dodaj wydarzenie lub poproś Lisi~</Text>
          </View>
        ) : (
          events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onLongPress={() => deleteEvent(event.id!)}
            >
              <View style={[styles.eventColor, { backgroundColor: event.color || '#ff6b9d' }]} />
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {getDayLabel(event.start_time)} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </Text>
                {event.description ? (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                ) : null}
                {event.location ? (
                  <Text style={styles.eventLocation}>📍 {event.location}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal dodawania */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📅 Nowe wydarzenie</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Tytuł"
              placeholderTextColor="#606078"
              value={newEvent.title}
              onChangeText={(v) => setNewEvent((p) => ({ ...p, title: v }))}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Opis (opcjonalnie)"
              placeholderTextColor="#606078"
              value={newEvent.description}
              onChangeText={(v) => setNewEvent((p) => ({ ...p, description: v }))}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Data (YYYY-MM-DD)"
              placeholderTextColor="#606078"
              value={newEvent.date}
              onChangeText={(v) => setNewEvent((p) => ({ ...p, date: v }))}
            />
            
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="Start (HH:MM)"
                placeholderTextColor="#606078"
                value={newEvent.startTime}
                onChangeText={(v) => setNewEvent((p) => ({ ...p, startTime: v }))}
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="Koniec (HH:MM)"
                placeholderTextColor="#606078"
                value={newEvent.endTime}
                onChangeText={(v) => setNewEvent((p) => ({ ...p, endTime: v }))}
              />
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Lokalizacja (opcjonalnie)"
              placeholderTextColor="#606078"
              value={newEvent.location}
              onChangeText={(v) => setNewEvent((p) => ({ ...p, location: v }))}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={addEvent}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Dodaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f19' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#e8e8f0', fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ff9a56' },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#ff6b9d', alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#a0a0b8', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#606078', marginTop: 8 },
  eventCard: {
    flexDirection: 'row', backgroundColor: 'rgba(30,30,50,0.85)',
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  eventColor: { width: 4 },
  eventContent: { flex: 1, padding: 16 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#e8e8f0', marginBottom: 4 },
  eventTime: { fontSize: 13, color: '#a0a0b8' },
  eventDescription: { fontSize: 13, color: '#606078', marginTop: 4 },
  eventLocation: { fontSize: 12, color: '#60a5fa', marginTop: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ff9a56', marginBottom: 20 },
  modalInput: {
    backgroundColor: 'rgba(30,30,50,0.85)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: '#e8e8f0',
    fontSize: 14, marginBottom: 12,
  },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: 'rgba(255,255,255,0.08)' },
  modalBtnSave: { backgroundColor: '#ff6b9d' },
  modalBtnText: { fontSize: 14, fontWeight: '600', color: '#a0a0b8' },
});
