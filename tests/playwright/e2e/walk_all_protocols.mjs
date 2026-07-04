// tests/playwright/e2e/walk_all_protocols.mjs
//
// All-protocols walker sweep runner.
//
// Enumerates every curriculum protocol under content/protocols/**/protocol.yaml
// and runs the existing single-protocol schema-driven walker
// (protocol_walkthrough_yaml.mjs) against each one in turn. Protocols are
// walked sequentially: the single walker binds a fixed local port (8126) and
// writes to a single shared results directory, so parallel runs would
// collide. This script never reimplements the walker and adds no
// per-protocol branches; it only spawns the existing walker once per
// discovered protocol id and classifies the outcome from its exit code plus
// its own playthrough_report.json.
//
// Usage:
//   node tests/playwright/e2e/walk_all_protocols.mjs
//
// Prerequisite: build dist/ first (npm run build), same as the single walker.
//
// Output:
//   test-results/walker/sweep_summary.json  - machine-readable worst-first summary
//   test-results/walker/reports/<id>.json   - per-protocol walker report, copied
//                                              out before the next run overwrites
//                                              the shared playthrough_report.json

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "../repo_root.mjs";

const CONTENT_DIR = path.join(REPO_ROOT, "content", "protocols");
const WALKER_SCRIPT = path.join(
  REPO_ROOT,
  "tests",
  "playwright",
  "e2e",
  "protocol_walkthrough_yaml.mjs",
);
const RESULTS_DIR = path.join(REPO_ROOT, "test-results", "walker");
const REPORTS_DIR = path.join(RESULTS_DIR, "reports");
const SHARED_REPORT_PATH = path.join(RESULTS_DIR, "playthrough_report.json");
const SUMMARY_PATH = path.join(RESULTS_DIR, "sweep_summary.json");

// Per-protocol wall-clock budget. Mirrors the single walker's own 10-minute
// RUN_BUDGET_MS with headroom for process spawn and teardown overhead.
const PER_PROTOCOL_TIMEOUT_MS = 660000;

//============================================
// Discovery
//============================================

// Recursively find every protocol.yaml under content/protocols and return the
// sorted list of protocol ids (the parent directory name of each file, which
// matches the authored protocol_name field for every curriculum protocol).
export function discoverProtocolIds(contentDir) {
  const ids = [];
  walkForProtocolYaml(contentDir, ids);
  ids.sort();
  return ids;
}

function walkForProtocolYaml(dirPath, ids) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkForProtocolYaml(entryPath, ids);
    } else if (entry.isFile() && entry.name === "protocol.yaml") {
      ids.push(path.basename(dirPath));
    }
  }
}

//============================================
// Single-protocol run
//============================================

// Spawn the existing single-protocol walker for one protocol id and resolve
// with its exit code plus captured stdout/stderr. Never rejects on a nonzero
// exit code; the caller classifies pass/fail from the exit code plus report.
function runWalkerForProtocol(protocolId) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("node", [WALKER_SCRIPT, "--protocol", protocolId], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, PER_PROTOCOL_TIMEOUT_MS);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        protocolId,
        exitCode: null,
        spawnError: err.message,
        timedOut: false,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        protocolId,
        exitCode,
        spawnError: null,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

//============================================
// Verdict classification
//============================================

// Classify one run's outcome from its exit code plus the walker's own
// playthrough_report.json. Reads the report's failureReason field only to
// tell "unsupported_gesture" apart from other failures; this is the same
// classification string the single walker already throws (see
// protocol_walkthrough_yaml.mjs), so no new per-protocol logic is added.
export function classifyRun(runResult, report) {
  if (runResult.spawnError !== null) {
    return { verdict: "error", reason: `spawn_error: ${runResult.spawnError}` };
  }
  if (runResult.timedOut) {
    return { verdict: "error", reason: `timeout after ${PER_PROTOCOL_TIMEOUT_MS}ms` };
  }
  if (report === null) {
    return { verdict: "error", reason: "no playthrough_report.json produced" };
  }

  const failureReason = report.summary ? report.summary.failureReason : null;
  if (typeof failureReason === "string" && failureReason.startsWith("unsupported_gesture:")) {
    return { verdict: "unsupported_gesture", reason: failureReason };
  }
  if (runResult.exitCode === 0) {
    return { verdict: "PASS", reason: null };
  }
  const reason = failureReason !== null ? failureReason : `nonzero exit code ${runResult.exitCode}`;
  return { verdict: "FAIL", reason };
}

//============================================
// Report archiving
//============================================

// Copy the shared playthrough_report.json aside before the next run
// overwrites it, and return its parsed contents (or null if missing).
function archiveReport(protocolId) {
  if (!fs.existsSync(SHARED_REPORT_PATH)) {
    return null;
  }
  const text = fs.readFileSync(SHARED_REPORT_PATH, "utf-8");
  const report = JSON.parse(text);
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  const archivedPath = path.join(REPORTS_DIR, `${protocolId}.json`);
  fs.writeFileSync(archivedPath, text);
  return report;
}

//============================================
// Summary printing
//============================================

const VERDICT_RANK = { FAIL: 0, error: 0, unsupported_gesture: 1, PASS: 2 };

function printSummaryTable(results) {
  const sorted = results.slice().sort((a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]);
  console.log("\n=== Walker sweep summary (worst first) ===");
  console.log("verdict              protocol_id                                duration  reason");
  for (const r of sorted) {
    const verdictCol = r.verdict.padEnd(20);
    const idCol = r.protocolId.padEnd(42);
    const durationCol = `${(r.durationMs / 1000).toFixed(1)}s`.padEnd(9);
    const reasonCol = r.reason !== null ? r.reason.slice(0, 120) : "";
    console.log(`${verdictCol} ${idCol} ${durationCol} ${reasonCol}`);
  }

  const counts = { PASS: 0, unsupported_gesture: 0, FAIL: 0, error: 0 };
  for (const r of results) {
    counts[r.verdict]++;
  }
  console.log(
    `\nTotals: PASS=${counts.PASS} unsupported_gesture=${counts.unsupported_gesture} ` +
      `FAIL=${counts.FAIL} error=${counts.error} (of ${results.length})`,
  );
}

//============================================
// Main
//============================================

async function main() {
  const protocolIds = discoverProtocolIds(CONTENT_DIR);
  if (protocolIds.length === 0) {
    throw new Error(`no protocol.yaml files found under ${CONTENT_DIR}`);
  }
  console.log(`Discovered ${protocolIds.length} protocols under content/protocols/`);

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results = [];
  for (const protocolId of protocolIds) {
    console.log(`\n--- Walking ${protocolId} ---`);
    const runResult = await runWalkerForProtocol(protocolId);
    const report = archiveReport(protocolId);
    const { verdict, reason } = classifyRun(runResult, report);
    console.log(`${protocolId}: ${verdict}${reason !== null ? ` (${reason})` : ""}`);
    results.push({
      protocolId,
      verdict,
      reason,
      exitCode: runResult.exitCode,
      durationMs: runResult.durationMs,
      reportPath: report !== null ? path.join(REPORTS_DIR, `${protocolId}.json`) : null,
    });
  }

  printSummaryTable(results);

  const summary = {
    timestamp: new Date().toISOString(),
    totalProtocols: results.length,
    results,
  };
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log(`\nSweep summary written to ${SUMMARY_PATH}`);

  const hasFailure = results.some((r) => r.verdict === "FAIL" || r.verdict === "error");
  process.exitCode = hasFailure ? 1 : 0;
}

main().catch((err) => {
  console.error("Fatal error in sweep runner:", err);
  process.exit(1);
});
