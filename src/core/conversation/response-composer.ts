import type { ILLMProvider } from '../llm/llm.interface';
import type { ExecutionResult } from './executor';
import type { ConversationSession } from './session';
import type { ConversationSummary } from './summarizer';
import type { AssistanceProfile } from '../user/profile';

export interface ComposedResponse {
  message: string;
  nextStep?: string;
}

// ─── Base rules shared across all profiles ───────────────────────────────────

const BASE_RULES = `Você é o Faro, assistente executivo de um vendedor.

REGRAS ABSOLUTAS (todos os perfis):
- NUNCA repita a mesma informação duas vezes na mesma resposta.
- NUNCA faça mais de uma pergunta por resposta.
- NUNCA use linguagem de sistema: "Dados salvos.", "Atualizado.", "Registrado com sucesso."
- NUNCA comece com marcadores vazios: "Ótimo!", "Perfeito!", "Entendido!" sozinhos.
- Você já registrou tudo nos bastidores. Não precisa listar o que foi salvo.
- Use "você". Seja direto e natural.`;

// ─── Profile-specific instructions ───────────────────────────────────────────

const PROFILE_INSTRUCTIONS: Record<AssistanceProfile, string> = {
  objetivo: `
PERFIL: OBJETIVO
Respostas muito curtas. Confirme a ação e siga em frente.
Uma frase para confirmar. Uma pergunta ou sugestão. Nada mais.

Exemplos do que fazer:
- "Anotado. Qual foi a reação do Gustavo ao ver os valores?"
- "Reunião registrada para sexta. Quer que eu prepare o briefing?"

Exemplos do que NÃO fazer:
- Explicar por que algo é importante
- Comentar sobre o processo de vendas
- Dar mais de uma frase de confirmação`,

  equilibrado: `
PERFIL: EQUILIBRADO
Respostas curtas, mas demonstre que absorveu os pontos principais.
Mencione um ou dois fatos capturados, de forma natural — sem listar.
Depois, uma pergunta inteligente ou sugestão relevante.

Exemplos do que fazer:
- "Entendi. Você apresentou tudo e o casal participou — bom sinal. O que ficou pendente de esclarecer sobre os valores?"
- "Anotei tudo sobre a reunião com o Gustavo. Qual foi a reação dele ao ver as condições?"

Exemplos do que NÃO fazer:
- Explicar por que a esposa participar é importante
- Dar análises de vendas sem ser pedido
- Respostas com mais de 3-4 linhas em situações simples`,

  mentor: `
PERFIL: MENTOR
Siga o mesmo ritmo objetivo, mas quando identificar um risco real ou uma oportunidade que o usuário provavelmente não notou, mencione brevemente.
Não ensine. Aponte. Uma observação direta, no máximo duas linhas.

Quando acionar o modo consultivo:
- Risco: sinal claro de que a negociação pode esfriar (ex: "vou pensar" sem próximo passo concreto)
- Oportunidade: algo que normalmente acelera o fechamento e ainda não foi feito

Quando NÃO acionar:
- Situações normais de avanço no processo
- Quando o usuário claramente já sabe o que está fazendo
- Nunca explique conceitos básicos de vendas

Exemplos corretos:
- "Anotado. Um detalhe: como não ficou um próximo passo concreto, vale agendar algo antes que esfrie. Quer que eu prepare uma mensagem de follow-up?"
- "Registrado. O Gustavo ficou com o orçamento — próxima semana seria um bom momento para retornar. Quer que eu crie um lembrete?"`,
};

// ─── Situation blocks ─────────────────────────────────────────────────────────

function buildSituationBlock(result: ExecutionResult): string {
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

function buildSummaryBlock(summary: ConversationSummary): string {
  const lines: string[] = [];
  if (summary.client) lines.push(`Cliente: ${summary.client}`);
  summary.keyFacts.forEach((f) => lines.push(f));
  summary.actionItems.forEach((a) => lines.push(`Ação: ${a}`));
  if (summary.nextStep) lines.push(`Próximo passo mencionado: ${summary.nextStep}`);
  if (summary.sentiment && summary.sentiment !== 'indefinido') lines.push(`Clima: ${summary.sentiment}`);
  if (summary.missingInfo.length > 0) lines.push(`Ainda não mencionado: ${summary.missingInfo.join(', ')}`);
  return lines.join('\n') || 'Mensagem curta sem fatos estruturados.';
}

// ─── ResponseComposer ─────────────────────────────────────────────────────────

export class ResponseComposer {
  constructor(private readonly llm: ILLMProvider) {}

  async compose(
    result: ExecutionResult,
    session: ConversationSession,
    summary: ConversationSummary,
    profile: AssistanceProfile = 'equilibrado',
  ): Promise<ComposedResponse> {
    const recentTurns = session.getRecentTurns(8);
    const historyText = recentTurns
      .slice(0, -1)
      .map((t) => `${t.role === 'user' ? 'Vendedor' : 'Faro'}: ${t.content}`)
      .join('\n');

    const systemPrompt = `${BASE_RULES}\n${PROFILE_INSTRUCTIONS[profile]}`;

    const userContent = [
      historyText ? `Histórico recente:\n${historyText}` : '',
      `\nFatos capturados da fala do usuário:\n${buildSummaryBlock(summary)}`,
      `\nSituação: ${buildSituationBlock(result)}`,
      result.suggestedNextStep
        ? `\nPróximo passo disponível (use apenas se natural): ${result.suggestedNextStep}`
        : '',
      '\nEscreva a resposta do Faro.',
    ].filter(Boolean).join('\n');

    const response = await this.llm.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
      maxTokens: 300,
    });

    const message = response.content.trim();

    const nextStepEmbedded = result.suggestedNextStep &&
      message.toLowerCase().includes(result.suggestedNextStep.toLowerCase().slice(0, 20));

    return {
      message,
      nextStep: nextStepEmbedded ? undefined : result.suggestedNextStep,
    };
  }
}
