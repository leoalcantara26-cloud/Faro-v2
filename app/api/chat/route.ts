import { NextRequest, NextResponse } from 'next/server';
import { getEngine, getOrCreateSession } from '../../../src/server/engine-singleton';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json() as { message: string; sessionId: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
    }

    const engine = await getEngine();
    const session = await getOrCreateSession(sessionId);
    const response = await engine.process(session, message.trim());

    const goalState = session.getGoalState();
    const conversation = session.getConversation();

    return NextResponse.json({
      message: response.message,
      nextStep: response.nextStep,
      context: {
        entities: conversation.entities,
        goals: conversation.goals.map((g) => ({
          id: g.id,
          description: g.description,
          status: g.status,
        })),
        conversationStatus: conversation.status,
        attentionMode: goalState.attentionMode,
      },
    });
  } catch (err) {
    console.error('[Chat API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno.' },
      { status: 500 },
    );
  }
}
