'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TypingIndicator } from '../components/TypingIndicator';
import { ContextPanel } from '../components/ContextPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nextStep?: string;
}

interface ContextData {
  entities: { type: string; value: string; confidence: number }[];
  goals: { id: string; description: string; status: 'open' | 'awaiting_info' | 'completed' | 'discarded' }[];
  conversationStatus: string;
  attentionMode: string;
}

const SESSION_KEY = 'faro_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ContextData | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: getSessionId() }),
      });

      const data = await res.json() as {
        message?: string;
        nextStep?: string;
        context?: ContextData;
        error?: string;
      };

      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message ?? '',
        nextStep: data.nextStep,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.context) setContext(data.context);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Ocorreu um erro. Tente novamente.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center">
              <span className="text-[#4ade80] text-xs font-mono font-semibold">F</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#e5e5e5] leading-none">Faro</p>
              <p className="text-[10px] text-[#404040] font-mono mt-0.5">assistente executivo</p>
            </div>
          </div>

          {/* Context panel toggle */}
          <button
            onClick={() => setPanelOpen((p) => !p)}
            className="w-8 h-8 rounded-lg border border-[#2a2a2a] flex items-center justify-center text-[#737373] hover:text-[#e5e5e5] hover:border-[#3a3a3a] transition-colors"
            title={panelOpen ? 'Ocultar contexto' : 'Mostrar contexto'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1"/>
              <path d="M9 1V13" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-10 h-10 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center">
                <span className="text-[#4ade80] text-base font-mono font-semibold">F</span>
              </div>
              <p className="text-[#737373] text-sm max-w-xs leading-relaxed">
                Olá. Pode falar.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-3 msg-enter ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#4ade80] text-[10px] font-mono font-medium">F</span>
                </div>
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#1a1a1a] border border-[#2a2a2a] rounded-br-sm text-[#e5e5e5]'
                    : 'bg-[#141414] border border-[#1f1f1f] rounded-bl-sm text-[#d4d4d4]'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.nextStep && (
                  <p className="text-xs text-[#737373] mt-2 pt-2 border-t border-[#2a2a2a]">
                    {msg.nextStep}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </main>

        {/* Input */}
        <footer className="px-4 pb-5 pt-3 border-t border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-end gap-2 bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 py-3 focus-within:border-[#3a3a3a] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Escreva aqui…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[#e5e5e5] placeholder-[#404040] outline-none leading-relaxed min-h-[20px]"
              style={{ height: '20px' }}
              autoFocus
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 transition-all
                disabled:opacity-20 disabled:cursor-not-allowed
                enabled:bg-[#14532d] enabled:hover:bg-[#166534] enabled:text-[#4ade80]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L10 6L2 2V5.5L7.5 6L2 6.5V10Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-[#2a2a2a] text-center mt-2 font-mono">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </footer>
      </div>

      {/* ── Context panel ── */}
      {panelOpen && (
        <aside className="w-64 flex-shrink-0 border-l border-[#1f1f1f] bg-[#0f0f0f]">
          <div className="px-4 py-4 border-b border-[#1f1f1f]">
            <p className="text-[10px] font-mono text-[#404040] uppercase tracking-widest">
              Contexto
            </p>
          </div>
          <ContextPanel data={context} />
        </aside>
      )}
    </div>
  );
}
