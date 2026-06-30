import type { IAgent, AgentContext, AgentResult } from './agent.interface';
import type { ILLMProvider } from '../core/llm/llm.interface';
import type { GoogleCalendarTool } from '../tools/google-calendar.tool';

const SYSTEM_PROMPT = `Você é o agente de agenda do Faro, assistente executivo de um vendedor.

Sua única responsabilidade é gerenciar eventos no Google Calendar do usuário.

Regras:
- Use as ferramentas disponíveis para buscar, criar ou excluir eventos.
- Nunca invente informações. Se faltar data/hora, pergunte antes de criar.
- Ao listar eventos, formate de forma natural, não como uma lista técnica.
- Ao criar um evento, confirme com os dados completos antes de finalizar.
- Datas e horas devem estar no formato ISO 8601 com timezone (ex: 2024-03-15T14:00:00-03:00).`;

const CALENDAR_TOOLS = [
  {
    name: 'list_events',
    description: 'Lista os eventos da agenda em um intervalo de datas',
    parameters: {
      type: 'object',
      properties: {
        timeMin: { type: 'string', description: 'Data de início no formato ISO 8601' },
        timeMax: { type: 'string', description: 'Data de fim no formato ISO 8601' },
        maxResults: { type: 'number', description: 'Número máximo de eventos (padrão: 10)' },
      },
      required: ['timeMin', 'timeMax'],
    },
  },
  {
    name: 'create_event',
    description: 'Cria um novo evento na agenda',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Título do evento' },
        start: { type: 'string', description: 'Data e hora de início no formato ISO 8601' },
        end: { type: 'string', description: 'Data e hora de fim no formato ISO 8601' },
        description: { type: 'string', description: 'Descrição ou pauta do evento' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Lista de e-mails dos participantes' },
      },
      required: ['summary', 'start', 'end'],
    },
  },
  {
    name: 'get_event',
    description: 'Busca os detalhes de um evento específico',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID do evento no Google Calendar' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'delete_event',
    description: 'Remove um evento da agenda',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID do evento a ser removido' },
      },
      required: ['eventId'],
    },
  },
];

export class AgendaAgent implements IAgent {
  readonly name = 'agenda';
  readonly description = 'Manages calendar events and schedules';
  readonly handles = ['agendar', 'reunião', 'agenda', 'calendário', 'disponibilidade', 'horário', 'evento', 'marcar'];

  constructor(
    private readonly llm: ILLMProvider,
    private readonly calendarTool: GoogleCalendarTool,
  ) {}

  async execute(context: AgentContext): Promise<AgentResult> {
    const memoryContext = context.memory
      .filter((m) => m.type === 'client' || m.type === 'meeting')
      .map((m) => JSON.stringify(m.data))
      .join('\n');

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + (memoryContext ? `\n\nContexto do usuário:\n${memoryContext}` : '') },
      { role: 'user', content: context.rawInput },
    ];

    // Agentic loop: LLM pode chamar ferramentas múltiplas vezes até concluir
    let finalResponse = '';
    for (let turn = 0; turn < 5; turn++) {
      const response = await this.llm.generate({
        messages,
        tools: CALENDAR_TOOLS,
        maxTokens: 1024,
      });

      if (!response.toolCalls?.length) {
        finalResponse = response.content;
        break;
      }

      // Executa cada tool call e devolve o resultado para o LLM
      messages.push({ role: 'assistant', content: response.content || '' });

      for (const call of response.toolCalls) {
        const result = await this.calendarTool.execute({
          action: call.name,
          ...call.arguments,
        });

        messages.push({
          role: 'user',
          content: `[Resultado da ferramenta ${call.name}]: ${JSON.stringify(result.data ?? result.error)}`,
        });
      }
    }

    if (!finalResponse) {
      return { success: false, output: '', error: 'AgendaAgent: limite de turnos atingido sem resposta final' };
    }

    return { success: true, output: finalResponse };
  }
}
