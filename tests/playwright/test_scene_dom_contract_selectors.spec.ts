// test_scene_dom_contract_selectors.spec.ts
//
// Converted from the library-model tests/playwright/test_scene_dom_contract_selectors.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the set).
//
// Scene DOM contract selector tests (WS-M1-T). Served over HTTP by the
// playwright.config.ts webServer block (build + serve dist/). No per-file
// server, no chromium import, no process.exit.
//
// Asserts contractual data-* attributes on the current renderer output.
// Tests the CONTRACTUAL selectors (frozen as interface):
//   - data-item-id        (walker-addressable identity; present ONLY when the
//                          object's declared capabilities include "clickable",
//                          per M6 "Enforce capabilities in renderer and
//                          candidate enumeration")
//   - data-object-name    (object YAML name)
//   - data-placement-name (scene placement key)
//   - data-zone           (zone name)
//   - data-kind           (object kind enum)
//   - data-depth          (depth tier enum; conditionally present)
//   - data-asset          (asset registry key)
//   - data-missing-svg    (present only on missing-svg placeholders)
//   - data-label          (present on every label element)
//   - data-label-for      (ties label to placement_name)
//
// INCIDENTAL (not tested here, change freely without breaking contract):
//   - Internal wrapper div nesting depth
//   - CSS class names on item divs
//   - Style properties other than position (left/top/width/height)
//   - z-index values
//   - Internal SVG structure below the top-level <svg> element
//
// This test uses bench_basic as the canonical scene for selector coverage.
// It then spot-checks one protocol scene (hood_workspace) for multi-scene
// coverage.
//
// Click-target behavior: asserts that a [data-item-id] element receives
// synthetic click events dispatched via a page.evaluate MouseEvent, not that a
// protocol step advances (scene operations are stubbed).
//
// Selector contract (cite source file:line so a UI change surfaces the coupling):
//   - [data-placement-name], [data-item-id], [data-object-name], [data-zone],
//     [data-kind], [data-depth], [data-asset], [data-missing-svg]
//     src/scene_runtime/renderer/scene_item.tsx
//   - [data-label], [data-label-for]  src/scene_runtime/renderer/scene_item.tsx
//   - #scene-root[data-viewer-ready]  src/dist_entry.tsx

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

//============================================
// Closed enum sets (contractual)
//============================================

const VALID_KINDS = new Set([
  "bottle",
  "equipment",
  "plate",
  "tube",
  "decoration",
  "pipette",
  "rack",
  "waste",
  "flask",
]);

const VALID_DEPTHS = new Set(["back", "mid", "front"]);

//============================================
// Types
//============================================

interface RenderedItem {
  placementName: string | null;
  objectName: string | null;
  itemId: string | null;
  zone: string | null;
  kind: string | null;
  depth: string | null;
  asset: string | null;
  missingSvg: string | null;
  hasSvg: boolean;
}

interface RenderedLabel {
  labelFor: string | null;
  hasText: boolean;
}

//============================================
// Load a scene via the scene_viewer, relative to the config baseURL.
//============================================

async function loadScene(page: Page, sceneName: string): Promise<void> {
  const url = `/scene_viewer.html?scene=${encodeURIComponent(sceneName)}`;
  await page.goto(url, { waitUntil: "load" });
  await page.locator("#scene-root[data-viewer-ready='true']").waitFor({ state: "attached" });
}

//============================================
// Core selector contract assertions for one scene
//============================================

async function assertSceneSelectorContract(page: Page, sceneName: string): Promise<void> {
  const items: RenderedItem[] = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-placement-name]"));
    return els.map((el) => ({
      placementName: el.getAttribute("data-placement-name"),
      objectName: el.getAttribute("data-object-name"),
      itemId: el.getAttribute("data-item-id"),
      zone: el.getAttribute("data-zone"),
      kind: el.getAttribute("data-kind"),
      depth: el.getAttribute("data-depth"),
      asset: el.getAttribute("data-asset"),
      missingSvg: el.getAttribute("data-missing-svg"),
      hasSvg: el.querySelector("svg") !== null,
    }));
  });

  expect(items.length, `${sceneName}: at least one rendered item`).toBeGreaterThan(0);

  const labels: RenderedLabel[] = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-label]"));
    return els.map((el) => ({
      labelFor: el.getAttribute("data-label-for"),
      hasText: (el.textContent ?? "").trim().length > 0,
    }));
  });

  const placementNameSet = new Set(items.map((item) => item.placementName));

  for (const item of items) {
    const id = item.placementName ?? "(no-placement-name)";

    expect(
      typeof item.placementName === "string" && item.placementName.length > 0,
      `${sceneName}[${id}]: data-placement-name non-empty`,
    ).toBe(true);

    // data-item-id: when present, non-empty (walker-addressable identity).
    // Absent entirely on a non-clickable item (decoration_only capability, or
    // a missing-object placeholder bound with capabilities: []) -- see M6
    // "Enforce capabilities in renderer and candidate enumeration".
    if (item.itemId !== null) {
      expect(
        item.itemId.length,
        `${sceneName}[${id}]: data-item-id non-empty when present`,
      ).toBeGreaterThan(0);
    }

    expect(
      typeof item.objectName === "string" && item.objectName.length > 0,
      `${sceneName}[${id}]: data-object-name non-empty`,
    ).toBe(true);

    expect(
      typeof item.zone === "string" && item.zone.length > 0,
      `${sceneName}[${id}]: data-zone non-empty`,
    ).toBe(true);

    expect(
      typeof item.kind === "string" && VALID_KINDS.has(item.kind),
      `${sceneName}[${id}]: data-kind in closed enum (got "${String(item.kind)}")`,
    ).toBe(true);

    // data-depth: when present, in closed enum.
    if (item.depth !== null) {
      expect(
        VALID_DEPTHS.has(item.depth),
        `${sceneName}[${id}]: data-depth in closed enum when present (got "${item.depth}")`,
      ).toBe(true);
    }

    expect(
      typeof item.asset === "string" && item.asset.length > 0,
      `${sceneName}[${id}]: data-asset non-empty`,
    ).toBe(true);

    // data-missing-svg: only present on placeholder items; normal items
    // (hasSvg === true, missingSvg === null) satisfy the contract.
    if (item.missingSvg !== null) {
      expect(item.missingSvg, `${sceneName}[${id}]: data-missing-svg value when present`).toBe(
        "true",
      );
    }
  }

  expect(labels.length, `${sceneName}: at least one label`).toBeGreaterThan(0);
  for (const label of labels) {
    expect(
      label.labelFor !== null && placementNameSet.has(label.labelFor),
      `${sceneName}: data-label-for="${String(label.labelFor)}" references a known placement`,
    ).toBe(true);
    expect(
      label.hasText,
      `${sceneName}: label[for=${String(label.labelFor)}] has text content`,
    ).toBe(true);
  }
}

//============================================
// Click-target behavior assertions
//============================================

async function assertClickTargetBehavior(page: Page, sceneName: string): Promise<void> {
  const itemIds: string[] = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-item-id]"))
      .map((el) => el.getAttribute("data-item-id"))
      .filter((id): id is string => id !== null && id.length > 0);
  });

  expect(
    itemIds.length,
    `${sceneName}: items with data-item-id present for click tests`,
  ).toBeGreaterThan(0);

  const firstId = itemIds[0]!;
  const clickReceived = await page.evaluate((itemId: string) => {
    const el = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!el) return false;
    let clicked = false;
    const handler = (): void => {
      clicked = true;
    };
    el.addEventListener("click", handler, { once: true });
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return clicked;
  }, firstId);

  expect(clickReceived, `${sceneName}: [data-item-id="${firstId}"] receives click events`).toBe(
    true,
  );
}

//============================================
// Tests
//============================================

test.describe("scene DOM contract selectors", () => {
  test("bench_basic: contractual attribute coverage + click-target behavior", async ({ page }) => {
    // Suppress expected console noise from scene operations stubs.
    page.on("console", () => {});

    await loadScene(page, "bench_basic");
    await assertSceneSelectorContract(page, "bench_basic");
    await assertClickTargetBehavior(page, "bench_basic");
  });

  test("hood_workspace: multi-scene selector coverage", async ({ page }) => {
    page.on("console", () => {});

    await loadScene(page, "hood_workspace");
    await assertSceneSelectorContract(page, "hood_workspace");
  });
});
