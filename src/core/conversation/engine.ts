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
import { KeywordTaskPlanner } from './task-planner';
import type { ITaskPlanner } from './task-planner';

export interface EngineResponse {
  message: string;
  nextStep?: string;
}

export interface EngineStreamResult {
  context: {
    entities: Array<{ type: string; value: string; confidence: number }>;
    goals: Array<{ id: string; description: string; status: string }>;
    conversationStatus: string;
    attentionMode: string;
  };
  nextStep?: string;
}

/**
 * Conversation Engine pipeline:
 * Intent → Memory+Profile → Confidence → GoalTracker.reopen
 * → Summarizer (detectedGoals + entities) → GoalTracker.update
 * → TaskPlanner (Goal → Task[]) → Planner(tasks) → Executor
 * → GoalTracker.markCompleted → MemoryWriter → ResponseComposer
 */
export class ConversationEngine {
  private confidence: ConfidenceLayer;
  private planner: Planner;
  private executor: Executor;
  private summarizer: Summarizer;
  private memoryWriter: MemoryWriter;
  private composer: ResponseComposer;
  private preferences: PreferenceService;
  private taskPlanner: ITaskPlanner;

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
    this.taskPlanner = new KeywordTaskPlanner();
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

    // 5. Summarize — extracts detectedGoals and entities for this turn
    const understanding = await this.summarizer.summarize(userMessage, session);

    // 6. Update GoalTracker with new goals and entities
    if (understanding.detectedGoals.length > 0) {
      session.goalTracker.addGoals(understanding.detectedGoals);
    }
    if (understanding.detectedEntities.length > 0) {
      session.goalTracker.addEntities(understanding.detectedEntities);
    }

    const goalState = session.getGoalState();
    const conversation = session.getConversation();

    // 7. TaskPlanner maps open Goals → Tasks (only component that knows agents)
    const openGoals = session.goalTracker.getOpenGoals();
    const tasks = await this.taskPlanner.plan(openGoals, conversation);

    // 8. Plan — receives tasks instead of raw agent names
    const plan = await this.planner.plan(session, memoryContext, assessment, goalState, tasks);

    // 9. Execute
    const result = await this.executor.execute(plan, assessment, session, tasks);

    // 10. Mark goal as completed if a task executed successfully
    if (result.outcome === 'executed' && !result.error && result.completedGoalId) {
      session.goalTracker.markGoalCompleted(result.completedGoalId);
    }

    const goalStateAfter = session.getGoalState();

    // 11. Persist silently
    await this.memoryWriter.write(session.userId, understanding);

    // 12. Compose response — aware of profile and goal state
    const response = await this.composer.compose(result, session, understanding, profile, goalStateAfter);

    // 13. Record assistant turn
    session.addTurn('assistant', response.message);

    return response;
  }

  async processStream(
    session: ConversationSession,
    userMessage: string,
    onChunk: (chunk: string) => void,
  ): Promise<EngineStreamResult> {
    session.addTurn('user', userMessage);

    const intent = await classifyIntent(userMessage, this.llm);
    session.updateIntent(intent);

    const [memoryContext, profile] = await Promise.all([
      this.memory.searchContext(session.userId, userMessage, 5),
      this.preferences.getProfile(session.userId),
    ]);

    const assessment = this.confidence.assess(intent, userMessage, session, memoryContext);
    session.setConfidence(assessment.score);
    session.goalTracker.reopenIfNeeded(userMessage);

    const understanding = await this.summarizer.summarize(userMessage, session);

    if (understanding.detectedGoals.length > 0) {
      session.goalTracker.addGoals(understanding.detectedGoals);
    }
    if (understanding.detectedEntities.length > 0) {
      session.goalTracker.addEntities(understanding.detectedEntities);
    }

    const goalState = session.getGoalState();
    const conversation = session.getConversation();
    const openGoals = session.goalTracker.getOpenGoals();
    const tasks = await this.taskPlanner.plan(openGoals, conversation);
    const plan = await this.planner.plan(session, memoryContext, assessment, goalState, tasks);
    const result = await this.executor.execute(plan, assessment, session, tasks);

    if (result.outcome === 'executed' && !result.error && result.completedGoalId) {
      session.goalTracker.markGoalCompleted(result.completedGoalId);
    }

    const goalStateAfter = session.getGoalState();
    await this.memoryWriter.write(session.userId, understanding);

    const response = await this.composer.compose(result, session, understanding, profile, goalStateAfter, onChunk);
    session.addTurn('assistant', response.message);

    const conv = session.getConversation();
    return {
      context: {
        entities: conv.entities,
        goals: conv.goals.map((g) => ({ id: g.id, description: g.description, status: g.status })),
        conversationStatus: conv.status,
        attentionMode: goalStateAfter.attentionMode,
      },
      nextStep: response.nextStep,
    };
  }
}
