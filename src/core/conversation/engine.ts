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
 * Intent → Memory+Profile → Confidence → GoalTracker.reopen
 * → Planner(goalState) → Executor → Summarizer
 * → GoalTracker.update → MemoryWriter → ResponseComposer(profile, goalState)
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

    // 3. Fetch memory context + user profile in parallel
    const [memoryContext, profile] = await Promise.all([
      this.memory.searchContext(session.userId, userMessage, 5),
      this.preferences.getProfile(session.userId),
    ]);

    // 4. Assess confidence
    const assessment = this.confidence.assess(intent, userMessage, session, memoryContext);
    session.setConfidence(assessment.score);

    // 4b. Allow GoalTracker to reopen a context if user explicitly references it
    session.goalTracker.reopenIfNeeded(userMessage);
    const goalStateBefore = session.getGoalState();

    // 5. Plan — receives goal state to enforce attention mode
    const plan = await this.planner.plan(session, memoryContext, assessment, goalStateBefore);

    // 6. Execute
    const result = await this.executor.execute(plan, assessment, session);

    // 7. Summarize — extracts detectedGoals for this turn
    const understanding = await this.summarizer.summarize(userMessage, session);

    // 8. Update GoalTracker
    // Register any new goals the user mentioned this turn
    if (understanding.detectedGoals.length > 0) {
      session.goalTracker.addGoals(understanding.detectedGoals);
    }
    // Mark goals as completed when an agent executed successfully
    if (result.outcome === 'executed' && !result.error && plan.action?.agent) {
      session.goalTracker.markCompletedByAgent(plan.action.agent);
    }
    const goalStateAfter = session.getGoalState();

    // 9. Persist silently
    await this.memoryWriter.write(session.userId, understanding);

    // 10. Compose response — aware of profile and goal state
    const response = await this.composer.compose(result, session, understanding, profile, goalStateAfter);

    // 11. Record assistant turn
    session.addTurn('assistant', response.message);

    return response;
  }
}
