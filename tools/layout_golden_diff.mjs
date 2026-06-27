// tools/layout_golden_diff.mjs
//
// Regression harness: rebuild layout for all scenes and compare against a reference
// snapshot. Detects every geometry change so future refactors can be validated
// against current engine output.
//
// This tool is READ-ONLY: it never modifies engine code or generated/ artifacts.
//
// Run (requires generated/ to exist -- run bash pipeline/build_generated.sh first):
//   node --import tsx tools/layout_golden_diff.mjs              # compare
//   node --import tsx tools/layout_golden_diff.mjs --refresh    # rebuild snapshot
//
// Exit codes:
//   0: compare mode -- all scenes match snapshot (no geometry changes)
//   1: compare mode -- one or more scenes differ; or refresh completed; or error
//
// Snapshot location: test-results/layout_reference_snapshot.json
//   (gitignored; ephemeral; NEVER committed to version control)
//
// Snapshot structure: { "provenance": { ... }, "<scene_name>": { "final": [...] }, ... }
//   The provenance block records scene_count, generated_layout_hash, timestamp,
//   command, and clean_build_note. Compare mode checks it for staleness but never
//   counts provenance differences as scene changes.
//
// ==========================================================================
// USAGE LIFECYCLE (read before running --refresh)
// ==========================================================================
// The snapshot is an ephemeral, gitignored baseline for refactor sessions.
// It lives under test-results/ (gitignored) and must NEVER be committed.
//
// Typical refactor workflow:
//   1. Start from a clean, reviewed engine state (before any changes).
//   2. Run --refresh to capture the baseline from the current engine.
//   3. Make your refactor changes.
//   4. Run compare mode (no flags) to detect geometry regressions.
//   5. A zero-change result means the refactor is geometry-safe.
//   6. Any CHANGED scene needs review before continuing.
//
// Run --refresh only from a clean starting state.
// Refreshing mid-refactor silently accepts in-flight changes as the new baseline.
// ==========================================================================

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { runPipeline } from "../src/scene_runtime/layout/index.ts";
import { SCENES } from "../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.js";

//============================================
// Constants
//============================================

// Canonical 16:9 viewport -- matches precompute_layout.mjs and scene_scale_report.mjs.
const VIEWPORT = { w: 1920, h: 1080 };

// Snapshot path relative to repo root (gitignored; ephemeral; never committed).
const SNAPSHOT_REL = "test-results/layout_reference_snapshot.json";

//============================================
// Repo root
//============================================

// Resolve the repo root from git so paths do not depend on cwd.
function repoRoot() {
  const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  return top.trim();
}

//============================================
// Run the engine for one scene
//============================================

// Returns the final ComputedItem[] for one scene at the canonical viewport.
// Read-only: does not write any files or generated/ artifacts.
function runScene(scene) {
  const result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
    viewport: VIEWPORT,
  });
  return result.final;
}

//============================================
// Stable serialization
//============================================

// A custom JSON replacer that sorts object keys alphabetically so the serialized
// form is byte-stable regardless of property insertion order.
// The key argument is required by the JSON.stringify replacer signature.
function sortedKeysReplacer(key, value) {
  // Suppress the key arg unused-variable warning -- it is required by the replacer
  // contract but this replacer is key-agnostic and acts only on the value.
  void key;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const sorted = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = value[k];
    }
    return sorted;
  }
  return value;
}

// Sort a ComputedItem[] by placement_name for a stable item order.
function sortItemsByName(items) {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.placement_name < b.placement_name) return -1;
    if (a.placement_name > b.placement_name) return 1;
    return 0;
  });
  return copy;
}

// Return a stable JSON string for a ComputedItem[]. Items are sorted by
// placement_name; object keys are sorted within each item. This produces a
// byte-stable output for identical geometry (the regression-detection contract).
function serializeFinal(items) {
  const sorted = sortItemsByName(items);
  return JSON.stringify(sorted, sortedKeysReplacer, 2);
}

// Serialize the full snapshot data to a stable JSON string (sorted scene keys,
// sorted item keys, sorted placement order). Appends a trailing newline.
function serializeSnapshot(snapshotData) {
  // Sort scene keys so the snapshot file is byte-stable regardless of SCENES order.
  const ordered = {};
  for (const name of Object.keys(snapshotData).sort()) {
    ordered[name] = snapshotData[name];
  }
  return JSON.stringify(ordered, sortedKeysReplacer, 2) + "\n";
}

//============================================
// Layout hash for provenance
//============================================

// Compute a sha256 digest over the stable serialization of the scene geometry map.
// Takes scene-only data (no provenance block) so identical geometry always yields
// an identical hash, regardless of when the snapshot was captured.
function computeLayoutHash(sceneData) {
  const text = serializeSnapshot(sceneData);
  return crypto.createHash("sha256").update(text).digest("hex");
}

//============================================
// Build snapshot data for all scenes
//============================================

// Run the engine for every scene and return a snapshot object keyed by scene name.
// Each entry is { final: ComputedItem[] } sorted by placement_name.
function buildSnapshotData(sceneNames) {
  const snapshot = {};
  for (const name of sceneNames) {
    const finalItems = runScene(SCENES[name]);
    snapshot[name] = { final: sortItemsByName(finalItems) };
  }
  return snapshot;
}

//============================================
// Provenance block
//============================================

// Build the provenance block for a --refresh run. The hash is computed over the
// scene-only data (no provenance) so identical geometry yields an identical hash
// regardless of capture time.
function buildProvenance(sceneNames, sceneData) {
  return {
    scene_count: sceneNames.length,
    generated_layout_hash: computeLayoutHash(sceneData),
    command: "--refresh",
    timestamp: new Date().toISOString(),
    clean_build_note: "Capture only from a clean, reviewed engine state.",
  };
}

//============================================
// Per-scene diff summary
//============================================

// Compare two stable-serialized final[] strings. Returns null when they match,
// or a multi-line summary string describing the differences when they differ.
// curSerial and refSerial are the outputs of serializeFinal().
function diffFinalSerials(curSerial, refSerial) {
  if (curSerial === refSerial) return null;

  // Parse both to build a field-level summary.
  const cur = JSON.parse(curSerial);
  const ref = JSON.parse(refSerial);

  const lines = [];

  if (cur.length !== ref.length) {
    lines.push(`    item count: ${ref.length} -> ${cur.length}`);
  }

  // Index items by placement_name for bilateral comparison.
  const refByName = new Map();
  for (const item of ref) {
    refByName.set(item.placement_name, item);
  }
  const curByName = new Map();
  for (const item of cur) {
    curByName.set(item.placement_name, item);
  }

  // Removed items (in reference, absent from current).
  for (const name of refByName.keys()) {
    if (!curByName.has(name)) {
      lines.push(`    removed: ${name}`);
    }
  }

  // Added items (in current, absent from reference).
  for (const name of curByName.keys()) {
    if (!refByName.has(name)) {
      lines.push(`    added: ${name}`);
    }
  }

  // Changed items: report geometry field (underscore-prefixed) differences.
  for (const [name, refItem] of refByName) {
    const curItem = curByName.get(name);
    if (curItem === undefined) continue;

    const changed = [];
    for (const field of Object.keys(refItem).sort()) {
      // Only report geometry/computed fields (underscore prefix).
      if (!field.startsWith("_")) continue;
      const refVal = JSON.stringify(refItem[field]);
      const curVal = JSON.stringify(curItem[field]);
      if (refVal !== curVal) {
        changed.push(`${field}: ${refVal} -> ${curVal}`);
      }
    }

    if (changed.length === 0) continue;

    lines.push(`    item ${name}:`);
    // Cap at 5 fields per item to keep output readable.
    const shown = changed.slice(0, 5);
    for (const line of shown) {
      lines.push(`      ${line}`);
    }
    if (changed.length > 5) {
      lines.push(`      ... and ${changed.length - 5} more field(s)`);
    }
  }

  return lines.join("\n");
}

//============================================
// Compare mode
//============================================

// Load and parse the reference snapshot. Throws an Error with a clear message
// when the snapshot file is missing.
function loadSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(
      `Snapshot not found: ${snapshotPath}\n` +
        `Capture a baseline first: node --import tsx tools/layout_golden_diff.mjs --refresh\n` +
        `(See the usage lifecycle at the top of this file for the correct workflow.)`,
    );
  }
  const raw = fs.readFileSync(snapshotPath, "utf8");
  return JSON.parse(raw);
}

// Run the compare mode: rebuild layout for all scenes and diff against snapshot.
// Returns the count of changed scenes (0 = all match snapshot).
// Emits staleness warnings to stderr when provenance is present and checks fail.
function runCompare(snapshotPath) {
  const snapshot = loadSnapshot(snapshotPath);
  const sceneNames = Object.keys(SCENES).sort();

  process.stdout.write(
    `layout_golden_diff: checking ${sceneNames.length} scenes` + ` against ${SNAPSHOT_REL}\n\n`,
  );

  // Extract provenance block (absent in snapshots captured before provenance existed).
  const provenance = snapshot.provenance ?? null;

  // Staleness check 1: scene count changed since the snapshot was captured.
  if (
    provenance !== null &&
    provenance.scene_count !== undefined &&
    provenance.scene_count !== sceneNames.length
  ) {
    process.stderr.write(
      `WARNING: scene count changed: ${String(provenance.scene_count)} -> ${String(sceneNames.length)}\n` +
        `  The snapshot may be stale. Consider running --refresh from a clean engine state.\n`,
    );
  }

  let changedCount = 0;
  const COL_SCENE = 52;

  // Collect current scene geometry for the layout hash staleness check below.
  const currentData = {};

  // Compare every scene the index provides.
  for (const name of sceneNames) {
    const curItems = runScene(SCENES[name]);
    const curSerial = serializeFinal(curItems);
    // Store sorted items for the post-loop hash computation.
    currentData[name] = { final: sortItemsByName(curItems) };

    const refEntry = snapshot[name];
    if (refEntry === undefined) {
      // Scene is in the current index but absent from the snapshot.
      process.stdout.write(`  ${name.padEnd(COL_SCENE)} NEW (not in snapshot)\n`);
      changedCount++;
      continue;
    }

    // Re-serialize the reference entry through the same stable path so the
    // comparison is immune to formatting differences in the stored JSON.
    const refSerial = serializeFinal(refEntry.final);
    const summary = diffFinalSerials(curSerial, refSerial);

    if (summary === null) {
      process.stdout.write(`  ${name.padEnd(COL_SCENE)} ok\n`);
    } else {
      process.stdout.write(`  ${name.padEnd(COL_SCENE)} CHANGED\n`);
      process.stdout.write(summary + "\n");
      changedCount++;
    }
  }

  // Report scenes in the snapshot that are no longer in the index.
  // Skip the "provenance" key -- it is not a scene entry.
  for (const name of Object.keys(snapshot).sort()) {
    if (name === "provenance") continue;
    if (SCENES[name] === undefined) {
      process.stdout.write(
        `  ${name.padEnd(COL_SCENE)} REMOVED (in snapshot, not in scene index)\n`,
      );
      changedCount++;
    }
  }

  // Staleness check 2: layout hash mismatch between current engine output and baseline.
  // Recompute the hash from the current engine run and compare to the stored value.
  if (provenance !== null && provenance.generated_layout_hash !== undefined) {
    const currentHash = computeLayoutHash(currentData);
    if (currentHash !== provenance.generated_layout_hash) {
      process.stderr.write(
        `WARNING: baseline may be stale (layout hash mismatch)\n` +
          `  Stored:  ${provenance.generated_layout_hash}\n` +
          `  Current: ${currentHash}\n` +
          `  Consider running --refresh from a clean engine state.\n`,
      );
    }
  }

  process.stdout.write("\n");
  if (changedCount === 0) {
    process.stdout.write(
      `layout_golden_diff: no changes -- all ${sceneNames.length} scenes match snapshot\n`,
    );
  } else {
    process.stdout.write(
      `layout_golden_diff: ${changedCount} of ${sceneNames.length} scenes changed\n`,
    );
  }

  return changedCount;
}

//============================================
// Refresh mode
//============================================

// Rebuild and write the reference snapshot to test-results/layout_reference_snapshot.json.
// Includes a provenance block with scene count, layout hash, timestamp, and a usage note.
// Exits 1 after writing (signals state change on disk; compare mode exits 0 on clean pass).
function runRefresh(snapshotPath) {
  const sceneNames = Object.keys(SCENES).sort();

  process.stdout.write(
    `layout_golden_diff: refreshing snapshot for ${sceneNames.length} scenes...\n`,
  );

  // Build per-scene geometry first; provenance hash covers scene data only (no provenance).
  const sceneData = buildSnapshotData(sceneNames);
  const provenance = buildProvenance(sceneNames, sceneData);

  // Combine provenance + per-scene entries into one snapshot object.
  const combined = { provenance, ...sceneData };
  const text = serializeSnapshot(combined);

  // Ensure test-results/ exists (gitignored; may be absent on a fresh clone).
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, text, "utf8");

  process.stdout.write(`  wrote ${SNAPSHOT_REL}\n`);
  process.stdout.write(
    `  provenance: ${sceneNames.length} scenes, hash ${provenance.generated_layout_hash.slice(0, 16)}...\n\n`,
  );
  process.stdout.write(`layout_golden_diff: snapshot refreshed (${sceneNames.length} scenes)\n`);
  process.stdout.write(
    `NOTE: this baseline is EPHEMERAL and gitignored. Do not commit it.\n` +
      `      Run --refresh only from a clean engine state at the start of a refactor session.\n`,
  );
}

//============================================
// CLI arg parsing
//============================================

// Parse --refresh from process.argv. Returns { refresh: boolean }.
// Exits 1 on unknown arguments.
function parseArgs() {
  const argv = process.argv.slice(2);
  const unknown = argv.filter((a) => a !== "--refresh");
  if (unknown.length > 0) {
    process.stderr.write(`Error: unrecognized arguments: ${unknown.join(" ")}\n`);
    process.stderr.write(
      "Usage:\n" +
        "  node --import tsx tools/layout_golden_diff.mjs\n" +
        "  node --import tsx tools/layout_golden_diff.mjs --refresh\n",
    );
    process.exit(1);
  }
  return { refresh: argv.includes("--refresh") };
}

//============================================
// Main
//============================================

function main() {
  // Resolve repo root so snapshot path is independent of cwd.
  const root = repoRoot();
  const snapshotPath = path.join(root, SNAPSHOT_REL);

  const opts = parseArgs();

  if (opts.refresh) {
    runRefresh(snapshotPath);
    // Exit 1 after refresh: signals "state changed on disk" so CI cannot
    // mistake a refresh run for a clean compare pass.
    process.exit(1);
  } else {
    const changed = runCompare(snapshotPath);
    process.exit(changed === 0 ? 0 : 1);
  }
}

main();
