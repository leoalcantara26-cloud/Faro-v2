import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto vazio.' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Extraia as seguintes informações do texto abaixo e retorne um JSON. Se uma informação não estiver presente, retorne null para aquele campo.

Campos:
- name: nome da pessoa
- company: nome da empresa
- role: cargo/função
- product: o que a pessoa vende (produto ou serviço)
- market: mercado-alvo ou público que atende
- avgTicket: ticket médio ou ciclo de venda (se mencionado)
- instagram: handle do instagram (com ou sem @)
- website: site da empresa (apenas o domínio ou URL)

Texto: "${text}"

Retorne APENAS o JSON, sem explicações.`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const profile = JSON.parse(cleaned);

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[Extract Profile]', err);
    return NextResponse.json({ error: 'Erro ao extrair perfil.' }, { status: 500 });
  }
}
