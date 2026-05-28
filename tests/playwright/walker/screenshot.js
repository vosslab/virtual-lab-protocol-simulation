// Screenshot pipeline for walker: captures before/after and summary screenshots.
// Organizes screenshots by protocol, step, and action for easy review.
// @ts-ignore: Node module types require @types/node
import fs from "node:fs";
// @ts-ignore: Node module types require @types/node
import path from "node:path";
//============================================
// Directory and filename helpers
//============================================
/**
 * Compute the root screenshot directory for a protocol run.
 * Format: test-results/walker/<protocolId>
 */
function getProtocolScreenshotRoot(protocolId) {
  return path.join("test-results", "walker", protocolId);
}
/**
 * Compute the step subdirectory.
 * Format: step_<NN> where NN is zero-padded to width 2.
 */
function getStepDirname(stepIndex) {
  const paddedIndex = String(stepIndex).padStart(2, "0");
  return `step_${paddedIndex}`;
}
/**
 * Compute the screenshot filename.
 * Format: action_<NN>_<phase>.png where NN is zero-padded to width 2.
 * Phase is one of "before", "after", or "summary".
 */
function getScreenshotFilename(actionIndex, phase) {
  const paddedIndex = String(actionIndex).padStart(2, "0");
  return `action_${paddedIndex}_${phase}.png`;
}
/**
 * Compute the full path to a screenshot file.
 */
function getScreenshotPath(protocolId, stepIndex, actionIndex, phase) {
  const root = getProtocolScreenshotRoot(protocolId);
  const stepDir = getStepDirname(stepIndex);
  const filename = getScreenshotFilename(actionIndex, phase);
  return path.join(root, stepDir, filename);
}
//============================================
// Public API
//============================================
/**
 * Resolve the screenshot directory for a protocol run.
 * Creates it if missing. Idempotent.
 */
export function ensureScreenshotDir(protocolId) {
  const root = getProtocolScreenshotRoot(protocolId);
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}
/**
 * Capture a screenshot before a click action.
 *
 * Writes to: test-results/walker/<protocolId>/step_<NN>/action_<NN>_before.png
 * NN is zero-padded to width 2.
 *
 * Returns the full path to the written file.
 */
export async function captureBefore(page, ctx) {
  const fullPath = getScreenshotPath(ctx.protocolId, ctx.stepIndex, ctx.actionIndex, "before");
  // Ensure parent directory exists.
  const parentDir = path.dirname(fullPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  await page.screenshot({ path: fullPath });
  return fullPath;
}
/**
 * Capture a screenshot after a click action.
 *
 * Writes to: test-results/walker/<protocolId>/step_<NN>/action_<NN>_after.png
 * NN is zero-padded to width 2.
 *
 * Returns the full path to the written file.
 */
export async function captureAfter(page, ctx) {
  const fullPath = getScreenshotPath(ctx.protocolId, ctx.stepIndex, ctx.actionIndex, "after");
  // Ensure parent directory exists.
  const parentDir = path.dirname(fullPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  await page.screenshot({ path: fullPath });
  return fullPath;
}
/**
 * Capture an end-of-step summary screenshot.
 *
 * Writes to: test-results/walker/<protocolId>/step_<NN>/action_99_summary.png
 * NN is zero-padded to width 2. Action index is fixed at 99.
 *
 * Returns the full path to the written file.
 */
export async function captureStepSummary(page, ctx) {
  const fullPath = getScreenshotPath(
    ctx.protocolId,
    ctx.stepIndex,
    99, // Fixed summary action index
    "summary",
  );
  // Ensure parent directory exists.
  const parentDir = path.dirname(fullPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  await page.screenshot({ path: fullPath });
  return fullPath;
}
