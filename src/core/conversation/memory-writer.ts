import type { IMemoryService } from '../memory/memory.service';
import type { ConversationUnderstanding } from './summarizer';
import type { MemoryEntityType } from '../memory/memory.interface';

const ENTITY_TYPE_MAP: Record<string, MemoryEntityType> = {
  client: 'client',
  meeting: 'meeting',
  follow_up: 'history',
  interaction: 'history',
};

/**
 * Silently persists everything the Summarizer identified as worth remembering.
 * The user never sees this step — Faro works in the background.
 */
export class MemoryWriter {
  constructor(private readonly memory: IMemoryService) {}

  async write(userId: string, understanding: ConversationUnderstanding): Promise<void> {
    if (understanding.memoryUpdates.length === 0 && understanding.keyFacts.length === 0) return;

    const writes: Promise<unknown>[] = [];

    // Persist what the Summarizer explicitly identified as memory updates
    for (const update of understanding.memoryUpdates) {
      const entityType = ENTITY_TYPE_MAP[update.entity] ?? 'history';
      writes.push(
        this.memory.save(userId, entityType, {
          ...update.data,
          origem: 'auto',
          registradoEm: new Date().toISOString(),
        }),
      );
    }

    // Always persist the interaction itself if there are meaningful facts
    if (understanding.keyFacts.length > 0) {
      writes.push(
        this.memory.save(userId, 'history', {
          tipo: 'interacao',
          cliente: understanding.client ?? null,
          fatos: understanding.keyFacts,
          estagioNegociacao: understanding.negotiationStage,
          pendencias: understanding.pendingItems,
          proximosPassos: understanding.nextSteps,
          clima: understanding.sentiment,
          registradoEm: new Date().toISOString(),
        }),
      );
    }

    await Promise.all(writes);
  }
}
