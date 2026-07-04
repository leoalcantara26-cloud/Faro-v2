'use client';

import { useRouter } from 'next/navigation';

const CLIENTS = [
  { id: 'gustavo', initial: 'G', name: 'Gustavo Mendes', company: 'TechCorp', status: 'Proposta enviada', statusColor: '#f59e0b', lastContact: 'há 2 dias' },
  { id: 'rafaela', initial: 'R', name: 'Rafaela Lima', company: 'Inova Solutions', status: 'Reunião realizada', statusColor: '#4ade80', lastContact: 'ontem' },
  { id: 'carlos', initial: 'C', name: 'Carlos Souza', company: 'FinBank', status: 'Aguardando case', statusColor: '#f59e0b', lastContact: 'há 3 dias' },
  { id: 'ana', initial: 'A', name: 'Ana Ferreira', company: 'LogisTech', status: 'Primeiro contato', statusColor: '#737373', lastContact: 'há 1 semana' },
];

export default function ClientsPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Nav */}
      <nav className="w-[52px] flex-shrink-0 border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-1">
        <div className="w-[30px] h-[30px] rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-xs font-bold text-[#4ade80] mb-4">F</div>
        <NavBtn icon="home" onClick={() => router.push('/')} />
        <NavBtn icon="chat" onClick={() => router.push('/chat')} />
        <NavBtn icon="clients" active />
        <div className="flex-1" />
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#303030] flex items-center justify-center text-xs font-semibold text-[#737373]">L</div>
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[560px] mx-auto">

          {/* Header */}
          <div className="mb-7">
            <h1 className="text-[15px] font-medium text-[#e5e5e5]">Clientes</h1>
            <p className="text-[11px] font-mono text-[#3d3d3d] mt-1">{CLIENTS.length} contatos ativos</p>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            {CLIENTS.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="group bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5 text-left flex items-center gap-3 hover:border-[#303030] hover:bg-[#1a1a1a] transition-all"
              >
                <div className="w-[36px] h-[36px] rounded-full bg-[#1a1a1a] border border-[#242424] flex items-center justify-center text-[12px] font-semibold text-[#737373] flex-shrink-0 group-hover:border-[#303030] transition-colors">
                  {c.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] text-[#e5e5e5] font-medium">{c.name}</p>
                    <p className="text-[10px] font-mono text-[#3d3d3d] flex-shrink-0">{c.lastContact}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-[#737373]">{c.company}</p>
                    <span className="text-[#3d3d3d]">·</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.statusColor }} />
                      <p className="text-[11px]" style={{ color: c.statusColor }}>{c.status}</p>
                    </div>
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#3d3d3d] group-hover:text-[#737373] transition-colors flex-shrink-0">
                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
