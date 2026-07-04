// test_protocol_host.spec.ts
//
// Converted from the library-model tests/playwright/test_protocol_host.mjs
// (that .mjs stays in place this phase; the batch migration reconciles the set).
// The runner owns pass/fail signaling (expect) for this file; the browser and
// static server stay self-managed because this spec proves the standalone
// protocol-host bundle in isolation from the shared config webServer's dist/.
//
// WP-3-8 test for src/protocol_host_entry.tsx (the production bundle entry;
// see pipeline/build_main_bundle.mjs: src/protocol_host_entry.tsx -> dist/protocol_host.js).
//
// Builds a one-off esbuild bundle for the host entry with esbuild-plugin-solid
// (matching pipeline/build_main_bundle.mjs's transform), serves it over HTTP
// from a temp directory (PLAYWRIGHT_TEST_STYLE.md: built output over HTTP, not
// file://), and asserts:
//   - #scene-root and #shell-root both exist after mount.
//   - [data-hud-step] is present and non-empty after step_machine.start().
//   - [data-item-id] elements exist inside #scene-root (scene rendered).
//   - ?shell=off variant leaves #shell-root empty.
//
// Conversion fix: the prior .mjs called bare `npx esbuild` (no Solid JSX
// transform) for this file's own harness build, which always failed and
// permanently SKIPped (process.exit(0)) rather than exercising the host. This
// conversion builds with the esbuild JS API + esbuild-plugin-solid (the same
// transform pipeline/build_main_bundle.mjs uses for this exact entry) so the
// test actually runs. It also fixes the harness's own output-filename
// mismatch (wrote main.js, but src/protocol_host_template.html loads
// ./protocol_host.js) that the permanent SKIP had been masking.
//
// Pilot protocol: mtt_reagent_prep. If its entry scene is not yet present
// in SCENES, the test falls back to a protocol whose entry scene is
// resolvable (the resolver throws a clear error otherwise).

import { test, expect } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { chromium } from "playwright";
import * as esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Pick a pilot protocol whose entry scene resolves.
//============================================

// Reads generated/protocols.ts text to find a protocol whose entry step has a
// SceneChange whose to_scene exists in generated/scenes.ts.
function pickPilotProtocol(): string {
  const protocolsSrc = fs.readFileSync(path.join(REPO_ROOT, "generated/protocols.ts"), "utf8");
  const scenesSrc = fs.readFileSync(path.join(REPO_ROOT, "generated/scenes.ts"), "utf8");

  function sceneInIndex(sceneName: string): boolean {
    // Heuristic: look for "'<name>':" or "<name>:" as a SCENES key.
    return (
      scenesSrc.includes(`'${sceneName}':`) ||
      scenesSrc.includes(`"${sceneName}":`) ||
      scenesSrc.includes(`\t${sceneName}: {`)
    );
  }

  function firstSceneChangeToScene(protocolName: string): string | null {
    // Find the protocol object literal start and the first to_scene token
    // that appears before the next protocol key.
    const keyPattern = new RegExp(`(?:^|\\s)${protocolName}:\\s*\\{`, "m");
    const m = keyPattern.exec(protocolsSrc);
    if (!m) {
      return null;
    }
    const start = m.index + m[0].length;
    const slice = protocolsSrc.slice(start, start + 20000);
    const sc = /to_scene:\s*"([^"]+)"/.exec(slice);
    return sc ? sc[1]! : null;
  }

  const candidates = ["mtt_reagent_prep", "passage_hood_detachment", "trypan_blue_counting"];
  for (const name of candidates) {
    const toScene = firstSceneChangeToScene(name);
    if (toScene && sceneInIndex(toScene)) {
      return name;
    }
  }
  // Last resort: return mtt_reagent_prep and let the host throw a clear
  // error visible in the test output.
  return "mtt_reagent_prep";
}

//============================================
// Build the host bundle + host page into a temp directory.
//============================================

interface HostBundle {
  outDir: string;
  protocolName: string;
}

async function buildHostBundle(outDir: string): Promise<HostBundle> {
  fs.mkdirSync(outDir, { recursive: true });

  // Generators are expected to have already run via npm run check (or any
  // other prebuild path). The test does not re-run them so a pre-existing
  // content issue elsewhere does not mask the host wiring.
  const protocolsTs = path.join(REPO_ROOT, "generated/protocols.ts");
  if (!fs.existsSync(protocolsTs)) {
    throw new Error("generated/protocols.ts missing; run npm run check first");
  }

  // Entry matches pipeline/build_main_bundle.mjs's protocol-host target
  // exactly, and the output filename matches what
  // src/protocol_host_template.html loads (./protocol_host.js).
  const entry = path.join(REPO_ROOT, "src/protocol_host_entry.tsx");
  const outJs = path.join(outDir, "protocol_host.js");
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    target: "es2020",
    platform: "browser",
    sourcemap: true,
    outfile: outJs,
    plugins: [solidPlugin()],
    logLevel: "silent",
  });
  if (result.errors.length > 0) {
    throw new Error(`esbuild failed to bundle ${entry}: ${JSON.stringify(result.errors)}`);
  }

  const protocolName = pickPilotProtocol();

  const htmlTemplate = fs.readFileSync(
    path.join(REPO_ROOT, "src/protocol_host_template.html"),
    "utf8",
  );
  const htmlRendered = htmlTemplate.split("{{PROTOCOL_NAME}}").join(protocolName);
  fs.writeFileSync(path.join(outDir, "index.html"), htmlRendered);

  // Copy stylesheet so the wrapper does not 404.
  const cssSrc = path.join(REPO_ROOT, "src/style.css");
  if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, path.join(outDir, "style.css"));
  } else {
    fs.writeFileSync(path.join(outDir, "style.css"), "");
  }

  return { outDir, protocolName };
}

//============================================
// Serve the temp directory over HTTP.
//============================================

interface ServerHandle {
  server: http.Server;
  base: string;
}

function startServer(rootDir: string): Promise<ServerHandle> {
  const mime: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".map": "application/json",
  };

  const server = http.createServer((req, res) => {
    const urlPath = (req.url ?? "/").split("?")[0] ?? "/";
    const norm = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.join(rootDir, norm);
    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`Not found: ${norm}`);
        return;
      }
      res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

//============================================
// Tests
//============================================

test.describe("protocol host bundle", () => {
  let outDir: string;
  let protocolName: string;
  let serverHandle: ServerHandle;
  let browser: Browser;
  let page: Page;
  const pageErrors: string[] = [];

  test.beforeAll(async () => {
    outDir = fs.mkdtempSync(path.join(REPO_ROOT, "test-results", "protocol_host_smoke_"));
    ({ protocolName } = await buildHostBundle(outDir));
    serverHandle = await startServer(outDir);
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (err) => pageErrors.push(err.message));
  });

  test.afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => serverHandle.server.close(() => resolve()));
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  test("mounts #scene-root and #shell-root with a rendered HUD step and scene items", async () => {
    await page.goto(serverHandle.base, { waitUntil: "load" });

    await expect(page.locator("#scene-root")).toHaveCount(1);
    await expect(page.locator("#shell-root")).toHaveCount(1);

    // HUD step region must be present and non-empty after start().
    const hudStep = page.locator("[data-hud-step]").first();
    await expect(hudStep).not.toHaveText("");

    // Scene must have rendered at least one [data-item-id] element.
    const sceneItems = page.locator("#scene-root [data-item-id]");
    await expect(sceneItems.first()).toBeVisible();

    console.log(`Using protocol: ${protocolName}`);
    await page.screenshot({ path: "test-results/test_protocol_host_00_mounted.png" });
  });

  test("shell=off leaves #shell-root empty", async () => {
    await page.goto(`${serverHandle.base}/?shell=off`, { waitUntil: "load" });
    await expect(page.locator("#shell-root")).toBeEmpty();

    expect(pageErrors, `Page errors during smoke: ${pageErrors.join("; ")}`).toEqual([]);
  });
});
