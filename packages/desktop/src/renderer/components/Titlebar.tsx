// ============================================================
// Titlebar - Niestandardowy pasek tytułowy
// ============================================================

import React from 'react';

export function Titlebar() {
  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <span className="emoji">🦊</span>
        <span>Lisi - Twoja lisia asystentka</span>
      </div>
      <div className="titlebar-buttons">
        <button
          className="titlebar-btn minimize"
          onClick={() => window.lisi?.window.minimize()}
          title="Minimalizuj"
        />
        <button
          className="titlebar-btn maximize"
          onClick={() => window.lisi?.window.maximize()}
          title="Maksymalizuj"
        />
        <button
          className="titlebar-btn close"
          onClick={() => window.lisi?.window.close()}
          title="Zamknij"
        />
      </div>
    </div>
  );
}
