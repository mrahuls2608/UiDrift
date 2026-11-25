import type { ComponentGroup, ReportDTO } from '@uidrift/shared';
import type { AnalysisResult } from '../analysis/index.js';
import { buildTokens } from './tokens.js';
import { generateComponents } from './react.js';

export function generateArtifacts(
  analysis: AnalysisResult,
  groups: ComponentGroup[] = analysis.componentGroups,
): Pick<ReportDTO, 'tokens' | 'components'> {
  const { css, json, set } = buildTokens({
    colors: analysis.colors,
    fontSizes: analysis.fontSizes,
    fontFamilies: analysis.fontFamilies,
    spacing: analysis.spacing,
    radius: analysis.radius,
    groups,
  });
  return { tokens: { css, json }, components: generateComponents(groups, set, css) };
}
