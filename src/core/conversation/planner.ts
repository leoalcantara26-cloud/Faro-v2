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

Regras de decisão:
- "ask"     → falta informação essencial. Use quando confidence.recommendation = ask
- "confirm" → há informação mas incerteza. Use quando confidence.recommendation = confirm
- "execute" → informações suficientes. Use apenas quando confidence.recommendation = proceed E há tarefas disponíveis
- "respond" → pergunta, saudação ou conversa que não exige ação no sistema

Regra absoluta: o plano jamais deve conter mais de uma pergunta. Se houver múltiplas informações
faltando, escolha a mais importante e pergunte apenas essa. As demais serão coletadas nos próximos turnos.

Gerenciamento de atenção:
- Quando o modo de atenção for "execution": há objetivos ativos. TODA pergunta deve existir apenas para desbloquear esses objetivos.
- Quando o modo de atenção for "conversational": não há objetivos ativos. Você pode usar a bestNextQuestion para conduzir a conversa.
- Quando o status for "closed": todos os objetivos foram concluídos. Confirme brevemente e aguarde. NÃO faça perguntas.

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
      lines.push('INSTRUÇÃO: Modo execução ativo. Toda pergunta deve existir APENAS para desbloquear um objetivo em aberto.');
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
