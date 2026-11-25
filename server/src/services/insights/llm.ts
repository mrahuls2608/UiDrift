import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { DEFAULT_ANTHROPIC_MODEL, type Insights, type LlmConfigInput } from '@uidrift/shared';
import { env } from '../../config/env.js';
import { assertPublicUrl } from '../crawler/url-guard.js';
import type { AnalysisResult } from '../analysis/index.js';
import { LlmInsightsSchema, llmInsightsJsonSchema, type LlmInsights } from './schema.js';

/** A failure we can show to the user. Messages are written here, never copied from providers. */
export class LlmError extends Error {}

const SYSTEM_PROMPT = `You are a senior design-systems engineer reviewing an automated UI consistency audit.
You receive JSON produced by a deterministic analyzer: scores, component variant groups, color clusters,
type/spacing/radius distributions, accessibility findings, and the analyzer's own rule-based recommendations.

Write insights for the developer who owns this UI.
- Use only facts present in the JSON. Never invent or change numbers, colors, counts, files or selectors.
- Keep every rule-based recommendation's facts; you may merge, reorder and rephrase them to be clearer and
  more actionable, and you may add advice that follows directly from the data.
- Order recommendations by impact. At most 8. Each detail names concrete values (hex colors, px, files).
- Token names are short kebab-case semantic names (primary, text-muted, danger...) for hex colors that
  appear in the data's colors list.
- The summary is two or three plain sentences.`;

/** Models that accept Anthropic's server-side refusal fallback. */
const FALLBACK_MODELS = new Set([
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
]);

/** Compact view of the audit sent to the model (no source code, no page HTML). */
export function buildDigest(a: AnalysisResult, rules: Insights, target: string) {
  return {
    target,
    score: a.score,
    summary: a.summary,
    componentGroups: a.componentGroups.slice(0, 30).map((g) => ({
      type: g.type,
      count: g.count,
      suggested: g.suggested,
      styles: g.styles,
      locations: g.pages.slice(0, 3),
    })),
    colors: a.colors.slice(0, 24),
    fontSizes: a.fontSizes.slice(0, 16),
    spacing: a.spacing.slice(0, 16),
    radius: a.radius.slice(0, 10),
    accessibility: a.a11y
      .slice(0, 30)
      .map((i) => ({ id: i.id, impact: i.impact, help: i.help, location: i.page })),
    ruleBasedInsights: {
      summary: rules.summary,
      recommendations: rules.recommendations,
      tokenNames: rules.tokenNames,
    },
  };
}

async function callAnthropic(cfg: LlmConfigInput, digest: unknown): Promise<LlmInsights> {
  const client = new Anthropic({ apiKey: cfg.apiKey, maxRetries: 1, timeout: 120_000 });
  const model = cfg.model || DEFAULT_ANTHROPIC_MODEL;
  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      ...(FALLBACK_MODELS.has(model)
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(digest) }],
      output_config: { format: zodOutputFormat(LlmInsightsSchema) },
    });
    if (response.stop_reason === 'refusal') throw new LlmError('The model declined the request.');
    if (response.stop_reason === 'max_tokens')
      throw new LlmError('The model response was cut off.');
    if (!response.parsed_output) throw new LlmError('The model did not return valid insights.');
    return response.parsed_output;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof Anthropic.AuthenticationError)
      throw new LlmError('Anthropic rejected the API key.');
    if (err instanceof Anthropic.PermissionDeniedError)
      throw new LlmError('This API key cannot use that model.');
    if (err instanceof Anthropic.NotFoundError)
      throw new LlmError(`Model “${model}” was not found.`);
    if (err instanceof Anthropic.RateLimitError)
      throw new LlmError('Anthropic rate limit reached.');
    if (err instanceof Anthropic.BadRequestError)
      throw new LlmError('Anthropic rejected the request.');
    if (err instanceof Anthropic.APIConnectionError)
      throw new LlmError('Could not reach Anthropic.');
    if (err instanceof Anthropic.APIError)
      throw new LlmError(`Anthropic error (${err.status ?? 'unknown'}).`);
    throw new LlmError('The LLM request failed.');
  }
}

async function callOpenAiStyle(
  cfg: LlmConfigInput,
  digest: unknown,
  fetchImpl: typeof fetch,
): Promise<LlmInsights> {
  const compatible = cfg.provider === 'openai-compatible';
  let base = 'https://api.openai.com/v1';
  if (compatible) {
    const url = await assertPublicUrl(cfg.baseUrl ?? '', {
      allowPrivate: env.ALLOW_PRIVATE_URLS,
    }).catch(() => {
      throw new LlmError('The base URL must be a public https URL.');
    });
    if (url.protocol !== 'https:' && !env.ALLOW_PRIVATE_URLS)
      throw new LlmError('The base URL must use https.');
    base = url.href.replace(/\/+$/, '');
  }
  const schema = llmInsightsJsonSchema();
  const body = {
    model: cfg.model,
    messages: [
      {
        role: 'system',
        content: compatible
          ? `${SYSTEM_PROMPT}\n\nReply with JSON only, matching this JSON Schema:\n${JSON.stringify(schema)}`
          : SYSTEM_PROMPT,
      },
      { role: 'user', content: JSON.stringify(digest) },
    ],
    response_format: compatible
      ? { type: 'json_object' }
      : { type: 'json_schema', json_schema: { name: 'uidrift_insights', strict: true, schema } },
  };
  let res: Response;
  try {
    res = await fetchImpl(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
      redirect: 'error',
    });
  } catch {
    throw new LlmError('Could not reach the LLM provider.');
  }
  if (res.status === 401 || res.status === 403)
    throw new LlmError('The provider rejected the API key.');
  if (res.status === 404) throw new LlmError(`Model “${cfg.model}” or endpoint was not found.`);
  if (res.status === 429) throw new LlmError('The provider rate limit was reached.');
  if (!res.ok) throw new LlmError(`The provider returned an error (${res.status}).`);
  const data = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string; refusal?: string } }>;
  } | null;
  const message = data?.choices?.[0]?.message;
  if (message?.refusal) throw new LlmError('The model declined the request.');
  const content = (message?.content ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '');
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new LlmError('The model did not return JSON.');
  }
  const parsed = LlmInsightsSchema.safeParse(json);
  if (!parsed.success) throw new LlmError('The model returned JSON in the wrong shape.');
  return parsed.data;
}

/**
 * Ask the user's model to rewrite the rule-based insights. Token names are kept only for colors
 * that exist in the audit, so the model can't introduce values the analyzer didn't find.
 */
export async function generateLlmInsights(
  cfg: LlmConfigInput,
  analysis: AnalysisResult,
  rules: Insights,
  target: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Insights> {
  const digest = buildDigest(analysis, rules, target);
  const out =
    cfg.provider === 'anthropic'
      ? await callAnthropic(cfg, digest)
      : await callOpenAiStyle(cfg, digest, fetchImpl);
  if (!out.recommendations.length) throw new LlmError('The model returned no recommendations.');
  const known = new Set(analysis.colors.map((c) => c.hex.toLowerCase()));
  return {
    engine: 'llm',
    provider: cfg.provider,
    model: cfg.model || (cfg.provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : undefined),
    summary: out.summary,
    recommendations: out.recommendations.slice(0, 10),
    tokenNames: out.tokenNames
      .filter((t) => known.has(t.value.toLowerCase()))
      .map((t) => ({ ...t, value: t.value.toLowerCase() })),
  };
}
