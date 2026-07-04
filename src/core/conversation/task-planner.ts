import { randomUUID } from 'crypto';
import type { Goal, Conversation } from './goal-tracker';

export type TaskStatus = 'pending' | 'awaiting_info' | 'completed' | 'failed';
export type TaskCriticality = 'blocking' | 'non_blocking';

export interface Task {
  id: string;
  goalId: string;
  agent: string;
  action: string;
  params: Record<string, unknown>;
  status: TaskStatus;
  priority: number;        // lower = higher priority (1 = most urgent)
  criticality: TaskCriticality;
  missingInfo: string[];
}

export interface ITaskPlanner {
  plan(goals: Goal[], conversation: Conversation): Promise<Task[]>;
}

/**
 * Maps goal descriptions to agent tasks using keyword matching.
 * This is the ONLY component in the system that knows about agents.
 */
const GOAL_TASK_MAP: Array<{
  keywords: string[];
  agent: string;
  action: string;
  criticality: TaskCriticality;
  priority: number;
}> = [
  {
    keywords: ['reunião', 'agendar', 'agenda', 'evento', 'marcar', 'calendar'],
    agent: 'agenda',
    action: 'create_event',
    criticality: 'blocking',
    priority: 1,
  },
  {
    keywords: ['e-mail', 'email', 'mensagem', 'gmail', 'enviar email'],
    agent: 'gmail',
    action: 'send_email',
    criticality: 'blocking',
    priority: 2,
  },
  {
    keywords: ['lembrete', 'follow-up', 'followup', 'lembrar', 'pendência', 'acompanhar'],
    agent: 'followup',
    action: 'create_followup',
    criticality: 'non_blocking',
    priority: 3,
  },
  {
    keywords: ['whatsapp', 'zap', 'mensagem whatsapp', 'avisar'],
    agent: 'whatsapp',
    action: 'send_message',
    criticality: 'blocking',
    priority: 1,
  },
  {
    keywords: ['crm', 'registrar cliente', 'atualizar cliente', 'cadastrar'],
    agent: 'crm',
    action: 'update_client',
    criticality: 'non_blocking',
    priority: 4,
  },
  {
    keywords: ['briefing', 'preparar reunião', 'resumo do cliente'],
    agent: 'briefing',
    action: 'generate_briefing',
    criticality: 'non_blocking',
    priority: 3,
  },
  {
    keywords: ['pesquisar', 'pesquisa', 'linkedin', 'empresa', 'research'],
    agent: 'research',
    action: 'search_company',
    criticality: 'non_blocking',
    priority: 4,
  },
];

function matchGoalToTask(
  goal: Goal,
  conversation: Conversation,
): Omit<Task, 'id'> | null {
  const lower = goal.description.toLowerCase();

  for (const mapping of GOAL_TASK_MAP) {
    if (mapping.keywords.some((k) => lower.includes(k))) {
      const params = extractParams(goal, conversation);
      return {
        goalId: goal.id,
        agent: mapping.agent,
        action: mapping.action,
        params,
        status: 'pending',
        priority: mapping.priority,
        criticality: mapping.criticality,
        missingInfo: [],
      };
    }
  }

  return null;
}

function extractParams(goal: Goal, conversation: Conversation): Record<string, unknown> {
  const params: Record<string, unknown> = { goalDescription: goal.description };

  for (const entity of conversation.entities) {
    params[entity.type] = entity.value;
  }

  return params;
}

export class KeywordTaskPlanner implements ITaskPlanner {
  async plan(goals: Goal[], conversation: Conversation): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const goal of goals) {
      if (goal.status !== 'open' && goal.status !== 'awaiting_info') continue;

      const taskDef = matchGoalToTask(goal, conversation);
      if (taskDef) {
        tasks.push({ id: randomUUID(), ...taskDef });
      }
    }

    // Sort: blocking first, then by priority ascending
    tasks.sort((a, b) => {
      if (a.criticality !== b.criticality) {
        return a.criticality === 'blocking' ? -1 : 1;
      }
      return a.priority - b.priority;
    });

    return tasks;
  }
}
