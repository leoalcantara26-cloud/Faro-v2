import 'dotenv/config';
import * as readline from 'readline';
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

const USER_ID = 'vendedor-demo';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌  ANTHROPIC_API_KEY não encontrada. Crie um arquivo .env com a chave.');
    process.exit(1);
  }

  const llm = new ClaudeProvider(apiKey);
  const memory = await createMockMemoryService(USER_ID);
  const registry = new Registry();

  registry.registerLLMProvider(llm, true);
  registry.registerAgent(new MockAgendaAgent());
  registry.registerAgent(new MockCRMAgent());
  registry.registerAgent(new MockGmailAgent());
  registry.registerAgent(new MockFollowUpAgent());
  registry.registerAgent(new MockBriefingAgent());
  registry.registerAgent(new MockResearchAgent());

  const engine = new ConversationEngine(llm, memory, registry);
  const session = engine.createSession(USER_ID);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n─────────────────────────────────────────');
  console.log('  Faro OS 2.0 — Conversation Engine');
  console.log('  Sprint 1 · Mock Mode');
  console.log('─────────────────────────────────────────');
  console.log('  Digite sua mensagem ou "sair" para encerrar.\n');

  const ask = () => {
    rl.question('Você: ', async (input) => {
      const text = input.trim();
      if (!text) { ask(); return; }
      if (text.toLowerCase() === 'sair') { console.log('\nFaro: Até logo!\n'); rl.close(); return; }

      try {
        const response = await engine.process(session, text);
        console.log(`\nFaro: ${response.message}`);
        if (response.nextStep) console.log(`\n💡 ${response.nextStep}`);
        console.log();
      } catch (err) {
        console.error('\n[Erro interno]', err instanceof Error ? err.message : err);
      }

      ask();
    });
  };

  ask();
}

main();
