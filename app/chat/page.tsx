'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MicButton } from '../../components/MicButton';
import { ContextPanel } from '../../components/ContextPanel';
import { TypingIndicator } from '../../components/TypingIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  entities: Array<{ type: string; value: string; confidence: number }>;
  goals: Array<{ id: string; description: string; status: 'open' | 'awaiting_info' | 'completed' | 'discarded' }>;
  conversationStatus: string;
  attentionMode: string;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [showContext, setShowContext] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didInitRef = useRef(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !didInitRef.current) {
      didInitRef.current = true;
      sendMessage(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    try {
      const storedProfile = localStorage.getItem('faro_profile');
      const userProfile = storedProfile ? JSON.parse(storedProfile) : null;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, userProfile }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as
              | { type: 'chunk'; text: string }
              | { type: 'done'; context: ChatContext; nextStep?: string }
              | { type: 'error'; message: string };

            if (event.type === 'chunk') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + event.text,
                };
                return updated;
              });
            } else if (event.type === 'done') {
              setContext(event.context);
            } else if (event.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: 'Ocorreu um erro. Tente novamente.' };
                return updated;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Ocorreu um erro. Tente novamente.' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTranscript = (text: string) => {
    sendMessage(text);
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Nav */}
      <nav className="w-[52px] flex-shrink-0 border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-1">
        <div className="w-[30px] h-[30px] rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-xs font-bold text-[#4ade80] mb-4">F</div>
        <NavBtn icon="home" onClick={() => router.push('/')} />
        <NavBtn icon="chat" active />
        <NavBtn icon="clients" onClick={() => router.push('/clients')} />
        <div className="flex-1" />
        <button onClick={() => router.push('/profile')} className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#303030] flex items-center justify-center text-xs font-semibold text-[#737373] hover:border-[#4ade80] hover:text-[#4ade80] transition-colors" title="Meu perfil">P</button>
      </nav>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-[#a3a3a3] font-medium">Nova conversa</span>
            {context?.conversationStatus === 'closed' && (
              <span className="text-[10px] font-mono text-[#737373] bg-[#1a1a1a] border border-[#242424] rounded-full px-2 py-0.5">encerrada</span>
            )}
          </div>
          <button
            onClick={() => setShowContext((v) => !v)}
            className={`w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors border ${showContext ? 'bg-[#1a1a1a] border-[#303030] text-[#a3a3a3]' : 'bg-transparent border-transparent text-[#3d3d3d] hover:text-[#737373]'}`}
            title="Contexto"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 6.5V10M7 4.5V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[13px] text-[#3d3d3d] font-mono">faro está pronto.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-[9px] font-bold text-[#4ade80] flex-shrink-0 mr-2.5 mt-0.5">F</div>
              )}
              <div
                className={`max-w-[72%] px-3.5 py-2.5 rounded-[14px] text-[13px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#1a1a1a] border border-[#242424] text-[#e5e5e5]'
                    : 'bg-transparent text-[#a3a3a3]'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-[9px] font-bold text-[#4ade80] flex-shrink-0 mt-0.5">F</div>
              <div className="px-3.5 py-2.5">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-[#1a1a1a]">
          <div className="flex items-end gap-2.5 bg-[#141414] border border-[#242424] rounded-[16px] px-3.5 py-2.5 focus-within:border-[#303030] transition-colors">
            <MicButton onTranscript={handleTranscript} size="sm" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escreva para o Faro…"
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-[#e5e5e5] placeholder-[#3d3d3d] resize-none outline-none leading-relaxed max-h-[120px] overflow-y-auto py-0.5"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-20 bg-[#14532d] border border-[#166534] text-[#4ade80] hover:bg-[#166534] disabled:hover:bg-[#14532d]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 10V2M2.5 5.5L6 2L9.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      {showContext && (
        <ContextPanel data={context} />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}

function NavBtn({ icon, active, onClick }: { icon: string; active?: boolean; onClick?: () => void }) {
  const base = 'w-9 h-9 rounded-[9px] flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors';
  const cls = active
    ? `${base} bg-[#1a1a1a] text-[#e5e5e5]`
    : `${base} text-[#3d3d3d] hover:bg-[#1a1a1a] hover:text-[#a3a3a3]`;

  const icons: Record<string, React.ReactElement> = {
    home: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2L14 6.5V14H10V10H6V14H2V6.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
    chat: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3C2 2.45 2.45 2 3 2H13C13.55 2 14 2.45 14 3V10C14 10.55 13.55 11 13 11H5L2 14V3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
    clients: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M2.5 13.5C2.5 11 5 9 8 9C11 9 13.5 11 13.5 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  };

  return <button className={cls} onClick={onClick}>{icons[icon]}</button>;
}
