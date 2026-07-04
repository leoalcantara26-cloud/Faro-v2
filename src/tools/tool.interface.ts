export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Thin adapter to an external system. No business logic lives here.
 */
export interface ITool {
  readonly name: string;
  readonly description: string;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}
