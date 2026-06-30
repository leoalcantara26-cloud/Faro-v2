export interface Intent {
  raw: string;
  category: string;
  confidence: number;
  entities: Record<string, string>;
}

export async function classifyIntent(input: string): Promise<Intent> {
  // Lightweight classification before calling the full LLM planner.
  // For now returns a stub — will be replaced with a real classifier.
  return {
    raw: input,
    category: 'unknown',
    confidence: 0,
    entities: {},
  };
}
