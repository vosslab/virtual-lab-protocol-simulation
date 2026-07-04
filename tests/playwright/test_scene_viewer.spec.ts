// test_scene_viewer.spec.ts
//
// Converted from the library-model tests/playwright/test_scene_viewer.mjs
// (that .mjs stays in place this phase; a later cleanup phase removes it).
//
// WS-M1-B smoke: scene_viewer.html loads any named scene and sets the ready
// marker; a bogus scene name shows the error banner.
//
// Two sub-tests:
//   1. Known scene (hood_basic): data-viewer-ready="true" is set on
//      #scene-root AND at least one [data-placement-name] is rendered.
//   2. Bogus scene (?scene=__bogus__): data-viewer-ready="true" is set AND a
//      visible error banner is present (contains "unknown scene").
//
// Served over HTTP by the playwright.config.ts webServer block (build +
// serve dist/). No per-file server, no chromium import, no process.exit.
//
// Selector contract:
//   - #scene-root[data-viewer-ready]   src/scene_runtime/renderer/scene_viewer entry
//   - [data-placement-name]            src/scene_runtime/renderer/scene_item.tsx

import { test, expect } from "@playwright/test";

const KNOWN_SCENE = "hood_basic";
const BOGUS_SCENE = "__bogus_scene_xyz__";

test.describe("scene_viewer.html", () => {
  test(`known scene "${KNOWN_SCENE}" sets ready marker and renders placements`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`/scene_viewer.html?scene=${KNOWN_SCENE}`, { waitUntil: "networkidle" });

    await expect(page.locator("#scene-root[data-viewer-ready='true']")).toBeAttached();

    const placements = page.locator("[data-placement-name]");
    await expect(placements.first()).toBeVisible();
    expect(await placements.count()).toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: `test-results/scene_viewer/known_scene_${KNOWN_SCENE}.png`,
      fullPage: false,
    });

    expect(pageErrors).toEqual([]);
  });

  test(`bogus scene "${BOGUS_SCENE}" sets ready marker and shows an error banner`, async ({
    page,
  }) => {
    // The bogus-scene path is a handled, non-throw path: no page errors are
    // expected here either.
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`/scene_viewer.html?scene=${BOGUS_SCENE}`, { waitUntil: "networkidle" });

    await expect(page.locator("#scene-root[data-viewer-ready='true']")).toBeAttached();

    const bannerText = await page.locator("#scene-root").innerText();
    expect(bannerText.toLowerCase()).toContain("unknown scene");

    await page.screenshot({ path: "test-results/scene_viewer/bogus_scene.png", fullPage: false });

    expect(pageErrors).toEqual([]);
  });
});
