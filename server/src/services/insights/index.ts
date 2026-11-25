import type { Insights, LlmConfigInput } from '@uidrift/shared';
import type { AnalysisResult } from '../analysis/index.js';
import { logger } from '../../lib/logger.js';
import { buildRuleInsights } from './rules.js';
import { generateLlmInsights, LlmError } from './llm.js';

/**
 * Insights are always computed by the deterministic rules engine. When the user supplied an LLM,
 * it rewrites them; if that fails for any reason, the rule-based insights are returned with the
 * reason, so an audit never fails because of an LLM. Scores, groups and tokens never depend on it.
 */
export async function buildInsights(
  analysis: AnalysisResult,
  target: string,
  llm?: LlmConfigInput | null,
  fetchImpl?: typeof fetch,
): Promise<Insights> {
  const rules = buildRuleInsights(analysis, { target });
  if (!llm) return rules;
  try {
    return await generateLlmInsights(llm, analysis, rules, target, fetchImpl);
  } catch (err) {
    const reason = err instanceof LlmError ? err.message : 'The LLM request failed.';
    logger.warn(
      { provider: llm.provider, reason },
      'LLM insights failed; using rule-based insights',
    );
    return { ...rules, provider: llm.provider, model: llm.model, fallbackReason: reason };
  }
}
