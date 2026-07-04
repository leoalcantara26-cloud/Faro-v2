import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class FollowUpAgent implements IAgent {
  readonly name = 'followup';
  readonly description = 'Tracks and reminds pending follow-ups with clients';
  readonly handles = ['follow-up', 'lembrete', 'retornar', 'cobrar', 'próximo passo'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('FollowUpAgent not implemented yet');
  }
}
