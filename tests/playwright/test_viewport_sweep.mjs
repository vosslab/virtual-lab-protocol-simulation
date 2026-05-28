import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../");

//============================================
// Configuration
//============================================

// Viewports to test (in addition to default 1920x1080)
const VIEWPORTS = [
  { name: "1200x900", width: 1200, height: 900 },
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

const ARTIFACT_DIR = path.join(REPO_ROOT, "tests/playwright/artifacts");

// Scenes to test (all 6 D4 scenes)
const SCENES_TO_TEST = [
  "bench_basic",
  "bench_basic_row_slot",
  "sample_prep_bench",
  "staining_bench",
  "cell_counter_basic",
  "hood_basic",
];

//============================================
// Utility functions
//============================================

async function rewriteMainTsForScene(sceneName) {
  const mainTsPath = path.join(REPO_ROOT, "src/main.ts");
  const originalContent = fs.readFileSync(mainTsPath, "utf8");

  // Rewrite the hardcoded scene line
  const updatedContent = originalContent.replace(
    /const scene = SCENES\.bench_basic;/,
    `const scene = SCENES.${sceneName};`,
  );

  fs.writeFileSync(mainTsPath, updatedContent, "utf8");
  return originalContent;
}

async function restoreMainTs(originalContent) {
  const mainTsPath = path.join(REPO_ROOT, "src/main.ts");
  fs.writeFileSync(mainTsPath, originalContent, "utf8");
}

async function rebuildDist() {
  return new Promise((resolve, reject) => {
    const buildScript = path.join(REPO_ROOT, "build_github_pages.sh");
    const proc = spawn("bash", [buildScript], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Build timeout"));
    }, 30000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function startLocalServer() {
  return new Promise((resolve, reject) => {
    const serveScript = path.join(REPO_ROOT, "run_web_server.sh");
    const proc = spawn("bash", [serveScript], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let serverUrl = null;
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Server startup timeout"));
    }, 10000);

    proc.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[SERVER] ${line}`);
      const match = line.match(/port (\d+)/);
      if (match && !serverUrl) {
        const port = match[1];
        serverUrl = `http://localhost:${port}`;
        clearTimeout(timeout);
        resolve({ url: serverUrl, process: proc });
      }
    });

    proc.stderr.on("data", (data) => {
      console.log(`[SERVER ERR] ${data}`);
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

//============================================
// Scene render test with viewport sweep
//============================================

async function testSceneAtViewports(sceneName, server, serverUrl) {
  console.log(`\n========== TESTING SCENE: ${sceneName} ==========`);

  const originalMainTs = await rewriteMainTsForScene(sceneName);

  try {
    // Rebuild dist for this scene
    console.log(`Building dist/ for scene ${sceneName}...`);
    await rebuildDist();

    const results = [];

    // Test each viewport
    for (const viewport of VIEWPORTS) {
      console.log(`\n  Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);

      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport });

      try {
        // Navigate
        await page.goto(serverUrl, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);

        // Check if scroll appeared
        const pageSize = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
        }));

        const hasHorizontalScroll = pageSize.documentWidth > pageSize.windowWidth;
        const hasVerticalScroll = pageSize.documentHeight > pageSize.windowHeight;

        // Get scene root info for compression check
        const sceneRootInfo = await page.evaluate(() => {
          const root = document.querySelector("#scene-root");
          if (!root) return null;
          const rect = root.getBoundingClientRect();
          const style = window.getComputedStyle(root);
          return {
            width: rect.width,
            height: rect.height,
            fontSize: style.fontSize,
            transform: style.transform,
          };
        });

        // Take screenshot
        const screenshotName = `${sceneName}_${viewport.name}.png`;
        const screenshotPath = path.join(ARTIFACT_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        // Get file size
        const fileStats = fs.statSync(screenshotPath);
        const fileSizeKb = (fileStats.size / 1024).toFixed(1);

        results.push({
          scene: sceneName,
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          screenshotPath: screenshotPath,
          fileSizeKb,
          hasHorizontalScroll,
          hasVerticalScroll,
          sceneRootInfo,
          status: "OK",
        });

        console.log(`    Screenshot: ${screenshotName} (${fileSizeKb} KB)`);
        console.log(`    Scroll: H=${hasHorizontalScroll}, V=${hasVerticalScroll}`);
        if (sceneRootInfo) {
          console.log(
            `    Scene root: ${sceneRootInfo.width.toFixed(0)}x${sceneRootInfo.height.toFixed(0)}px`,
          );
        }
      } catch (error) {
        console.error(`    ERROR: ${error.message}`);
        results.push({
          scene: sceneName,
          viewport: viewport.name,
          status: "ERROR",
          error: error.message,
        });
      } finally {
        await browser.close();
      }
    }

    return results;
  } finally {
    // Restore original main.ts
    await restoreMainTs(originalMainTs);
  }
}

//============================================
// Generate report
//============================================

function generateMarkdownReport(allResults) {
  let markdown = "";

  markdown += "# M2 Viewport Sweep Report\n\n";
  markdown += "## Scope\n\n";
  markdown +=
    "This report documents viewport sweep testing across 3 viewport sizes for all 6 D4 scenes.\n\n";
  markdown += "**Method (Option B - Browser-only viewport sweep):**\n";
  markdown += "- Pipeline renders at fixed 1920x1080 layout output (percentage coordinates)\n";
  markdown += "- Browser viewport is parameterized to 3 sizes\n";
  markdown += "- Tests CSS scaling and responsive reflow\n";
  markdown += "- Does NOT rebuild layout engine for each viewport\n";
  markdown +=
    "- Rationale: Percentage coordinates make layout responsive by design; faster execution\n\n";

  markdown += "## Viewport Sizes Tested\n\n";
  markdown += "| Viewport | Aspect Ratio | Purpose |\n";
  markdown += "| --- | --- | --- |\n";
  markdown += "| 1200x900 | 4:3-ish | Older displays, smaller screens |\n";
  markdown += "| 1440x1000 | ~14:10 | Mid-range modern displays |\n";
  markdown += "| 1920x1080 | 16:9 | Default; modern widescreen |\n\n";

  markdown += "## Results Table\n\n";
  markdown += "| Scene | Viewport | Size (KB) | H-Scroll | V-Scroll | Status |\n";
  markdown += "| --- | --- | --- | --- | --- | --- |\n";

  for (const result of allResults) {
    if (result.status === "ERROR") {
      markdown += `| ${result.scene} | ${result.viewport} | - | - | - | ERROR: ${result.error} |\n`;
    } else {
      const hScroll = result.hasHorizontalScroll ? "YES" : "NO";
      const vScroll = result.hasVerticalScroll ? "YES" : "NO";
      markdown += `| ${result.scene} | ${result.viewport} | ${result.fileSizeKb} | ${hScroll} | ${vScroll} | OK |\n`;
    }
  }

  markdown += "\n## Observations\n\n";

  // Analyze scroll behavior
  const scenesWithScroll = new Set();
  for (const result of allResults) {
    if (result.status === "OK" && (result.hasHorizontalScroll || result.hasVerticalScroll)) {
      scenesWithScroll.add(result.scene);
    }
  }

  if (scenesWithScroll.size === 0) {
    markdown +=
      "**Scroll behavior:** No scenes triggered horizontal or vertical scroll at any viewport size.\n\n";
  } else {
    markdown +=
      "**Scroll behavior:** The following scenes triggered scroll at smaller viewports:\n";
    for (const scene of scenesWithScroll) {
      const sceneResults = allResults.filter((r) => r.scene === scene && r.status === "OK");
      const scrollViewports = sceneResults
        .filter((r) => r.hasHorizontalScroll || r.hasVerticalScroll)
        .map((r) => r.viewport)
        .join(", ");
      markdown += `- ${scene}: scroll at ${scrollViewports}\n`;
    }
    markdown += "\n";
  }

  // Screenshot file sizes
  const avgSizes = {};
  const sceneGroups = {};
  for (const result of allResults) {
    if (result.status === "OK") {
      if (!sceneGroups[result.scene]) sceneGroups[result.scene] = [];
      sceneGroups[result.scene].push(parseFloat(result.fileSizeKb));
    }
  }

  markdown += "**Screenshot sizes by scene (across all viewports):**\n";
  for (const [scene, sizes] of Object.entries(sceneGroups)) {
    const avg = (sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1);
    const min = Math.min(...sizes).toFixed(1);
    const max = Math.max(...sizes).toFixed(1);
    markdown += `- ${scene}: avg=${avg} KB, range=${min}..${max} KB\n`;
  }
  markdown += "\n";

  markdown += "## Artifacts\n\n";
  markdown += "All 18 screenshots are stored in `tests/playwright/artifacts/`:\n";
  markdown += "- Naming: `<scene>_<viewport>.png`\n";
  markdown += "- Example: `bench_basic_1200x900.png`\n\n";

  markdown += "## Summary\n\n";
  markdown += `- Total scenes tested: ${SCENES_TO_TEST.length}\n`;
  markdown += `- Total viewports: ${VIEWPORTS.length}\n`;
  markdown += `- Total screenshots: ${allResults.filter((r) => r.status === "OK").length}\n`;
  markdown += `- Failed renders: ${allResults.filter((r) => r.status === "ERROR").length}\n`;
  markdown += `- Convergence (no scroll): ${SCENES_TO_TEST.length - scenesWithScroll.size} / ${SCENES_TO_TEST.length} scenes\n\n`;

  markdown += "## Residual Risks\n\n";
  markdown +=
    "- CSS media queries (if any) might behave differently than percentage-based layout\n";
  markdown += "- Very small viewports (< 1200px) not tested; edge cases unknown\n";
  markdown += "- Visual compression (squashing) subjective; not quantified in this sweep\n";
  markdown +=
    "- Layout engine convergence shrink (3 passes) not measured; pipeline still runs at 1920x1080\n\n";

  markdown += "## Next Steps\n\n";
  markdown += "- Review screenshots for any visual anomalies or clipping\n";
  markdown +=
    "- If scroll appears at certain viewports, determine root cause (constraint, zone, or CSS)\n";
  markdown +=
    "- Consider Option (A) if pipeline-level adaptive layout is needed (more complex, slower)\n";

  return markdown;
}

//============================================
// Main
//============================================

async function main() {
  try {
    console.log("========== M2 Viewport Sweep Test ==========");
    console.log(`REPO_ROOT: ${REPO_ROOT}`);
    console.log(`ARTIFACT_DIR: ${ARTIFACT_DIR}`);
    console.log(`Scenes: ${SCENES_TO_TEST.length}`);
    console.log(`Viewports: ${VIEWPORTS.length}`);
    console.log(`Total tests: ${SCENES_TO_TEST.length * VIEWPORTS.length}`);

    // Ensure artifact directory exists
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    // Start server
    console.log("\nStarting local web server...");
    const server = await startLocalServer();
    console.log(`Server running at: ${server.url}`);

    await new Promise((r) => setTimeout(r, 500));

    // Test each scene
    const allResults = [];
    for (const sceneName of SCENES_TO_TEST) {
      try {
        const results = await testSceneAtViewports(sceneName, server, server.url);
        allResults.push(...results);
      } catch (error) {
        console.error(`Error testing scene ${sceneName}:`, error);
        for (const viewport of VIEWPORTS) {
          allResults.push({
            scene: sceneName,
            viewport: viewport.name,
            status: "ERROR",
            error: error.message,
          });
        }
      }
    }

    // Generate report
    console.log("\n========== Generating Report ==========");
    const reportMarkdown = generateMarkdownReport(allResults);
    const reportPath = path.join(REPO_ROOT, "docs/active_plans/reports/m2_viewport_sweep.md");

    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, reportMarkdown, "utf8");
    console.log(`Report saved: ${reportPath}`);

    // Summary
    console.log("\n========== FINAL SUMMARY ==========");
    const okResults = allResults.filter((r) => r.status === "OK");
    const errorResults = allResults.filter((r) => r.status === "ERROR");
    console.log(`Total results: ${allResults.length}`);
    console.log(`  OK: ${okResults.length}`);
    console.log(`  ERROR: ${errorResults.length}`);

    // List all artifacts
    console.log("\nArtifacts generated:");
    for (const result of okResults) {
      if (result.screenshotPath) {
        const basename = path.basename(result.screenshotPath);
        console.log(`  ${basename} (${result.fileSizeKb} KB)`);
      }
    }

    // Kill server
    if (server && server.process) {
      server.process.kill();
    }

    console.log("\nViewport sweep complete.");
    process.exit(okResults.length === 18 ? 0 : 1);
  } catch (error) {
    console.error("Test error:", error);
    process.exit(1);
  }
}

main();
