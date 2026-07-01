import type { ILLMProvider } from '../llm/llm.interface';
import type { ExecutionResult } from './executor';
import type { ConversationSession } from './session';
import type { ConversationSummary } from './summarizer';

export interface ComposedResponse {
  message: string;
  nextStep?: string;
}

const COMPOSER_SYSTEM = `Você é o Faro, assistente executivo de um vendedor de alto desempenho.
Você age como um coach de vendas experiente: escuta com atenção, raciocina, conduz a conversa e agrega valor.

━━ RITMO OBRIGATÓRIO ━━
Toda resposta segue esta estrutura mental (sem títulos visíveis):
1. Demonstrar que ouviu — referencie fatos específicos do que foi dito. Não transcreva. Interprete e reorganize.
2. Agregar valor — quando relevante, ofereça um insight, observação ou conexão que o vendedor não disse explicitamente.
3. Conduzir — faça UMA pergunta inteligente OU sugira um próximo passo. Nunca os dois. Nunca mais de um.

━━ REGRAS ABSOLUTAS ━━
- NUNCA repita a mesma informação duas vezes na mesma resposta.
- NUNCA faça mais de uma pergunta por resposta.
- NUNCA responda como sistema: proibido "Dados salvos.", "Reunião registrada.", "Atualizado."
- NUNCA dê respostas genéricas de uma linha quando o usuário compartilhou informações detalhadas.
- NUNCA comece respostas com "Entendido!", "Perfeito!", "Ótimo!" isolados — esses marcadores são vazios.

━━ INTELIGÊNCIA DE VENDAS ━━
Você conhece o processo de vendas. Use esse conhecimento para interpretar o que foi dito:
- Esposa/sócio participou da reunião → sinal positivo: os dois já conhecem o produto, próxima reunião tende a ser decisão.
- Valores foram apresentados → próxima reunião foca em proposta e objeções, não em produto.
- Cliente disse "vou pensar" → há objeção não verbalizada. Vale perguntar qual foi a reação ao valor.
- Reunião marcada → o mais valioso é preparar o terreno antes, não apenas confirmar o horário.
- Follow-up atrasado → mencione proativamente se for relevante.
- Reunião de primeira visita → o objetivo é qualificação, não fechamento. Pergunte sobre perfil do cliente.

━━ CONDUZIR A CONVERSA ━━
Você não apenas reage — você guia.
Após um debriefing de reunião, você sabe quais informações importam:
- Reação do cliente aos valores
- Principais objeções
- O que mais chamou atenção
- Próximo passo combinado
- Nível de interesse percebido

Pergunte a coisa mais valiosa para aquele momento, não a mais óbvia.
"Como foi?" é uma pergunta fraca. "O que mais chamou a atenção do cliente?" é uma pergunta que gera valor.

━━ TOM ━━
- Use "você". Seja direto, caloroso e confiante.
- Respostas curtas para situações simples. Detalhadas quando o usuário compartilhou muito.
- Nunca use jargão técnico. Fale como um colega experiente, não como um software.`;

export class ResponseComposer {
  constructor(private readonly llm: ILLMProvider) {}

  async compose(
    result: ExecutionResult,
    session: ConversationSession,
    summary: ConversationSummary,
  ): Promise<ComposedResponse> {
    const recentTurns = session.getRecentTurns(8);
    const historyText = recentTurns
      .slice(0, -1)
      .map((t) => `${t.role === 'user' ? 'Vendedor' : 'Faro'}: ${t.content}`)
      .join('\n');

    const summaryBlock = this.buildSummaryBlock(summary);
    const situationBlock = this.buildSituationBlock(result);

    const userContent = [
      historyText ? `Histórico recente:\n${historyText}` : '',
      `\nFatos estruturados extraídos da fala do usuário:\n${summaryBlock}`,
      `\nSituação atual: ${situationBlock}`,
      result.suggestedNextStep
        ? `\nPróximo passo disponível para sugerir (use apenas se fizer sentido): ${result.suggestedNextStep}`
        : '',
      '\nEscreva a resposta do Faro agora.',
    ].filter(Boolean).join('\n');

    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: COMPOSER_SYSTEM },
        { role: 'user', content: userContent },
      ],
      temperature: 0.65,
      maxTokens: 400,
    });

    const message = response.content.trim();

    // Detect if the suggested next step was already embedded in the response
    const nextStepEmbedded = result.suggestedNextStep &&
      message.toLowerCase().includes(
        result.suggestedNextStep.toLowerCase().slice(0, 20),
      );

    return {
      message,
      nextStep: nextStepEmbedded ? undefined : result.suggestedNextStep,
    };
  }

  private buildSummaryBlock(summary: ConversationSummary): string {
    const lines: string[] = [];
    if (summary.client) lines.push(`- Cliente: ${summary.client}`);
    summary.keyFacts.forEach((f) => lines.push(`- ${f}`));
    summary.actionItems.forEach((a) => lines.push(`- Ação: ${a}`));
    if (summary.nextStep) lines.push(`- Próximo passo mencionado: ${summary.nextStep}`);
    if (summary.sentiment && summary.sentiment !== 'indefinido') lines.push(`- Clima: ${summary.sentiment}`);
    if (summary.missingInfo.length > 0) lines.push(`- Informações não mencionadas: ${summary.missingInfo.join(', ')}`);
    return lines.join('\n') || '- Mensagem curta, sem fatos estruturados';
  }

  private buildSituationBlock(result: ExecutionResult): string {
    switch (result.outcome) {
      case 'executed':
        return result.error
          ? `Houve um problema ao executar: ${result.error}`
          : `Ação executada. Resultado: ${result.agentOutput}`;
      case 'asked':
        return `Precisa pedir mais informação: ${result.question}`;
      case 'confirmed':
        return `Precisa confirmar dados antes de prosseguir: ${result.question}`;
      case 'responded':
        return `Resposta conversacional. Contexto: ${result.directResponse}`;
    }
  }
}
