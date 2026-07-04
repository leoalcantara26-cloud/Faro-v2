import { randomUUID } from 'crypto';

export type GoalStatus = 'open' | 'awaiting_info' | 'completed' | 'discarded';
export type AttentionMode = 'execution' | 'conversational';
export type ContextStatus = 'active' | 'awaiting_info' | 'completed' | 'closed';

export interface ConversationEntity {
  type: string;    // 'client' | 'company' | 'product' | 'date' | 'amount' | etc.
  value: string;
  confidence: number;
}

export interface Goal {
  id: string;
  conversationId: string;
  description: string;
  status: GoalStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  startedAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  status: ContextStatus;
  entities: ConversationEntity[];
  goals: Goal[];
}

export interface GoalTrackerState {
  conversation: Conversation;
  attentionMode: AttentionMode;
  blockingQuestion: string | null;
}

export class GoalTracker {
  private conversation: Conversation;

  constructor() {
    const id = randomUUID();
    this.conversation = {
      id,
      title: 'Nova conversa',
      startedAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      entities: [],
      goals: [],
    };
  }

  getConversation(): Conversation {
    return this.conversation;
  }

  addGoals(descriptions: string[]): void {
    for (const description of descriptions) {
      const alreadyTracked = this.conversation.goals.some(
        (g) =>
          g.status !== 'discarded' &&
          g.description.toLowerCase().includes(description.toLowerCase().slice(0, 15)),
      );
      if (alreadyTracked) continue;

      this.conversation.goals.push({
        id: randomUUID(),
        conversationId: this.conversation.id,
        description,
        status: 'open',
        createdAt: new Date(),
      });
      this.conversation.updatedAt = new Date();
    }
  }

  addEntities(entities: ConversationEntity[]): void {
    for (const incoming of entities) {
      const exists = this.conversation.entities.some(
        (e) => e.type === incoming.type && e.value === incoming.value,
      );
      if (!exists) {
        this.conversation.entities.push(incoming);
      }
    }
    if (entities.length > 0) this.conversation.updatedAt = new Date();
  }

  markGoalCompleted(goalId: string): void {
    const goal = this.conversation.goals.find((g) => g.id === goalId);
    if (goal && (goal.status === 'open' || goal.status === 'awaiting_info')) {
      goal.status = 'completed';
      goal.completedAt = new Date();
      this.conversation.updatedAt = new Date();
    }
    this._syncConversationStatus();
  }

  markAwaitingInfo(goalId: string): void {
    const goal = this.conversation.goals.find((g) => g.id === goalId);
    if (goal) {
      goal.status = 'awaiting_info';
      this.conversation.updatedAt = new Date();
    }
    this._syncConversationStatus();
  }

  reopenIfNeeded(userMessage: string): void {
    const lower = userMessage.toLowerCase();
    for (const goal of this.conversation.goals) {
      if (goal.status === 'completed' || goal.status === 'discarded') {
        if (lower.includes(goal.description.toLowerCase().slice(0, 10))) {
          goal.status = 'open';
          goal.completedAt = undefined;
          this.conversation.updatedAt = new Date();
        }
      }
    }
    this._syncConversationStatus();
  }

  getOpenGoals(): Goal[] {
    return this.conversation.goals.filter(
      (g) => g.status === 'open' || g.status === 'awaiting_info',
    );
  }

  getState(): GoalTrackerState {
    const openGoals = this.getOpenGoals();
    const attentionMode: AttentionMode = openGoals.length > 0 ? 'execution' : 'conversational';
    const blockingQuestion =
      openGoals.length > 0
        ? `O que preciso saber para ${openGoals[0].description.toLowerCase()}?`
        : null;

    return {
      conversation: { ...this.conversation, goals: [...this.conversation.goals] },
      attentionMode,
      blockingQuestion,
    };
  }

  private _syncConversationStatus(): void {
    const goals = this.conversation.goals;
    if (goals.length === 0) { this.conversation.status = 'active'; return; }

    const allDone = goals.every((g) => g.status === 'completed' || g.status === 'discarded');
    if (allDone) {
      this.conversation.status = 'closed';
      this.conversation.closedAt = new Date();
      return;
    }
    const anyAwaiting = goals.some((g) => g.status === 'awaiting_info');
    this.conversation.status = anyAwaiting ? 'awaiting_info' : 'active';
  }
}
