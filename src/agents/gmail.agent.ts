import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class GmailAgent implements IAgent {
  readonly name = 'gmail';
  readonly description = 'Reads, drafts and sends emails via Gmail';
  readonly handles = ['email', 'responder email', 'enviar email', 'caixa de entrada'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('GmailAgent not implemented yet');
  }
}
