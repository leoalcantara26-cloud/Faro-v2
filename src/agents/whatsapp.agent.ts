import type { IAgent, AgentContext, AgentResult } from './agent.interface';

export class WhatsAppAgent implements IAgent {
  readonly name = 'whatsapp';
  readonly description = 'Sends and reads WhatsApp messages';
  readonly handles = ['whatsapp', 'mensagem', 'mandar mensagem', 'zap'];

  async execute(_context: AgentContext): Promise<AgentResult> {
    throw new Error('WhatsAppAgent not implemented yet');
  }
}
