import type { ILLMProvider } from '../llm/llm.interface';
import type { ConversationSession } from './session';

export interface ConversationSummary {
  client?: string;
  keyFacts: string[];
  actionItems: string[];
  nextStep?: string;
  sentiment?: 'positivo' | 'negativo' | 'neutro' | 'indefinido';
  missingInfo: string[];
}

const SUMMARIZER_SYSTEM = `Você é um extrator de informações para um assistente de vendas.

Analise a mensagem do usuário e extraia SOMENTE o que foi explicitamente dito ou claramente implícito.
Nunca invente ou assuma informações não mencionadas.

Responda APENAS com JSON válido, sem texto adicional.

Exemplo de saída:
{
  "client": "Gustavo",
  "keyFacts": [
    "Esposa participou da reunião",
    "Todos os produtos foram apresentados",
    "Valores foram apresentados",
    "Próxima reunião marcada para sexta às 17h"
  ],
  "actionItems": [
    "Enviar proposta formal antes de sexta"
  ],
  "nextStep": "Reunião de apresentação do orçamento na sexta às 17h",
  "sentiment": "positivo",
  "missingInfo": [
    "Reação do cliente aos valores",
    "Principais objeções"
  ]
}`;

export class Summarizer {
  constructor(private readonly llm: ILLMProvider) {}

  async summarize(
    userMessage: string,
    session: ConversationSession,
  ): Promise<ConversationSummary> {
    const recentTurns = session.getRecentTurns(6);
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
        maxTokens: 512,
      });

      const json = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(json) as ConversationSummary;
    } catch {
      // Fallback: return minimal summary so the pipeline never breaks
      return {
        keyFacts: [userMessage],
        actionItems: [],
        missingInfo: [],
        sentiment: 'indefinido',
      };
    }
  }
}
