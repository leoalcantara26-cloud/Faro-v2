import { randomUUID } from 'crypto';

export type GoalStatus = 'open' | 'awaiting_info' | 'completed' | 'discarded';
export type AttentionMode = 'execution' | 'conversational';
export type ContextStatus = 'active' | 'awaiting_info' | 'completed' | 'closed';

export interface Goal {
  id: string;
  description: string;
  agent?: string;
  status: GoalStatus;
  missingInfo: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface GoalTrackerState {
  goals: Goal[];
  attentionMode: AttentionMode;
  contextStatus: ContextStatus;
  /** The single question that most directly unblocks an open goal. */
  blockingQuestion: string | null;
}

/**
 * Keywords that map a goal description to an agent.
 * Used to mark goals as completed when an agent executes successfully.
 */
const GOAL_AGENT_MAP: Array<{ keywords: string[]; agent: string }> = [
  { keywords: ['reunião', 'agendar', 'agenda', 'evento', 'calendar'], agent: 'agenda' },
  { keywords: ['e-mail', 'email', 'mensagem', 'gmail'], agent: 'gmail' },
  { keywords: ['lembrete', 'follow-up', 'followup', 'lembrar', 'pendência'], agent: 'followup' },
  { keywords: ['whatsapp', 'zap', 'mensagem whatsapp', 'avisar', 'concierge'], agent: 'whatsapp' },
  { keywords: ['crm', 'cliente', 'registrar cliente', 'atualizar'], agent: 'crm' },
  { keywords: ['briefing', 'preparar', 'resumo'], agent: 'briefing' },
  { keywords: ['pesquisar', 'pesquisa', 'linkedin', 'empresa'], agent: 'research' },
];

function inferAgent(description: string): string | undefined {
  const lower = description.toLowerCase();
  return GOAL_AGENT_MAP.find((m) => m.keywords.some((k) => lower.includes(k)))?.agent;
}

export class GoalTracker {
  private goals: Goal[] = [];

  /**
   * Register new goals from the current turn.
   * Goals already tracked are not duplicated (matched by description similarity).
   */
  addGoals(detectedGoals: string[]): void {
    for (const description of detectedGoals) {
      const alreadyTracked = this.goals.some(
        (g) => g.status !== 'discarded' &&
          g.description.toLowerCase().includes(description.toLowerCase().slice(0, 15)),
      );
      if (alreadyTracked) continue;

      this.goals.push({
        id: randomUUID(),
        description,
        agent: inferAgent(description),
        status: 'open',
        missingInfo: [],
        createdAt: new Date(),
      });
    }
  }

  /**
   * Mark goals as completed when a specific agent executed successfully.
   * Called by the Engine after a successful Executor run.
   */
  markCompletedByAgent(agentName: string): void {
    for (const goal of this.goals) {
      if (goal.status === 'open' || goal.status === 'awaiting_info') {
        if (goal.agent === agentName) {
          goal.status = 'completed';
          goal.completedAt = new Date();
        }
      }
    }
  }

  /**
   * Mark a goal as awaiting information.
   */
  markAwaitingInfo(goalId: string, missingInfo: string[]): void {
    const goal = this.goals.find((g) => g.id === goalId);
    if (goal) {
      goal.status = 'awaiting_info';
      goal.missingInfo = missingInfo;
    }
  }

  /**
   * Reopen a closed context if the user explicitly references it again.
   */
  reopenIfNeeded(userMessage: string): void {
    const lower = userMessage.toLowerCase();
    for (const goal of this.goals) {
      if (goal.status === 'completed' || goal.status === 'discarded') {
        if (lower.includes(goal.description.toLowerCase().slice(0, 10))) {
          goal.status = 'open';
          goal.completedAt = undefined;
        }
      }
    }
  }

  getState(): GoalTrackerState {
    const openGoals = this.goals.filter((g) => g.status === 'open' || g.status === 'awaiting_info');
    const allDone = this.goals.length > 0 &&
      this.goals.every((g) => g.status === 'completed' || g.status === 'discarded');

    const attentionMode: AttentionMode = openGoals.length > 0 ? 'execution' : 'conversational';

    let contextStatus: ContextStatus = 'active';
    if (allDone) contextStatus = 'closed';
    else if (openGoals.some((g) => g.status === 'awaiting_info')) contextStatus = 'awaiting_info';

    const blockingQuestion = openGoals.length > 0
      ? this.buildBlockingQuestion(openGoals[0])
      : null;

    return { goals: [...this.goals], attentionMode, contextStatus, blockingQuestion };
  }

  getOpenGoals(): Goal[] {
    return this.goals.filter((g) => g.status === 'open' || g.status === 'awaiting_info');
  }

  private buildBlockingQuestion(goal: Goal): string {
    if (goal.missingInfo.length > 0) return goal.missingInfo[0];
    return `O que preciso saber para ${goal.description.toLowerCase()}?`;
  }
}
