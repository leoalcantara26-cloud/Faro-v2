import { randomUUID } from 'crypto';
import type { Intent } from '../orchestrator/intent';
import { GoalTracker } from './goal-tracker';
import type { GoalTrackerState } from './goal-tracker';

export type TurnRole = 'user' | 'assistant';

export interface Turn {
  role: TurnRole;
  content: string;
  timestamp: Date;
}

export interface EntityValue {
  value: unknown;
  confidence: number;
  source: 'user' | 'memory' | 'inferred';
}

export interface PendingAction {
  agent: string;
  action: string;
  params: Record<string, unknown>;
  waitingFor?: string;
}

export interface ConversationState {
  id: string;
  userId: string;
  turns: Turn[];
  currentIntent: Intent | null;
  pendingAction: PendingAction | null;
  collectedEntities: Record<string, EntityValue>;
  confidenceLevel: number;
  expectedNextStep: string | null;
  context: Record<string, unknown>;
}

export class ConversationSession {
  private state: ConversationState;
  readonly goalTracker: GoalTracker;

  constructor(userId: string) {
    this.goalTracker = new GoalTracker();
    this.state = {
      id: randomUUID(),
      userId,
      turns: [],
      currentIntent: null,
      pendingAction: null,
      collectedEntities: {},
      confidenceLevel: 1,
      expectedNextStep: null,
      context: {},
    };
  }

  get id(): string { return this.state.id; }
  get userId(): string { return this.state.userId; }

  addTurn(role: TurnRole, content: string): void {
    this.state.turns.push({ role, content, timestamp: new Date() });
  }

  updateIntent(intent: Intent): void {
    this.state.currentIntent = intent;
  }

  setConfidence(level: number): void {
    this.state.confidenceLevel = Math.max(0, Math.min(1, level));
  }

  setPendingAction(action: PendingAction | null): void {
    this.state.pendingAction = action;
  }

  setEntity(key: string, value: EntityValue): void {
    this.state.collectedEntities[key] = value;
  }

  setNextStep(step: string | null): void {
    this.state.expectedNextStep = step;
  }

  setContext(key: string, value: unknown): void {
    this.state.context[key] = value;
  }

  getGoalState(): GoalTrackerState {
    return this.goalTracker.getState();
  }

  getSnapshot(): Readonly<ConversationState> {
    return { ...this.state, turns: [...this.state.turns] };
  }

  getRecentTurns(n = 10): Turn[] {
    return this.state.turns.slice(-n);
  }

  clearPendingAction(): void {
    this.state.pendingAction = null;
  }
}
