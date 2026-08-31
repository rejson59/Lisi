// ============================================================
// Tasks Screen - Ekran zadań (Mobile)
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
import type { Task } from '../../../shared/src/types';

interface TasksScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function TasksScreen({ navigation }: TasksScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    category: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    // TODO: Załaduj z Supabase
    setTasks([
      {
        id: '1', user_id: 'local', title: 'Kupić mleko', completed: false,
        priority: 'medium', category: 'Zakupy', created_at: new Date().toISOString(),
      },
      {
        id: '2', user_id: 'local', title: 'Oddać książkę do biblioteki', completed: false,
        priority: 'low', created_at: new Date().toISOString(),
      },
      {
        id: '3', user_id: 'local', title: 'Zadzwonić do dentysty', completed: true,
        priority: 'high', created_at: new Date().toISOString(), completed_at: new Date().toISOString(),
      },
    ]);
  };

  const addTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Błąd', 'Podaj tytuł zadania');
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      user_id: 'local',
      title: newTask.title,
      description: newTask.description,
      completed: false,
      priority: newTask.priority,
      category: newTask.category || undefined,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [task, ...prev]);
    // TODO: Zapisz w Supabase
    
    setShowAddModal(false);
    setNewTask({ title: '', description: '', priority: 'medium', category: '' });
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : undefined }
          : t
      )
    );
    // TODO: Aktualizuj w Supabase
  };

  const deleteTask = (id: string) => {
    Alert.alert('Usuń zadanie', 'Na pewno?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
          // TODO: Usuń z Supabase
        },
      },
    ]);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return '#f87171';
      case 'high': return '#fb923c';
      case 'medium': return '#60a5fa';
      case 'low': return '#a0a0b8';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return '🔴 Pilne';
      case 'high': return '🟠 Wysoki';
      case 'medium': return '🔵 Średni';
      case 'low': return '⚪ Niski';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✅ Zadania</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filtry */}
      <View style={styles.filters}>
        {(['all', 'active', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'Wszystkie' : f === 'active' ? 'Aktywne' : 'Ukończone'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista zadań */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>
              {filter === 'completed' ? 'Brak ukończonych zadań' : 'Brak zadań'}
            </Text>
            <Text style={styles.emptyHint}>Dodaj zadanie lub poproś Lisi~</Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
              onPress={() => toggleTask(task.id!)}
              onLongPress={() => deleteTask(task.id!)}
            >
              <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                  {task.title}
                </Text>
                <View style={styles.taskMeta}>
                  <Text style={[styles.taskPriority, { color: getPriorityColor(task.priority) }]}>
                    {getPriorityLabel(task.priority)}
                  </Text>
                  {task.category && (
                    <Text style={styles.taskCategory}>📁 {task.category}</Text>
                  )}
                </View>
                {task.description && (
                  <Text style={styles.taskDescription}>{task.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal dodawania */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Nowe zadanie</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Tytuł zadania"
              placeholderTextColor="#606078"
              value={newTask.title}
              onChangeText={(v) => setNewTask((p) => ({ ...p, title: v }))}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Opis (opcjonalnie)"
              placeholderTextColor="#606078"
              value={newTask.description}
              onChangeText={(v) => setNewTask((p) => ({ ...p, description: v }))}
            />
            
            <Text style={styles.modalLabel}>Priorytet</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityBtn,
                    newTask.priority === p && { borderColor: getPriorityColor(p), backgroundColor: `${getPriorityColor(p)}20` },
                  ]}
                  onPress={() => setNewTask((prev) => ({ ...prev, priority: p }))}
                >
                  <Text style={[styles.priorityBtnText, newTask.priority === p && { color: getPriorityColor(p) }]}>
                    {getPriorityLabel(p)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Kategoria (opcjonalnie)"
              placeholderTextColor="#606078"
              value={newTask.category}
              onChangeText={(v) => setNewTask((p) => ({ ...p, category: v }))}
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
                onPress={addTask}
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
  filters: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterBtnActive: { backgroundColor: 'rgba(255,107,157,0.2)' },
  filterBtnText: { color: '#a0a0b8', fontSize: 13 },
  filterBtnTextActive: { color: '#ff6b9d', fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#a0a0b8', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#606078', marginTop: 8 },
  taskCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    backgroundColor: 'rgba(30,30,50,0.85)', borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  taskCardCompleted: { opacity: 0.6 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: '#606078', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#e8e8f0', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#606078' },
  taskMeta: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  taskPriority: { fontSize: 12 },
  taskCategory: { fontSize: 12, color: '#606078' },
  taskDescription: { fontSize: 13, color: '#a0a0b8', marginTop: 4 },
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
  modalLabel: { fontSize: 13, color: '#a0a0b8', marginBottom: 8 },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  priorityBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  priorityBtnText: { fontSize: 12, color: '#a0a0b8' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: 'rgba(255,255,255,0.08)' },
  modalBtnSave: { backgroundColor: '#ff6b9d' },
  modalBtnText: { fontSize: 14, fontWeight: '600', color: '#a0a0b8' },
});
