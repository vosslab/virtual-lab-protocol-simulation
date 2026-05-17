/**
 * tests/playwright/test_base_scene_gallery.mjs
 *
 * Playwright test: render all 9 base scenes and generate a visual gallery index.
 *
 * For each base scene (where extends_base === null or not present):
 * 1. Compile the scene runtime with generated scene data.
 * 2. Create a minimal HTML shell that renders that scene.
 * 3. Capture a screenshot into test-results/_base_scenes_gallery/<scene_name>.png.
 * 4. Log placement count and bbox stats.
 *
 * After all scenes are rendered, generate a static HTML index that embeds
 * all screenshots for human visual review.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { REPO_ROOT } from './repo_root.mjs';

//============================================
// CONSTANTS
//============================================

// The 9 base scenes (no extends_base field in generated/scene_data.ts).
const BASE_SCENE_NAMES = [
	'bench_basic',
	'cell_counter_basic',
	'electrophoresis_bench',
	'heat_block_bench',
	'hood_basic',
	'imaging_bench',
	'microscope_basic',
	'sample_prep_bench',
	'staining_bench',
];

const GALLERY_DIR = path.join(REPO_ROOT, 'test-results', '_base_scenes_gallery');

//============================================
// Helper: Load scene data from generated catalog
//============================================

async function loadSceneData(sceneName) {
	// Import the compiled generated scene data.
	const mod = await import(path.join(REPO_ROOT, 'generated', 'scene_data.ts'));
	const { SCENE_CATALOG } = mod;

	if (!(sceneName in SCENE_CATALOG)) {
		throw new Error(`Scene '${sceneName}' not found in SCENE_CATALOG`);
	}

	const sceneData = SCENE_CATALOG[sceneName];

	// Verify it's a base scene (no extends_base).
	if ('extends_base' in sceneData && sceneData.extends_base !== null) {
		throw new Error(`Scene '${sceneName}' extends base; not a base scene`);
	}

	return sceneData;
}

//============================================
// Helper: Generate minimal HTML shell for a scene
//============================================

function generateHtmlShell(sceneName) {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Base Scene: ${sceneName}</title>
	<style>
		* { box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			margin: 0;
			padding: 20px;
			background-color: #f5f5f5;
		}
		.container {
			max-width: 1200px;
			margin: 0 auto;
			background-color: white;
			border: 1px solid #ddd;
			border-radius: 4px;
			padding: 20px;
		}
		h1 {
			margin: 0 0 10px 0;
			color: #333;
			font-size: 18px;
		}
		.meta {
			color: #666;
			font-size: 12px;
			margin-bottom: 15px;
			font-family: monospace;
		}
		#scene-container {
			width: 900px;
			height: 700px;
			background-color: white;
			border: 2px solid #999;
			margin: 20px 0;
		}
		.stats {
			color: #666;
			font-size: 12px;
			margin-top: 15px;
		}
		.stats pre {
			background-color: #f9f9f9;
			border: 1px solid #eee;
			border-radius: 4px;
			padding: 10px;
			overflow-x: auto;
			margin: 10px 0;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Base Scene Gallery: ${sceneName}</h1>
		<div class="meta">
			<div>Workspace: <span id="workspace-label">loading...</span></div>
			<div>Placements: <span id="placement-count">loading...</span></div>
		</div>
		<div id="scene-container"></div>
		<div class="stats">
			<h2 style="margin-top: 0; margin-bottom: 5px; font-size: 14px;">Placement bounding boxes:</h2>
			<pre id="bbox-stats">Loading...</pre>
		</div>
	</div>
</body>
</html>
`;
}

//============================================
// Helper: Render a single base scene
//============================================

async function renderSingleScene(sceneName, browser) {
	console.log(`\n[${sceneName}] Starting render...`);

	// Load scene data.
	let sceneData;
	try {
		sceneData = await loadSceneData(sceneName);
	} catch (err) {
		console.error(`[${sceneName}] Failed to load scene data: ${err.message}`);
		throw err;
	}

	// Create gallery directory if needed.
	fs.mkdirSync(GALLERY_DIR, { recursive: true });

	// Write HTML shell.
	const htmlPath = path.join(GALLERY_DIR, `${sceneName}_temp.html`);
	const htmlContent = generateHtmlShell(sceneName);
	fs.writeFileSync(htmlPath, htmlContent);

	// Create page and load HTML.
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
	const fileUrl = `file://${htmlPath}`;
	await page.goto(fileUrl);

	// Render the scene into the container.
	console.log(`[${sceneName}] Rendering scene...`);
	const renderResult = await page.evaluate(async (scene) => {
		// Update the metadata display.
		document.getElementById('workspace-label').textContent = scene.workspace;
		document.getElementById('placement-count').textContent = scene.placements.length;

		const container = document.getElementById('scene-container');
		if (!container) throw new Error('Container not found');

		// Create SVG with resolved scene geometry.
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const bounds = scene.scene_bounds;
		svg.setAttribute('viewBox', `${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`);
		svg.setAttribute('width', '100%');
		svg.setAttribute('height', '100%');
		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		svg.style.border = '1px solid #999';

		// Background rect.
		const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		bgRect.setAttribute('x', String(bounds.left));
		bgRect.setAttribute('y', String(bounds.top));
		bgRect.setAttribute('width', String(bounds.right - bounds.left));
		bgRect.setAttribute('height', String(bounds.bottom - bounds.top));
		bgRect.setAttribute('fill', '#fafafa');
		bgRect.setAttribute('stroke', 'none');
		svg.appendChild(bgRect);

		// Render each placement.
		const placementIds = [];
		for (const placement of scene.placements) {
			// Find the zone.
			const zone = scene.zones.find(z => z.id === placement.zone);
			if (!zone) continue;

			// Position at zone center.
			const x = zone.bounds.left + (zone.bounds.right - zone.bounds.left) / 2;
			const y = zone.bounds.top + (zone.bounds.bottom - zone.bounds.top) / 2;
			const width = 22;
			const height = 32;

			// Create group.
			const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			group.setAttribute('data-placement-name', placement.placement_name);
			group.setAttribute('data-object-name', placement.object_name);
			group.setAttribute('data-target-id', placement.object_name);

			// Create rect.
			const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			rect.setAttribute('x', String(x - width / 2));
			rect.setAttribute('y', String(y - height / 2));
			rect.setAttribute('width', String(width));
			rect.setAttribute('height', String(height));
			rect.setAttribute('fill', '#c8e6c9');
			rect.setAttribute('stroke', '#2e7d32');
			rect.setAttribute('stroke-width', '2');
			rect.setAttribute('rx', '4');

			// Create label.
			const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
			text.setAttribute('x', String(x));
			text.setAttribute('y', String(y + 6));
			text.setAttribute('text-anchor', 'middle');
			text.setAttribute('font-size', '11');
			text.setAttribute('font-family', 'monospace');
			text.setAttribute('font-weight', 'bold');
			text.setAttribute('fill', '#1b5e20');
			text.textContent = placement.object_name.substring(0, 14);

			group.appendChild(rect);
			group.appendChild(text);
			svg.appendChild(group);

			placementIds.push({
				placement: placement.placement_name,
				targetId: placement.object_name,
			});
		}

		container.innerHTML = '';
		container.appendChild(svg);

		return {
			rendered: true,
			placementIds,
		};
	}, sceneData);

	console.log(`[${sceneName}] Rendered ${renderResult.placementIds.length} placements`);

	// Collect bounding boxes.
	const boundingBoxResult = await page.evaluate(async () => {
		const container = document.getElementById('scene-container');
		const groups = container.querySelectorAll('[data-target-id]');

		const boxes = [];
		for (const group of groups) {
			const box = group.getBoundingClientRect();
			boxes.push({
				targetId: group.getAttribute('data-target-id'),
				x: Math.round(box.x * 100) / 100,
				y: Math.round(box.y * 100) / 100,
				width: Math.round(box.width * 100) / 100,
				height: Math.round(box.height * 100) / 100,
			});
		}

		return boxes;
	});

	// Display stats in the page.
	const statsText = boundingBoxResult.map(box =>
		`${box.targetId.padEnd(20)} (${String(box.width).padStart(6)}x${String(box.height).padStart(6)}) at (${String(box.x).padStart(8)}, ${String(box.y).padStart(8)})`
	).join('\n');

	await page.evaluate((stats) => {
		document.getElementById('bbox-stats').textContent = stats;
	}, statsText);

	// Capture screenshot.
	const screenshotPath = path.join(GALLERY_DIR, `${sceneName}.png`);
	await page.screenshot({ path: screenshotPath });
	console.log(`[${sceneName}] Screenshot saved: ${screenshotPath}`);

	// Log bbox stats.
	console.log(`[${sceneName}] Placement bbox stats:`);
	boundingBoxResult.forEach(box => {
		console.log(`  ${box.targetId.padEnd(20)} (${box.width.toFixed(1)}x${box.height.toFixed(1)}) at (${box.x.toFixed(1)}, ${box.y.toFixed(1)})`);
	});

	// Close page.
	await page.close();

	// Clean up temp HTML.
	fs.unlinkSync(htmlPath);

	return {
		sceneName,
		placementCount: renderResult.placementIds.length,
		screenshotPath,
	};
}

//============================================
// Helper: Generate gallery index HTML
//============================================

function generateGalleryIndex(results) {
	const scenes = results
		.map(r => r.sceneName)
		.sort();

	let html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Base Scene Gallery</title>
	<style>
		* { box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			margin: 0;
			padding: 40px 20px;
			background-color: #f9f9f9;
		}
		.gallery {
			max-width: 1400px;
			margin: 0 auto;
		}
		h1 {
			text-align: center;
			color: #333;
			margin-bottom: 10px;
		}
		.header {
			text-align: center;
			color: #666;
			margin-bottom: 40px;
		}
		.header p {
			margin: 5px 0;
			font-size: 14px;
		}
		.scene-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
			gap: 30px;
			margin-bottom: 40px;
		}
		.scene-card {
			background-color: white;
			border: 1px solid #ddd;
			border-radius: 8px;
			padding: 20px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}
		.scene-card h2 {
			margin: 0 0 10px 0;
			font-size: 16px;
			color: #333;
		}
		.scene-card img {
			width: 100%;
			height: auto;
			border: 1px solid #eee;
			border-radius: 4px;
			display: block;
		}
		.footer {
			text-align: center;
			color: #999;
			font-size: 12px;
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #eee;
		}
	</style>
</head>
<body>
	<div class="gallery">
		<h1>Base Scene Gallery</h1>
		<div class="header">
			<p>Visual review of all 9 base scenes.</p>
			<p>Each screenshot shows the rendered scene with placements in their declared zones.</p>
		</div>
		<div class="scene-grid">
`;

	for (const sceneName of scenes) {
		html += `			<div class="scene-card">
				<h2>${sceneName}</h2>
				<img src="${sceneName}.png" alt="Scene: ${sceneName}">
			</div>
`;
	}

	html += `		</div>
		<div class="footer">
			<p>Generated by test_base_scene_gallery.mjs</p>
			<p>Artifacts: test-results/_base_scenes_gallery/</p>
		</div>
	</div>
</body>
</html>
`;

	return html;
}

//============================================
// MAIN TEST
//============================================

async function runTest() {
	console.log('='.repeat(60));
	console.log('WP-BASE-SCENE-GALLERY: Render all 9 base scenes');
	console.log('='.repeat(60));

	// Create gallery directory.
	fs.mkdirSync(GALLERY_DIR, { recursive: true });

	// Launch browser once.
	console.log('\nLaunching browser...');
	const browser = await chromium.launch({ headless: true });

	const results = [];
	let failedScenes = [];

	try {
		// Render each base scene.
		for (const sceneName of BASE_SCENE_NAMES) {
			try {
				const result = await renderSingleScene(sceneName, browser);
				results.push(result);
			} catch (err) {
				console.error(`[${sceneName}] FAILED: ${err.message}`);
				failedScenes.push(sceneName);
			}
		}
	} finally {
		// Close browser.
		await browser.close();
	}

	// Report results.
	console.log('\n' + '='.repeat(60));
	console.log('RENDER SUMMARY');
	console.log('='.repeat(60));
	console.log(`Total base scenes: ${BASE_SCENE_NAMES.length}`);
	console.log(`Successfully rendered: ${results.length}`);
	console.log(`Failed: ${failedScenes.length}`);

	if (failedScenes.length > 0) {
		console.log(`\nFailed scenes: ${failedScenes.join(', ')}`);
	}

	// Generate gallery index.
	console.log('\nGenerating gallery index...');
	const indexHtml = generateGalleryIndex(results);
	const indexPath = path.join(GALLERY_DIR, 'index.html');
	fs.writeFileSync(indexPath, indexHtml);
	console.log(`Index saved: ${indexPath}`);

	// Report file list.
	console.log('\nGenerated files:');
	const files = fs.readdirSync(GALLERY_DIR).sort();
	files.forEach(f => {
		const filePath = path.join(GALLERY_DIR, f);
		const stat = fs.statSync(filePath);
		const size = stat.size > 1024
			? `${(stat.size / 1024).toFixed(1)}K`
			: `${stat.size}B`;
		console.log(`  ${f.padEnd(30)} ${size.padStart(10)}`);
	});

	// Exit code.
	if (failedScenes.length > 0) {
		console.log('\nFAILURE: Some scenes failed to render');
		return 1;
	}

	console.log('\nSUCCESS: All 9 base scenes rendered and gallery created');
	return 0;
}

// Run the test.
runTest()
	.then(code => process.exit(code))
	.catch(err => {
		console.error('TEST ERROR:', err);
		process.exit(1);
	});
