// ============================================================
// Control Bar - Pasek kontrolny na dole ekranu
// ============================================================

import React from 'react';

interface ControlBarProps {
  isMuted: boolean;
  isScreenSharing: boolean;
  isImageSharing: boolean;
  isListening: boolean;
  onToggleMute: () => void;
  onToggleScreenShare: () => void;
  onToggleImageShare: () => void;
  onToggleListening: () => void;
  onOpenSettings: () => void;
}

export function ControlBar({
  isMuted,
  isScreenSharing,
  isImageSharing,
  isListening,
  onToggleMute,
  onToggleScreenShare,
  onToggleImageShare,
  onToggleListening,
  onOpenSettings,
}: ControlBarProps) {
  return (
    <div className="control-bar">
      {/* Mikrofon / Nasłuchiwanie */}
      <button
        className={`control-btn ${isListening ? 'active' : ''} ${isMuted ? 'muted' : ''}`}
        onClick={onToggleListening}
        title={isListening ? 'Przestań nasłuchiwać' : 'Rozpocznij nasłuchiwanie'}
      >
        {isListening ? '🎤' : '🎙️'}
        {isListening && <span className="badge" />}
      </button>

      {/* Wyciszenie */}
      <button
        className={`control-btn ${isMuted ? 'active' : ''}`}
        onClick={onToggleMute}
        title={isMuted ? 'Włącz dźwięk' : 'Wycisz'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* Udostępnianie ekranu */}
      <button
        className={`control-btn ${isScreenSharing ? 'active' : ''}`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Zatrzymj udostępnianie' : 'Udostępnij ekran (na żywo)'}
      >
        🖥️
        {isScreenSharing && <span className="badge" />}
      </button>

      {/* Udostępnianie obrazu */}
      <button
        className={`control-btn ${isImageSharing ? 'active' : ''}`}
        onClick={onToggleImageShare}
        title={isImageSharing ? 'Zatrzymj udostępnianie obrazu' : 'Udostępnij obraz (na żywo)'}
      >
        🖼️
        {isImageSharing && <span className="badge" />}
      </button>

      {/* Separator */}
      <div style={{
        width: 1,
        height: 28,
        background: 'var(--border)',
        margin: '0 4px',
      }} />

      {/* Ustawienia */}
      <button
        className="control-btn"
        onClick={onOpenSettings}
        title="Ustawienia"
      >
        ⚙️
      </button>
    </div>
  );
}
