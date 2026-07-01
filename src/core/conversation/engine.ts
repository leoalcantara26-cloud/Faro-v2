import type { ILLMProvider } from '../llm/llm.interface';
import type { IMemoryService } from '../memory/memory.service';
import type { Registry } from '../../registry/registry';
import { ConversationSession } from './session';
import { classifyIntent } from '../orchestrator/intent';
import { ConfidenceLayer } from './confidence';
import { Planner } from './planner';
import { Executor } from './executor';
import { ResponseComposer } from './response-composer';

export interface EngineResponse {
  message: string;
  nextStep?: string;
}

/**
 * Conversation Engine pipeline:
 * Intent → Memory → Confidence → Planner → Executor → ResponseComposer
 */
export class ConversationEngine {
  private confidence: ConfidenceLayer;
  private planner: Planner;
  private executor: Executor;
  private composer: ResponseComposer;

  constructor(
    private readonly llm: ILLMProvider,
    private readonly memory: IMemoryService,
    private readonly registry: Registry,
  ) {
    this.confidence = new ConfidenceLayer();
    this.planner = new Planner(llm);
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

    // 3. Fetch relevant memory context
    const memoryContext = await this.memory.searchContext(session.userId, userMessage, 5);

    // 4. Assess confidence (before planning)
    const assessment = this.confidence.assess(intent, userMessage, session, memoryContext);
    session.setConfidence(assessment.score);

    // 5. Plan (receives the confidence assessment — only produces a plan)
    const plan = await this.planner.plan(session, memoryContext, assessment);

    // 6. Execute (respects confidence assessment, uses Registry for agents)
    const result = await this.executor.execute(plan, assessment, session);

    // 7. Compose response in Faro's voice (3-part structure)
    const response = await this.composer.compose(result, session);

    // 8. Record assistant turn
    const fullMessage = response.nextStep
      ? `${response.message}\n\n${response.nextStep}`
      : response.message;
    session.addTurn('assistant', fullMessage);

    return response;
  }
}
