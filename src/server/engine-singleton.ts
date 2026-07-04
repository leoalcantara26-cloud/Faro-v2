import 'dotenv/config';
import { ClaudeProvider } from '../core/llm/providers/claude.provider';
import { Registry } from '../registry/registry';
import { ConversationEngine } from '../core/conversation/engine';
import { createMockMemoryService } from '../core/conversation/mocks/memory.mock';
import {
  MockAgendaAgent,
  MockCRMAgent,
  MockGmailAgent,
  MockFollowUpAgent,
  MockBriefingAgent,
  MockResearchAgent,
} from '../core/conversation/mocks/agents.mock';
import type { ConversationSession } from '../core/conversation/session';

let engineInstance: ConversationEngine | null = null;
const sessions = new Map<string, ConversationSession>();

export async function getEngine(): Promise<ConversationEngine> {
  if (engineInstance) return engineInstance;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada.');

  const llm = new ClaudeProvider(apiKey);
  const memory = await createMockMemoryService('demo-user');
  const registry = new Registry();

  registry.registerLLMProvider(llm, true);
  registry.registerAgent(new MockAgendaAgent());
  registry.registerAgent(new MockCRMAgent());
  registry.registerAgent(new MockGmailAgent());
  registry.registerAgent(new MockFollowUpAgent());
  registry.registerAgent(new MockBriefingAgent());
  registry.registerAgent(new MockResearchAgent());

  engineInstance = new ConversationEngine(llm, memory, registry);
  return engineInstance;
}

export async function getOrCreateSession(sessionId: string): Promise<ConversationSession> {
  const engine = await getEngine();

  if (!sessions.has(sessionId)) {
    const session = engine.createSession('demo-user');
    sessions.set(sessionId, session);
  }

  return sessions.get(sessionId)!;
}

export { sessions };
