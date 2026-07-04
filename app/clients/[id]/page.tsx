'use client';

import { useRouter, useParams } from 'next/navigation';

const CLIENTS: Record<string, ClientData> = {
  gustavo: {
    id: 'gustavo',
    initial: 'G',
    name: 'Gustavo Mendes',
    role: 'Diretor de Tecnologia',
    company: 'TechCorp',
    email: 'gustavo@techcorp.com.br',
    phone: '+55 11 99999-1111',
    stage: 'Proposta enviada',
    stageColor: '#f59e0b',
    lastContact: 'há 2 dias',
    context: 'Empresa de médio porte focada em automação industrial. Gustavo é o decisor final. Time de TI com 8 pessoas.',
    notes: 'Prefere comunicação via WhatsApp. Reunião às quintas, manhã. Gosta de dados e ROI claro.',
    openItems: [
      { label: 'Proposta da TechCorp', detail: 'Enviada em 02/07 — aguardando resposta', urgent: true },
      { label: 'Follow-up agendado', detail: 'Nenhum agendado ainda', urgent: false },
    ],
    history: [
      { date: '02 jul', event: 'Proposta enviada por e-mail' },
      { date: '01 jul', event: 'Reunião de apresentação — 45 min' },
      { date: '25 jun', event: 'Primeiro contato via LinkedIn' },
    ],
  },
  rafaela: {
    id: 'rafaela',
    initial: 'R',
    name: 'Rafaela Lima',
    role: 'Head de Operações',
    company: 'Inova Solutions',
    email: 'rafaela@inovasolutions.com.br',
    phone: '+55 11 99999-2222',
    stage: 'Reunião realizada',
    stageColor: '#4ade80',
    lastContact: 'ontem',
    context: 'Startup de logística em fase de escala. Rafaela lidera operações e tem autonomia para contratar.',
    notes: 'Muito objetiva. Quer ver resultados em 30 dias. Indicação do Carlos.',
    openItems: [
      { label: 'Debriefing da reunião', detail: 'Ainda não registrado', urgent: true },
      { label: 'Proposta personalizada', detail: 'A preparar conforme alinhamento', urgent: false },
    ],
    history: [
      { date: '03 jul', event: 'Reunião de discovery — 1h' },
      { date: '28 jun', event: 'Contato inicial — indicação do Carlos' },
    ],
  },
  carlos: {
    id: 'carlos',
    initial: 'C',
    name: 'Carlos Souza',
    role: 'Gerente Financeiro',
    company: 'FinBank',
    email: 'carlos@finbank.com.br',
    phone: '+55 11 99999-3333',
    stage: 'Aguardando case',
    stageColor: '#f59e0b',
    lastContact: 'há 3 dias',
    context: 'Banco regional em processo de digitalização. Carlos avalia fornecedores para o projeto de automação de backoffice.',
    notes: 'Processo de compra burocrático — mínimo 3 fornecedores. Precisa de case no setor financeiro.',
    openItems: [
      { label: 'Case financeiro', detail: 'Prometido para amanhã', urgent: true },
      { label: 'Reunião com comitê', detail: 'Pendente de agendar', urgent: false },
    ],
    history: [
      { date: '01 jul', event: 'Carlos pediu case financeiro' },
      { date: '29 jun', event: 'Reunião de apresentação' },
      { date: '20 jun', event: 'Cold outreach via e-mail' },
    ],
  },
  ana: {
    id: 'ana',
    initial: 'A',
    name: 'Ana Ferreira',
    role: 'CEO',
    company: 'LogisTech',
    email: 'ana@logistech.com.br',
    phone: '+55 11 99999-4444',
    stage: 'Primeiro contato',
    stageColor: '#737373',
    lastContact: 'há 1 semana',
    context: 'Empresa de logística de médio porte. Ana fundou a empresa há 8 anos e conhece bem o mercado.',
    notes: 'Conhecida de evento — troca de cartão. Ainda sem reunião marcada.',
    openItems: [
      { label: 'Primeira reunião', detail: 'Ainda não agendada', urgent: false },
    ],
    history: [
      { date: '27 jun', event: 'Troca de cartão — evento Logística Brasil' },
    ],
  },
};

interface ClientData {
  id: string;
  initial: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  stageColor: string;
  lastContact: string;
  context: string;
  notes: string;
  openItems: Array<{ label: string; detail: string; urgent: boolean }>;
  history: Array<{ date: string; event: string }>;
}

export default function ClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const client = CLIENTS[id];

  if (!client) {
    return (
      <div className="flex h-screen bg-[#0f0f0f] items-center justify-center">
        <p className="text-[13px] text-[#3d3d3d]">Cliente não encontrado.</p>
      </div>
    );
  }

  const handleChat = () => {
    router.push(`/chat?q=${encodeURIComponent(`Falar sobre ${client.name} da ${client.company}`)}`);
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Nav */}
      <nav className="w-[52px] flex-shrink-0 border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-1">
        <div className="w-[30px] h-[30px] rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-xs font-bold text-[#4ade80] mb-4">F</div>
        <NavBtn icon="home" onClick={() => router.push('/')} />
        <NavBtn icon="chat" onClick={() => router.push('/chat')} />
        <NavBtn icon="clients" active onClick={() => router.push('/clients')} />
        <div className="flex-1" />
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#303030] flex items-center justify-center text-xs font-semibold text-[#737373]">L</div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">

        {/* Profile header */}
        <div className="px-6 py-6 border-b border-[#1a1a1a]">
          <button onClick={() => router.push('/clients')} className="flex items-center gap-1.5 text-[11px] font-mono text-[#3d3d3d] hover:text-[#737373] transition-colors mb-5">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 2L3 5L7 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            clientes
          </button>

          <div className="flex items-start gap-4">
            <div className="w-[48px] h-[48px] rounded-full bg-[#1a1a1a] border border-[#242424] flex items-center justify-center text-[16px] font-semibold text-[#737373] flex-shrink-0">
              {client.initial}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-medium text-[#e5e5e5]">{client.name}</h1>
              <p className="text-[12px] text-[#737373] mt-0.5">{client.role} · {client.company}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: client.stageColor }} />
                <p className="text-[11px]" style={{ color: client.stageColor }}>{client.stage}</p>
                <span className="text-[#3d3d3d] text-[11px]">· {client.lastContact}</span>
              </div>
            </div>
            <button
              onClick={handleChat}
              className="flex items-center gap-2 bg-[#14532d] border border-[#166534] text-[#4ade80] text-[12px] font-medium rounded-[10px] px-3.5 py-2 hover:bg-[#166534] transition-colors flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 2C1 1.45 1.45 1 2 1H10C10.55 1 11 1.45 11 2V8C11 8.55 10.55 9 10 9H4L1 11V2Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
              Falar com o Faro
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5 max-w-[640px]">

          {/* Contact */}
          <Section label="Contato">
            <div className="flex flex-col gap-2">
              <InfoRow icon="mail" value={client.email} />
              <InfoRow icon="phone" value={client.phone} />
            </div>
          </Section>

          {/* Open items */}
          <Section label="Em aberto">
            <div className="flex flex-col gap-2">
              {client.openItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#141414] border border-[#1a1a1a] rounded-[12px] px-3.5 py-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${item.urgent ? 'bg-[#f59e0b]' : 'bg-[#303030]'}`} />
                  <div>
                    <p className="text-[13px] text-[#e5e5e5]">{item.label}</p>
                    <p className="text-[11px] text-[#737373] mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Context */}
          <Section label="Contexto">
            <p className="text-[13px] text-[#a3a3a3] leading-relaxed">{client.context}</p>
          </Section>

          {/* Notes */}
          <Section label="Notas">
            <p className="text-[13px] text-[#a3a3a3] leading-relaxed">{client.notes}</p>
          </Section>

          {/* History */}
          <Section label="Histórico">
            <div className="flex flex-col gap-1">
              {client.history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[#1a1a1a] last:border-0">
                  <p className="text-[10px] font-mono text-[#3d3d3d] w-[44px] flex-shrink-0 pt-0.5">{h.date}</p>
                  <p className="text-[13px] text-[#a3a3a3]">{h.event}</p>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </main>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase mb-2.5">{label}</p>
      {children}
    </div>
  );
}

function InfoRow({ icon, value }: { icon: 'mail' | 'phone'; value: string }) {
  const icons = {
    mail: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M1 4L6 7L11 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    phone: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 2.5C2 2.22 2.22 2 2.5 2H4L5 4.5L3.5 5.5C4.17 7.17 5.33 7.83 6.5 8.5L7.5 7L10 8V9.5C10 9.78 9.78 10 9.5 10C5.36 10 2 6.64 2 2.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[#3d3d3d]">{icons[icon]}</span>
      <p className="text-[13px] text-[#737373]">{value}</p>
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
