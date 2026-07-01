import type { Intent } from '../orchestrator/intent';
import type { ConversationSession } from './session';
import type { MemoryEntity } from '../memory/memory.interface';

export type ConfidenceRecommendation = 'proceed' | 'confirm' | 'ask';

export interface ConfidenceAssessment {
  score: number;
  recommendation: ConfidenceRecommendation;
  uncertainEntities: string[];
  clarificationQuestion?: string;
  context: string; // passed to Planner so it can factor confidence into the plan
}

// Patterns that signal ambiguity — common in voice or casual typing
const AMBIGUITY_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /\b(1|um)\s+apart/i,       hint: '"1 apartamento" ou "11 apartamentos"?' },
  { pattern: /\b(2|dois)\s+imóv/i,      hint: '"2 imóveis" ou "12 imóveis"?' },
  { pattern: /amanhã|depois de amanhã/i, hint: 'data relativa — confirmar dia exato antes de registrar' },
  { pattern: /\bele\b|\bela\b|\beles\b/i, hint: 'pronome sem referência clara ao cliente' },
  { pattern: /\bisso\b|\baquilo\b|\besse\b/i, hint: 'referência anafórica sem contexto suficiente' },
];

/**
 * Evaluates confidence before planning.
 * The result is passed to the Planner so it can factor uncertainty into its decisions.
 */
export class ConfidenceLayer {
  assess(
    intent: Intent,
    rawInput: string,
    session: ConversationSession,
    _memoryContext: MemoryEntity[],
  ): ConfidenceAssessment {
    const detected = AMBIGUITY_PATTERNS.filter((p) => p.pattern.test(rawInput));

    if (detected.length > 0) {
      return {
        score: 0.5,
        recommendation: 'confirm',
        uncertainEntities: detected.map((d) => d.hint),
        clarificationQuestion: `Só para confirmar: ${detected[0].hint}`,
        context: `Ambiguidade detectada na entrada: ${detected.map((d) => d.hint).join('; ')}`,
      };
    }

    // Low-confidence entities already collected in session
    const state = session.getSnapshot();
    const lowConfidence = Object.entries(state.collectedEntities)
      .filter(([, v]) => v.confidence < 0.7)
      .map(([k]) => k);

    if (lowConfidence.length > 0) {
      return {
        score: 0.6,
        recommendation: 'confirm',
        uncertainEntities: lowConfidence,
        clarificationQuestion: `Só confirmando — ${lowConfidence.join(', ')} está correto?`,
        context: `Entidades com baixa confiança já coletadas: ${lowConfidence.join(', ')}`,
      };
    }

    // Low intent confidence from classifier
    if (intent.confidence < 0.5) {
      return {
        score: intent.confidence,
        recommendation: 'ask',
        uncertainEntities: [],
        clarificationQuestion: 'Pode me dar mais detalhes sobre o que você precisa?',
        context: `Intenção classificada com baixa confiança (${intent.confidence.toFixed(2)}): ${intent.category}`,
      };
    }

    return {
      score: intent.confidence,
      recommendation: 'proceed',
      uncertainEntities: [],
      context: `Intenção clara: ${intent.category} (confiança ${intent.confidence.toFixed(2)})`,
    };
  }
}
