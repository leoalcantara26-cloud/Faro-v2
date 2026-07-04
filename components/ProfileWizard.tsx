'use client';

import { useState } from 'react';
import { MicButton } from './MicButton';

export interface UserProfile {
  name: string;
  company: string;
  role: string;
  product: string;
  market: string;
  avgTicket: string;
  instagram: string;
  website: string;
}

const EMPTY_PROFILE: UserProfile = {
  name: '', company: '', role: '', product: '', market: '',
  avgTicket: '', instagram: '', website: '',
};

interface ProfileWizardProps {
  initial?: Partial<UserProfile>;
  onSave: (profile: UserProfile) => void;
  isOnboarding?: boolean;
}

const VOICE_SUGGESTIONS = [
  'Meu nome, minha empresa e meu cargo',
  'O que eu vendo e para quem',
  'Meu ticket médio ou ciclo de venda',
  'Meu Instagram e site (opcionais)',
];

export function ProfileWizard({ initial, onSave, isOnboarding = false }: ProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE, ...initial });
  const [voiceMode, setVoiceMode] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  const set = (field: keyof UserProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p) => ({ ...p, [field]: e.target.value }));

  const handleTranscript = async (text: string) => {
    setExtracting(true);
    setExtractError('');
    try {
      const res = await fetch('/api/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json() as { profile?: Partial<UserProfile>; error?: string };
      if (data.profile) {
        setProfile((p) => ({
          ...p,
          ...Object.fromEntries(
            Object.entries(data.profile!).filter(([, v]) => v !== null && v !== undefined && v !== ''),
          ),
        }));
        setVoiceMode(false);
      } else {
        setExtractError('Não consegui identificar as informações. Tente novamente.');
      }
    } catch {
      setExtractError('Erro ao processar. Tente novamente.');
    } finally {
      setExtracting(false);
    }
  };

  const step1Valid = profile.name.trim() && profile.company.trim();
  const step2Valid = profile.product.trim() && profile.market.trim();

  return (
    <div className="flex h-screen bg-[#0f0f0f] items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center font-mono text-sm font-bold text-[#4ade80] mx-auto mb-4">F</div>
          {isOnboarding ? (
            <>
              <h1 className="text-[17px] font-medium text-[#e5e5e5]">Olá. Sou o Faro.</h1>
              <p className="text-[13px] text-[#737373] mt-1.5">Para começar, me conta um pouco sobre você.</p>
            </>
          ) : (
            <>
              <h1 className="text-[17px] font-medium text-[#e5e5e5]">Meu perfil</h1>
              <p className="text-[13px] text-[#737373] mt-1.5">Suas informações ajudam o Faro a ser mais preciso.</p>
            </>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-7 justify-center">
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 0 ? 'bg-[#4ade80]' : 'bg-[#303030]'}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 1 ? 'bg-[#4ade80]' : 'bg-[#303030]'}`} />
        </div>

        {/* Voice mode toggle */}
        {!voiceMode ? (
          <button
            onClick={() => { setVoiceMode(true); setExtractError(''); }}
            className="w-full flex items-center gap-2.5 bg-[#141414] border border-[#1a1a1a] rounded-[12px] px-4 py-3 mb-5 hover:border-[#303030] transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" stroke="#4ade80" strokeWidth="1.6"/>
                <path d="M5 10C5 14.418 8.134 18 12 18C15.866 18 19 14.418 19 10" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M12 18V22" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[13px] text-[#a3a3a3] group-hover:text-[#e5e5e5] transition-colors">Preencher por voz</p>
              <p className="text-[11px] text-[#3d3d3d]">Fale e o Faro identifica tudo</p>
            </div>
          </button>
        ) : (
          <div className="bg-[#141414] border border-[#1a1a1a] rounded-[14px] px-4 py-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-[#a3a3a3]">Fale sobre você</p>
              <button onClick={() => setVoiceMode(false)} className="text-[11px] font-mono text-[#3d3d3d] hover:text-[#737373] transition-colors">cancelar</button>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              {VOICE_SUGGESTIONS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#3d3d3d] flex-shrink-0" />
                  <p className="text-[11px] text-[#3d3d3d]">{s}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              {extracting ? (
                <div className="flex items-center gap-2 text-[12px] text-[#737373]">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
                  </svg>
                  Identificando...
                </div>
              ) : (
                <MicButton onTranscript={handleTranscript} size="lg" />
              )}
            </div>
            {extractError && <p className="text-[11px] text-[#f87171] text-center mt-3">{extractError}</p>}
          </div>
        )}

        {/* Step 0 */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase mb-1">Sobre você</p>
            <Field label="Nome" value={profile.name} onChange={set('name')} placeholder="Seu nome" />
            <Field label="Empresa" value={profile.company} onChange={set('company')} placeholder="Nome da empresa" />
            <Field label="Cargo" value={profile.role} onChange={set('role')} placeholder="Ex: Executivo de Vendas" />
            <button
              onClick={() => { if (step1Valid) setStep(1); }}
              disabled={!step1Valid}
              className="mt-2 w-full py-3 rounded-[12px] text-[13px] font-medium transition-all disabled:opacity-30 bg-[#14532d] border border-[#166534] text-[#4ade80] hover:bg-[#166534] disabled:hover:bg-[#14532d]"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase mb-1">O que você vende</p>
            <Field label="Produto / Serviço" value={profile.product} onChange={set('product')} placeholder="Ex: Software de gestão financeira" />
            <Field label="Mercado-alvo" value={profile.market} onChange={set('market')} placeholder="Ex: PMEs do setor industrial" />
            <Field label="Ticket médio" value={profile.avgTicket} onChange={set('avgTicket')} placeholder="Ex: R$ 5.000/mês (opcional)" />
            <div className="mt-1 border-t border-[#1a1a1a] pt-3">
              <p className="text-[10px] font-mono text-[#3d3d3d] tracking-[.1em] uppercase mb-3">Sua presença online (opcional)</p>
              <div className="flex flex-col gap-3">
                <Field label="Instagram" value={profile.instagram} onChange={set('instagram')} placeholder="@suaempresa" />
                <Field label="Site" value={profile.website} onChange={set('website')} placeholder="suaempresa.com.br" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-3 rounded-[12px] text-[13px] font-medium bg-[#141414] border border-[#242424] text-[#737373] hover:border-[#303030] transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => { if (step2Valid) onSave(profile); }}
                disabled={!step2Valid}
                className="flex-[2] py-3 rounded-[12px] text-[13px] font-medium transition-all disabled:opacity-30 bg-[#14532d] border border-[#166534] text-[#4ade80] hover:bg-[#166534] disabled:hover:bg-[#14532d]"
              >
                {isOnboarding ? 'Começar' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-[#737373] mb-1.5">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[#141414] border border-[#242424] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[#e5e5e5] placeholder-[#3d3d3d] outline-none focus:border-[#303030] transition-colors"
      />
    </div>
  );
}
