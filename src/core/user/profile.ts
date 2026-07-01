/**
 * Controls how much explanation Faro volunteers during normal flow.
 * Stored in memory and can be changed via settings.
 *
 * objetivo   — confirm + act. No commentary.
 * equilibrado — confirm + mention key captured facts.
 * mentor     — confirm + offer insight when a real risk or opportunity exists.
 */
export type AssistanceProfile = 'objetivo' | 'equilibrado' | 'mentor';

export const DEFAULT_PROFILE: AssistanceProfile = 'equilibrado';

export interface UserPreferences {
  userId: string;
  profile: AssistanceProfile;
}
