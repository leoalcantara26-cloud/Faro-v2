import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class CRMAgent implements IAgent {
  readonly name = 'crm';
  readonly description = 'Reads and writes data to the connected CRM';
  readonly handles = ['atualizar crm', 'registrar cliente', 'histórico cliente', 'oportunidade'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('CRMAgent not implemented yet');
  }
}
