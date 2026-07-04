import type { Page } from "@playwright/test";

export interface WalkOptions {
  protocol: string;
  baseUrl: string;
  wrongOrder?: boolean;
  screenshotMode?: "per-step" | "per-interaction" | "per-click";
  resultsDir: string;
}

export interface WalkOutcome {
  passed: boolean;
  protocol: string;
  stepCount: number;
  stepsPassed: number;
  stepsFailed: number;
  isComplete: boolean;
  failureReason: string | null;
  errorCount: number;
  diagnostics: string;
}

export declare function runProtocolWalk(page: Page, options: WalkOptions): Promise<WalkOutcome>;
