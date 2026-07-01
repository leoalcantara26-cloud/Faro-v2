import { InMemoryStore } from '../../memory/stores/in-memory.store';

export function createMockMemory(userId: string): InMemoryStore {
  const store = new InMemoryStore();

  // Pre-populate with realistic sales data
  const seed = async () => {
    await store.set({ id: 'client-1', type: 'client', userId, data: {
      nome: 'João Silva',
      empresa: 'Construtora Horizonte',
      cargo: 'Diretor Comercial',
      email: 'joao.silva@horizonteconstrutora.com.br',
      telefone: '(11) 99234-5678',
      ultimoContato: '2024-11-20',
      interesse: 'Apartamentos 3 quartos, Zona Sul',
      status: 'Em negociação',
      observacoes: 'Prefere reuniões presenciais. Alérgico a e-mails longos.',
    }});

    await store.set({ id: 'client-2', type: 'client', userId, data: {
      nome: 'Carla Mendes',
      empresa: 'Grupo Real Empreendimentos',
      cargo: 'Sócia-Diretora',
      email: 'carla@realempreendimentos.com.br',
      telefone: '(11) 98765-4321',
      ultimoContato: '2024-11-18',
      interesse: 'Terrenos industriais, Grande ABC',
      status: 'Proposta enviada',
      observacoes: 'Tomadora de decisão. Avalia 3 imóveis em paralelo.',
    }});

    await store.set({ id: 'client-3', type: 'client', userId, data: {
      nome: 'Roberto Alves',
      empresa: 'Alves Investimentos',
      cargo: 'Sócio',
      email: 'roberto@alvesinvest.com.br',
      telefone: '(11) 97654-3210',
      ultimoContato: '2024-11-10',
      interesse: 'FIIs e imóveis comerciais',
      status: 'Novo contato',
      observacoes: 'Indicação do João Silva. Ainda no início.',
    }});

    await store.set({ id: 'meeting-1', type: 'meeting', userId, data: {
      titulo: 'Apresentação de proposta — Construtora Horizonte',
      cliente: 'João Silva',
      data: '2024-11-25T10:00:00-03:00',
      local: 'Escritório do cliente — Av. Paulista, 1000',
      pauta: 'Apresentar 3 opções de apartamentos no Brooklin',
      status: 'Confirmada',
    }});

    await store.set({ id: 'meeting-2', type: 'meeting', userId, data: {
      titulo: 'Follow-up proposta — Grupo Real',
      cliente: 'Carla Mendes',
      data: '2024-11-27T14:00:00-03:00',
      local: 'Videochamada',
      pauta: 'Retorno sobre proposta de terreno enviada na semana passada',
      status: 'A confirmar',
    }});

    await store.set({ id: 'followup-1', type: 'history', userId, data: {
      tipo: 'follow-up',
      cliente: 'Roberto Alves',
      descricao: 'Enviar material sobre FIIs disponíveis',
      prazo: '2024-11-22',
      status: 'Pendente',
      prioridade: 'Alta',
    }});

    await store.set({ id: 'followup-2', type: 'history', userId, data: {
      tipo: 'follow-up',
      cliente: 'Carla Mendes',
      descricao: 'Ligar para confirmar reunião de quarta-feira',
      prazo: '2024-11-25',
      status: 'Pendente',
      prioridade: 'Alta',
    }});
  };

  seed().catch(console.error);
  return store;
}
