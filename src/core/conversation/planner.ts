import type { ILLMProvider } from '../llm/llm.interface';
import type { ConversationSession } from './session';
import type { MemoryEntity } from '../memory/memory.interface';

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

Sua única responsabilidade é analisar o contexto da conversa e produzir um plano de ação.
Você NÃO executa nenhuma ação. Você apenas decide o que deve acontecer.

Regras de decisão:
- "ask"     → falta informação essencial para prosseguir (ex.: data, cliente, assunto)
- "confirm" → existe informação mas a confiança é baixa (ex.: pode ter sido mal entendido)
- "execute" → todas as informações necessárias estão presentes e confiáveis
- "respond" → é uma pergunta, saudação, ou conversa que não requer ação no sistema

Agentes disponíveis: agenda, crm, gmail, followup, briefing, whatsapp, research

Para cada agente, as ações disponíveis são:
- agenda:   list_events, create_event, delete_event
- crm:      get_client, create_client, update_client, list_clients
- gmail:    list_emails, send_email, draft_email
- followup: list_followups, create_followup, complete_followup
- briefing: generate_briefing
- whatsapp: send_message
- research: search_company, search_contact

Você deve sempre chamar a ferramenta "create_plan" com sua decisão.`;

const CREATE_PLAN_TOOL = {
  name: 'create_plan',
  description: 'Registra o plano de ação decidido pelo planejador',
  parameters: {
    type: 'object',
    properties: {
      decision: {
        type: 'string',
        enum: ['ask', 'confirm', 'execute', 'respond'],
        description: 'Tipo de decisão tomada',
      },
      reasoning: {
        type: 'string',
        description: 'Raciocínio interno que levou a essa decisão (não mostrado ao usuário)',
      },
      action: {
        type: 'object',
        description: 'Preenchido apenas quando decision = execute',
        properties: {
          agent: { type: 'string' },
          action: { type: 'string' },
          params: { type: 'object' },
        },
        required: ['agent', 'action', 'params'],
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
        description: 'Próximo passo útil a sugerir após a execução (opcional)',
      },
    },
    required: ['decision', 'reasoning'],
  },
};

export class Planner {
  constructor(private readonly llm: ILLMProvider) {}

  async plan(session: ConversationSession, memoryContext: MemoryEntity[]): Promise<Plan> {
    const state = session.getSnapshot();
    const history = session.getRecentTurns(8);

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

    const response = await this.llm.generate({
      messages: [
        {
          role: 'system',
          content: PLANNER_SYSTEM + memoryText + entitiesText + pendingText,
        },
        {
          role: 'user',
          content: `Histórico da conversa:\n${historyText}\n\nProduz um plano de ação.`,
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
        reasoning: 'Planner não retornou tool call — respondendo diretamente.',
        directResponse: response.content,
      };
    }

    return toolCall.arguments as Plan;
  }
}
