// tests/playwright/test_decoration_noninteractive.spec.ts
//
// Browser evidence for M6 "Enforce capabilities in renderer and candidate
// enumeration". Proves that a decoration_only scene object is NOT a click
// target while a clickable object beside it IS, through the production
// mountScene path only (no internal API calls, no game-state mutation).
//
// Converted from the library-model tests/playwright/test_decoration_noninteractive.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the
// set).
//
// KNOWN REAL DEFECT (not a conversion bug): the dev_smoke fixture this spec
// depends on, tests/content/dev_smoke/decoration_noninteractive_check/, does
// not exist in this checkout (confirmed: no protocol.yaml under that path,
// and generated/protocols.ts carries no decoration_noninteractive_check
// entry). The fixture content was removed or never landed. This spec is
// marked test.fixme so the gap is reported honestly rather than faked as a
// pass or as a misleading conversion failure; the body below is preserved
// verbatim (converted to the runner model) so it runs the moment the fixture
// is restored under content ownership. Report to scene-manager/architect:
// restore tests/content/dev_smoke/decoration_noninteractive_check/protocol.yaml.
//
// What it proves once the fixture exists:
//   - ethanol_bottle renders with data-item-id and is a real click target: a
//     real visible click on it produces an observable state change
//     (gameState.interactionIndex/activeStepId/isComplete advances).
//   - micropipette_tip_box renders with NO data-item-id at all (the renderer
//     never stamps a non-clickable item, per M6).
//   - micropipette_tip_box is excluded from the resolver-accepted candidate
//     set: a synthetic click dispatched directly at its DOM node produces no
//     observable state change.
//
// Launch mechanism (same as test_affordance_evidence.spec.ts): this is a
// dev_smoke protocol, intentionally excluded from the student launcher, so
// build_github_pages.sh emits no dist/decoration_noninteractive_check.html.
// The protocol host resolves the active protocol from ?protocol=<name>
// (src/protocol_host.tsx resolve_protocol_name), so the fixture is loaded
// through the production mountScene path by appending
// ?protocol=decoration_noninteractive_check to a built protocol-host page.

import { test, expect, type Page } from "@playwright/test";

//============================================
// Constants
//============================================

// A built protocol-host page exists for this curriculum protocol; reuse it as
// the host shell and override the protocol via ?protocol=<dev_smoke_name>.
const HOST_PAGE = "drug_dilution_setup.html";

const FIXTURE_PROTOCOL = "decoration_noninteractive_check";
const CLICKABLE_TARGET = "ethanol_bottle";
const DECORATION_TARGET = "micropipette_tip_box";

const ITEM_WAIT_MS = 4000;

//============================================
// Progress-signal read helper
//============================================

interface ProgressSignals {
  interactionIndex: number;
  activeStepId: string | null;
  isComplete: boolean;
}

// Read the FROZEN read-only walker surface fields this check watches for
// observable progress (see docs/specs/WALKTHROUGH_GUIDE.md).
async function readProgressSignals(page: Page): Promise<ProgressSignals> {
  return page.evaluate((): ProgressSignals => {
    const gs = window.gameState;
    if (gs === undefined) {
      throw new Error("window.gameState is not exposed on this page");
    }
    return {
      interactionIndex: gs.interactionIndex,
      activeStepId: gs.activeStepId,
      isComplete: gs.isComplete,
    };
  });
}

function progressChanged(before: ProgressSignals, after: ProgressSignals): boolean {
  return (
    before.interactionIndex !== after.interactionIndex ||
    before.activeStepId !== after.activeStepId ||
    before.isComplete !== after.isComplete
  );
}

// Load the fixture protocol into the host page and wait for scene items to
// render. Real scene objects always carry data-object-name (regardless of
// clickability), so the wait selector must not rely on [data-item-id]
// existing at all -- that is exactly the property under test.
async function loadFixture(page: Page): Promise<void> {
  await page.goto(`/${HOST_PAGE}?protocol=${FIXTURE_PROTOCOL}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#scene-root [data-object-name]", { timeout: ITEM_WAIT_MS });
}

//============================================
// Test (fixme: fixture content missing, see header)
//============================================

test.fixme("decoration_only object is excluded from click targets beside a clickable object", async ({
  page,
}) => {
  await loadFixture(page);

  // -- Structural evidence: the decoration object carries no data-item-id at
  //    all, while the clickable object does.
  const clickableSel = `#scene-root [data-object-name="${CLICKABLE_TARGET}"]`;
  const decorationSel = `#scene-root [data-object-name="${DECORATION_TARGET}"]`;

  await expect(
    page.locator(clickableSel),
    `${CLICKABLE_TARGET} is present exactly once`,
  ).toHaveCount(1);
  await expect(
    page.locator(decorationSel),
    `${DECORATION_TARGET} is present exactly once`,
  ).toHaveCount(1);

  const clickableItemId = await page.locator(clickableSel).first().getAttribute("data-item-id");
  expect(clickableItemId, `${CLICKABLE_TARGET} carries data-item-id`).toBe(CLICKABLE_TARGET);

  const decorationItemId = await page.locator(decorationSel).first().getAttribute("data-item-id");
  expect(decorationItemId, `${DECORATION_TARGET} carries no data-item-id`).toBeNull();

  // -- Behavioral evidence: a real click on the decoration object produces
  //    no observable progress (the click_resolver's closest("[data-item-id]")
  //    never matches it, and enumerate_candidate_targets never listed it).
  // Proving a negative (nothing happens) has no readiness signal to poll
  // for, so a bounded fixed wait is the correct tool here, not a pitfall:
  // there is no forward-progress event to wait on.
  const beforeDecorationClick = await readProgressSignals(page);
  await page.locator(decorationSel).first().click();
  await page.waitForTimeout(500);
  const afterDecorationClick = await readProgressSignals(page);
  expect(
    progressChanged(beforeDecorationClick, afterDecorationClick),
    `clicking ${DECORATION_TARGET} produces no observable progress`,
  ).toBe(false);

  // -- Positive control: the clickable object beside it DOES advance the
  //    step on a real click, proving the fixture and click plumbing are both
  //    live (a false negative on the decoration check would otherwise be
  //    indistinguishable from "nothing on this page is clickable").
  const beforeClickableClick = await readProgressSignals(page);
  await page.locator(clickableSel).first().click();
  await expect
    .poll(async () => {
      const after = await readProgressSignals(page);
      return progressChanged(beforeClickableClick, after) || after.isComplete;
    })
    .toBe(true);
});
