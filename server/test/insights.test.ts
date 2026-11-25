import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const parseMock = vi.fn();
class FakeAuthError extends Error {}
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status?: number;
  }
  class Anthropic {
    static APIError = APIError;
    static AuthenticationError = FakeAuthError;
    static PermissionDeniedError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    static RateLimitError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static APIConnectionError = class extends APIError {};
    options: unknown;
    beta = { messages: { parse: parseMock } };
    constructor(options: unknown) {
      this.options = options;
      constructed.push(options);
    }
  }
  return { default: Anthropic };
});
const constructed: unknown[] = [];

const { analyzeSource } = await import('../src/services/source/index.js');
const { analyzeData } = await import('../src/services/analysis/index.js');
const { buildRuleInsights, nameTokens } = await import('../src/services/insights/rules.js');
const { buildInsights } = await import('../src/services/insights/index.js');
const { llmInsightsJsonSchema } = await import('../src/services/insights/schema.js');
const { encrypt, decrypt } = await import('../src/services/insights/key-vault.js');

const SAMPLE = join(process.cwd(), '../samples/acme-ui');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) =>
    statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)],
  );
const files = walk(SAMPLE)
  .filter((p) => !/\.(md|json)$/.test(p))
  .map((p) => ({ path: relative(SAMPLE, p), content: readFileSync(p, 'utf8') }));
const analysis = analyzeData(analyzeSource(files));

beforeEach(() => {
  parseMock.mockReset();
  constructed.length = 0;
});

describe('rule-based insights (no AI)', () => {
  const insights = buildRuleInsights(analysis, { target: 'acme-ui' });

  it('summarises the score and biggest gaps from the data', () => {
    expect(insights.engine).toBe('rules');
    expect(insights.summary).toMatch(
      /^acme-ui scores \d+\/100 \((Consistent|Drifting|Chaotic)\)\. Biggest gaps: buttons \(11 → 3\)/,
    );
  });

  it('produces concrete, data-backed recommendations ordered by impact', () => {
    const titles = insights.recommendations.map((r) => r.title);
    expect(titles).toContain('Consolidate 11 buttons into 3');
    expect(titles.some((t) => /^Merge \d+ near-identical colors$/.test(t))).toBe(true);
    expect(
      titles.some((t) => t.startsWith('Fix ') && t.includes('Images must have alternative text')),
    ).toBe(true);
    const order = insights.recommendations.map((r) => ({ high: 0, medium: 1, low: 2 })[r.impact]);
    expect(order).toEqual([...order].sort());
    const merge = insights.recommendations.find((r) => r.title.startsWith('Merge'));
    expect(merge?.detail).toContain('#2464ea → #2563eb');
  });

  it('names tokens by role and hue', () => {
    const names = Object.fromEntries(nameTokens(analysis).map((t) => [t.name, t.value]));
    expect(names.primary).toMatch(/^#/);
    expect(names.danger).toBe('#dc2626');
    expect(names.background).toBe('#ffffff');
  });

  it('is deterministic', () => {
    expect(
      buildRuleInsights(analyzeData(analyzeSource([...files].reverse())), { target: 'acme-ui' }),
    ).toEqual(insights);
  });
});

describe('Anthropic insights (user-supplied key, official SDK)', () => {
  const reply = {
    summary: 'Two sentences.',
    recommendations: [
      {
        title: 'Consolidate buttons',
        detail: 'Keep #2563eb.',
        impact: 'high',
        category: 'components',
      },
    ],
    tokenNames: [{ value: '#2563eb', name: 'primary', reason: 'Most used button' }],
  };

  it('uses the key from the request, Claude Opus 5.5 by default, structured output and refusal fallbacks', async () => {
    parseMock.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: reply });
    const out = await buildInsights(analysis, 'acme-ui', {
      provider: 'anthropic',
      apiKey: 'sk-ant-user-123456',
    });
    expect(constructed[0]).toMatchObject({ apiKey: 'sk-ant-user-123456' });
    const args = parseMock.mock.calls[0]?.[0];
    expect(args).toMatchObject({
      model: 'claude-opus-5-5',
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    expect(args.output_config.format).toBeDefined();
    expect(
      JSON.parse(args.messages[0].content).ruleBasedInsights.recommendations.length,
    ).toBeGreaterThan(0);
    expect(out).toMatchObject({
      engine: 'llm',
      provider: 'anthropic',
      model: 'claude-opus-5-5',
      summary: 'Two sentences.',
    });
  });

  it('omits fallbacks for models that do not support them', async () => {
    parseMock.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: reply });
    await buildInsights(analysis, 'acme-ui', {
      provider: 'anthropic',
      apiKey: 'sk-ant-user-123456',
      model: 'claude-haiku-5-5',
    });
    const args = parseMock.mock.calls[0]?.[0];
    expect(args.model).toBe('claude-haiku-5-5');
    expect(args.fallbacks).toBeUndefined();
  });

  it('falls back to rules on refusal or a rejected key, with a readable reason', async () => {
    parseMock.mockResolvedValueOnce({ stop_reason: 'refusal', parsed_output: null });
    const refused = await buildInsights(analysis, 'acme-ui', {
      provider: 'anthropic',
      apiKey: 'sk-ant-user-123456',
    });
    expect(refused).toMatchObject({
      engine: 'rules',
      fallbackReason: 'The model declined the request.',
    });
    parseMock.mockRejectedValueOnce(new FakeAuthError('invalid x-api-key sk-ant-user-123456'));
    const badKey = await buildInsights(analysis, 'acme-ui', {
      provider: 'anthropic',
      apiKey: 'sk-ant-user-123456',
    });
    expect(badKey.fallbackReason).toBe('Anthropic rejected the API key.');
    expect(badKey.recommendations).toEqual(
      buildRuleInsights(analysis, { target: 'acme-ui' }).recommendations,
    );
  });
});

describe('OpenAI-compatible providers', () => {
  it('refuses private base URLs (SSRF) and falls back to rules', async () => {
    const fetchImpl = vi.fn();
    const out = await buildInsights(
      analysis,
      'acme-ui',
      {
        provider: 'openai-compatible',
        apiKey: 'key-123456',
        model: 'llama',
        baseUrl: 'http://169.254.169.254/v1',
      },
      fetchImpl as never,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(out.fallbackReason).toBe('The base URL must be a public https URL.');
  });

  it('rejects malformed model output', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"summary": 1}' } }] })),
    );
    const out = await buildInsights(
      analysis,
      'acme-ui',
      { provider: 'openai', apiKey: 'sk-123456', model: 'gpt-x' },
      fetchImpl as never,
    );
    expect(out.fallbackReason).toBe('The model returned JSON in the wrong shape.');
  });

  it('builds a strict JSON schema for structured output', () => {
    const schema = llmInsightsJsonSchema() as {
      additionalProperties: boolean;
      required: string[];
      properties: Record<string, { items?: { additionalProperties?: boolean } }>;
    };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['summary', 'recommendations', 'tokenNames']);
    expect(schema.properties.recommendations?.items?.additionalProperties).toBe(false);
  });
});

describe('key vault', () => {
  it('round-trips encrypted LLM settings and rejects tampering', () => {
    const cfg = { provider: 'openai' as const, apiKey: 'sk-secret-123456', model: 'gpt-x' };
    const sealed = encrypt(cfg);
    expect(sealed).not.toContain('sk-secret');
    expect(decrypt(sealed)).toEqual(cfg);
    const raw = Buffer.from(sealed, 'base64');
    raw[raw.length - 1] = (raw[raw.length - 1] as number) ^ 1;
    expect(() => decrypt(raw.toString('base64'))).toThrow();
  });
});
