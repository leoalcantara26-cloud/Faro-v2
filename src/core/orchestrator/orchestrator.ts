import type { IMemory } from '../memory/memory.interface';
import type { Registry } from '../../registry/registry';
import { classifyIntent } from './intent';
import { buildPlan } from './planner';

export interface OrchestratorInput {
  userId: string;
  sessionId: string;
  message: string;
}

export interface OrchestratorOutput {
  response: string;
  suggestion: string;
}

/**
 * Executes the fixed Faro pipeline:
 * Understand → Context → Plan → Execute → Respond → Suggest next step
 *
 * Never responds directly and never calls external tools directly.
 */
export class Orchestrator {
  constructor(
    private readonly registry: Registry,
    private readonly memory: IMemory,
  ) {}

  async run(input: OrchestratorInput): Promise<OrchestratorOutput> {
    // 1. Understand
    const intent = await classifyIntent(input.message, this.registry.getLLM());

    // 2. Fetch context from memory
    const context = await this.memory.search({ userId: input.userId, query: intent.raw });

    // 3. Plan
    const plan = buildPlan(intent, this.registry.listAgents());

    // 4. Execute each agent in the plan
    const results = [];
    for (const agentName of plan.agents) {
      const agent = this.registry.getAgent(agentName);
      const result = await agent.execute({
        userId: input.userId,
        sessionId: input.sessionId,
        memory: context,
        rawInput: input.message,
      });

      // Persist any memory updates returned by the agent
      if (result.updatedMemory) {
        for (const entry of result.updatedMemory) {
          await this.memory.set({
            id: entry.id ?? crypto.randomUUID(),
            type: entry.type,
            userId: input.userId,
            data: entry.data,
          });
        }
      }

      results.push(result);
    }

    // 5–6. Respond and suggest next step (formatting delegated to Responder)
    const { formatResponse } = await import('../conversation/responder');
    return formatResponse(input.message, results);
  }
}
