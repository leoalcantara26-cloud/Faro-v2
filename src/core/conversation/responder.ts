import type { AgentResult } from '../../agents/agent.interface';
import type { OrchestratorOutput } from '../orchestrator/orchestrator';

/**
 * Formats the final response in the Faro tone:
 * - Never sounds like software ("Dados salvos.")
 * - Always sounds like an executive assistant
 * - Always ends with a suggested next step
 */
export function formatResponse(
  _userMessage: string,
  results: AgentResult[],
): OrchestratorOutput {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (results.length === 0) {
    return {
      response: 'Entendi. Pode me contar mais detalhes para eu agir da melhor forma?',
      suggestion: 'Me diga o que você precisa e eu organizo tudo para você.',
    };
  }

  if (failed.length > 0 && successful.length === 0) {
    return {
      response: 'Tive um problema ao executar isso agora. Pode tentar novamente?',
      suggestion: 'Se preferir, me passe mais detalhes e eu encontro outro caminho.',
    };
  }

  const combined = successful.map((r) => r.output).join(' ');

  return {
    response: combined || 'Feito. Cuidei de tudo por você.',
    suggestion: 'Quer que eu registre algo mais ou já podemos avançar?',
  };
}
