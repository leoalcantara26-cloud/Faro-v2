import type { Plan } from './planner';
import type { ConfidenceAssessment } from './confidence';
import type { ConversationSession } from './session';
import type { Registry } from '../../registry/registry';
import type { AgentContext } from '../../agents/agent.interface';

export interface ExecutionResult {
  outcome: 'executed' | 'asked' | 'confirmed' | 'responded';
  agentOutput?: string;
  question?: string;
  directResponse?: string;
  suggestedNextStep?: string;
  error?: string;
}

export class Executor {
  constructor(private readonly registry: Registry) {}

  async execute(
    plan: Plan,
    assessment: ConfidenceAssessment,
    session: ConversationSession,
  ): Promise<ExecutionResult> {
    // Override execute decision if confidence layer says otherwise
    const effectiveDecision =
      plan.decision === 'execute' && assessment.recommendation !== 'proceed'
        ? assessment.recommendation
        : plan.decision;

    switch (effectiveDecision) {
      case 'ask':
        return {
          outcome: 'asked',
          question: assessment.clarificationQuestion ?? 'Pode me dar mais detalhes?',
          suggestedNextStep: plan.suggestedNextStep,
        };

      case 'confirm':
        // Store the action as pending so we can resume after confirmation
        if (plan.action) {
          session.setPendingAction({
            agent: plan.action.agent,
            action: plan.action.action,
            params: plan.action.params,
            waitingFor: 'user_confirmation',
          });
        }
        return {
          outcome: 'confirmed',
          question: assessment.clarificationQuestion ?? 'Posso prosseguir com essas informações?',
          suggestedNextStep: plan.suggestedNextStep,
        };

      case 'respond':
        return {
          outcome: 'responded',
          directResponse: plan.directResponse ?? '',
          suggestedNextStep: plan.suggestedNextStep,
        };

      case 'execute': {
        if (!plan.action) {
          return { outcome: 'responded', directResponse: plan.directResponse ?? '' };
        }

        // Check if user just confirmed a pending action
        const state = session.getSnapshot();
        const actionToRun = state.pendingAction ?? plan.action;
        session.clearPendingAction();

        try {
          const agent = this.registry.getAgent(actionToRun.agent);
          const context: AgentContext = {
            userId: session.userId,
            sessionId: session.id,
            memory: [],
            rawInput: JSON.stringify(actionToRun.params),
          };

          const result = await agent.execute(context);
          return {
            outcome: 'executed',
            agentOutput: result.output,
            suggestedNextStep: plan.suggestedNextStep,
            error: result.success ? undefined : result.error,
          };
        } catch (err) {
          return {
            outcome: 'executed',
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }
    }
  }
}
