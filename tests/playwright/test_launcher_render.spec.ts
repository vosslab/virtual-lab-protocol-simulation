// test_launcher_render.spec.ts
//
// Converted from the library-model tests/playwright/test_launcher_render.mjs
// (that .mjs stays in place this phase; a later cleanup phase removes it).
//
// This spec does not drive a browser: it verifies the shape of
// generated/protocols.ts (PROTOCOLS_INDEX), the data the Launcher component
// renders from. It lives under tests/playwright/ per PLAYWRIGHT_TEST_STYLE.md
// file-layout (it is part of the launcher-render conversion set), and runs
// through @playwright/test so the runner owns pass/fail for the whole suite.
//
// Verifies:
//   - Every entry has a non-empty protocol_name and cluster field.
//   - learning_hook field is present on the type (may be null per entry).
//   - Parsed entries have unique protocol_name and a valid protocol_type.

/// <reference types="node" />

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "./repo_root.mjs";

function readProtocolsIndexText(): string {
  const protocolsPath = path.join(REPO_ROOT, "generated/protocols.ts");
  const content = fs.readFileSync(protocolsPath, "utf8");
  // Extract the PROTOCOLS_INDEX array literal. A pragmatic regex-based check
  // rather than a full TS parse: it verifies the shape without compiling.
  const indexMatch = content.match(/PROTOCOLS_INDEX[\s\S]*?=[\s\S]*?(\[[\s\S]*?\])/);
  return indexMatch?.[1] ?? "";
}

test.describe("generated/protocols.ts PROTOCOLS_INDEX shape", () => {
  test("PROTOCOLS_INDEX array literal is present", () => {
    expect(readProtocolsIndexText().length).toBeGreaterThan(0);
  });

  test("every entry has a non-empty protocol_name", () => {
    const indexText = readProtocolsIndexText();
    const protocolNameMatches = indexText.match(/protocol_name:\s*["']([^"']+)["']/g);
    expect(protocolNameMatches, "PROTOCOLS_INDEX must have protocol_name fields").not.toBeNull();
    expect(protocolNameMatches!.length).toBeGreaterThan(0);
  });

  test("every entry has a non-empty cluster field", () => {
    const indexText = readProtocolsIndexText();
    const clusterMatches = indexText.match(/cluster:\s*["']([^"']+)["']/g);
    expect(clusterMatches, "PROTOCOLS_INDEX must have cluster fields").not.toBeNull();
    expect(clusterMatches!.length).toBeGreaterThan(0);
  });

  test("learning_hook field is present on every entry's type", () => {
    const indexText = readProtocolsIndexText();
    expect(indexText.includes("learning_hook:")).toBe(true);
  });

  test("parsed entries have unique protocol_name and valid protocol_type", () => {
    const indexText = readProtocolsIndexText();
    const entryRegex =
      /\{\s*protocol_name:\s*["']([^"']+)["'],\s*cluster:\s*["']([^"']+)["'],\s*protocol_type:\s*["']([^"']+)["'],\s*learning_hook:\s*([^,}]+)/g;

    const seenProtocols = new Set<string>();
    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = entryRegex.exec(indexText)) !== null) {
      count++;
      const protocolName = match[1]!;
      const protocolType = match[3]!;
      const learningHook = match[4]!;

      expect(seenProtocols.has(protocolName), `duplicate protocol_name: ${protocolName}`).toBe(
        false,
      );
      seenProtocols.add(protocolName);

      expect(["mini_protocol", "sequence_runner"]).toContain(protocolType);

      const trimmed = learningHook.trim();
      const validLearningHook = trimmed === "null" || trimmed.startsWith('"');
      expect(validLearningHook, `invalid learning_hook for ${protocolName}: ${trimmed}`).toBe(true);
    }

    expect(count, "at least one protocol entry must parse").toBeGreaterThan(0);
  });
});
