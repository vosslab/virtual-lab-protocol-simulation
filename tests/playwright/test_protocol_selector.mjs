// Smoke test for the protocol selector landing page.

import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:8123/";

//============================================

function getBaseUrl() {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

//============================================

async function main() {
  const baseUrl = getBaseUrl();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto(baseUrl, { waitUntil: "networkidle" });

    const title = await page.locator("h1").textContent();
    const cardCount = await page.locator(".protocol-card").count();

    if (title !== "Virtual Lab Protocols") {
      throw new Error(`unexpected launcher title: ${title}`);
    }

    if (cardCount === 0) {
      throw new Error("protocol selector rendered zero cards");
    }

    const firstHref = await page.locator(".protocol-card").first().getAttribute("href");
    if (!firstHref) {
      throw new Error("first protocol card has no href");
    }

    const selectedUrl = new URL(firstHref, baseUrl).toString();
    await page.goto(selectedUrl, { waitUntil: "networkidle" });

    const toolbarCount = await page.locator(".scene-toolbar__title").count();
    const unavailableCount = await page.locator(".scene-unavailable").count();
    const placementCount = await page.locator("#active-scene [data-placement-name]").count();

    if (toolbarCount !== 1) {
      throw new Error("selected protocol did not render a toolbar");
    }

    if (unavailableCount !== 1 && placementCount === 0) {
      throw new Error("selected protocol rendered neither a scene nor unavailable state");
    }

    const result = {
      title,
      cardCount,
      firstHref,
      unavailableCount,
      placementCount,
    };
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

//============================================

main();
