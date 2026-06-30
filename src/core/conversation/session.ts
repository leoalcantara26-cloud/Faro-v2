import { randomUUID } from 'crypto';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class ConversationSession {
  readonly id: string;
  readonly userId: string;
  private turns: ConversationTurn[] = [];

  constructor(userId: string) {
    this.id = randomUUID();
    this.userId = userId;
  }

  addTurn(role: ConversationTurn['role'], content: string): void {
    this.turns.push({ role, content, timestamp: new Date() });
  }

  getHistory(): ConversationTurn[] {
    return [...this.turns];
  }
}
