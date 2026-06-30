import 'dotenv/config';
import { Registry } from './registry/registry';
import { ClaudeProvider } from './core/llm/providers/claude.provider';
import { InMemoryStore } from './core/memory/stores/in-memory.store';
import { Orchestrator } from './core/orchestrator/orchestrator';
import { ConversationSession } from './core/conversation/session';
import { AgendaAgent } from './agents/agenda.agent';
import { GoogleCalendarTool } from './tools/google-calendar.tool';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function createFaro(): { orchestrator: Orchestrator; createSession: (userId: string) => ConversationSession } {
  // LLM
  const llm = new ClaudeProvider(requireEnv('ANTHROPIC_API_KEY'));

  // Memory
  const memory = new InMemoryStore();

  // Registry
  const registry = new Registry();
  registry.registerLLMProvider(llm, true);

  // Tools
  const calendarTool = new GoogleCalendarTool({
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    refreshToken: requireEnv('GOOGLE_REFRESH_TOKEN'),
  });
  registry.registerTool(calendarTool);

  // Agents
  registry.registerAgent(new AgendaAgent(llm, calendarTool));

  // Orchestrator
  const orchestrator = new Orchestrator(registry, memory);

  return {
    orchestrator,
    createSession: (userId: string) => new ConversationSession(userId),
  };
}
