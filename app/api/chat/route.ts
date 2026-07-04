import { NextRequest } from 'next/server';
import { getEngine, getOrCreateSession } from '../../../src/server/engine-singleton';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, userProfile } = await req.json() as {
      message: string;
      sessionId: string;
      userProfile?: Record<string, string>;
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Mensagem vazia.' }), { status: 400 });
    }

    const engine = await getEngine();
    const session = await getOrCreateSession(sessionId);

    if (userProfile) {
      session.setUserProfile(userProfile);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await engine.processStream(
            session,
            message.trim(),
            (chunk) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`));
            },
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', context: result.context, nextStep: result.nextStep })}\n\n`));
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Erro interno.' })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[Chat API]', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno.' }), { status: 500 });
  }
}
