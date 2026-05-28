// tests/playwright/test_launcher.mjs
//
// M4 WP-4-1 launcher Playwright test. Loads dist/index.html (the built
// launcher) and asserts:
//   - Every entry in PROTOCOLS_INDEX (from generated/protocols.ts)
//     renders as a button with [data-protocol-id].
//   - No dev_smoke entries appear in the launcher.
//   - Clicking the mtt_reagent_prep entry navigates to
//     mtt_reagent_prep.html and both #scene-root and #shell-root
//     render on that page.
//
// Drives the visible UI only (per PRIMARY_CONTRACT.md item 4). Does not
// import src/ or read window.gameState.
//
// Usage:
//   PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright \
//     node tests/playwright/test_launcher.mjs

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Static-server helper
//============================================

// Pick an available TCP port. Cross-platform; binds to 0 and reads the
// resulting port back out.
async function pick_free_port() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

// Start `python3 -m http.server <port> --directory dist` and resolve
// once the server is reachable. Returns the child handle.
async function start_server(port, dist_dir) {
  const child = spawn(
    "python3",
    ["-m", "http.server", String(port), "--directory", dist_dir, "--bind", "127.0.0.1"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  // Wait until the port accepts connections (max ~5 seconds).
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const sock = net.createConnection({ host: "127.0.0.1", port }, () => {
        sock.end();
        resolve(true);
      });
      sock.on("error", () => resolve(false));
    });
    if (ready) {
      return child;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`http.server did not come up on port ${port}`);
}

//============================================
// Extract expected protocol_name list + dev_smoke filter check
//============================================

function load_expected_index() {
  // Read generated/protocols.ts and pull the PROTOCOLS_INDEX entries.
  const file = path.join(REPO_ROOT, "generated/protocols.ts");
  const src = fs.readFileSync(file, "utf8");
  // Locate the PROTOCOLS_INDEX literal. The file ends with `] as const;`
  // so we slice from `PROTOCOLS_INDEX` to the next closing `]`.
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
  const names = [];
  const re = /protocol_name:\s*["']([^"']+)["'][^}]*protocol_type:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(blob)) !== null) {
    names.push({ protocol_name: m[1], protocol_type: m[2] });
  }
  if (names.length === 0) {
    throw new Error("PROTOCOLS_INDEX parsed zero entries");
  }
  return names;
}

//============================================
// Main
//============================================

async function main() {
  const dist_dir = path.join(REPO_ROOT, "dist");
  if (!fs.existsSync(path.join(dist_dir, "index.html"))) {
    throw new Error("dist/index.html missing; run `bash build_github_pages.sh` first");
  }

  const expected = load_expected_index();
  for (const entry of expected) {
    if (entry.protocol_type === "dev_smoke") {
      throw new Error(
        `PROTOCOLS_INDEX contains dev_smoke entry ${entry.protocol_name}; gen_protocols.py should exclude them`,
      );
    }
  }
  const expected_names = expected.map((e) => e.protocol_name);

  const port = await pick_free_port();
  const server = await start_server(port, dist_dir);
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });

  try {
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-launcher-root]", { timeout: 5000 });

    // Collect every rendered protocol id.
    const rendered = await page.$$eval("[data-protocol-id]", (els) =>
      els.map((el) => el.getAttribute("data-protocol-id")),
    );

    // Every expected protocol must render.
    for (const name of expected_names) {
      if (!rendered.includes(name)) {
        throw new Error(
          `Launcher missing [data-protocol-id=${name}]; rendered=${rendered.join(",")}`,
        );
      }
    }
    // No dev_smoke ids should appear at all. (Anything with "_check"
    // suffix is a dev_smoke convention; assert by hard list, not by
    // suffix sniff, to keep the test honest.)
    for (const id of rendered) {
      const match = expected.find((e) => e.protocol_name === id);
      if (!match) {
        throw new Error(`Launcher rendered unknown id ${id} (not in PROTOCOLS_INDEX)`);
      }
      if (match.protocol_type === "dev_smoke") {
        throw new Error(`Launcher rendered dev_smoke id ${id}`);
      }
    }

    console.log(`OK: launcher rendered ${rendered.length} entries, 0 dev_smoke`);

    // Click the mtt_reagent_prep entry and confirm navigation.
    const link = page.locator('[data-protocol-id="mtt_reagent_prep"]');
    const link_count = await link.count();
    if (link_count !== 1) {
      throw new Error(`Expected one [data-protocol-id=mtt_reagent_prep]; got ${link_count}`);
    }
    await Promise.all([page.waitForLoadState("networkidle"), link.click()]);

    const url = page.url();
    if (!url.endsWith("/mtt_reagent_prep.html")) {
      throw new Error(`Navigation did not reach mtt_reagent_prep.html; url=${url}`);
    }

    // Confirm both mount roots exist.
    await page.waitForSelector("#scene-root", {
      state: "attached",
      timeout: 5000,
    });
    await page.waitForSelector("#shell-root", {
      state: "attached",
      timeout: 5000,
    });
    // Wait briefly for runtime to mount and render at least one scene item.
    await page.waitForTimeout(1500);
    const item_count = await page.locator("#scene-root [data-item-id]").count();
    console.log(`OK: mtt_reagent_prep.html mounted; #scene-root has ${item_count} items`);
    if (item_count === 0) {
      // The pilot may not render any scene items if its entry scene is
      // not present in generated/scenes.ts. Surface page errors so the
      // gap is visible in the failure message.
      const err_blob = errors.length > 0 ? errors.join(" | ") : "(no page errors captured)";
      throw new Error(
        `After navigation to mtt_reagent_prep.html, #scene-root has no [data-item-id] elements. ` +
          `Likely cause: the protocol's entry scene is not present in generated/scenes.ts. ` +
          `page_errors=${err_blob}`,
      );
    }

    if (errors.length > 0) {
      throw new Error(`Page errors: ${errors.join(" | ")}`);
    }

    console.log("PASS: test_launcher");
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error("FAIL: test_launcher");
  console.error(err);
  process.exit(1);
});
