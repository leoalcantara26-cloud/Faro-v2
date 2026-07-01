import type { ILLMProvider } from '../llm/llm.interface';
import type { IMemoryService } from '../memory/memory.service';
import type { Registry } from '../../registry/registry';
import { ConversationSession } from './session';
import { classifyIntent } from '../orchestrator/intent';
import { ConfidenceLayer } from './confidence';
import { Planner } from './planner';
import { Executor } from './executor';
import { Summarizer } from './summarizer';
import { MemoryWriter } from './memory-writer';
import { ResponseComposer } from './response-composer';
import { PreferenceService } from '../user/preference.service';

export interface EngineResponse {
  message: string;
  nextStep?: string;
}

/**
 * Conversation Engine pipeline:
 * Intent → Memory → Confidence → Planner → Executor → Summarizer → MemoryWriter → ResponseComposer
 *
 * MemoryWriter runs silently — the user never sees what was persisted.
 * ResponseComposer adapts verbosity based on the user's AssistanceProfile.
 */
export class ConversationEngine {
  private confidence: ConfidenceLayer;
  private planner: Planner;
  private executor: Executor;
  private summarizer: Summarizer;
  private memoryWriter: MemoryWriter;
  private composer: ResponseComposer;
  private preferences: PreferenceService;

  constructor(
    private readonly llm: ILLMProvider,
    private readonly memory: IMemoryService,
    private readonly registry: Registry,
  ) {
    this.confidence = new ConfidenceLayer();
    this.planner = new Planner(llm);
    this.executor = new Executor(registry);
    this.summarizer = new Summarizer(llm);
    this.memoryWriter = new MemoryWriter(memory);
    this.composer = new ResponseComposer(llm);
    this.preferences = new PreferenceService(memory);
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

    // 3. Fetch relevant memory context + user profile (in parallel)
    const [memoryContext, profile] = await Promise.all([
      this.memory.searchContext(session.userId, userMessage, 5),
      this.preferences.getProfile(session.userId),
    ]);

    // 4. Assess confidence
    const assessment = this.confidence.assess(intent, userMessage, session, memoryContext);
    session.setConfidence(assessment.score);

    // 5. Plan (only produces a plan — no execution)
    const plan = await this.planner.plan(session, memoryContext, assessment);

    // 6. Execute
    const result = await this.executor.execute(plan, assessment, session);

    // 7. Summarize facts from user message
    const summary = await this.summarizer.summarize(userMessage, session);

    // 8. Persist facts silently (user never sees this step)
    await this.memoryWriter.write(session.userId, summary);

    // 9. Compose response (profile-aware verbosity)
    const response = await this.composer.compose(result, session, summary, profile);

    // 10. Record assistant turn
    session.addTurn('assistant', response.message);

    return response;
  }
}
