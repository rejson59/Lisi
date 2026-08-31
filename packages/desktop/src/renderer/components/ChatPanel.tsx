// ============================================================
// Chat Panel - Panel czatu z Lisi
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@shared/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  visible: boolean;
  onSend: (text: string) => void;
  currentText: string;
}

export function ChatPanel({ messages, visible, onSend, currentText }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll do najnowszej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!visible) return null;

  return (
    <div className="chat-panel">
      {/* Nagłówek */}
      <div className="chat-header">
        <h3>💬 Rozmowa z Lisi</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {messages.length} wiadomości
        </span>
      </div>

      {/* Wiadomości */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦊</div>
            <p>Cześć! Jestem Lisi~ ✨</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Powiedz mi coś lub kliknij 🎤 żeby mówić
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div style={{
                fontSize: 11,
                color: 'var(--fox-orange)',
                marginBottom: 4,
                fontWeight: 600,
              }}>
                🦊 Lisi
              </div>
            )}
            {msg.content}
          </div>
        ))}

        {/* Aktualna odpowiedź (streaming) */}
        {currentText && (
          <div className="chat-message assistant">
            <div style={{
              fontSize: 11,
              color: 'var(--fox-orange)',
              marginBottom: 4,
              fontWeight: 600,
            }}>
              🦊 Lisi
            </div>
            {currentText}
            <span style={{ animation: 'pulse 1s infinite' }}>▌</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz do Lisi..."
          autoComplete="off"
        />
        <button className="chat-send-btn" type="submit" disabled={!input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
