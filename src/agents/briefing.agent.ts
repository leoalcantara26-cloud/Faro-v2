import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class BriefingAgent implements IAgent {
  readonly name = 'briefing';
  readonly description = 'Generates pre-meeting briefings from memory and research';
  readonly handles = ['briefing', 'preparar reunião', 'resumo do cliente', 'o que sei sobre'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('BriefingAgent not implemented yet');
  }
}
