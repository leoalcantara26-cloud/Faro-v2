import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class ResearchAgent implements IAgent {
  readonly name = 'research';
  readonly description = 'Searches external sources for information about companies and contacts';
  readonly handles = ['pesquisar', 'procurar informação', 'notícias', 'linkedin', 'sobre a empresa'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('ResearchAgent not implemented yet');
  }
}
