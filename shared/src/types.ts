export type ComponentType = 'button' | 'input' | 'heading' | 'link' | 'card';

export type ScanStatus = 'queued' | 'crawling' | 'analysing' | 'done' | 'failed' | 'cancelled';

export type ScanEventType =
  'queued' | 'page_started' | 'page_done' | 'analysing' | 'done' | 'failed' | 'cancelled';

export interface ScanProgress {
  pagesDone: number;
  pagesTotal: number;
  step: string;
}

export interface ScanDTO {
  id: string;
  url: string;
  domain: string;
  status: ScanStatus;
  progress: ScanProgress;
  pagesScanned: string[];
  isDemo: boolean;
  isPublic: boolean;
  error?: string;
  score?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ScanEvent {
  type: ScanEventType;
  scanId: string;
  message: string;
  progress: ScanProgress;
  at: string;
}

/** Raw element captured by the crawler (computed styles only, never HTML). */
export interface RawElement {
  type: ComponentType;
  tag: string;
  text: string;
  page: string;
  styles: Record<string, string>;
}

export interface RawA11yIssue {
  id: string;
  impact: A11yImpact;
  description: string;
  help: string;
  helpUrl?: string;
  selector: string;
  page: string;
}

export type A11yImpact = 'minor' | 'moderate' | 'serious' | 'critical';

export interface PageResult {
  url: string;
  elements: RawElement[];
  a11y: RawA11yIssue[];
}

export interface ScoreBreakdown {
  overall: number;
  components: number;
  colors: number;
  typography: number;
  spacing: number;
  radius: number;
  a11yPenalty: number;
}

export interface ComponentGroup {
  type: ComponentType;
  fingerprint: string;
  styles: Record<string, string>;
  count: number;
  pages: string[];
  sampleText: string;
  suggested: boolean;
}

export interface ColorGroup {
  hex: string;
  merged: string[];
  count: number;
}

export interface ValueCount {
  value: string;
  count: number;
}

export interface ComponentSummary {
  type: ComponentType;
  variants: number;
  ideal: number;
}

export interface ReportTokens {
  css: string;
  json: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ReportDTO {
  id: string;
  scanId: string;
  url: string;
  domain: string;
  pagesScanned: string[];
  createdAt: string;
  score: ScoreBreakdown;
  summary: {
    components: ComponentSummary[];
    colors: { actual: number; ideal: number };
    fontSizes: { actual: number; ideal: number };
    spacing: { actual: number; ideal: number };
    radius: { actual: number; ideal: number };
    a11yIssues: number;
  };
  componentGroups: ComponentGroup[];
  colors: ColorGroup[];
  fontSizes: ValueCount[];
  fontFamilies: ValueCount[];
  spacing: ValueCount[];
  radius: ValueCount[];
  a11y: RawA11yIssue[];
  tokens: ReportTokens;
  components: GeneratedFile[];
}

export interface DemoDTO {
  scanId: string;
  url: string;
  domain: string;
  score: number;
}

export interface UserDTO {
  id: string;
  email: string;
}

export interface ApiError {
  error: { code: string; message: string };
}
