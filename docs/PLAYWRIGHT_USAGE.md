# Playwright usage

How to use Playwright for browser automation and visual testing in this repo.

## Install

Playwright is a dev dependency. If the repo does not already have a
`package.json`, create one first. Then install Playwright and its browsers:

```bash
npm init -y
npm install --save-dev playwright
npx playwright install
```

`npm init -y` creates a default `package.json` at the repo root. `npm install
--save-dev playwright` gets the `playwright` Node library and records it under
`devDependencies`. `npx playwright install` downloads browser binaries
(Chromium, Firefox, WebKit). If `package.json` already exists, skip
`npm init -y` and just run `npm install` (to pick up existing deps) followed
by `npx playwright install`.

## Key rule: scripts must run from the project root

Node resolves `import 'playwright'` by searching `node_modules/` starting from the
script's own directory and walking up. A script in `/tmp/` will not find the project's
`node_modules/`.

**Wrong:**

```bash
node /tmp/_test_game_ui.mjs
# Error: Cannot find module 'playwright'
```

**Right:**

```bash
cd /Users/vosslab/nsh/cell-culture-game-claude
node tests/e2e/test_game_ui.mjs
```

## Script location

Browser-driven Playwright tests live in `tests/e2e/`, a dedicated subdirectory:

- `tests/e2e/` contains Playwright tests that need a real browser (`*.mjs` files).
- `tests/` contains pure-function unit/regression tests (`test_*.py` for pytest, and non-browser `.mjs` files like protocol graph validation).

This separation ensures:
- Pytest collects only Python files from `tests/` (no `.mjs` files in the unit tier).
- Playwright tests in `tests/e2e/` run independently with `node tests/e2e/test_*.mjs`.
- `tests/e2e/` can grow to support multiple test runners (Cypress, Puppeteer, etc.) without name collisions.

## Packages

| Package | Purpose |
| --- | --- |
| `playwright` | Library/API for browser automation (what we use) |
| `@playwright/test` | Test runner with fixtures, assertions, reporters |
| `playwright-core` | Low-level core without bundled browsers (rarely needed) |

For "open a local HTML file, click things, take screenshots", use `playwright`.

## Script template

```javascript
import { chromium } from 'playwright';
import path from 'path';

const gamePath = path.resolve('cell_culture_game.html');
const url = `file://${gamePath}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(url);
await page.waitForTimeout(500);

// Interact with the page
await page.click('#welcome-start-btn');
await page.waitForTimeout(300);

// Screenshot
await page.screenshot({ path: 'test-results/screenshot.png' });

// Measure element positions
const box = await page.locator('#my-element').boundingBox();
console.log('Position:', box);

await browser.close();
```

Run with:

```bash
node tests/e2e/my_test.mjs
```

## Common patterns

### Click a hood item

Hood items use `data-item-id`:

```javascript
await page.click('[data-item-id="ethanol_bottle"]');
```

### Wait for animations

Use `waitForTimeout` after actions that trigger animations:

```javascript
await page.click('[data-item-id="flask"]');
await page.waitForTimeout(2500);  // aspiration takes ~2s
```

### Check element alignment

Use `boundingBox()` to compare positions of overlapping elements:

```javascript
const svgRect = await page.locator('#microscope-svg rect[fill="#e8f5e9"]').first().boundingBox();
const button = await page.locator('.quadrant-btn').first().boundingBox();
const dx = Math.abs(svgRect.x - button.x);
const dy = Math.abs(svgRect.y - button.y);
console.log(`Offset: dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
```

### Evaluate JavaScript in the page

```javascript
const result = await page.evaluate(() => {
    return document.querySelectorAll('.quadrant-btn').length;
});
console.log('Button count:', result);
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Cannot find module 'playwright'` | Run the script from the project root, not `/tmp/` |
| `browserType.launch: Executable doesn't exist` | Run `npx playwright install` |
| `npx playwright` works but `node script.mjs` fails | Different issue: npx resolves packages differently than Node require |
| Timeout clicking an element | Check the selector; use `data-item-id` not `data-item` for hood items |

## Verify install

```bash
npm ls playwright
```

Should show `playwright@x.x.x` under the project.

## File conventions

- Put browser-driven Playwright scripts in `tests/e2e/` with `.mjs` extension (e.g., `tests/e2e/test_game_ui.mjs`).
- Put pure-function tests (no browser) in `tests/` (pytest `.py` files and non-browser `.mjs` files).
- Use `.mjs` extension for ES module scripts.
- Put screenshots in `test-results/` (gitignored).
- Call `ensureGameBuilt(repoRoot)` at the start of each test to bootstrap the HTML if missing.
