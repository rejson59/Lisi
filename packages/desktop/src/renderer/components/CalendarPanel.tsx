// ============================================================
// Calendar Panel - Panel kalendarza w wersji desktop
// ============================================================

import React, { useState, useEffect } from 'react';
import type { CalendarEvent } from '@shared/types';

interface CalendarPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function CalendarPanel({ visible, onClose }: CalendarPanelProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
  });

  useEffect(() => {
    if (visible) loadEvents();
  }, [visible]);

  const loadEvents = async () => {
    // TODO: Załaduj z Supabase
    setEvents([
      {
        id: '1', user_id: 'local', title: 'Spotkanie',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 7200000).toISOString(),
        all_day: false, color: '#ff6b9d',
      },
    ]);
  };

  const addEvent = () => {
    if (!newEvent.title.trim()) return;
    const event: CalendarEvent = {
      id: Date.now().toString(), user_id: 'local',
      title: newEvent.title, description: newEvent.description,
      location: newEvent.location,
      start_time: `${newEvent.date}T${newEvent.startTime}:00`,
      end_time: `${newEvent.date}T${newEvent.endTime}:00`,
      all_day: false, color: '#ff6b9d',
    };
    setEvents((prev) => [...prev, event].sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ));
    setShowAdd(false);
    setNewEvent({ title: '', description: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', location: '' });
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });

  if (!visible) return null;

  return (
    <div className="panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel-container" style={{ width: 500, maxHeight: '70vh' }}>
        <div className="panel-header">
          <h2>📅 Kalendarz</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="panel-btn-primary" onClick={() => setShowAdd(true)}>+ Dodaj</button>
            <button className="panel-btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="panel-body">
          {events.length === 0 ? (
            <div className="panel-empty">
              <div style={{ fontSize: 48 }}>📅</div>
              <p>Brak wydarzeń</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="panel-list-item">
                <div style={{ width: 4, background: event.color || '#ff6b9d', borderRadius: 2 }} />
                <div style={{ flex: 1, padding: '8px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#e8e8f0' }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: '#a0a0b8' }}>
                    {formatDate(event.start_time)} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </div>
                  {event.location && <div style={{ fontSize: 11, color: '#60a5fa' }}>📍 {event.location}</div>}
                </div>
                <button className="panel-btn-icon" onClick={() => deleteEvent(event.id!)} title="Usuń">🗑️</button>
              </div>
            ))
          )}
        </div>

        {showAdd && (
          <div className="panel-modal">
            <div className="panel-modal-content">
              <h3>📅 Nowe wydarzenie</h3>
              <input className="panel-input" placeholder="Tytuł" value={newEvent.title}
                onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} />
              <input className="panel-input" placeholder="Opis" value={newEvent.description}
                onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} />
              <input className="panel-input" type="date" value={newEvent.date}
                onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="panel-input" type="time" value={newEvent.startTime}
                  onChange={(e) => setNewEvent((p) => ({ ...p, startTime: e.target.value }))} />
                <input className="panel-input" type="time" value={newEvent.endTime}
                  onChange={(e) => setNewEvent((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
              <input className="panel-input" placeholder="Lokalizacja" value={newEvent.location}
                onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="panel-btn-secondary" onClick={() => setShowAdd(false)}>Anuluj</button>
                <button className="panel-btn-primary" onClick={addEvent}>Dodaj</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
