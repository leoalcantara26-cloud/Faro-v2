import type { ILLMProvider } from '../llm/llm.interface';
import type { ConversationSession } from './session';
import type { MemoryEntity } from '../memory/memory.interface';
import type { ConfidenceAssessment } from './confidence';

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

Sua ÚNICA responsabilidade é analisar o contexto e produzir um plano estruturado.
Você NÃO executa nenhuma ação. Você NUNCA chama ferramentas externas. Você apenas decide.

A avaliação de confiança já foi feita antes de você. Use-a para guiar sua decisão.

Regras de decisão:
- "ask"     → falta informação essencial. Use quando confidence.recommendation = ask
- "confirm" → existe informação mas há incerteza. Use quando confidence.recommendation = confirm
- "execute" → informações suficientes e confiáveis. Use apenas quando confidence.recommendation = proceed
- "respond" → pergunta, saudação ou conversa que não exige ação no sistema

Regra absoluta: o plano jamais deve conter mais de uma pergunta. Se houver múltiplas informações
faltando, escolha a mais importante e pergunte apenas essa. As demais serão coletadas nos próximos turnos.

Agentes disponíveis e suas ações:
- agenda:   list_events, create_event, delete_event
- crm:      get_client, create_client, update_client, list_clients
- gmail:    list_emails, send_email, draft_email
- followup: list_followups, create_followup, complete_followup
- briefing: generate_briefing
- whatsapp: send_message
- research: search_company, search_contact

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
        description: 'Próximo passo útil a sugerir após execução (opcional)',
      },
    },
    required: ['decision', 'reasoning'],
  },
};

export class Planner {
  constructor(private readonly llm: ILLMProvider) {}

  async plan(
    session: ConversationSession,
    memoryContext: MemoryEntity[],
    assessment: ConfidenceAssessment,
  ): Promise<Plan> {
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
          content: [
            `Histórico:\n${historyText}`,
            `\nAvaliação de confiança: ${assessment.context}`,
            `Recomendação: ${assessment.recommendation}`,
            assessment.clarificationQuestion
              ? `Pergunta sugerida se necessário: "${assessment.clarificationQuestion}"`
              : '',
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

    return toolCall.arguments as unknown as Plan;
  }
}
