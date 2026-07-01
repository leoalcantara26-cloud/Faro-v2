import type { ILLMProvider } from '../llm/llm.interface';
import type { ExecutionResult } from './executor';
import type { ConversationSession } from './session';
import type { ConversationUnderstanding } from './summarizer';
import type { AssistanceProfile } from '../user/profile';

export interface ComposedResponse {
  message: string;
  nextStep?: string;
}

// ─── Base rules shared across all profiles ───────────────────────────────────

const BASE_RULES = `Você é o Faro, assistente executivo de um vendedor.

FILOSOFIA:
O Faro assume que o usuário sabe vender. Não ensina. Não explica técnicas.
Sua inteligência aparece na qualidade das perguntas, na organização das informações e nos próximos passos sugeridos.
Explicações sobre vendas só devem acontecer se o usuário pedir ajuda, análise ou feedback.

REGRAS ABSOLUTAS:
- NUNCA repita a mesma informação duas vezes.
- NUNCA faça mais de uma pergunta por resposta.
- NUNCA use linguagem de sistema: "Dados salvos.", "Atualizado.", "Registrado."
- NUNCA comece com marcadores vazios: "Ótimo!", "Perfeito!" isolados.
- NUNCA explique por que algo é importante a menos que seja pedido.
- O Faro já registrou tudo nos bastidores. Não precisa listar o que foi salvo.
- Use "você". Seja direto e natural.`;

// ─── Profile-specific tone ────────────────────────────────────────────────────

const PROFILE_TONE: Record<AssistanceProfile, string> = {
  objetivo: `
PERFIL OBJETIVO:
Brevidade máxima. Uma frase de confirmação, depois use a bestNextQuestion ou sugira um próximo passo.
Nada além disso.`,

  equilibrado: `
PERFIL EQUILIBRADO:
Confirme de forma natural mencionando um ou dois fatos capturados.
Depois use a bestNextQuestion para conduzir a conversa.
Máximo 3 linhas.`,

  mentor: `
PERFIL MENTOR:
Mesmo ritmo do Equilibrado. A diferença é que você pode fazer perguntas mais estratégicas.
Use a bestNextQuestion como base, mas aprofunde quando for genuinamente útil.
NUNCA ofereça análises de vendas sem ser pedido.
Apenas faça perguntas mais precisas e contextuais.`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUnderstandingBlock(u: ConversationUnderstanding): string {
  const lines: string[] = [];
  if (u.client) lines.push(`Cliente: ${u.client}`);
  if (u.negotiationStage !== 'indefinido') lines.push(`Estágio: ${u.negotiationStage}`);
  u.keyFacts.forEach((f) => lines.push(f));
  if (u.nextSteps.length > 0) lines.push(`Próximos passos: ${u.nextSteps.join('; ')}`);
  if (u.unknownInfo.length > 0) lines.push(`Ainda desconhecido: ${u.unknownInfo.join(', ')}`);
  lines.push(`Melhor pergunta agora: "${u.bestNextQuestion}"`);
  return lines.join('\n') || 'Mensagem curta sem fatos estruturados.';
}

function buildSituationBlock(result: ExecutionResult): string {
  switch (result.outcome) {
    case 'executed':
      return result.error
        ? `Problema ao executar: ${result.error}`
        : `Ação executada. Resultado: ${result.agentOutput}`;
    case 'asked':
      return `Precisa de mais informação: ${result.question}`;
    case 'confirmed':
      return `Aguarda confirmação: ${result.question}`;
    case 'responded':
      return `Conversa: ${result.directResponse}`;
  }
}

// ─── ResponseComposer ─────────────────────────────────────────────────────────

export class ResponseComposer {
  constructor(private readonly llm: ILLMProvider) {}

  async compose(
    result: ExecutionResult,
    session: ConversationSession,
    understanding: ConversationUnderstanding,
    profile: AssistanceProfile = 'equilibrado',
  ): Promise<ComposedResponse> {
    const recentTurns = session.getRecentTurns(8);
    const historyText = recentTurns
      .slice(0, -1)
      .map((t) => `${t.role === 'user' ? 'Vendedor' : 'Faro'}: ${t.content}`)
      .join('\n');

    const systemPrompt = `${BASE_RULES}\n${PROFILE_TONE[profile]}`;

    const userContent = [
      historyText ? `Histórico recente:\n${historyText}` : '',
      `\nEntendimento estruturado da conversa:\n${buildUnderstandingBlock(understanding)}`,
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
