export type MemoryEntityType =
  | 'client'
  | 'company'
  | 'meeting'
  | 'event'
  | 'product'
  | 'preference'
  | 'history';

export interface MemoryEntity {
  id: string;
  type: MemoryEntityType;
  userId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchOptions {
  type?: MemoryEntityType;
  userId: string;
  query?: string;
  limit?: number;
}

/**
 * Permanent memory layer. Agents and orchestrator never rely solely on
 * conversation context — they always read from and write to this store.
 */
export interface IMemory {
  get(id: string): Promise<MemoryEntity | null>;
  set(entity: Omit<MemoryEntity, 'createdAt' | 'updatedAt'>): Promise<MemoryEntity>;
  update(id: string, data: Partial<MemoryEntity['data']>): Promise<MemoryEntity>;
  delete(id: string): Promise<void>;
  search(options: MemorySearchOptions): Promise<MemoryEntity[]>;
}
