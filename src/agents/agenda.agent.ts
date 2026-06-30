import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class AgendaAgent implements IAgent {
  readonly name = 'agenda';
  readonly description = 'Manages calendar events and schedules';
  readonly handles = ['agendar', 'reunião', 'agenda', 'calendário', 'disponibilidade'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('AgendaAgent not implemented yet');
  }
}
