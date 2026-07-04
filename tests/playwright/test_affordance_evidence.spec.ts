// tests/playwright/test_affordance_evidence.spec.ts
//
// Browser evidence for the derived interaction affordance. This is the
// contract item-4 acceptance test for the affordance feature.
//
// Converted from the library-model tests/playwright/test_affordance_evidence.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the
// set). The runner owns the shared server and pass/fail; this spec asserts
// only what a student sees through the production mountScene path (no
// internal API calls, no game-state mutation -- it loads the page normally
// and merely READS the DOM and computed styles for assertions):
//
//   SELECT step (dev/test protocol select_check, two bottles):
//     - the count of [data-affordance="candidate"] elements equals the count
//       of clickable scene objects present (>= 2);
//     - both pbs_bottle (correct) and ethanol_bottle (wrong) carry
//       data-affordance="candidate";
//     - neither carries data-affordance="active" (no answer reveal);
//     - their computed ring (outline) is identical, so a student cannot tell
//       the correct bottle from the wrong one by the ring;
//     - the ring is STATIC (computed animation-name is "none"), and persists
//       through hover and keyboard focus.
//
//   CLICK step (curriculum protocol drug_dilution_setup, entry gesture click
//   on micropipette):
//     - exactly one [data-affordance="active"] element;
//     - zero [data-affordance="candidate"] elements.
//
// Launch mechanism: select_check is a dev_smoke protocol, intentionally
// excluded from the student launcher, so build_github_pages.sh emits no
// dist/select_check.html. The protocol host resolves the active protocol
// from ?protocol=<name> (which wins over the per-page inlined
// window.__PROTOCOL_NAME__; see src/protocol_host.tsx resolve_protocol_name).
// So select_check is loaded through the production mountScene path by
// appending ?protocol=select_check to a built protocol-host page.
// drug_dilution_setup is loaded directly via its own emitted
// dist/drug_dilution_setup.html.
//
// Selector contract (cite source file:line so a UI change surfaces the
// coupling):
//   - #scene-root [data-item-id]              src/protocol_host_template.html:47
//   - #scene-root [data-object-name]          the semantic protocol target
//                                              name (stable across placement
//                                              renames); src/scene_runtime/
//                                              renderer/scene_item.tsx:628
//   - [data-affordance]                       src/style.css (candidate/active rings)

import { test, expect, type Page } from "@playwright/test";

//============================================
// Constants
//============================================

// A built protocol-host page exists for this curriculum protocol; we reuse it
// as the host shell and override the protocol via ?protocol=select_check.
const HOST_PAGE = "drug_dilution_setup.html";

// The dev/test select protocol: two bottles, one correct (pbs), one wrong.
const SELECT_PROTOCOL = "select_check";
const SELECT_BOTTLES = ["pbs_bottle", "ethanol_bottle"] as const;

// A click-gesture protocol: entry step prepare_carb_parent_stock clicks the
// micropipette. Its own dist HTML inlines window.__PROTOCOL_NAME__.
const CLICK_PROTOCOL = "drug_dilution_setup";
const CLICK_ACTIVE_TARGET = "micropipette";

// Computed-style tokens the CSS ring rules in src/style.css produce.
//   active:    outline: 3px solid #f5a623  -> rgb(245, 166, 35)
//   candidate: outline: 3px dashed #2563eb -> rgb(37, 99, 235)
const EXPECTED_CANDIDATE_OUTLINE_COLOR = "rgb(37, 99, 235)";
const EXPECTED_CANDIDATE_OUTLINE_STYLE = "dashed";

const ITEM_WAIT_MS = 4000;

//============================================
// Outline read helper
//============================================

interface OutlineSnapshot {
  outline: string;
  outlineColor: string;
  outlineStyle: string;
  outlineWidth: string;
  animationName: string;
}

// Read the computed outline triple (width/style/color) of a single element.
async function readOutline(page: Page, selector: string): Promise<OutlineSnapshot> {
  return page
    .locator(selector)
    .first()
    .evaluate((el): OutlineSnapshot => {
      const cs = getComputedStyle(el);
      return {
        outline: cs.outline,
        outlineColor: cs.outlineColor,
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        animationName: cs.animationName,
      };
    });
}

// Load a protocol into the host page (via ?protocol= override) and wait for
// scene items to render before returning.
async function loadProtocol(page: Page, protocolName: string): Promise<void> {
  await page.goto(`/${HOST_PAGE}?protocol=${protocolName}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#scene-root [data-item-id]", { timeout: ITEM_WAIT_MS });
}

//============================================
// SELECT-step evidence (the most important acceptance test)
//============================================

test("affordance: select step rings both candidates identically, no reveal", async ({ page }) => {
  await loadProtocol(page, SELECT_PROTOCOL);

  await page.screenshot({ path: "test-results/affordance/select_00_before.png" });

  // Count clickable scene objects present and candidate-ringed objects.
  const clickableCount = await page.locator("#scene-root [data-item-id]").count();
  const candidateCount = await page.locator('#scene-root [data-affordance="candidate"]').count();
  const activeCount = await page.locator('#scene-root [data-affordance="active"]').count();

  expect(clickableCount, "at least 2 clickable scene objects present").toBeGreaterThanOrEqual(2);
  // Design assumption: select_check contains only candidate scene objects, so
  // every clickable [data-item-id] element is a candidate. If a non-candidate
  // fixture object is ever added to this scene, this equality becomes
  // `>= 2` plus per-object affordance checks.
  expect(candidateCount, "candidate-ring count equals clickable-object count").toBe(clickableCount);
  expect(activeCount, "zero active rings on a select step (no answer reveal)").toBe(0);

  // Both named bottles carry the candidate affordance and neither is active.
  const outlines: Record<string, OutlineSnapshot> = {};
  for (const bottle of SELECT_BOTTLES) {
    // Select by the semantic data-object-name (the protocol target name),
    // not by data-item-id: data-item-id carries the placement_name, which is
    // a scene-layout implementation detail that can differ from the object
    // name (see src/scene_runtime/renderer/scene_item.tsx).
    const sel = `#scene-root [data-object-name="${bottle}"]`;
    await expect(page.locator(sel), `${bottle} is present exactly once`).toHaveCount(1);
    const affordance = await page.locator(sel).first().getAttribute("data-affordance");
    expect(affordance, `${bottle} has data-affordance="candidate"`).toBe("candidate");
    outlines[bottle] = await readOutline(page, sel);
  }

  // The correct and wrong bottle must look identical: same computed ring.
  const first = SELECT_BOTTLES[0];
  const second = SELECT_BOTTLES[1];
  const a = outlines[first];
  const b = outlines[second];
  if (a === undefined || b === undefined) {
    throw new Error("outline snapshot missing for a candidate bottle");
  }
  expect(
    { color: a.outlineColor, style: a.outlineStyle, width: a.outlineWidth },
    `${first} and ${second} have identical rings`,
  ).toEqual({ color: b.outlineColor, style: b.outlineStyle, width: b.outlineWidth });

  // The candidate ring is the expected dashed-blue token.
  expect(a.outlineColor, "candidate ring color is the dashed-blue token").toBe(
    EXPECTED_CANDIDATE_OUTLINE_COLOR,
  );
  expect(a.outlineStyle, "candidate ring style is dashed").toBe(EXPECTED_CANDIDATE_OUTLINE_STYLE);

  // STATIC: no animation drives the ring (computed animation-name is "none").
  expect(a.animationName, `${first} ring is static (no animation)`).toBe("none");
  expect(b.animationName, `${second} ring is static (no animation)`).toBe("none");

  // Re-read the live computed style (no state mutation, no internal API
  // call): the candidate ring is unchanged, proving the affordance is stable,
  // not motion-driven. Mouse moves to a neutral corner first so the baseline
  // :hover outline does not transiently mask the candidate ring in the
  // measurement.
  await page.mouse.move(2, 2);
  const firstSel = `#scene-root [data-object-name="${first}"]`;
  await expect
    .poll(async () => (await readOutline(page, firstSel)).outlineColor)
    .toBe(EXPECTED_CANDIDATE_OUTLINE_COLOR);

  // Hover-persistence: the candidate ring MUST persist while hovered. This is
  // the direct browser proof that the affordance selectors
  // ([data-item-id][data-affordance="..."]) out-specify the baseline
  // [data-item-id]:hover rule.
  await page.locator(firstSel).hover();
  const hoverOutline = await readOutline(page, firstSel);
  expect(hoverOutline.outlineColor, "candidate ring persists while hovered").toBe(
    EXPECTED_CANDIDATE_OUTLINE_COLOR,
  );
  expect(hoverOutline.outlineStyle, "candidate ring style persists while hovered").toBe(
    EXPECTED_CANDIDATE_OUTLINE_STYLE,
  );

  // Focus-persistence: the candidate ring MUST persist while keyboard-focused.
  // Move the mouse off first so the hovered state does not interfere.
  await page.mouse.move(2, 2);
  await page.locator(firstSel).focus();
  const focusOutline = await readOutline(page, firstSel);
  expect(focusOutline.outlineColor, "candidate ring persists while focused").toBe(
    EXPECTED_CANDIDATE_OUTLINE_COLOR,
  );
  expect(focusOutline.outlineStyle, "candidate ring style persists while focused").toBe(
    EXPECTED_CANDIDATE_OUTLINE_STYLE,
  );

  await page.mouse.move(2, 2);
  await page.screenshot({ path: "test-results/affordance/select_01_after.png" });
});

//============================================
// CLICK-step evidence (one active ring, no candidates)
//============================================

test("affordance: click step rings exactly one active target, no candidates", async ({ page }) => {
  await loadProtocol(page, CLICK_PROTOCOL);

  await page.screenshot({ path: "test-results/affordance/click_00_before.png" });

  const activeCount = await page.locator('#scene-root [data-affordance="active"]').count();
  const candidateCount = await page.locator('#scene-root [data-affordance="candidate"]').count();

  expect(activeCount, "exactly one active ring on a click step").toBe(1);
  expect(candidateCount, "zero candidate rings on a click step").toBe(0);

  // The single active ring is on the directed target and is the solid-orange
  // token, distinct from the candidate dashed-blue token. Compare by the
  // semantic data-object-name (the protocol target name), not data-item-id,
  // which carries the placement_name (a scene-layout detail).
  const activeTargetObjectName = await page
    .locator('#scene-root [data-affordance="active"]')
    .first()
    .getAttribute("data-object-name");
  expect(activeTargetObjectName, "active ring is on the directed target").toBe(CLICK_ACTIVE_TARGET);

  const style = await readOutline(page, '#scene-root [data-affordance="active"]');
  expect(style.outlineStyle, "active ring is solid").toBe("solid");
  expect(style.animationName, "active ring is static (no animation)").toBe("none");

  await page.screenshot({ path: "test-results/affordance/click_01_after.png" });
});
