import type { MemoryEntity } from '../core/memory/memory.interface';

export interface AgentContext {
  userId: string;
  sessionId: string;
  memory: MemoryEntity[];
  rawInput: string;
}

export interface AgentResult {
  success: boolean;
  output: string;
  updatedMemory?: Array<{ id?: string; type: MemoryEntity['type']; data: Record<string, unknown> }>;
  error?: string;
}

/**
 * Every agent handles exactly one domain responsibility.
 * Add a new agent by implementing this interface and registering it.
 */
export interface IAgent {
  readonly name: string;
  readonly description: string;
  /** Intent keywords this agent handles (used by the orchestrator planner). */
  readonly handles: string[];
  execute(context: AgentContext): Promise<AgentResult>;
}
