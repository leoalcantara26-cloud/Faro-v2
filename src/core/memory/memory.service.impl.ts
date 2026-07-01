import { randomUUID } from 'crypto';
import type { IMemoryService } from './memory.service';
import type { IMemory, MemoryEntity, MemoryEntityType } from './memory.interface';

export class MemoryService implements IMemoryService {
  constructor(private readonly store: IMemory) {}

  async getClient(userId: string, name: string): Promise<MemoryEntity | null> {
    const results = await this.store.search({ userId, type: 'client' });
    const lower = name.toLowerCase();
    return results.find((e) => {
      const data = e.data as Record<string, string>;
      return (
        data.nome?.toLowerCase().includes(lower) ||
        data.empresa?.toLowerCase().includes(lower)
      );
    }) ?? null;
  }

  async getRecentMeetings(userId: string, limit = 5): Promise<MemoryEntity[]> {
    const results = await this.store.search({ userId, type: 'meeting', limit });
    return results.sort((a, b) => {
      const dateA = (a.data as Record<string, string>).data ?? '';
      const dateB = (b.data as Record<string, string>).data ?? '';
      return dateA < dateB ? 1 : -1;
    });
  }

  async getPendingFollowUps(userId: string): Promise<MemoryEntity[]> {
    const results = await this.store.search({ userId, type: 'history' });
    return results.filter((e) => {
      const data = e.data as Record<string, string>;
      return data.tipo === 'follow-up' && data.status === 'Pendente';
    });
  }

  async searchContext(userId: string, query: string, limit = 5): Promise<MemoryEntity[]> {
    return this.store.search({ userId, query, limit });
  }

  async save(
    userId: string,
    type: MemoryEntityType,
    data: Record<string, unknown>,
    id?: string,
  ): Promise<MemoryEntity> {
    return this.store.set({ id: id ?? randomUUID(), type, userId, data });
  }

  async update(id: string, data: Partial<Record<string, unknown>>): Promise<MemoryEntity> {
    return this.store.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }
}
