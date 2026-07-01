import type { IMemoryService } from '../memory/memory.service';
import type { ConversationSummary } from './summarizer';

/**
 * Silently persists extracted facts to memory after every turn.
 * The user never sees this happening — Faro works in the background.
 */
export class MemoryWriter {
  constructor(private readonly memory: IMemoryService) {}

  async write(userId: string, summary: ConversationSummary): Promise<void> {
    if (!summary.client && summary.keyFacts.length === 0) return;

    const promises: Promise<unknown>[] = [];

    // Persist interaction record if there are meaningful facts
    if (summary.keyFacts.length > 0) {
      promises.push(
        this.memory.save(userId, 'history', {
          tipo: 'interacao',
          cliente: summary.client ?? null,
          fatos: summary.keyFacts,
          acoes: summary.actionItems,
          proximoPasso: summary.nextStep ?? null,
          clima: summary.sentiment ?? null,
          registradoEm: new Date().toISOString(),
        }),
      );
    }

    // Create a follow-up automatically if a next step was mentioned
    if (summary.nextStep && summary.client) {
      promises.push(
        this.memory.save(userId, 'history', {
          tipo: 'follow-up',
          cliente: summary.client,
          descricao: summary.nextStep,
          status: 'Pendente',
          origem: 'auto',
          criadoEm: new Date().toISOString(),
        }),
      );
    }

    await Promise.all(promises);
  }
}
