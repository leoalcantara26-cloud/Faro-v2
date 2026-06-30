import type { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';

export class ClaudeProvider implements ILLMProvider {
  readonly name = 'claude';

  async generate(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error('ClaudeProvider.generate not implemented yet');
  }

  async stream(_request: LLMRequest, _onChunk: (chunk: string) => void): Promise<LLMResponse> {
    throw new Error('ClaudeProvider.stream not implemented yet');
  }
}
