// ============================================================
// Alarms Panel - Panel budzików w wersji desktop
// ============================================================

import React, { useState, useEffect } from 'react';
import type { Alarm } from '@shared/types';

interface AlarmsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

export function AlarmsPanel({ visible, onClose }: AlarmsPanelProps) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    time: '07:00', label: 'Budzik', days: [] as number[],
    gradual: true, volume: 80,
  });

  useEffect(() => {
    if (visible) loadAlarms();
  }, [visible]);

  const loadAlarms = async () => {
    setAlarms([
      { id: '1', user_id: 'local', time: '07:00', label: 'Pobudka', enabled: true, days: [1, 2, 3, 4, 5], volume: 80, vibrate: true, gradual_volume: true, max_volume: 100, snooze_minutes: 5 },
      { id: '2', user_id: 'local', time: '09:00', label: 'Weekend', enabled: false, days: [0, 6], volume: 60, vibrate: true, gradual_volume: true, max_volume: 80, snooze_minutes: 10 },
    ]);
  };

  const addAlarm = () => {
    setAlarms((prev) => [...prev, {
      id: Date.now().toString(), user_id: 'local', time: newAlarm.time,
      label: newAlarm.label, enabled: true, days: newAlarm.days,
      volume: newAlarm.volume, vibrate: true, gradual_volume: newAlarm.gradual,
      max_volume: 100, snooze_minutes: 5,
    }]);
    setShowAdd(false);
  };

  const toggleAlarm = (id: string) => {
    setAlarms((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlarm = (id: string) => setAlarms((prev) => prev.filter((a) => a.id !== id));

  const toggleDay = (day: number) => {
    setNewAlarm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Codziennie';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Pon-Pt';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekend';
    if (days.length === 0) return 'Raz';
    return days.map((d) => DAY_NAMES[d]).join(', ');
  };

  if (!visible) return null;

  return (
    <div className="panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel-container" style={{ width: 450, maxHeight: '70vh' }}>
        <div className="panel-header">
          <h2>⏰ Budziki</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="panel-btn-primary" onClick={() => setShowAdd(true)}>+ Dodaj</button>
            <button className="panel-btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="panel-body">
          {alarms.length === 0 ? (
            <div className="panel-empty"><div style={{ fontSize: 48 }}>⏰</div><p>Brak budzików</p></div>
          ) : (
            alarms.map((alarm) => (
              <div key={alarm.id} className={`panel-list-item ${!alarm.enabled ? 'disabled' : ''}`}>
                <div style={{ padding: '8px 12px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 200, color: alarm.enabled ? '#ff9a56' : '#606078' }}>
                      {alarm.time}
                    </span>
                    <span style={{ fontSize: 13, color: '#a0a0b8' }}>{alarm.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#606078', marginTop: 4 }}>
                    {formatDays(alarm.days)} • 🔊 {alarm.volume}%
                    {alarm.gradual_volume && ' • 📈 Rosnąca'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div className={`toggle ${alarm.enabled ? 'active' : ''}`}
                    onClick={() => toggleAlarm(alarm.id!)} />
                  <button className="panel-btn-icon" onClick={() => deleteAlarm(alarm.id!)} title="Usuń">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        {showAdd && (
          <div className="panel-modal">
            <div className="panel-modal-content">
              <h3>⏰ Nowy budzik</h3>
              <input className="panel-input" type="time" value={newAlarm.time}
                onChange={(e) => setNewAlarm((p) => ({ ...p, time: e.target.value }))} />
              <input className="panel-input" placeholder="Etykieta" value={newAlarm.label}
                onChange={(e) => setNewAlarm((p) => ({ ...p, label: e.target.value }))} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {DAY_NAMES.map((name, i) => (
                  <button key={i} className={`day-chip ${newAlarm.days.includes(i) ? 'active' : ''}`}
                    onClick={() => toggleDay(i)}>{name}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#a0a0b8' }}>Głośność: {newAlarm.volume}%</span>
                <input type="range" min="10" max="100" value={newAlarm.volume}
                  onChange={(e) => setNewAlarm((p) => ({ ...p, volume: parseInt(e.target.value) }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#a0a0b8' }}>Rosnąca głośność</span>
                <div className={`toggle ${newAlarm.gradual ? 'active' : ''}`}
                  onClick={() => setNewAlarm((p) => ({ ...p, gradual: !p.gradual }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="panel-btn-secondary" onClick={() => setShowAdd(false)}>Anuluj</button>
                <button className="panel-btn-primary" onClick={addAlarm}>Dodaj</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
