import type { Plan } from './planner';
import type { ConversationSession } from './session';

export type ConfidenceRecommendation = 'proceed' | 'confirm' | 'ask';

export interface ConfidenceAssessment {
  score: number;
  recommendation: ConfidenceRecommendation;
  uncertainEntities: string[];
  clarificationQuestion?: string;
}

// Patterns that signal ambiguity — common in voice or casual typing
const AMBIGUITY_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /\b(1|um)\s+apart/i,      hint: '"1 apartamento" ou "11 apartamentos"?' },
  { pattern: /\b(2|dois)\s+imóv/i,     hint: '"2 imóveis" ou "12 imóveis"?' },
  { pattern: /amanhã|depois de amanhã/i, hint: 'data relativa — confirmar dia exato' },
  { pattern: /ele|ela|eles/i,           hint: 'pronome sem referência clara' },
  { pattern: /isso|aquilo|esse/i,       hint: 'referência anafórica incerta' },
];

export class ConfidenceLayer {
  assess(plan: Plan, session: ConversationSession, rawInput: string): ConfidenceAssessment {
    // If planner already decided to ask or confirm, respect that
    if (plan.decision === 'ask') {
      return {
        score: 0.3,
        recommendation: 'ask',
        uncertainEntities: plan.missingInfo ?? [],
        clarificationQuestion: this.buildAskQuestion(plan.missingInfo ?? []),
      };
    }

    if (plan.decision === 'confirm') {
      return {
        score: 0.6,
        recommendation: 'confirm',
        uncertainEntities: Object.keys(plan.confirmationData ?? {}),
        clarificationQuestion: this.buildConfirmQuestion(plan.confirmationData ?? {}),
      };
    }

    // For execute decisions, run our own ambiguity checks
    if (plan.decision === 'execute') {
      const detected = AMBIGUITY_PATTERNS.filter((p) => p.pattern.test(rawInput));

      if (detected.length > 0) {
        return {
          score: 0.5,
          recommendation: 'confirm',
          uncertainEntities: detected.map((d) => d.hint),
          clarificationQuestion: `Só para confirmar: ${detected[0].hint}`,
        };
      }

      const state = session.getSnapshot();
      const lowConfidenceEntities = Object.entries(state.collectedEntities)
        .filter(([, v]) => v.confidence < 0.7)
        .map(([k]) => k);

      if (lowConfidenceEntities.length > 0) {
        return {
          score: 0.6,
          recommendation: 'confirm',
          uncertainEntities: lowConfidenceEntities,
          clarificationQuestion: `Só confirmando: ${lowConfidenceEntities.join(', ')} — está correto?`,
        };
      }
    }

    return { score: 1, recommendation: 'proceed', uncertainEntities: [] };
  }

  private buildAskQuestion(missing: string[]): string {
    if (missing.length === 0) return 'Pode me dar mais detalhes?';
    if (missing.length === 1) return `Para continuar, preciso saber: ${missing[0]}.`;
    const last = missing.pop();
    return `Preciso de mais algumas informações: ${missing.join(', ')} e ${last}.`;
  }

  private buildConfirmQuestion(data: Record<string, string>): string {
    const items = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
    return `Só para confirmar — ${items.join(', ')}. Está certo?`;
  }
}
