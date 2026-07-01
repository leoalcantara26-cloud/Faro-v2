import type { ILLMProvider } from '../llm/llm.interface';
import type { ConversationSession } from './session';

export type NegotiationStage =
  | 'primeiro_contato'
  | 'qualificacao'
  | 'apresentacao'
  | 'proposta'
  | 'negociacao'
  | 'fechamento'
  | 'pos_venda'
  | 'indefinido';

export interface MemoryUpdateItem {
  entity: 'client' | 'meeting' | 'follow_up' | 'interaction';
  data: Record<string, unknown>;
}

/**
 * Internal representation of what Faro truly understood from the conversation.
 * This is not a transcript — it's a structured model of the current state.
 */
export interface ConversationUnderstanding {
  // What was shared
  client?: string;
  keyFacts: string[];

  // State of the negotiation
  negotiationStage: NegotiationStage;

  // What is still unknown and would be valuable to know
  unknownInfo: string[];

  // Things that still need to happen
  pendingItems: string[];

  // Concrete next steps mentioned or clearly implied
  nextSteps: string[];

  // What should be persisted to memory after this turn
  memoryUpdates: MemoryUpdateItem[];

  // The single most useful question to advance the conversation right now
  bestNextQuestion: string;

  // Overall tone of what was shared
  sentiment: 'positivo' | 'negativo' | 'neutro' | 'indefinido';
}

const SUMMARIZER_SYSTEM = `Você é o modelo de entendimento interno do Faro, assistente executivo de um vendedor.

Seu trabalho é construir uma representação estruturada do que foi dito — não um resumo, mas um modelo do estado atual da conversa.

Analise a mensagem do usuário no contexto do histórico e responda APENAS com JSON válido.

Campos obrigatórios:
- client: nome do cliente mencionado (null se não mencionado)
- keyFacts: lista de fatos concretos compartilhados (apenas o que foi dito explicitamente)
- negotiationStage: estágio atual — primeiro_contato | qualificacao | apresentacao | proposta | negociacao | fechamento | pos_venda | indefinido
- unknownInfo: informações ainda desconhecidas que seriam valiosas para o processo (ex: "reação ao preço", "quem toma a decisão final")
- pendingItems: coisas que ainda precisam acontecer, mencionadas ou claramente implícitas
- nextSteps: próximos passos concretos mencionados ou acordados
- memoryUpdates: o que deve ser salvo na memória. Cada item tem "entity" (client | meeting | follow_up | interaction) e "data" (objeto com os campos relevantes)
- bestNextQuestion: a pergunta única mais útil para avançar a conversa agora. Deve ser específica, não genérica. Nunca "Como foi?" — sempre algo que gera informação real.
- sentiment: positivo | negativo | neutro | indefinido

Nunca invente informações. Nunca assuma o que não foi dito.
Nunca inclua conselhos de vendas ou avaliações — apenas fatos e estrutura.`;

export class Summarizer {
  constructor(private readonly llm: ILLMProvider) {}

  async summarize(
    userMessage: string,
    session: ConversationSession,
  ): Promise<ConversationUnderstanding> {
    const recentTurns = session.getRecentTurns(8);
    const historyText = recentTurns
      .slice(0, -1)
      .map((t) => `${t.role === 'user' ? 'Usuário' : 'Faro'}: ${t.content}`)
      .join('\n');

    const contextBlock = historyText
      ? `Contexto da conversa:\n${historyText}\n\nMensagem atual: "${userMessage}"`
      : `Mensagem: "${userMessage}"`;

    try {
      const response = await this.llm.generate({
        messages: [
          { role: 'system', content: SUMMARIZER_SYSTEM },
          { role: 'user', content: contextBlock },
        ],
        temperature: 0,
        maxTokens: 768,
      });

      const json = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(json) as ConversationUnderstanding;
    } catch {
      return {
        keyFacts: [userMessage],
        negotiationStage: 'indefinido',
        unknownInfo: [],
        pendingItems: [],
        nextSteps: [],
        memoryUpdates: [],
        bestNextQuestion: 'Pode me contar mais detalhes?',
        sentiment: 'indefinido',
      };
    }
  }
}
