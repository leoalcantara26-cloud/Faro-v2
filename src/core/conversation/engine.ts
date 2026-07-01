import type { ILLMProvider } from '../llm/llm.interface';
import type { IMemory } from '../memory/memory.interface';
import type { Registry } from '../../registry/registry';
import { ConversationSession } from './session';
import { classifyIntent } from '../orchestrator/intent';
import { Planner } from './planner';
import { ConfidenceLayer } from './confidence';
import { Executor } from './executor';
import { ResponseComposer } from './response-composer';

export interface EngineResponse {
  message: string;
  nextStep?: string;
}

/**
 * Conversation Engine — executes the full Faro pipeline:
 * Intent → Memory → Planner → Confidence → Executor → ResponseComposer
 */
export class ConversationEngine {
  private planner: Planner;
  private confidence: ConfidenceLayer;
  private executor: Executor;
  private composer: ResponseComposer;

  constructor(
    private readonly llm: ILLMProvider,
    private readonly memory: IMemory,
    private readonly registry: Registry,
  ) {
    this.planner = new Planner(llm);
    this.confidence = new ConfidenceLayer();
    this.executor = new Executor(registry);
    this.composer = new ResponseComposer(llm);
  }

  createSession(userId: string): ConversationSession {
    return new ConversationSession(userId);
  }

  async process(session: ConversationSession, userMessage: string): Promise<EngineResponse> {
    // 1. Record user turn
    session.addTurn('user', userMessage);

    // 2. Understand intent
    const intent = await classifyIntent(userMessage, this.llm);
    session.updateIntent(intent);
    session.setConfidence(intent.confidence);

    // 3. Fetch relevant memory context
    const memoryContext = await this.memory.search({
      userId: session.userId,
      query: userMessage,
      limit: 5,
    });

    // 4. Plan (analyze only — no execution)
    const plan = await this.planner.plan(session, memoryContext);

    // 5. Assess confidence
    const assessment = this.confidence.assess(plan, session, userMessage);

    // 6. Execute (respects confidence assessment)
    const result = await this.executor.execute(plan, assessment, session);

    // 7. Compose response in Faro's voice
    const response = await this.composer.compose(result, session);

    // 8. Record assistant turn
    const fullMessage = response.nextStep
      ? `${response.message}\n\n${response.nextStep}`
      : response.message;
    session.addTurn('assistant', fullMessage);

    return response;
  }
}
