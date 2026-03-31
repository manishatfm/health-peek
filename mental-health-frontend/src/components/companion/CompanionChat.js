import React, { useState, useRef, useEffect } from 'react';
import { companionService } from '../../services';
import './CompanionChat.css';

export default function CompanionChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "hey 👋 I'm here if you want to talk. how are you doing today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      // Pass the history without the first greeting (it's UI-only)
      const history = next.slice(0, -1).filter(m => m.role === 'user' || m.role === 'assistant');
      const reply = await companionService.chat(text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "sorry, something went wrong on my end. try again?" }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="companion-container">
      <div className="companion-header">
        <div className="companion-avatar">🌿</div>
        <div className="companion-info">
          <h2>Emotional Companion</h2>
          <span className="companion-status">here for you</span>
        </div>
      </div>

      <div className="companion-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-avatar">🌿</div>
            )}
            <div className={`message-bubble ${msg.role}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="message-avatar">🌿</div>
            <div className="message-bubble assistant typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="companion-input-area">
        <textarea
          ref={inputRef}
          className="companion-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="say something..."
          rows={1}
          disabled={loading}
        />
        <button
          className="companion-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
      <p className="companion-hint">Press Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
