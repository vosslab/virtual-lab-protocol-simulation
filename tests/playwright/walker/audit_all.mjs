#!/usr/bin/env node

/**
 * tests/playwright/walker/audit_all.mjs
 *
 * Comprehensive walker audit for all mini_protocols in the repo.
 *
 * Discovers all mini_protocol entries from generated/protocol_data.ts,
 * builds HTML (if needed), runs walker on each, captures results,
 * classifies failures into gap categories, and emits a markdown summary
 * plus machine-readable JSON.
 *
 * Usage:
 *   node tests/playwright/walker/audit_all.mjs
 *
 * Output:
 *   test-results/_walker_audit/audit_report.md (markdown table)
 *   test-results/_walker_audit/audit_report.json (machine-readable)
 *
 * Exit code: 0 if audit completes (regardless of protocol pass/fail), nonzero on fatal error.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { runWalker } from "./engine.mjs";

// Resolve repo root via git
const REPO_ROOT = execSync("git rev-parse --show-toplevel", {
  encoding: "utf8",
}).trim();

//============================================
// Protocol discovery
//============================================

/**
 * Extract all mini_protocol entries from generated/protocol_data.ts
 */
function discoverMiniProtocols() {
  const protocolDataPath = path.join(
    REPO_ROOT,
    "generated",
    "protocol_data.ts",
  );

  if (!fs.existsSync(protocolDataPath)) {
    throw new Error(`protocol_data.ts not found at ${protocolDataPath}`);
  }

  const content = fs.readFileSync(protocolDataPath, "utf8");

  // Parse the TypeScript object literal to extract mini_protocol entries.
  // Pattern: <name>: { protocol_type: 'mini_protocol', ... },
  // We extract all objects where protocol_type === 'mini_protocol'

  const protocols = [];
  const lines = content.split("\n");

  let inCatalog = false;
  let currentProtocolName = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for export const PROTOCOL_CATALOG start
    if (line.includes("export const PROTOCOL_CATALOG")) {
      inCatalog = true;
      continue;
    }

    if (!inCatalog) {
      continue;
    }

    // Look for protocol_name key at top level of catalog
    const nameMatch = line.match(/^\s*(\w+):\s*\{/);
    if (nameMatch) {
      currentProtocolName = nameMatch[1];
      braceDepth = 1;
      continue;
    }

    if (currentProtocolName) {
      // Count braces to find protocol block boundaries
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      // Check if this is a mini_protocol
      if (line.includes("protocol_type:") && line.includes("mini_protocol")) {
        protocols.push(currentProtocolName);
      }

      // End of this protocol block
      if (braceDepth === 0 && currentProtocolName) {
        currentProtocolName = null;
      }
    }
  }

  if (protocols.length === 0) {
    throw new Error("No mini_protocols found in protocol_data.ts");
  }

  return protocols.sort();
}

//============================================
// HTML build
//============================================

/**
 * Build HTML for a protocol if not already present.
 */
function ensureProtocolHTML(protocolName) {
  const htmlPath = path.join(REPO_ROOT, "dist", `${protocolName}.html`);

  if (fs.existsSync(htmlPath)) {
    return; // Already built
  }

  // Run build_protocol_html.py
  try {
    const cmd = `source source_me.sh && python3 pipeline/build_protocol_html.py --protocol ${protocolName}`;
    execSync(cmd, {
      cwd: REPO_ROOT,
      stdio: "pipe",
      shell: "/bin/bash",
    });
  } catch (err) {
    throw new Error(
      `Failed to build HTML for protocol "${protocolName}": ${err.message}`,
    );
  }
}

//============================================
// Gap classification
//============================================

/**
 * Classify a walker error into a gap category.
 * Returns one of: 'pass', 'renderer-gap', 'content-gap', 'orchestrator-gap', 'unknown'
 */
function classifyGap(errorMessage) {
  if (!errorMessage) {
    return "pass";
  }

  const msg = errorMessage.toLowerCase();

  // Renderer gaps: missing DOM affordance, pointer events, layout issues
  if (
    msg.includes("missing dom affordance") ||
    msg.includes("intercepts pointer events") ||
    msg.includes("not found in dom") ||
    msg.includes("selector=")
  ) {
    return "renderer-gap";
  }

  // Orchestrator gaps: step completion, button visibility, flow issues
  if (
    msg.includes("next button not visible") ||
    msg.includes("step completed but") ||
    msg.includes("step validator") ||
    msg.includes("orchestr")
  ) {
    return "orchestrator-gap";
  }

  // Content gaps: materials, missing objects in scenes
  if (
    msg.includes("material") ||
    msg.includes("not found in protocol") ||
    msg.includes("missing placement")
  ) {
    return "content-gap";
  }

  // Generated data gaps
  if (msg.includes("scene") || msg.includes("catalog")) {
    return "generated-data-gap";
  }

  return "unknown";
}

//============================================
// Walker execution
//============================================

/**
 * Run walker on a single protocol.
 * Returns: { success, stepsCompleted, stepsTotal, errorMessage, gapClass, screenshotsDir }
 */
async function walkProtocol(protocolName) {
  try {
    const screenshotDir = path.join(
      REPO_ROOT,
      "test-results",
      `walker_${protocolName}`,
    );

    const result = await runWalker({
      protocolName,
      headless: true,
      verbosity: "quiet",
      screenshotDir,
    });

    const gapClass = classifyGap(result.errorMessage);

    return {
      success: result.success,
      stepsCompleted: result.stepsWalked,
      stepsTotal: result.stepsTotal,
      errorMessage: result.errorMessage || null,
      gapClass,
      screenshotsDir: screenshotDir,
    };
  } catch (err) {
    return {
      success: false,
      stepsCompleted: 0,
      stepsTotal: 0,
      errorMessage: err.message,
      gapClass: classifyGap(err.message),
      screenshotsDir: null,
    };
  }
}

//============================================
// Report generation
//============================================

/**
 * Generate markdown table from audit results.
 */
function generateMarkdownReport(results) {
  const lines = [];
  lines.push("# Walker Audit Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Summary stats
  const totalProtocols = results.length;
  const passCount = results.filter((r) => r.success).length;
  const failCount = totalProtocols - passCount;

  // Count by gap class
  const gapCounts = {};
  for (const r of results) {
    if (!r.success) {
      gapCounts[r.gapClass] = (gapCounts[r.gapClass] || 0) + 1;
    }
  }

  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total protocols:** ${totalProtocols}`);
  lines.push(`- **Passed:** ${passCount}`);
  lines.push(`- **Failed:** ${failCount}`);
  lines.push("");
  lines.push("### Failures by gap class:");
  lines.push("");
  for (const [gapClass, count] of Object.entries(gapCounts).sort()) {
    lines.push(`- **${gapClass}:** ${count}`);
  }
  lines.push("");

  // Results table
  lines.push("## Protocol Results");
  lines.push("");
  lines.push("| Protocol | Status | Steps | Gap Class | Error Message |");
  lines.push("| --- | --- | --- | --- | --- |");

  for (const r of results) {
    const status = r.success ? "✓ PASS" : "✗ FAIL";
    const steps = `${r.stepsCompleted}/${r.stepsTotal}`;
    const gapClass = r.success ? "-" : r.gapClass;
    const errorMsg = r.errorMessage
      ? r.errorMessage.substring(0, 60).replace(/\|/g, "\\|") + "..."
      : "-";
    lines.push(
      `| ${r.protocolName} | ${status} | ${steps} | ${gapClass} | ${errorMsg} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Generate JSON report from audit results.
 */
function generateJSONReport(results) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalProtocols: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
    results,
  };
}

//============================================
// Main
//============================================

async function main() {
  console.log("[INFO] Starting walker audit...");

  // Discover protocols
  console.log("[INFO] Discovering mini_protocols...");
  let protocols;
  try {
    protocols = discoverMiniProtocols();
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  }
  console.log(`[INFO] Found ${protocols.length} mini_protocols`);

  // Build runtime bundle first
  console.log("[INFO] Building runtime bundle...");
  try {
    execSync("bash pipeline/build_runtime_bundle.sh", {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
  } catch (_err) {
    console.error("[ERROR] Failed to build runtime bundle");
    process.exit(1);
  }

  // Run walker on each protocol
  console.log("[INFO] Running walker on each protocol...");
  const results = [];

  for (const protocolName of protocols) {
    console.log(`[INFO] Processing ${protocolName}...`);

    // Build HTML if needed
    try {
      ensureProtocolHTML(protocolName);
    } catch (err) {
      console.warn(`[WARN] ${err.message}`);
      results.push({
        protocolName,
        success: false,
        stepsCompleted: 0,
        stepsTotal: 0,
        errorMessage: `HTML build failed: ${err.message}`,
        gapClass: "unknown",
        screenshotsDir: null,
      });
      continue;
    }

    // Run walker
    const walkerResult = await walkProtocol(protocolName);
    results.push({
      protocolName,
      ...walkerResult,
    });

    const status = walkerResult.success ? "✓" : "✗";
    const steps = `${walkerResult.stepsCompleted}/${walkerResult.stepsTotal}`;
    console.log(
      `[INFO] ${status} ${protocolName}: ${steps} (${walkerResult.gapClass})`,
    );
  }

  // Ensure output directory exists
  const auditDir = path.join(REPO_ROOT, "test-results", "_walker_audit");
  fs.mkdirSync(auditDir, { recursive: true });

  // Write markdown report
  const mdReport = generateMarkdownReport(results);
  const mdPath = path.join(auditDir, "audit_report.md");
  fs.writeFileSync(mdPath, mdReport, "utf8");
  console.log(`[INFO] Markdown report written to ${mdPath}`);

  // Write JSON report
  const jsonReport = generateJSONReport(results);
  const jsonPath = path.join(auditDir, "audit_report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), "utf8");
  console.log(`[INFO] JSON report written to ${jsonPath}`);

  // Print summary
  const passCount = results.filter((r) => r.success).length;
  const failCount = results.length - passCount;
  console.log("");
  console.log("==========================================");
  console.log("AUDIT COMPLETE");
  console.log("==========================================");
  console.log(`Total protocols: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("");

  // Exit with success (audit runs to completion regardless of protocol results)
  process.exit(0);
}

main().catch((err) => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});
