import type { MemoryEntity, MemoryEntityType } from './memory.interface';

/**
 * Definitive domain-level memory interface.
 * Swap the implementation (in-process → Postgres → vector DB) without touching consumers.
 */
export interface IMemoryService {
  // Retrieval
  getClient(userId: string, name: string): Promise<MemoryEntity | null>;
  getRecentMeetings(userId: string, limit?: number): Promise<MemoryEntity[]>;
  getPendingFollowUps(userId: string): Promise<MemoryEntity[]>;
  searchContext(userId: string, query: string, limit?: number): Promise<MemoryEntity[]>;

  // Persistence
  save(userId: string, type: MemoryEntityType, data: Record<string, unknown>, id?: string): Promise<MemoryEntity>;
  update(id: string, data: Partial<Record<string, unknown>>): Promise<MemoryEntity>;
  delete(id: string): Promise<void>;
}
