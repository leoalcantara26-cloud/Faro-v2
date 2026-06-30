import type { ILLMProvider } from '../llm/llm.interface';

export interface Intent {
  raw: string;
  category: string;
  confidence: number;
  entities: Record<string, string>;
}

const INTENT_SYSTEM = `Você é um classificador de intenções para um assistente executivo de vendas.

Dada uma mensagem do usuário, responda APENAS com um JSON válido no formato:
{
  "category": "<categoria>",
  "confidence": <0.0 a 1.0>,
  "entities": { "<chave>": "<valor>" }
}

Categorias disponíveis: agenda, crm, gmail, whatsapp, briefing, followup, research, general

Exemplos de entidades: cliente, empresa, data, horário, assunto, email`;

export async function classifyIntent(input: string, llm?: ILLMProvider): Promise<Intent> {
  if (!llm) {
    // Fallback sem LLM: classificação por palavras-chave
    return keywordClassify(input);
  }

  try {
    const response = await llm.generate({
      messages: [
        { role: 'system', content: INTENT_SYSTEM },
        { role: 'user', content: input },
      ],
      temperature: 0,
      maxTokens: 256,
    });

    const parsed = JSON.parse(response.content) as Omit<Intent, 'raw'>;
    return { raw: input, ...parsed };
  } catch {
    return keywordClassify(input);
  }
}

function keywordClassify(input: string): Intent {
  const lower = input.toLowerCase();
  const map: Array<[string, string[]]> = [
    ['agenda',   ['agendar', 'reunião', 'agenda', 'calendário', 'horário', 'evento', 'marcar']],
    ['gmail',    ['email', 'e-mail', 'gmail', 'mensagem', 'responder email']],
    ['crm',      ['crm', 'cliente', 'oportunidade', 'lead', 'negócio']],
    ['whatsapp', ['whatsapp', 'zap', 'mensagem', 'mandar mensagem']],
    ['briefing', ['briefing', 'preparar', 'resumo', 'o que sei']],
    ['followup', ['follow-up', 'lembrete', 'retornar', 'cobrar', 'próximo passo']],
    ['research', ['pesquisar', 'procurar', 'notícias', 'linkedin', 'empresa']],
  ];

  for (const [category, keywords] of map) {
    if (keywords.some((k) => lower.includes(k))) {
      return { raw: input, category, confidence: 0.7, entities: {} };
    }
  }

  return { raw: input, category: 'general', confidence: 0.3, entities: {} };
}
