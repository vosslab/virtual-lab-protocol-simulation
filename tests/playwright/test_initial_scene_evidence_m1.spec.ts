// test_initial_scene_evidence_m1.spec.ts
//
// Converted from the library-model tests/playwright/test_initial_scene_evidence_m1.mjs
// (that .mjs stays in place this phase; a later cleanup phase removes it).
//
// WP-EVID-1 -- M1 initial-scene evidence (strict mode).
//
// Demonstrates that three nominated protocols (one per cluster: cell_culture,
// sdspage, runners) load their correct initial scene with at least one
// [data-item-id] element visible in #scene-root. Direct dist HTML load; the
// launcher click-path is confirmed available (informational) but direct load
// is used for all three to keep the test deterministic.
//
// Evidence set (from docs/active_plans/audits/blank_scene_gap_report.md M0):
//   - cell_culture : passage_hood_detachment (2 items, microscope scene)
//   - sdspage      : sdspage_heat_denature_samples (3 items, heat-block scene)
//   - runners      : cell_culture_full (sequence_runner -> passage_hood_detachment)
//
// Placeholder-mode note:
//   Placeholder render contract is covered by the unit test
//   tests/test_render_item_missing_svg.mjs. End-to-end placeholder rendering
//   requires the fixture object (test_missing_svg_target) to be in
//   OBJECT_LIBRARY. gen_object_library.py only scans content/objects/, not
//   tests/content/dev_smoke/, so the fixture placement is orphaned and zero
//   items appear in final[]. Tracked as follow-up: wire dev_smoke objects
//   into OBJECT_LIBRARY so the full render path can be exercised end-to-end.
//
// Served over HTTP by the playwright.config.ts webServer block (build +
// serve dist/). No per-file server, no chromium import, no process.exit.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

interface StrictEvidenceProtocol {
  name: string;
  cluster: string;
  minItems: number;
}

const STRICT_EVIDENCE_PROTOCOLS: StrictEvidenceProtocol[] = [
  { name: "passage_hood_detachment", cluster: "cell_culture", minItems: 1 },
  { name: "sdspage_heat_denature_samples", cluster: "sdspage", minItems: 1 },
  // Sequence runner delegates to passage_hood_detachment; same scene.
  { name: "cell_culture_full", cluster: "runners", minItems: 1 },
];

// Checks whether the launcher lists the given protocol (informational only;
// the strict-mode assertions below always load the protocol page directly).
async function launcherHasProtocol(page: Page, protocolName: string): Promise<boolean> {
  await page.goto("/index.html", { waitUntil: "networkidle" });
  await expect(page.locator("[data-launcher-root]")).toBeAttached({ timeout: 5000 });
  const count = await page.locator(`[data-protocol-id="${protocolName}"]`).count();
  return count > 0;
}

test.describe("M1 initial-scene evidence (strict mode)", () => {
  for (const proto of STRICT_EVIDENCE_PROTOCOLS) {
    test(`${proto.name} (cluster=${proto.cluster}) renders its initial scene`, async ({ page }) => {
      const launcherPathAvailable = await launcherHasProtocol(page, proto.name);

      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(`/${proto.name}.html`, { waitUntil: "networkidle" });

      await expect(page.locator("#scene-root [data-item-id]").first()).toBeVisible({
        timeout: 5000,
      });

      const itemCount = await page.locator("#scene-root [data-item-id]").count();
      expect(
        itemCount,
        `launcher_path_available=${launcherPathAvailable}; page_errors=${pageErrors.join(" | ")}`,
      ).toBeGreaterThanOrEqual(proto.minItems);

      await page.screenshot({
        path: `test-results/m1_strict_${proto.cluster}_${proto.name}.png`,
        fullPage: false,
      });
    });
  }
});
