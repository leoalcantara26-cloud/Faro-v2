'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileWizard, type UserProfile } from '../../components/ProfileWizard';

interface CompanyBriefing {
  description: string;
  positioning: string;
  mainProducts: string[];
  targetAudience: string;
  tone: string;
  highlights: string[];
  researchedAt: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function ProfilePage() {
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<UserProfile> | undefined>(undefined);
  const [briefing, setBriefing] = useState<CompanyBriefing | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('faro_profile');
    if (stored) {
      try { setInitial(JSON.parse(stored)); } catch { /* ignore */ }
    }
    const storedBriefing = localStorage.getItem('faro_company_briefing');
    if (storedBriefing) {
      try { setBriefing(JSON.parse(storedBriefing)); } catch { /* ignore */ }
    }
    setLoaded(true);
  }, []);

  const runResearch = async (profile: UserProfile) => {
    if (!profile.website?.trim()) {
      setResearchError('Adicione um site no perfil para o Faro pesquisar.');
      return;
    }
    setResearching(true);
    setResearchError('');
    try {
      const res = await fetch('/api/research-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: profile.website,
          company: profile.company,
          product: profile.product,
          market: profile.market,
          instagram: profile.instagram,
        }),
      });
      const data = await res.json() as { briefing?: CompanyBriefing; error?: string; fetchError?: string };
      if (data.briefing) {
        setBriefing(data.briefing);
        localStorage.setItem('faro_company_briefing', JSON.stringify(data.briefing));
        if (data.fetchError) setResearchError(data.fetchError);
      } else {
        setResearchError(data.error || 'Erro ao pesquisar.');
      }
    } catch {
      setResearchError('Erro ao pesquisar. Tente novamente.');
    } finally {
      setResearching(false);
    }
  };

  const handleSave = async (profile: UserProfile) => {
    localStorage.setItem('faro_profile', JSON.stringify(profile));
    setInitial(profile);
    setEditing(false);

    // Auto-research if website is set
    if (profile.website?.trim()) {
      await runResearch(profile);
    }
  };

  if (!loaded) return null;

  if (editing) {
    return <ProfileWizard initial={initial} onSave={handleSave} />;
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">

      {/* Nav */}
      <nav className="w-[52px] flex-shrink-0 border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-1">
        <div className="w-[30px] h-[30px] rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-xs font-bold text-[#4ade80] mb-4">F</div>
        <NavBtn icon="home" onClick={() => router.push('/')} />
        <NavBtn icon="chat" onClick={() => router.push('/chat')} />
        <NavBtn icon="clients" onClick={() => router.push('/clients')} />
        <div className="flex-1" />
        <button className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#4ade80] flex items-center justify-center text-xs font-semibold text-[#4ade80]">
          {initial?.name?.[0]?.toUpperCase() ?? '?'}
        </button>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[520px] mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-[15px] font-medium text-[#e5e5e5]">Meu perfil</h1>
              <p className="text-[11px] font-mono text-[#3d3d3d] mt-0.5">Informações que o Faro usa sobre você</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] font-mono text-[#737373] hover:text-[#a3a3a3] transition-colors border border-[#242424] rounded-[8px] px-3 py-1.5 hover:border-[#303030]"
            >
              Editar
            </button>
          </div>

          {/* User info */}
          <Section label="Você">
            <div className="flex flex-col gap-2">
              <Row label="Nome" value={initial?.name} />
              <Row label="Empresa" value={initial?.company} />
              <Row label="Cargo" value={initial?.role} />
            </div>
          </Section>

          {/* What you sell */}
          <Section label="O que você vende">
            <div className="flex flex-col gap-2">
              <Row label="Produto / Serviço" value={initial?.product} />
              <Row label="Mercado-alvo" value={initial?.market} />
              <Row label="Ticket médio" value={initial?.avgTicket} />
            </div>
          </Section>

          {/* Online presence */}
          {(initial?.instagram || initial?.website) && (
            <Section label="Presença online">
              <div className="flex flex-col gap-2">
                {initial?.instagram && <Row label="Instagram" value={initial.instagram} />}
                {initial?.website && <Row label="Site" value={initial.website} />}
              </div>
            </Section>
          )}

          {/* Company briefing */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase">O que o Faro sabe</p>
              <button
                onClick={() => initial && runResearch(initial as UserProfile)}
                disabled={researching || !initial?.website}
                className="flex items-center gap-1.5 text-[10px] font-mono text-[#737373] hover:text-[#4ade80] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={!initial?.website ? 'Adicione um site no perfil' : 'Re-pesquisar empresa'}
              >
                {researching ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    pesquisando...
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M8.5 5A3.5 3.5 0 1 1 5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <path d="M5 1.5L7 3.5L5 1.5L3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {briefing ? 're-pesquisar' : 'pesquisar empresa'}
                  </>
                )}
              </button>
            </div>

            {researchError && (
              <p className="text-[11px] text-[#f59e0b] mb-3">{researchError}</p>
            )}

            {!briefing && !researching && (
              <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-4 text-center">
                <p className="text-[12px] text-[#3d3d3d]">
                  {initial?.website
                    ? 'Clique em "pesquisar empresa" para o Faro analisar seu site.'
                    : 'Adicione seu site no perfil para o Faro pesquisar sua empresa.'}
                </p>
              </div>
            )}

            {briefing && (
              <div className="flex flex-col gap-3">
                <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5">
                  <p className="text-[11px] text-[#3d3d3d] mb-1.5">Descrição</p>
                  <p className="text-[13px] text-[#a3a3a3] leading-relaxed">{briefing.description}</p>
                </div>

                {briefing.positioning && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5">
                    <p className="text-[11px] text-[#3d3d3d] mb-1.5">Posicionamento</p>
                    <p className="text-[13px] text-[#a3a3a3]">{briefing.positioning}</p>
                  </div>
                )}

                {briefing.mainProducts?.length > 0 && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5">
                    <p className="text-[11px] text-[#3d3d3d] mb-2">Produtos / Serviços</p>
                    <div className="flex flex-wrap gap-1.5">
                      {briefing.mainProducts.map((p, i) => (
                        <span key={i} className="text-[11px] text-[#737373] bg-[#1a1a1a] border border-[#242424] rounded-full px-2.5 py-0.5">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {briefing.targetAudience && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5">
                    <p className="text-[11px] text-[#3d3d3d] mb-1.5">Público-alvo</p>
                    <p className="text-[13px] text-[#a3a3a3]">{briefing.targetAudience}</p>
                  </div>
                )}

                {briefing.highlights?.length > 0 && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5">
                    <p className="text-[11px] text-[#3d3d3d] mb-2">Destaques</p>
                    <div className="flex flex-col gap-1.5">
                      {briefing.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#4ade80] mt-1.5 flex-shrink-0" />
                          <p className="text-[12px] text-[#a3a3a3]">{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] font-mono text-[#3d3d3d] text-right">
                  Pesquisado em {formatDate(briefing.researchedAt)}
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase mb-2.5">{label}</p>
      <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-3.5">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-[11px] text-[#3d3d3d] flex-shrink-0">{label}</p>
      <p className="text-[13px] text-[#a3a3a3] text-right">{value}</p>
    </div>
  );
}

function NavBtn({ icon, onClick }: { icon: string; onClick?: () => void }) {
  const cls = 'w-9 h-9 rounded-[9px] flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors text-[#3d3d3d] hover:bg-[#1a1a1a] hover:text-[#a3a3a3]';
  const icons: Record<string, React.ReactElement> = {
    home: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2L14 6.5V14H10V10H6V14H2V6.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
    chat: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3C2 2.45 2.45 2 3 2H13C13.55 2 14 2.45 14 3V10C14 10.55 13.55 11 13 11H5L2 14V3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
    clients: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 13.5C2.5 11 5 9 8 9C11 9 13.5 11 13.5 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  };
  return <button className={cls} onClick={onClick}>{icons[icon]}</button>;
}
