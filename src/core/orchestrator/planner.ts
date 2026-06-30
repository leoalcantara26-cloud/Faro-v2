import type { Intent } from './intent';
import type { IAgent } from '../../agents/agent.interface';

export interface ExecutionPlan {
  agents: string[];
  rationale: string;
}

/**
 * Decides which agents to call and in what order.
 * Does not call the LLM directly — receives intent and available agents.
 */
export function buildPlan(intent: Intent, availableAgents: IAgent[]): ExecutionPlan {
  const matched = availableAgents.filter((agent) =>
    agent.handles.some((keyword) => intent.raw.toLowerCase().includes(keyword))
  );

  return {
    agents: matched.map((a) => a.name),
    rationale: matched.length > 0
      ? `Matched ${matched.length} agent(s) for intent: ${intent.category}`
      : 'No specific agent matched — will use general response',
  };
}
