import type { ILLMProvider, LLMRequest, LLMResponse } from '../llm.interface';

export class GPTProvider implements ILLMProvider {
  readonly name = 'gpt';

  async generate(_request: LLMRequest): Promise<LLMResponse> {
    throw new Error('GPTProvider.generate not implemented yet');
  }

  async stream(_request: LLMRequest, _onChunk: (chunk: string) => void): Promise<LLMResponse> {
    throw new Error('GPTProvider.stream not implemented yet');
  }
}
