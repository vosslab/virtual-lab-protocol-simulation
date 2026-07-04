// tests/playwright/test_type_input_feedback.spec.ts
//
// WP-UX-2 (Patch 6) focused check: visible type-input commit feedback.
//
// Converted from the library-model tests/playwright/test_type_input_feedback.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the
// set).
//
// Drives the type_check dev_smoke protocol through the visible UI, submits an
// invalid commit (wrong value), and asserts that a visible rejection message
// appears via the TypeInput component's [data-type-reject-message] affordance.
// No ARIA, no validator-derived reasons, no verbatim copy coupling.
//
// CONVERSION FIX (not a behavior change): the source .mjs navigated directly
// to dist/type_check.html, but type_check is a dev_smoke protocol excluded
// from the student launcher's per-protocol HTML build (confirmed:
// build_github_pages.sh emits no dist/type_check.html; PROTOCOLS_INDEX
// excludes dev_smoke). This spec uses the same ?protocol= host-page override
// mechanism already established by test_affordance_evidence.spec.ts
// (src/protocol_host.tsx resolve_protocol_name) so the fixture actually
// loads. The source .mjs also drove a welcome-screen click that no longer
// exists in this runtime (confirmed: no "welcome" affordance anywhere under
// src/); that dead step is dropped here, matching current behavior where the
// type-input affordance renders immediately since type_check's entry step
// gesture is `type`.
//
// PRIMARY_SPEC.md walker rule: advances only via real visible affordances.
// The type input + commit button are real visible affordances. No internal
// state writes.

import { test, expect } from "@playwright/test";

// A built protocol-host page exists for this curriculum protocol; reuse it as
// the host shell and override the protocol via ?protocol=type_check.
const HOST_PAGE = "drug_dilution_setup.html";
const PROTOCOL = "type_check";
// The wrong value that should trigger a rejected commit (correct is 42).
const WRONG_VALUE = "99";

test("type input: an invalid commit shows a visible rejection message", async ({ page }) => {
  await page.goto(`/${HOST_PAGE}?protocol=${PROTOCOL}`, { waitUntil: "networkidle" });

  await page.screenshot({ path: "test-results/type_input_feedback/00_scene_loaded.png" });

  // Wait for the visible type-input affordance to appear. type_check's entry
  // step has gesture=type, so it renders on load with no prior click.
  const input = page.locator("[data-type-input]").first();
  await expect(input).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: "test-results/type_input_feedback/01_type_input_visible.png" });

  // Fill the input with a wrong value.
  await input.fill(WRONG_VALUE);

  await page.screenshot({ path: "test-results/type_input_feedback/02_wrong_value_entered.png" });

  // Click the commit button (the visible affordance).
  await page.locator("[data-type-commit]").first().click();

  // Assert the visible rejection message is present and visible in the DOM.
  // The visibility assertion is the behavioral contract; verbatim copy text
  // is not asserted so the test does not break when wording is edited.
  const rejectMessage = page.locator("[data-type-reject-message]");
  await expect(rejectMessage).toBeVisible();

  await page.screenshot({ path: "test-results/type_input_feedback/03_after_rejected_commit.png" });
});
