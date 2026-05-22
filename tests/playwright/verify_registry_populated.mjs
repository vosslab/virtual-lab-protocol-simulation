import { chromium } from "playwright";
import path from "path";

const gamePath = path.resolve("cell_culture_game.html");
const url = `file://${gamePath}`;

console.log("Loading page:", url);

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(url);
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const registry = window.__CAPABILITY_REGISTRY;
    const keys = Object.keys(registry || {});
    return {
      exists: Boolean(registry),
      keys: keys,
      hasItemWorkspace: "itemWorkspace" in (registry || {}),
      itemWorkspaceId: registry?.itemWorkspace?.id || null,
    };
  });

  console.log("\nCapability Registry Check:");
  console.log("  Registry exists:", result.exists);
  console.log("  Keys:", result.keys);
  console.log("  Has itemWorkspace:", result.hasItemWorkspace);
  if (result.itemWorkspaceId) {
    console.log("  itemWorkspace id:", result.itemWorkspaceId);
    console.log(
      "\n✓ SUCCESS: itemWorkspace capability is registered and populated!",
    );
    process.exit(0);
  } else {
    console.log("\n✗ FAILED: itemWorkspace capability not found in registry");
    process.exit(1);
  }
} catch (err) {
  console.error("Error:", err);
  process.exit(1);
} finally {
  await browser.close();
}
