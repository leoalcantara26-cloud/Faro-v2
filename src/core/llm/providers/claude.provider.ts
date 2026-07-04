import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider, LLMRequest, LLMResponse, LLMToolDefinition } from '../llm.interface';

export class ClaudeProvider implements ILLMProvider {
  readonly name = 'claude';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const system = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      messages,
      ...(system ? { system } : {}),
      ...(request.tools?.length ? { tools: this.mapTools(request.tools) } : {}),
    };

    const response = await this.client.messages.create(params);

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, arguments: b.input as Record<string, unknown> }));

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    const system = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      messages,
      ...(system ? { system } : {}),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
      if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      }
    }

    return { content: fullText, inputTokens, outputTokens };
  }

  private mapTools(tools: LLMToolDefinition[]): Anthropic.Tool[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }));
  }
}
