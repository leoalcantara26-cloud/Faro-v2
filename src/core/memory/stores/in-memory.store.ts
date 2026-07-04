import { randomUUID } from 'crypto';
import type { IMemory, MemoryEntity, MemorySearchOptions } from '../memory.interface';

/**
 * In-process store for development and testing.
 * Replace with Postgres + vector store for production.
 */
export class InMemoryStore implements IMemory {
  private store = new Map<string, MemoryEntity>();

  async get(id: string): Promise<MemoryEntity | null> {
    return this.store.get(id) ?? null;
  }

  async set(entity: Omit<MemoryEntity, 'createdAt' | 'updatedAt'>): Promise<MemoryEntity> {
    const now = new Date();
    const full: MemoryEntity = { ...entity, id: entity.id ?? randomUUID(), createdAt: now, updatedAt: now };
    this.store.set(full.id, full);
    return full;
  }

  async update(id: string, data: Partial<MemoryEntity['data']>): Promise<MemoryEntity> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Memory entity ${id} not found`);
    const updated: MemoryEntity = { ...existing, data: { ...existing.data, ...data }, updatedAt: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async search(options: MemorySearchOptions): Promise<MemoryEntity[]> {
    const results: MemoryEntity[] = [];
    for (const entity of this.store.values()) {
      if (entity.userId !== options.userId) continue;
      if (options.type && entity.type !== options.type) continue;
      results.push(entity);
    }
    return results.slice(0, options.limit ?? 50);
  }
}
