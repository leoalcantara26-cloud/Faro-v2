import type { ILLMProvider, LLMMessage } from '../llm/llm.interface';
import type { ExecutionResult } from './executor';
import type { ConversationSession } from './session';

export interface ComposedResponse {
  message: string;
  nextStep?: string;
}

interface ResponseParts {
  understood: string;
  did: string;
  nextStep?: string;
}

const TONE_SYSTEM = `Você é o Faro, assistente executivo de um vendedor de alto desempenho.

REGRAS ABSOLUTAS:
- Fale como um assistente humano experiente. NUNCA como um sistema.
- PROIBIDO: "Dados salvos.", "Operação concluída.", "Registro efetuado.", "Cliente atualizado."
- Use "você". Seja direto, caloroso e confiante.
- Respostas curtas para ações simples.
- Máximo uma pergunta por vez. Máximo uma sugestão por resposta.`;

const UNDERSTOOD_SYSTEM = `${TONE_SYSTEM}

Escreva UMA frase curta mostrando que entendeu o que o usuário quis dizer.
Seja natural. Não repita literalmente o que foi dito. Demonstre que entendeu o contexto.
Exemplos: "Entendi, você precisa agendar para o João." / "Certo, quer verificar o que está pendente."`;

const DID_SYSTEM = `${TONE_SYSTEM}

Escreva UMA ou DUAS frases descrevendo o que foi feito ou o que precisa ser feito.
Seja natural e humano. Exemplos:
- Executado: "Já agendei para segunda às 10h no escritório dele."
- Pergunta: "Para criar o evento, só preciso saber o horário."
- Confirmação: "Só confirmando — João Silva, amanhã às 14h. Pode agendar?"
- Resposta: "Você tem duas reuniões esta semana, nenhuma com conflito."`;

const NEXTSTEP_SYSTEM = `${TONE_SYSTEM}

Você vai receber um próximo passo sugerido. Escreva UMA frase natural propondo isso ao usuário.
Seja útil, nunca insistente. Se não fizer sentido no contexto, escreva apenas: NENHUM
Exemplo: "Quer que eu prepare um briefing antes da reunião?"`;

export class ResponseComposer {
  constructor(private readonly llm: ILLMProvider) {}

  async compose(result: ExecutionResult, session: ConversationSession): Promise<ComposedResponse> {
    const recentHistory = session.getRecentTurns(6);
    const historyText = recentHistory
      .slice(0, -1)
      .map((t) => `${t.role === 'user' ? 'Vendedor' : 'Faro'}: ${t.content}`)
      .join('\n');

    const lastUserMessage = [...recentHistory].reverse().find((t) => t.role === 'user')?.content ?? '';
    const context = `Histórico:\n${historyText}\n\nÚltima mensagem do usuário: "${lastUserMessage}"`;

    const parts = await this.buildParts(result, context);

    const message = this.assembleParts(parts);
    return { message, nextStep: parts.nextStep };
  }

  private async buildParts(result: ExecutionResult, context: string): Promise<ResponseParts> {
    const instruction = this.buildInstruction(result);

    const [understood, did, nextStep] = await Promise.all([
      this.generatePart(UNDERSTOOD_SYSTEM, `${context}\n\nSituação: ${instruction}`),
      this.generatePart(DID_SYSTEM, `${context}\n\nSituação: ${instruction}`),
      result.suggestedNextStep
        ? this.generatePart(NEXTSTEP_SYSTEM, `${context}\n\nPróximo passo a sugerir: ${result.suggestedNextStep}`)
        : Promise.resolve(undefined),
    ]);

    return {
      understood,
      did,
      nextStep: nextStep === 'NENHUM' || !nextStep?.trim() ? undefined : nextStep,
    };
  }

  private async generatePart(system: string, userContent: string): Promise<string> {
    const messages: LLMMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];
    const response = await this.llm.generate({ messages, temperature: 0.6, maxTokens: 128 });
    return response.content.trim();
  }

  private buildInstruction(result: ExecutionResult): string {
    switch (result.outcome) {
      case 'executed':
        return result.error
          ? `Houve um problema: ${result.error}`
          : `Ação executada com sucesso. Resultado: ${result.agentOutput}`;
      case 'asked':
        return `Precisa perguntar ao usuário: ${result.question}`;
      case 'confirmed':
        return `Precisa confirmar dados antes de prosseguir: ${result.question}`;
      case 'responded':
        return `Resposta direta: ${result.directResponse}`;
    }
  }

  private assembleParts(parts: ResponseParts): string {
    // "Understood" is subtle — used as opening tone, not as a literal header
    const lines = [parts.understood, parts.did].filter(Boolean);
    return lines.join(' ');
  }
}
