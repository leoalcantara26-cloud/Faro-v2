import type { ILLMProvider } from '../llm/llm.interface';
import type { ExecutionResult } from './executor';
import type { ConversationSession } from './session';

export interface ComposedResponse {
  message: string;
  nextStep?: string;
}

const COMPOSER_SYSTEM = `Você é o Faro, assistente executivo de um vendedor de alto desempenho.

PERSONALIDADE:
- Você fala como um assistente humano experiente, não como um sistema.
- Você é direto, claro e confiante.
- Você demonstra que entende o contexto sem precisar repetir tudo.

REGRAS ABSOLUTAS DE LINGUAGEM:
- NUNCA use: "Cliente atualizado.", "Dados salvos.", "Reunião registrada.", "Operação concluída."
- NUNCA use linguagem técnica ou de sistema.
- SEMPRE escreva como se estivesse conversando com o vendedor pessoalmente.
- Respostas curtas para ações simples, detalhadas apenas quando necessário.
- Use "você" (não "o senhor" nem "tu").

QUANDO PEDIR INFORMAÇÃO:
- Seja natural: "Qual seria a data?" em vez de "Por favor, informe a data."
- Máximo uma pergunta por vez.

QUANDO PEDIR CONFIRMAÇÃO:
- Seja breve: "Só confirmando — João Silva, amanhã às 14h. Posso agendar?"
- Nunca liste os dados como um formulário.

QUANDO EXECUTAR UMA AÇÃO:
- Confirme que foi feito, de forma humana: "Pronto, já agendei para você."
- Se relevante, mencione um detalhe para mostrar que entendeu o contexto.

SUGESTÃO DE PRÓXIMO PASSO:
- Sugira apenas quando for genuinamente útil.
- Seja natural: "Quer que eu prepare um briefing antes da reunião?"
- NUNCA force uma sugestão se não houver contexto para isso.
- Máximo uma sugestão por resposta.`;

export class ResponseComposer {
  constructor(private readonly llm: ILLMProvider) {}

  async compose(result: ExecutionResult, session: ConversationSession): Promise<ComposedResponse> {
    const recentHistory = session.getRecentTurns(6);
    const historyText = recentHistory
      .slice(0, -1) // exclude last user turn (already in the instruction)
      .map((t) => `${t.role === 'user' ? 'Vendedor' : 'Faro'}: ${t.content}`)
      .join('\n');

    const instruction = this.buildInstruction(result);

    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: COMPOSER_SYSTEM },
        {
          role: 'user',
          content: `Histórico recente:\n${historyText}\n\nInstrução interna: ${instruction}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 512,
    });

    return this.parseResponse(response.content, result.suggestedNextStep);
  }

  private buildInstruction(result: ExecutionResult): string {
    switch (result.outcome) {
      case 'executed':
        if (result.error) {
          return `Houve um problema ao executar a ação: ${result.error}. Informe o usuário de forma natural e sugira tentar novamente.`;
        }
        return `A ação foi executada com sucesso. Resultado: ${result.agentOutput}. Confirme ao usuário de forma natural.${result.suggestedNextStep ? ` Considere sugerir: ${result.suggestedNextStep}` : ''}`;

      case 'asked':
        return `Precisa perguntar ao usuário: ${result.question}. Faça a pergunta de forma natural, como um assistente humano faria.`;

      case 'confirmed':
        return `Precisa confirmar os dados com o usuário antes de prosseguir: ${result.question}. Seja breve e natural.`;

      case 'responded':
        return `Responda diretamente ao usuário. Contexto: ${result.directResponse}.${result.suggestedNextStep ? ` Se fizer sentido, sugira: ${result.suggestedNextStep}` : ''}`;
    }
  }

  private parseResponse(content: string, suggestedNextStep?: string): ComposedResponse {
    // If the LLM embedded the next step in the message, don't duplicate
    const hasNextStepInContent = suggestedNextStep &&
      content.toLowerCase().includes(suggestedNextStep.toLowerCase().slice(0, 15));

    return {
      message: content,
      nextStep: hasNextStepInContent ? undefined : suggestedNextStep,
    };
  }
}
