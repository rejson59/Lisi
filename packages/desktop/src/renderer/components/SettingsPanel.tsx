// ============================================================
// Settings Panel - Panel ustawień Lisi
// ============================================================

import React, { useState } from 'react';
import type { LisiSettings } from '@shared/types';

interface SettingsPanelProps {
  settings: LisiSettings;
  onSave: (settings: Partial<LisiSettings>) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'voice' | 'appearance' | 'advanced'>('general');

  const handleChange = <K extends keyof LisiSettings>(key: K, value: LisiSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const tabs = [
    { id: 'general' as const, label: 'Ogólne', icon: '🏠' },
    { id: 'api' as const, label: 'API', icon: '🔑' },
    { id: 'voice' as const, label: 'Głos', icon: '🎵' },
    { id: 'appearance' as const, label: 'Wygląd', icon: '🎨' },
    { id: 'advanced' as const, label: 'Zaawansowane', icon: '⚡' },
  ];

  return (
    <div className="settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel">
        {/* Nagłówek */}
        <div className="settings-header">
          <h2>⚙️ Ustawienia Lisi</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Zakładki */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Treść */}
        <div className="settings-body">
          {/* Ogólne */}
          {activeTab === 'general' && (
            <>
              <div className="settings-section">
                <h3>👤 Twój profil</h3>
                <div className="settings-field">
                  <label>Twoje imię</label>
                  <input
                    type="text"
                    value={localSettings.user_name}
                    onChange={(e) => handleChange('user_name', e.target.value)}
                    placeholder="Jak mam się do Ciebie zwracać?"
                  />
                </div>
                <div className="settings-field">
                  <label>Język</label>
                  <select
                    value={localSettings.user_language}
                    onChange={(e) => handleChange('user_language', e.target.value)}
                  >
                    <option value="pl">Polski</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>🦊 Osobowość Lisi</h3>
                <div className="settings-field">
                  <label>System Prompt (osobowość)</label>
                  <textarea
                    value={localSettings.system_prompt}
                    onChange={(e) => handleChange('system_prompt', e.target.value)}
                    placeholder="Opisz jak Lisi ma się zachowywać..."
                    rows={6}
                  />
                  <div className="hint">
                    Ten prompt definiuje jak Lisi się zachowuje. Bądź kreatywny! ✨
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>🎯 Funkcje</h3>
                <div className="settings-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ marginBottom: 0 }}>Fraza wybudzania</label>
                    <div className="hint">"Hej Lisi" aktywuje nasłuchiwanie</div>
                  </div>
                  <div
                    className={`toggle ${localSettings.wake_word_enabled ? 'active' : ''}`}
                    onClick={() => handleChange('wake_word_enabled', !localSettings.wake_word_enabled)}
                  />
                </div>
                {localSettings.wake_word_enabled && (
                  <div className="settings-field">
                    <label>Fraza wybudzania</label>
                    <input
                      type="text"
                      value={localSettings.wake_word_phrase}
                      onChange={(e) => handleChange('wake_word_phrase', e.target.value)}
                    />
                  </div>
                )}
                <div className="settings-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ marginBottom: 0 }}>Kontrola ekranu</label>
                    <div className="hint">Lisi może klikać, pisać i nawigować</div>
                  </div>
                  <div
                    className={`toggle ${localSettings.screen_control_enabled ? 'active' : ''}`}
                    onClick={() => handleChange('screen_control_enabled', !localSettings.screen_control_enabled)}
                  />
                </div>
                <div className="settings-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label style={{ marginBottom: 0 }}>Automatyczna pamięć</label>
                    <div className="hint">Lisi zapamiętuje ciekawostki o Tobie</div>
                  </div>
                  <div
                    className={`toggle ${localSettings.auto_memory_enabled ? 'active' : ''}`}
                    onClick={() => handleChange('auto_memory_enabled', !localSettings.auto_memory_enabled)}
                  />
                </div>
              </div>
            </>
          )}

          {/* API */}
          {activeTab === 'api' && (
            <>
              <div className="settings-section">
                <h3>🔑 Klucze API</h3>
                <div className="settings-field">
                  <label>Gemini API Key *</label>
                  <input
                    type="password"
                    value={localSettings.gemini_api_key}
                    onChange={(e) => handleChange('gemini_api_key', e.target.value)}
                    placeholder="Wklej swój klucz API z Google AI Studio"
                  />
                  <div className="hint">
                    Pobierz za darmo z{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" style={{ color: 'var(--accent-blue)' }}>
                      aistudio.google.com/apikey
                    </a>
                  </div>
                </div>
                <div className="settings-field">
                  <label>ElevenLabs API Key (opcjonalnie)</label>
                  <input
                    type="password"
                    value={localSettings.elevenlabs_api_key || ''}
                    onChange={(e) => handleChange('elevenlabs_api_key', e.target.value)}
                    placeholder="Opcjonalnie - dla lepszego głosu"
                  />
                  <div className="hint">
                    Opcjonalne. Darmowy tier na{' '}
                    <a href="https://elevenlabs.io" target="_blank" style={{ color: 'var(--accent-blue)' }}>
                      elevenlabs.io
                    </a>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>☁️ Supabase (synchronizacja)</h3>
                <div className="settings-field">
                  <label>Supabase URL</label>
                  <input
                    type="text"
                    value={(localSettings as any).supabase_url || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, supabase_url: e.target.value } as any))}
                    placeholder="https://xxx.supabase.co"
                  />
                </div>
                <div className="settings-field">
                  <label>Supabase Anon Key</label>
                  <input
                    type="password"
                    value={(localSettings as any).supabase_anon_key || ''}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, supabase_anon_key: e.target.value } as any))}
                    placeholder="eyJ..."
                  />
                  <div className="hint">
                    Dane synchronizują się między urządzeniami przez Supabase
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Głos */}
          {activeTab === 'voice' && (
            <>
              <div className="settings-section">
                <h3>🎵 Ustawienia głosu</h3>
                <div className="settings-field">
                  <label>Głos</label>
                  <select
                    value={localSettings.voice_id}
                    onChange={(e) => handleChange('voice_id', e.target.value)}
                  >
                    <option value="default">Domyślny (Gemini TTS)</option>
                    <option value="Puck">Puck (męski, energiczny)</option>
                    <option value="Charon">Charon (męski, spokojny)</option>
                    <option value="Kore">Kore (żeński, ciepły)</option>
                    <option value="Fenrir">Fenrir (męski, głęboki)</option>
                    <option value="Aoede">Aoede (żeński, melodyjny)</option>
                    <option value="Leda">Leda (żeński, młody)</option>
                    <option value="Zephyr">Zephyr (neutralny)</option>
                  </select>
                  <div className="hint">
                    Głosy Gemini TTS - Aoede i Kore pasują do Lisi~ ✨
                  </div>
                </div>
                <div className="settings-field">
                  <label>Język mowy</label>
                  <select
                    value={localSettings.voice_language}
                    onChange={(e) => handleChange('voice_language', e.target.value)}
                  >
                    <option value="pl-PL">Polski</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="ja-JP">日本語</option>
                    <option value="de-DE">Deutsch</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label>Prędkość mowy: {localSettings.voice_speed.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={localSettings.voice_speed}
                    onChange={(e) => handleChange('voice_speed', parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="settings-field">
                  <label>Wysokość głosu: {localSettings.voice_pitch.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={localSettings.voice_pitch}
                    onChange={(e) => handleChange('voice_pitch', parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Wygląd */}
          {activeTab === 'appearance' && (
            <>
              <div className="settings-section">
                <h3>🎨 Motyw</h3>
                <div className="settings-field">
                  <label>Motyw kolorystyczny</label>
                  <select
                    value={localSettings.theme}
                    onChange={(e) => handleChange('theme', e.target.value as any)}
                  >
                    <option value="dark">🌙 Ciemny (domyślny)</option>
                    <option value="light">☀️ Jasny</option>
                    <option value="anime">🌸 Anime</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>🦊 Avatar</h3>
                <div className="settings-field">
                  <label>Rozmiar avatara: {localSettings.avatar_size}px</label>
                  <input
                    type="range"
                    min="100"
                    max="500"
                    step="10"
                    value={localSettings.avatar_size}
                    onChange={(e) => handleChange('avatar_size', parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="settings-field">
                  <label>Pozycja avatara</label>
                  <select
                    value={localSettings.avatar_position}
                    onChange={(e) => handleChange('avatar_position', e.target.value as any)}
                  >
                    <option value="center">🎯 Na środku</option>
                    <option value="bottom-right">↘️ Prawy dolny róg</option>
                    <option value="bottom-left">↙️ Lewy dolny róg</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Zaawansowane */}
          {activeTab === 'advanced' && (
            <>
              <div className="settings-section">
                <h3>⚡ Zaawansowane</h3>
                <div className="settings-field">
                  <label>Model Gemini</label>
                  <select
                    value={(localSettings as any).gemini_model || 'gemini-2.0-flash-live-001'}
                    onChange={(e) => setLocalSettings((prev) => ({ ...prev, gemini_model: e.target.value } as any))}
                  >
                    <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live Preview (najnowszy, zalecany)</option>
                    <option value="gemini-2.0-flash-live-001">Gemini 2.0 Flash Live (starszy)</option>
                  </select>
                  <div className="hint">
                    Gemini 2.0 Flash Live - szybki, darmowy, z audio i tools calling
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>💾 Dane</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => {
                      const json = JSON.stringify(localSettings, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'lisi-settings.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    📤 Eksportuj ustawienia
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const imported = JSON.parse(ev.target?.result as string);
                              setLocalSettings((prev) => ({ ...prev, ...imported }));
                            } catch {
                              alert('Nieprawidłowy plik');
                            }
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    📥 Importuj ustawienia
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stopka z przyciskami */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 24px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            💾 Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
