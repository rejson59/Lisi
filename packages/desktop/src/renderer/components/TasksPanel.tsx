// ============================================================
// Tasks Panel - Panel zadań w wersji desktop
// ============================================================

import React, { useState, useEffect } from 'react';
import type { Task } from '@shared/types';

interface TasksPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function TasksPanel({ visible, onClose }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Task['priority'] });

  useEffect(() => {
    if (visible) loadTasks();
  }, [visible]);

  const loadTasks = async () => {
    setTasks([
      { id: '1', user_id: 'local', title: 'Kupić mleko', completed: false, priority: 'medium', created_at: new Date().toISOString() },
      { id: '2', user_id: 'local', title: 'Zadzwonić do dentysty', completed: false, priority: 'high', created_at: new Date().toISOString() },
      { id: '3', user_id: 'local', title: 'Posprzątać pokój', completed: true, priority: 'low', created_at: new Date().toISOString(), completed_at: new Date().toISOString() },
    ]);
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setTasks((prev) => [{
      id: Date.now().toString(), user_id: 'local', title: newTask.title,
      description: newTask.description, completed: false, priority: newTask.priority,
      created_at: new Date().toISOString(),
    }, ...prev]);
    setShowAdd(false);
    setNewTask({ title: '', description: '', priority: 'medium' });
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? {
      ...t, completed: !t.completed,
      completed_at: !t.completed ? new Date().toISOString() : undefined,
    } : t));
  };

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const priorityColor = (p: Task['priority']) => {
    switch (p) { case 'urgent': return '#f87171'; case 'high': return '#fb923c'; case 'medium': return '#60a5fa'; case 'low': return '#a0a0b8'; }
  };
  const priorityLabel = (p: Task['priority']) => {
    switch (p) { case 'urgent': return '🔴'; case 'high': return '🟠'; case 'medium': return '🔵'; case 'low': return '⚪'; }
  };

  if (!visible) return null;

  return (
    <div className="panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel-container" style={{ width: 480, maxHeight: '70vh' }}>
        <div className="panel-header">
          <h2>✅ Zadania</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="panel-btn-primary" onClick={() => setShowAdd(true)}>+ Dodaj</button>
            <button className="panel-btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px' }}>
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Wszystkie' : f === 'active' ? 'Aktywne' : 'Ukończone'}
            </button>
          ))}
        </div>

        <div className="panel-body">
          {filtered.length === 0 ? (
            <div className="panel-empty"><div style={{ fontSize: 48 }}>✅</div><p>Brak zadań</p></div>
          ) : (
            filtered.map((task) => (
              <div key={task.id} className={`panel-list-item ${task.completed ? 'completed' : ''}`}>
                <button className={`checkbox ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task.id!)}>
                  {task.completed && '✓'}
                </button>
                <div style={{ flex: 1, padding: '4px 12px' }}>
                  <div style={{
                    fontWeight: 600, color: task.completed ? '#606078' : '#e8e8f0',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: priorityColor(task.priority) }}>
                    {priorityLabel(task.priority)} {task.priority}
                    {task.category && <span style={{ color: '#606078' }}> • {task.category}</span>}
                  </div>
                </div>
                <button className="panel-btn-icon" onClick={() => deleteTask(task.id!)} title="Usuń">🗑️</button>
              </div>
            ))
          )}
        </div>

        {showAdd && (
          <div className="panel-modal">
            <div className="panel-modal-content">
              <h3>✅ Nowe zadanie</h3>
              <input className="panel-input" placeholder="Tytuł" value={newTask.title}
                onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} />
              <input className="panel-input" placeholder="Opis" value={newTask.description}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))} />
              <div style={{ display: 'flex', gap: 6 }}>
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <button key={p} className={`priority-chip ${newTask.priority === p ? 'active' : ''}`}
                    style={{ borderColor: priorityColor(p) }}
                    onClick={() => setNewTask((prev) => ({ ...prev, priority: p }))}>
                    {priorityLabel(p)} {p}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="panel-btn-secondary" onClick={() => setShowAdd(false)}>Anuluj</button>
                <button className="panel-btn-primary" onClick={addTask}>Dodaj</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
