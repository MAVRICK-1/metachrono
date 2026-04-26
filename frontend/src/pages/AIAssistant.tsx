import React, { useState, useRef } from 'react';
import { askAI } from '../services/api';
import type { AIQueryResponse } from '../types';
import { Bot, Send, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  events?: any[];
  suggestions?: string[];
}

const STARTERS = [
  '🔍 Why did my orders table break last week?',
  '👤 Who last changed the customer_id column?',
  '💥 What breaks if I drop the revenue column?',
  '📊 How stable is the payments dataset?',
  '🏷️ Which tables are missing PII tags?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Hi! I\'m the **MetaChronos AI** — powered by OpenMetadata change events.\n\nAsk me anything about your data assets: why something broke, who changed what, what the blast radius of a change is, or how to improve governance coverage.\n\nYou can optionally provide an Entity ID for deeper analysis.' },
  ]);
  const [input, setInput] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityType, setEntityType] = useState('tables');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(question?: string) {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const resp: AIQueryResponse = await askAI(q, entityId || undefined, entityType || undefined);
      setMessages(m => [...m, {
        role: 'assistant',
        content: resp.answer,
        events: resp.relatedEvents,
        suggestions: resp.suggestions,
      }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `❌ Error: ${e.message}` }]);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Context panel */}
      <div className="card">
        <div className="card-title">📎 Context (optional)</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity Type</div>
            <select className="mc-select" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="tables">Table</option>
              <option value="dashboards">Dashboard</option>
              <option value="topics">Topic</option>
              <option value="pipelines">Pipeline</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Entity ID (UUID) — grounds the AI in real data</div>
            <input style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: 13, outline: 'none' }}
              placeholder="Optional: paste UUID for entity-specific answers"
              value={entityId} onChange={e => setEntityId(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Chat window */}
      <div className="card" style={{ flex: 1 }}>
        <div className="chat-window">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-avatar">
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} style={{ color: 'var(--accent)' }} />}
                </div>
                <div>
                  <div className="chat-bubble">{msg.content}</div>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {msg.suggestions.map((s, si) => (
                        <div key={si} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 8px', background: 'rgba(124,92,252,0.08)', borderRadius: 6, borderLeft: '2px solid var(--accent)' }}>
                          💡 {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.events && msg.events.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                      📅 Based on {msg.events.length} change events
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg">
                <div className="chat-avatar"><Bot size={14} style={{ color: 'var(--accent)' }} /></div>
                <div className="chat-bubble" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', animation: 'pulse-ring 1s ease-out infinite' }} />
                  <div style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', animation: 'pulse-ring 1s ease-out 0.2s infinite' }} />
                  <div style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', animation: 'pulse-ring 1s ease-out 0.4s infinite' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Starter prompts */}
          {messages.length === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
              {STARTERS.map((s, i) => (
                <button key={i} className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => send(s.replace(/^.+? /, ''))}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <textarea
              className="chat-input"
              rows={2}
              placeholder="Ask anything about your metadata…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
