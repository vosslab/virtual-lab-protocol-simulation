// tests/playwright/test_interaction_attrs.spec.ts
//
// Interaction attributes audit for M2b renderer output. Verifies that
// bench_basic render emits the frozen data-* attributes: data-placement-name,
// data-object-name, data-zone, data-kind, data-depth.
//
// Converted from the library-model tests/playwright/test_interaction_attrs.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the
// set). Served by the playwright.config.ts webServer block (build + serve
// dist/).
//
// Selector contract:
//   - #scene-root [data-placement-name] items  src/protocol_host_template.html,
//                                               src/scene_runtime/renderer

import { test, expect } from "@playwright/test";

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

test("interaction attrs: bench_basic placements carry the frozen data-* contract", async ({
  page,
}) => {
  // The interaction-attr audit targets a scene-bearing page. dist/index.html
  // is the launcher (no #scene-root); the per-protocol HTML pages host the
  // scene. bench_basic is the canonical render fixture this audit was written
  // for.
  await page.goto("/bench_basic.html");

  // Wait for scene root to exist. Use state:"attached" (not the default
  // "visible"): the scene-root panel can be reported non-visible in headless
  // layout even though it is in the DOM and its item children render. The
  // audit reads data-* attributes off attached nodes, not visible geometry.
  await page.waitForSelector("#scene-root", { timeout: 5000, state: "attached" });

  // Wait for at least one placement to render before enumerating.
  const items = page.locator("#scene-root [data-placement-name]");
  await expect.poll(async () => items.count(), { timeout: 5000 }).toBeGreaterThan(0);

  const elements = await items.all();
  expect(elements.length, "at least one item rendered with data-placement-name").toBeGreaterThan(0);

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el === undefined) {
      continue;
    }
    const placementName = await el.getAttribute("data-placement-name");
    const objectName = await el.getAttribute("data-object-name");
    const zone = await el.getAttribute("data-zone");
    const kind = await el.getAttribute("data-kind");
    const depth = await el.getAttribute("data-depth");
    const itemLabel = placementName ?? `item[${i}]`;

    const placementNameNonEmpty = placementName !== null && placementName.trim() !== "";
    const objectNameNonEmpty = objectName !== null && objectName.trim() !== "";
    const zoneNonEmpty = zone !== null && zone.trim() !== "";
    const kindValid = kind !== null && VALID_KINDS.has(kind);

    expect.soft(placementNameNonEmpty, `${itemLabel}: data-placement-name is non-empty`).toBe(true);
    expect.soft(objectNameNonEmpty, `${itemLabel}: data-object-name is non-empty`).toBe(true);
    expect.soft(zoneNonEmpty, `${itemLabel}: data-zone is non-empty`).toBe(true);
    expect
      .soft(kindValid, `${itemLabel}: data-kind '${kind ?? "(missing)"}' is a valid enum member`)
      .toBe(true);

    // data-depth is a conditional attribute in the frozen DOM contract: both
    // the imperative render_item.ts and the Solid scene_item.tsx emit it only
    // for items that carry a depth tier, and the frozen baseline records
    // bench_basic items with NO data-depth. Absence is a pass; a present
    // value must still be a valid enum member.
    if (depth !== null) {
      expect
        .soft(VALID_DEPTHS.has(depth), `${itemLabel}: data-depth '${depth}' is a valid enum member`)
        .toBe(true);
    }
  }
});
