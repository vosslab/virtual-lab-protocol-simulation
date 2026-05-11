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

	const reviewUrl = BASE_URL ?? `http://${HOST}:${PORT}/`;
	await page.goto(reviewUrl, { waitUntil: 'networkidle' });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'desktop.png'),
		fullPage: true,
	});

	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload({ waitUntil: 'networkidle' });
	await page.screenshot({
		path: path.join(ARTIFACTS_DIR, 'mobile.png'),
		fullPage: true,
	});

	const title = await page.title();
	const bodyText = await page.locator('body').innerText();

	await browser.close();
	if (server !== null) {
		await closeServer(server);
	}

	const report = {
		url: reviewUrl,
		title,
		screenshots: [
			'artifacts/ui-review/desktop.png',
			'artifacts/ui-review/mobile.png',
		],
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
