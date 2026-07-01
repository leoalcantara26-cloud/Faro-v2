import type { ILLMProvider } from '../llm/llm.interface';
import type { ConversationSession } from './session';
import type { MemoryEntity } from '../memory/memory.interface';
import type { ConfidenceAssessment } from './confidence';
import type { GoalTrackerState } from './goal-tracker';
import type { Task } from './task-planner';

export type PlanDecision = 'ask' | 'confirm' | 'execute' | 'respond';

export interface AgentAction {
  agent: string;
  action: string;
  params: Record<string, unknown>;
}

export interface Plan {
  decision: PlanDecision;
  reasoning: string;
  action?: AgentAction;
  missingInfo?: string[];
  confirmationData?: Record<string, string>;
  directResponse?: string;
  suggestedNextStep?: string;
}

const PLANNER_SYSTEM = `Você é o planejador interno do Faro, assistente executivo de vendedores.

Sua ÚNICA responsabilidade é analisar o contexto e decidir a estratégia de execução.
Você NÃO executa nenhuma ação. Você NUNCA chama ferramentas externas. Você apenas decide.

A avaliação de confiança já foi feita antes de você. Use-a para guiar sua decisão.
O mapeamento de tarefas para agentes já foi feito pelo TaskPlanner — você recebe as tarefas prontas.

────────────────────────────────────────
PRINCÍPIO 1 — A INTENÇÃO ATUAL SEMPRE TEM PRIORIDADE
────────────────────────────────────────
A mensagem mais recente do usuário representa sua prioridade atual.

Se ela for claramente sobre um assunto diferente dos goals em aberto — uma pergunta sobre
capacidades do Faro, sobre outro cliente, sobre outro tema, ou um sinal explícito de encerramento
como "esquece", "agora vamos falar de", "quanto custa", "você consegue fazer X" — o modo execução
deve ser pausado. Decida "respond" respondendo completamente a nova pergunta.

Se existir um goal pausado, use suggestedNextStep para oferecer retomá-lo depois.
O usuário nunca deve sentir que sua pergunta foi ignorada.

Sinais claros de nova intenção dominante (exemplos):
- Pergunta sobre capacidade: "Você consegue integrar ao WhatsApp?"
- Mudança explícita de contexto: "Agora vamos falar do João", "Esquece o Gustavo"
- Pergunta sobre produto/preço: "Quanto custa?", "Quais planos existem?"
- Assunto completamente não relacionado ao goal aberto

────────────────────────────────────────
PRINCÍPIO 2 — GERE VALOR ANTES DE INVESTIGAR
────────────────────────────────────────
Conversar com o Faro deve parecer uma conversa entre dois profissionais experientes — não um questionário.

Regra: se você já possui informação suficiente para entregar algo útil, faça isso agora.
Não colete informações que ainda não são necessárias.

Pergunte APENAS quando a informação faltante for crítica — ou seja: sem ela, a ação estaria
errada ou incompleta de forma relevante para o usuário. Um detalhe secundário não bloqueia execução.

Quando decidir "ask", escolha apenas a pergunta mais importante. Uma por vez. Nunca duas.

────────────────────────────────────────
Regras de decisão:
- "ask"     → falta informação CRÍTICA. Só quando sem ela a execução seria errada.
- "confirm" → há ambiguidade genuína (números, datas relativas, pronomes sem referência).
- "execute" → informações suficientes para agir bem. Prefira executar a perguntar.
- "respond" → nova intenção dominante, pergunta sobre o Faro, conversa sem ação no sistema,
              ou contexto encerrado.

Gerenciamento de atenção:
- Quando o modo de atenção for "execution": há objetivos ativos — mas SEMPRE verifique
  primeiro se a mensagem atual representa uma nova intenção dominante (Princípio 1).
- Quando o modo de atenção for "conversational": use a bestNextQuestion para conduzir.
- Quando o status for "closed": confirme brevemente e aguarde. NÃO faça perguntas.

Chame obrigatoriamente a ferramenta "create_plan" com sua decisão.`;

const CREATE_PLAN_TOOL = {
  name: 'create_plan',
  description: 'Registra o plano de ação decidido pelo planejador',
  parameters: {
    type: 'object',
    properties: {
      decision: {
        type: 'string',
        enum: ['ask', 'confirm', 'execute', 'respond'],
      },
      reasoning: {
        type: 'string',
        description: 'Raciocínio interno (não mostrado ao usuário)',
      },
      selectedTaskIndex: {
        type: 'number',
        description: 'Índice da tarefa a executar na lista de tarefas disponíveis (quando decision = execute)',
      },
      missingInfo: {
        type: 'array',
        items: { type: 'string' },
        description: 'Informações faltando (quando decision = ask)',
      },
      confirmationData: {
        type: 'object',
        description: 'Dados a confirmar com o usuário (quando decision = confirm)',
      },
      directResponse: {
        type: 'string',
        description: 'Resposta direta ao usuário (quando decision = respond)',
      },
      suggestedNextStep: {
        type: 'string',
        description: 'Próximo passo útil a sugerir após execução (opcional)',
      },
    },
    required: ['decision', 'reasoning'],
  },
};

interface RawPlan {
  decision: PlanDecision;
  reasoning: string;
  selectedTaskIndex?: number;
  missingInfo?: string[];
  confirmationData?: Record<string, string>;
  directResponse?: string;
  suggestedNextStep?: string;
}

export class Planner {
  constructor(private readonly llm: ILLMProvider) {}

  async plan(
    session: ConversationSession,
    memoryContext: MemoryEntity[],
    assessment: ConfidenceAssessment,
    goalState: GoalTrackerState,
    tasks: Task[],
  ): Promise<Plan> {
    // Short-circuit: closed context — confirm and stop
    if (goalState.conversation.status === 'closed') {
      return {
        decision: 'respond',
        reasoning: 'All goals completed. Context is closed.',
        directResponse: 'Todos os objetivos desta conversa foram concluídos.',
      };
    }

    const history = session.getRecentTurns(8);
    const state = session.getSnapshot();

    const memoryText = memoryContext.length > 0
      ? `\nContexto disponível na memória:\n${memoryContext.map((e) => JSON.stringify(e.data)).join('\n')}`
      : '';

    const entitiesText = Object.keys(state.collectedEntities).length > 0
      ? `\nEntidades já coletadas: ${JSON.stringify(state.collectedEntities)}`
      : '';

    const pendingText = state.pendingAction
      ? `\nAção pendente aguardando confirmação: ${JSON.stringify(state.pendingAction)}`
      : '';

    const historyText = history
      .map((t) => `${t.role === 'user' ? 'Usuário' : 'Faro'}: ${t.content}`)
      .join('\n');

    const goalBlock = this.buildGoalBlock(goalState, tasks);

    const response = await this.llm.generate({
      messages: [
        {
          role: 'system',
          content: PLANNER_SYSTEM + memoryText + entitiesText + pendingText,
        },
        {
          role: 'user',
          content: [
            `Histórico:\n${historyText}`,
            `\nAvaliação de confiança: ${assessment.context}`,
            `Recomendação: ${assessment.recommendation}`,
            assessment.clarificationQuestion
              ? `Pergunta sugerida se necessário: "${assessment.clarificationQuestion}"`
              : '',
            goalBlock,
            '\nProduz um plano de ação.',
          ].filter(Boolean).join('\n'),
        },
      ],
      tools: [CREATE_PLAN_TOOL],
      temperature: 0,
      maxTokens: 512,
    });

    const toolCall = response.toolCalls?.[0];

    if (!toolCall) {
      return {
        decision: 'respond',
        reasoning: 'Planner não retornou tool call.',
        directResponse: response.content,
      };
    }

    const raw = toolCall.arguments as unknown as RawPlan;

    // Resolve selectedTaskIndex → action
    let action: AgentAction | undefined;
    if (raw.decision === 'execute' && tasks.length > 0) {
      const idx = typeof raw.selectedTaskIndex === 'number' ? raw.selectedTaskIndex : 0;
      const task = tasks[Math.min(idx, tasks.length - 1)];
      action = { agent: task.agent, action: task.action, params: task.params };
    }

    return {
      decision: raw.decision,
      reasoning: raw.reasoning,
      action,
      missingInfo: raw.missingInfo,
      confirmationData: raw.confirmationData,
      directResponse: raw.directResponse,
      suggestedNextStep: raw.suggestedNextStep,
    };
  }

  private buildGoalBlock(goalState: GoalTrackerState, tasks: Task[]): string {
    const { conversation, attentionMode } = goalState;
    const lines: string[] = ['\nGerenciamento de objetivos:'];
    lines.push(`Modo de atenção: ${attentionMode}`);
    lines.push(`Status da conversa: ${conversation.status}`);

    const open = conversation.goals.filter(
      (g) => g.status === 'open' || g.status === 'awaiting_info',
    );
    const done = conversation.goals.filter((g) => g.status === 'completed');

    if (open.length > 0) {
      lines.push(`Objetivos em aberto: ${open.map((g) => g.description).join(', ')}`);
      lines.push('ATENÇÃO: Antes de continuar o modo execução, verifique se a mensagem atual é uma nova intenção dominante (Princípio 1). Se for, responda primeiro.');
      lines.push('Se a mensagem for continuação dos goals abertos, então: toda pergunta deve existir APENAS para desbloquear o objetivo, nunca para coletar informações secundárias (Princípio 2).');
    }

    if (done.length > 0) {
      lines.push(`Objetivos concluídos: ${done.map((g) => g.description).join(', ')}`);
    }

    if (tasks.length > 0) {
      lines.push('\nTarefas disponíveis (já mapeadas para agentes pelo TaskPlanner):');
      tasks.forEach((t, i) => {
        lines.push(`  [${i}] agente=${t.agent} ação=${t.action} criticidade=${t.criticality} prioridade=${t.priority}`);
      });
      lines.push('Se decision=execute, informe selectedTaskIndex com o índice da tarefa.');
    }

    if (conversation.entities.length > 0) {
      const entitySummary = conversation.entities
        .map((e) => `${e.type}=${e.value}`)
        .join(', ');
      lines.push(`\nEntidades da conversa: ${entitySummary}`);
    }

    return lines.join('\n');
  }
}
