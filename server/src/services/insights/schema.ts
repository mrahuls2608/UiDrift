import * as z from 'zod/v4';

/** The JSON an LLM must return. Same fields as the rule-based insights (minus engine metadata). */
export const LlmInsightsSchema = z.object({
  summary: z.string().min(1).max(600),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(1).max(140),
        detail: z.string().min(1).max(700),
        impact: z.enum(['high', 'medium', 'low']),
        category: z.enum([
          'components',
          'colors',
          'typography',
          'spacing',
          'radius',
          'accessibility',
        ]),
      }),
    )
    .max(10),
  tokenNames: z
    .array(
      z.object({
        value: z.string().regex(/^#[0-9a-f]{6}$/i),
        name: z
          .string()
          .regex(/^[a-z][a-z0-9-]*$/)
          .max(40),
        reason: z.string().max(140),
      }),
    )
    .max(16),
});

export type LlmInsights = z.infer<typeof LlmInsightsSchema>;

/** Strict JSON Schema (every object closed, every field required) for OpenAI-style structured output. */
export function llmInsightsJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(LlmInsightsSchema) as Record<string, unknown>;
  const close = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'object') {
      n.additionalProperties = false;
      n.required = Object.keys((n.properties as Record<string, unknown>) ?? {});
    }
    for (const v of Object.values(n)) close(v);
  };
  close(schema);
  delete schema.$schema;
  return schema;
}
