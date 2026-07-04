'use client';

interface Entity {
  type: string;
  value: string;
  confidence: number;
}

interface Goal {
  id: string;
  description: string;
  status: 'open' | 'awaiting_info' | 'completed' | 'discarded';
}

interface ContextData {
  entities: Entity[];
  goals: Goal[];
  conversationStatus: string;
  attentionMode: string;
}

function GoalIcon({ status }: { status: Goal['status'] }) {
  if (status === 'completed') {
    return (
      <span className="w-4 h-4 rounded-full bg-[#14532d] border border-[#166534] flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4L3 5.5L6.5 2" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (status === 'awaiting_info') {
    return <span className="w-4 h-4 rounded-full bg-[#1c1a0a] border border-[#713f12] flex-shrink-0 mt-0.5" />;
  }
  if (status === 'discarded') {
    return <span className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex-shrink-0 mt-0.5 opacity-40" />;
  }
  return <span className="w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#3a3a3a] flex-shrink-0 mt-0.5" />;
}

function EntityTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    client: 'cliente',
    company: 'empresa',
    product: 'produto',
    date: 'data',
    amount: 'valor',
    contact: 'contato',
  };
  return (
    <span className="text-[10px] font-mono text-[#404040] uppercase tracking-wider">
      {labels[type] ?? type}
    </span>
  );
}

export function ContextPanel({ data }: { data: ContextData | null }) {
  const hasContent = data && (data.entities.length > 0 || data.goals.length > 0);

  if (!hasContent) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="w-8 h-8 rounded-full border border-[#2a2a2a] flex items-center justify-center mb-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#404040" strokeWidth="1"/>
            <path d="M7 4.5V7.5M7 9.5V9.6" stroke="#404040" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-[#404040] text-xs leading-relaxed">
          O Faro irá capturar<br/>contexto aqui
        </p>
      </div>
    );
  }

  const activeGoals = data.goals.filter((g) => g.status === 'open' || g.status === 'awaiting_info');
  const completedGoals = data.goals.filter((g) => g.status === 'completed');

  return (
    <div className="h-full overflow-y-auto px-4 py-5 space-y-6">
      {/* Entities */}
      {data.entities.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-[#404040] uppercase tracking-widest mb-3">
            Contexto
          </p>
          <div className="space-y-2">
            {data.entities.map((e, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <EntityTypeLabel type={e.type} />
                <p className="text-sm text-[#e5e5e5] font-medium">{e.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-[#404040] uppercase tracking-widest mb-3">
            Em andamento
          </p>
          <div className="space-y-2.5">
            {activeGoals.map((g) => (
              <div key={g.id} className="flex items-start gap-2">
                <GoalIcon status={g.status} />
                <p className="text-xs text-[#a3a3a3] leading-snug">{g.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-[#404040] uppercase tracking-widest mb-3">
            Concluído
          </p>
          <div className="space-y-2.5">
            {completedGoals.map((g) => (
              <div key={g.id} className="flex items-start gap-2 opacity-50">
                <GoalIcon status={g.status} />
                <p className="text-xs text-[#737373] leading-snug line-through decoration-[#404040]">
                  {g.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode badge */}
      {data.attentionMode === 'execution' && (
        <div className="pt-2 border-t border-[#1f1f1f]">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#4ade80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            modo execução
          </span>
        </div>
      )}
    </div>
  );
}
