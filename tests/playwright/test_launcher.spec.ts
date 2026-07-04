// test_launcher.spec.ts
//
// Converted from the library-model tests/playwright/test_launcher.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the set).
//
// M4 WP-4-1 launcher test. Loads dist/index.html (served by the
// playwright.config.ts webServer block; no per-file server, no chromium
// import, no process.exit) and asserts:
//   - Every entry in PROTOCOLS_INDEX (from generated/protocols.ts)
//     renders as a card with [data-protocol-id].
//   - No dev_smoke entries appear in the launcher.
//   - Clicking the mtt_reagent_prep entry navigates to
//     mtt_reagent_prep.html and both #scene-root and #shell-root
//     render on that page.
//
// Drives the visible UI only (per PRIMARY_CONTRACT.md item 4). Does not
// import src/ or read window.gameState.
//
// Selector contract (cite source file:line so a UI change surfaces the coupling):
//   - [data-launcher-root]        src/launcher/Launcher.tsx
//   - [data-protocol-id] cards    src/launcher/Launcher.tsx
//   - #scene-root, #shell-root    src/protocol_host_template.html:47,65

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "./repo_root.mjs";

interface ProtocolIndexEntry {
  protocol_name: string;
  protocol_type: string;
}

//============================================
// Extract expected protocol_name list + dev_smoke filter check
//============================================

function loadExpectedIndex(): ProtocolIndexEntry[] {
  // Read generated/protocols.ts and pull the PROTOCOLS_INDEX entries.
  const file = path.join(REPO_ROOT, "generated/protocols.ts");
  const src = fs.readFileSync(file, "utf8");
  // Locate the PROTOCOLS_INDEX literal. The file ends with `] as const;` so we
  // slice from `PROTOCOLS_INDEX` to the next closing `]`.
  const startIdx = src.indexOf("PROTOCOLS_INDEX");
  if (startIdx < 0) {
    throw new Error("PROTOCOLS_INDEX not found in generated/protocols.ts");
  }
  const bracketStart = src.indexOf("[", startIdx);
  const bracketEnd = src.indexOf("\n] as const", bracketStart);
  if (bracketStart < 0 || bracketEnd < 0) {
    throw new Error("PROTOCOLS_INDEX shape unexpected in generated/protocols.ts");
  }
  const blob = src.slice(bracketStart, bracketEnd + 1);
  const names: ProtocolIndexEntry[] = [];
  const re = /protocol_name:\s*["']([^"']+)["'][^}]*protocol_type:\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    names.push({ protocol_name: m[1]!, protocol_type: m[2]! });
  }
  if (names.length === 0) {
    throw new Error("PROTOCOLS_INDEX parsed zero entries");
  }
  return names;
}

test("launcher renders every non-dev_smoke protocol and navigates to one", async ({ page }) => {
  const expected = loadExpectedIndex();
  for (const entry of expected) {
    expect(
      entry.protocol_type,
      `PROTOCOLS_INDEX contains dev_smoke entry ${entry.protocol_name}; gen_protocols.py should exclude them`,
    ).not.toBe("dev_smoke");
  }
  const expectedNames = expected.map((e) => e.protocol_name);

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`console.error: ${msg.text()}`);
    }
  });

  await page.goto("/index.html", { waitUntil: "networkidle" });
  await expect(page.locator("[data-launcher-root]")).toBeAttached();

  // Collect every rendered protocol id.
  const rendered = await page
    .locator("[data-protocol-id]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-protocol-id")));

  // Every expected protocol must render.
  for (const name of expectedNames) {
    expect(rendered, `Launcher missing [data-protocol-id=${name}]`).toContain(name);
  }

  // No dev_smoke ids should appear at all, and no unknown ids either. (This
  // stays a hard lookup against the parsed index, not a suffix sniff, to
  // keep the test honest.)
  for (const id of rendered) {
    const match = expected.find((e) => e.protocol_name === id);
    expect(
      match,
      `Launcher rendered unknown id ${String(id)} (not in PROTOCOLS_INDEX)`,
    ).toBeDefined();
    expect(match?.protocol_type, `Launcher rendered dev_smoke id ${String(id)}`).not.toBe(
      "dev_smoke",
    );
  }

  await page.screenshot({ path: "test-results/test_launcher_00_index.png" });

  // Click the mtt_reagent_prep entry and confirm navigation.
  const link = page.locator('[data-protocol-id="mtt_reagent_prep"]');
  await expect(link).toHaveCount(1);
  await Promise.all([page.waitForLoadState("networkidle"), link.click()]);

  await expect(page).toHaveURL(/\/mtt_reagent_prep\.html$/);

  // Confirm both mount roots exist and the scene rendered at least one item.
  await expect(page.locator("#scene-root")).toBeAttached();
  await expect(page.locator("#shell-root")).toBeAttached();
  const sceneItems = page.locator("#scene-root [data-item-id]");
  await expect(sceneItems.first()).toBeVisible();

  await page.screenshot({ path: "test-results/test_launcher_01_mtt_reagent_prep.png" });

  const errors = [...pageErrors, ...consoleErrors];
  expect(errors, `Page errors: ${errors.join(" | ")}`).toEqual([]);
});
