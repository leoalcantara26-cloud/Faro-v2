import type { IAgent, AgentContext, AgentResult } from '../../../agents/agent.interface';

// Realistic mock responses — simulate what real agents would return
// These make the conversation feel real before any integration is built

export class MockAgendaAgent implements IAgent {
  readonly name = 'agenda';
  readonly description = 'Mock agenda agent';
  readonly handles = ['agendar', 'reunião', 'agenda', 'calendário', 'horário', 'evento', 'marcar'];

  async execute(context: AgentContext): Promise<AgentResult> {
    const input = context.rawInput.toLowerCase();
    const params = tryParse(context.rawInput);

    if (params.action === 'list_events' || input.includes('list')) {
      return {
        success: true,
        output: `Você tem 2 reuniões confirmadas esta semana:\n• Segunda, 25/11 às 10h — Apresentação de proposta para João Silva (Construtora Horizonte)\n• Quarta, 27/11 às 14h — Follow-up proposta com Carla Mendes (Grupo Real) — ainda a confirmar`,
      };
    }

    if (params.action === 'create_event' || input.includes('create')) {
      const summary = params.params?.summary ?? 'Nova reunião';
      const start = params.params?.start ?? 'em breve';
      return {
        success: true,
        output: `Reunião "${summary}" agendada para ${start}. Já está na sua agenda.`,
        updatedMemory: [{
          type: 'meeting',
          data: { titulo: summary, data: start, status: 'Confirmada', cliente: (params.params?.attendees as string[] | undefined)?.[0] ?? '' },
        }],
      };
    }

    return { success: true, output: 'Agenda verificada. Nenhum conflito encontrado.' };
  }
}

export class MockCRMAgent implements IAgent {
  readonly name = 'crm';
  readonly description = 'Mock CRM agent';
  readonly handles = ['atualizar crm', 'registrar cliente', 'cliente', 'lead', 'oportunidade', 'negócio'];

  async execute(context: AgentContext): Promise<AgentResult> {
    const params = tryParse(context.rawInput);
    const input = context.rawInput.toLowerCase();

    if (params.action === 'list_clients' || input.includes('list')) {
      return {
        success: true,
        output: `Você tem 3 clientes ativos:\n• João Silva (Construtora Horizonte) — Em negociação\n• Carla Mendes (Grupo Real) — Proposta enviada\n• Roberto Alves (Alves Investimentos) — Novo contato`,
      };
    }

    if (params.action === 'get_client' || input.includes('get')) {
      return {
        success: true,
        output: `João Silva — Diretor Comercial da Construtora Horizonte. Interesse: apartamentos 3 quartos, Zona Sul. Último contato: 20/11. Status: em negociação. Prefere reuniões presenciais.`,
      };
    }

    if (params.action === 'create_client') {
      const nome = params.params?.nome ?? 'Novo cliente';
      return {
        success: true,
        output: `${nome} adicionado à sua carteira. Já está disponível para acompanhamento.`,
        updatedMemory: [{ type: 'client', data: params.params ?? {} }],
      };
    }

    if (params.action === 'update_client') {
      return {
        success: true,
        output: `Informações atualizadas. O perfil está completo e pronto para a próxima interação.`,
      };
    }

    return { success: true, output: 'CRM consultado com sucesso.' };
  }
}

export class MockGmailAgent implements IAgent {
  readonly name = 'gmail';
  readonly description = 'Mock Gmail agent';
  readonly handles = ['email', 'e-mail', 'gmail', 'responder email', 'enviar email', 'caixa de entrada'];

  async execute(context: AgentContext): Promise<AgentResult> {
    const params = tryParse(context.rawInput);
    const input = context.rawInput.toLowerCase();

    if (params.action === 'list_emails' || input.includes('list')) {
      return {
        success: true,
        output: `Você tem 3 e-mails importantes não respondidos:\n• Carla Mendes: "Retorno sobre proposta do terreno" (há 2 dias)\n• Roberto Alves: "Material sobre FIIs" (há 4 dias)\n• Construtora Horizonte (RH): "Confirmação de visita técnica" (hoje)`,
      };
    }

    if (params.action === 'send_email' || input.includes('send')) {
      const to = params.params?.to ?? 'destinatário';
      return { success: true, output: `E-mail enviado para ${to}. Cópia salva nos enviados.` };
    }

    if (params.action === 'draft_email') {
      return { success: true, output: `Rascunho criado e salvo. Você pode revisar antes de enviar.` };
    }

    return { success: true, output: 'Gmail verificado.' };
  }
}

export class MockFollowUpAgent implements IAgent {
  readonly name = 'followup';
  readonly description = 'Mock follow-up agent';
  readonly handles = ['follow-up', 'followup', 'lembrete', 'retornar', 'cobrar', 'próximo passo', 'pendente'];

  async execute(context: AgentContext): Promise<AgentResult> {
    const params = tryParse(context.rawInput);
    const input = context.rawInput.toLowerCase();

    if (params.action === 'list_followups' || input.includes('list')) {
      return {
        success: true,
        output: `Você tem 2 follow-ups pendentes:\n• Roberto Alves — Enviar material sobre FIIs (vence hoje)\n• Carla Mendes — Confirmar reunião de quarta-feira (vence amanhã)`,
      };
    }

    if (params.action === 'create_followup') {
      const cliente = params.params?.cliente ?? 'cliente';
      const descricao = params.params?.descricao ?? 'acompanhamento';
      return {
        success: true,
        output: `Follow-up criado para ${cliente}: "${descricao}". Vou te lembrar no momento certo.`,
        updatedMemory: [{ type: 'history', data: { tipo: 'follow-up', ...params.params, status: 'Pendente' } }],
      };
    }

    if (params.action === 'complete_followup') {
      return { success: true, output: `Follow-up marcado como concluído. Bom trabalho.` };
    }

    return { success: true, output: 'Follow-ups verificados.' };
  }
}

export class MockBriefingAgent implements IAgent {
  readonly name = 'briefing';
  readonly description = 'Mock briefing agent';
  readonly handles = ['briefing', 'preparar reunião', 'resumo do cliente', 'o que sei sobre', 'preparar'];

  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      success: true,
      output: `Briefing preparado:\n\n**João Silva — Construtora Horizonte**\n• Cargo: Diretor Comercial\n• Interesse atual: Apartamentos 3 quartos, Zona Sul\n• Última reunião: 20/11 — discutimos o Edifício Parque das Flores\n• Ponto de atenção: prefere reuniões objetivas, sem rodeios\n• Proposta anterior: R$ 1,2M — ainda em análise\n• Próximo passo esperado: resposta até esta semana`,
    };
  }
}

export class MockResearchAgent implements IAgent {
  readonly name = 'research';
  readonly description = 'Mock research agent';
  readonly handles = ['pesquisar', 'procurar informação', 'notícias', 'linkedin', 'sobre a empresa'];

  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      success: true,
      output: `Construtora Horizonte — fundada em 2003, 450 funcionários, faturamento estimado R$ 280M/ano. Atuação principal: edifícios residenciais de médio-alto padrão em São Paulo. Expansão recente para o ABC paulista. CEO: Marco Horizonte. LinkedIn: 1.2k seguidores. Sem notícias negativas recentes.`,
    };
  }
}

function tryParse(input: string): { action?: string; params?: Record<string, unknown> } {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}
