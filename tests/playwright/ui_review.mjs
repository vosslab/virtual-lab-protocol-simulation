import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './repo_root.mjs';

const DIST_DIR = path.join(REPO_ROOT, 'dist');
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'artifacts', 'ui-review');
const PORT = 4173;
const HOST = '127.0.0.1';
const BASE_URL = process.env.BASE_URL || null;
const REVIEW_PROTOCOL = process.env.REVIEW_PROTOCOL || 'cell_culture';
const PLATE_REVIEW_PROTOCOL = process.env.PLATE_REVIEW_PROTOCOL || 'tutorial_plate_drug_additions';

const CONTENT_TYPES = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
};

function getContentType(filePath) {
	const ext = path.extname(filePath);
	return CONTENT_TYPES[ext] || 'application/octet-stream';
}

async function serveFile(res, filePath) {
	const body = await readFile(filePath);
	res.writeHead(200, { 'content-type': getContentType(filePath) });
	res.end(body);
}

function createStaticServer() {
	return createServer(async (req, res) => {
		const rawUrl = req.url || '/';
		const url = new URL(rawUrl, `http://${HOST}:${PORT}`);
		const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;
		const filePath = path.normalize(path.join(DIST_DIR, urlPath));
		const distPrefix = DIST_DIR + path.sep;

		if (!filePath.startsWith(distPrefix)) {
			res.writeHead(403);
			res.end('Forbidden');
			return;
		}

		try {
			await serveFile(res, filePath);
		} catch {
			await serveFile(res, path.join(DIST_DIR, 'index.html'));
		}
	});
}

async function listen(server) {
	await new Promise((resolve) => {
		server.listen(PORT, HOST, resolve);
	});
}

async function closeServer(server) {
	await new Promise((resolve, reject) => {
		server.close((err) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}

async function main() {
	if (BASE_URL === null && !existsSync(DIST_DIR)) {
		throw new Error('dist/ does not exist. Run npm run build first.');
	}

	await mkdir(ARTIFACTS_DIR, { recursive: true });

	const problems = [];
	const server = BASE_URL === null ? createStaticServer() : null;
	if (server !== null) {
		await listen(server);
	}

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({
		viewport: { width: 1440, height: 1000 },
		deviceScaleFactor: 1,
	});

	page.on('console', (msg) => {
		if (msg.type() === 'error' || msg.type() === 'warning') {
			problems.push(`console ${msg.type()}: ${msg.text()}`);
		}
	});
	page.on('pageerror', (err) => {
		problems.push(`page error: ${err.message}`);
	});

	const rootUrl = BASE_URL ?? `http://${HOST}:${PORT}/`;
	const screenshots = [];

	await page.goto(rootUrl, { waitUntil: 'networkidle' });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'launcher-desktop.png'),
		fullPage: true,
	});
	screenshots.push('artifacts/ui-review/launcher-desktop.png');

	const protocolUrl = new URL(rootUrl);
	protocolUrl.searchParams.set('protocol', REVIEW_PROTOCOL);

	await page.goto(protocolUrl.toString(), { waitUntil: 'networkidle' });
	const startButton = page.locator('#welcome-start-btn');
	if (await startButton.count() > 0) {
		await startButton.click();
	}
	await page.waitForSelector('#hood-scene svg', { timeout: 5000 });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'hood-desktop.png'),
		fullPage: true,
	});
	screenshots.push('artifacts/ui-review/hood-desktop.png');

	const plateTutorialUrl = new URL(rootUrl);
	plateTutorialUrl.searchParams.set('protocol', PLATE_REVIEW_PROTOCOL);
	await page.goto(plateTutorialUrl.toString(), { waitUntil: 'networkidle' });
	const plateStartButton = page.locator('#welcome-start-btn');
	if (await plateStartButton.count() > 0) {
		await plateStartButton.click();
	}
	await page.waitForSelector('[data-item-id="well_plate"]', { timeout: 5000 });
	await page.locator('[data-item-id="well_plate"]').click();
	// Intro step is kind: modal — render.ts injects the SVG into #plate-overlay.modal-content, not the workspace container.
	await page.waitForSelector('#plate-overlay.active .plate-workspace-svg', { timeout: 5000 });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'plate-tutorial-intro-desktop.png'),
		fullPage: true,
	});
	screenshots.push('artifacts/ui-review/plate-tutorial-intro-desktop.png');

	await page.locator('#confirm-plate-intro').click();
	await page.waitForSelector('#well-plate-workspace-scene', { timeout: 5000 });
	await page.waitForFunction(() => {
		const overlay = document.querySelector('#plate-overlay');
		return overlay !== null && !overlay.classList.contains('active');
	}, { timeout: 5000 });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'plate-tutorial-workspace-desktop.png'),
		fullPage: true,
	});
	screenshots.push('artifacts/ui-review/plate-tutorial-workspace-desktop.png');

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(protocolUrl.toString(), { waitUntil: 'networkidle' });
	const mobileStartButton = page.locator('#welcome-start-btn');
	if (await mobileStartButton.count() > 0) {
		await mobileStartButton.click();
	}
	await page.waitForSelector('#hood-scene svg', { timeout: 5000 });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'hood-mobile.png'),
		fullPage: true,
	});
	screenshots.push('artifacts/ui-review/hood-mobile.png');

	const title = await page.title();
	const bodyText = await page.locator('body').innerText();

	await browser.close();
	if (server !== null) {
		await closeServer(server);
	}

	const report = {
		url: rootUrl,
		protocolUrl: protocolUrl.toString(),
		protocol: REVIEW_PROTOCOL,
		plateTutorialProtocol: PLATE_REVIEW_PROTOCOL,
		title,
		screenshots,
		problems,
		bodyPreview: bodyText.slice(0, 1000),
	};
	await writeFile(
		path.join(ARTIFACTS_DIR, 'report.json'),
		JSON.stringify(report, null, 2) + '\n',
	);

	console.log(JSON.stringify(report, null, 2));

	if (problems.length > 0) {
		process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
