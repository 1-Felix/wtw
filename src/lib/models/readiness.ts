export type ReadinessStatus = "ready" | "almost-ready" | "not-ready";

export interface RuleResult {
  ruleName: string;
  passed: boolean;
  detail: string;
  /** Shortened detail for compact UI contexts (e.g., progress bar labels) */
  compactDetail: string;
  /** Progress numerator (e.g., 10 episodes available) */
  numerator: number;
  /** Progress denominator (e.g., 12 total episodes) */
  denominator: number;
}

export interface ReadinessVerdict {
  status: ReadinessStatus;
  /** Individual rule results */
  ruleResults: RuleResult[];
  /** Overall progress percentage (0-1) */
  progressPercent: number;
}
