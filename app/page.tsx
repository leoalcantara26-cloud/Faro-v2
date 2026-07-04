'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MicButton } from '../components/MicButton';

const SUGGESTIONS = [
  {
    id: 'gustavo',
    initial: 'G',
    text: 'Você não fala com Gustavo há 2 dias. A proposta da TechCorp ainda está sem resposta.',
    action: 'Retomar conversa',
  },
  {
    id: 'rafaela',
    initial: 'R',
    text: 'Você se reuniu com Rafaela ontem. Ainda não registrou como foi.',
    action: 'Fazer debriefing',
  },
  {
    id: 'carlos',
    initial: 'C',
    text: 'Carlos pediu um case de uso financeiro. Você prometeu enviar até amanhã.',
    action: 'Preparar e enviar',
  },
];

function todayLabel() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('faro_profile');
    if (!stored) { router.replace('/onboarding'); return; }
    try { setUserName(JSON.parse(stored).name?.split(' ')[0] || ''); } catch { /* ignore */ }
  }, [router]);

  const handleTranscript = (text: string) => {
    router.push(`/chat?q=${encodeURIComponent(text)}`);
  };

  const handleType = () => {
    router.push('/chat');
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Nav */}
      <nav className="w-[52px] flex-shrink-0 border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-1">
        <div className="w-[30px] h-[30px] rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-xs font-bold text-[#4ade80] mb-4">F</div>
        <NavBtn icon="home" active />
        <NavBtn icon="chat" onClick={() => router.push('/chat')} />
        <NavBtn icon="clients" onClick={() => router.push('/clients')} />
        <div className="flex-1" />
        <button onClick={() => router.push('/profile')} className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#303030] flex items-center justify-center text-xs font-semibold text-[#737373] hover:border-[#4ade80] hover:text-[#4ade80] transition-colors" title="Meu perfil">
          {userName ? userName[0].toUpperCase() : '?'}
        </button>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 gap-0 overflow-y-auto">

        {/* Greeting */}
        <div className="text-center mb-11">
          <p className="text-[17px] font-normal text-[#a3a3a3]">{userName ? `Bom dia, ${userName}.` : 'Bom dia.'}</p>
          <p className="text-[11px] font-mono text-[#3d3d3d] mt-1.5">{todayLabel()}</p>
        </div>

        {/* Mic */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <MicButton onTranscript={handleTranscript} size="lg" />
          <p className="text-[11px] font-mono text-[#3d3d3d] tracking-widest uppercase">falar com o faro</p>
        </div>

        {/* Type shortcut */}
        <button
          onClick={handleType}
          className="flex items-center gap-2.5 bg-[#141414] border border-[#242424] rounded-[14px] px-4 py-2.5 w-[280px] mb-12 hover:border-[#303030] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#3d3d3d] flex-shrink-0">
            <path d="M2 4H12M2 7H9M2 10H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="flex-1 text-[13px] text-[#3d3d3d] text-left">ou escreva aqui…</span>
          <kbd className="text-[10px] font-mono text-[#3d3d3d] bg-[#1a1a1a] border border-[#303030] rounded-[5px] px-1.5 py-0.5">⌘ K</kbd>
        </button>

        {/* Suggestions */}
        <div className="w-full max-w-[480px]">
          <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase text-center mb-3.5">Faro sugere</p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/clients/${s.id}`)}
                className="group bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5 text-left flex items-start gap-3 hover:border-[#303030] hover:bg-[#1a1a1a] transition-all"
              >
                <div className="w-[30px] h-[30px] rounded-full bg-[#1a1a1a] border border-[#242424] flex items-center justify-center text-[11px] font-semibold text-[#737373] flex-shrink-0 mt-0.5">
                  {s.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#a3a3a3] leading-relaxed">{s.text}</p>
                  <p className="text-[11px] font-mono text-[#4ade80] mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                    {s.action}
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5H8M5.5 2.5L8 5L5.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
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
