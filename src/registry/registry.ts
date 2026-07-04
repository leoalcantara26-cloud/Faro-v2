import type { IAgent } from '../agents/agent.interface';
import type { ITool } from '../tools/tool.interface';
import type { ILLMProvider } from '../core/llm/llm.interface';

export class Registry {
  private agents = new Map<string, IAgent>();
  private tools = new Map<string, ITool>();
  private llmProviders = new Map<string, ILLMProvider>();
  private activeLLM: string | null = null;

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.name, agent);
  }

  registerTool(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  registerLLMProvider(provider: ILLMProvider, setAsActive = false): void {
    this.llmProviders.set(provider.name, provider);
    if (setAsActive || this.activeLLM === null) this.activeLLM = provider.name;
  }

  getAgent(name: string): IAgent {
    const agent = this.agents.get(name);
    if (!agent) throw new Error(`Agent "${name}" not registered`);
    return agent;
  }

  getTool(name: string): ITool {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool "${name}" not registered`);
    return tool;
  }

  getLLM(): ILLMProvider {
    if (!this.activeLLM) throw new Error('No LLM provider registered');
    return this.llmProviders.get(this.activeLLM)!;
  }

  setActiveLLM(name: string): void {
    if (!this.llmProviders.has(name)) throw new Error(`LLM provider "${name}" not registered`);
    this.activeLLM = name;
  }

  listAgents(): IAgent[] {
    return [...this.agents.values()];
  }

  listTools(): ITool[] {
    return [...this.tools.values()];
  }
}
