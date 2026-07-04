import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchSiteContent(url: string): Promise<string> {
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  const res = await fetch(normalized, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaroBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();

  // Strip tags and collapse whitespace — keep readable text only
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { website, company, product, market, instagram } = await req.json() as {
      website?: string;
      company?: string;
      product?: string;
      market?: string;
      instagram?: string;
    };

    if (!website?.trim()) {
      return NextResponse.json({ error: 'Site não informado.' }, { status: 400 });
    }

    let siteContent = '';
    let fetchError = '';

    try {
      siteContent = await fetchSiteContent(website.trim());
    } catch {
      fetchError = 'Não consegui acessar o site, mas vou gerar o briefing com as informações disponíveis.';
    }

    const contextLines = [
      company && `Empresa: ${company}`,
      product && `O que vende: ${product}`,
      market && `Mercado-alvo: ${market}`,
      instagram && `Instagram: ${instagram}`,
      website && `Site: ${website}`,
    ].filter(Boolean).join('\n');

    const prompt = siteContent
      ? `Analise o conteúdo do site abaixo e as informações fornecidas sobre a empresa e gere um briefing estruturado.

INFORMAÇÕES DO USUÁRIO:
${contextLines}

CONTEÚDO DO SITE:
${siteContent}

Gere um briefing em JSON com os seguintes campos:
- description: descrição da empresa em 2-3 frases (o que faz, para quem, diferencial)
- positioning: posicionamento de mercado (1 frase)
- mainProducts: array de até 4 produtos/serviços principais (strings curtas)
- targetAudience: público-alvo identificado (1-2 frases)
- tone: tom de comunicação da empresa (ex: "técnico e profissional", "descontraído e próximo")
- highlights: array de até 3 pontos de destaque ou diferenciais (strings curtas)
- researchedAt: "${new Date().toISOString()}"

Retorne APENAS o JSON, sem explicações.`
      : `Com base nas informações fornecidas pelo usuário, gere um briefing básico da empresa.

INFORMAÇÕES:
${contextLines}
${fetchError ? `\nObservação: ${fetchError}` : ''}

Gere um briefing em JSON com os seguintes campos:
- description: descrição inferida em 2 frases
- positioning: posicionamento provável (1 frase)
- mainProducts: array de até 3 produtos/serviços inferidos
- targetAudience: público-alvo inferido (1 frase)
- tone: tom provável
- highlights: array vazio []
- researchedAt: "${new Date().toISOString()}"

Retorne APENAS o JSON, sem explicações.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const briefing = JSON.parse(cleaned);

    return NextResponse.json({ briefing, fetchError: fetchError || null });
  } catch (err) {
    console.error('[Research Company]', err);
    return NextResponse.json({ error: 'Erro ao pesquisar empresa.' }, { status: 500 });
  }
}
