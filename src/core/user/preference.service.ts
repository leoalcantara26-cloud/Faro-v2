import type { IMemoryService } from '../memory/memory.service';
import { DEFAULT_PROFILE, type AssistanceProfile, type UserPreferences } from './profile';

export class PreferenceService {
  constructor(private readonly memory: IMemoryService) {}

  async getProfile(userId: string): Promise<AssistanceProfile> {
    const results = await this.memory.searchContext(userId, 'preferências usuário', 1);
    const pref = results.find((e) => e.type === 'preference');
    if (!pref) return DEFAULT_PROFILE;
    return ((pref.data as unknown as UserPreferences).profile) ?? DEFAULT_PROFILE;
  }

  async setProfile(userId: string, profile: AssistanceProfile): Promise<void> {
    await this.memory.save(userId, 'preference', { userId, profile }, `pref-${userId}`);
  }
}
