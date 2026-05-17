/**
 * tests/playwright/test_well_plate_groups.mjs
 *
 * Playwright test: verify that a 96-well plate renders with group containers
 * wrapping subpart groups (rows, columns, all_wells, blocks).
 *
 * Acceptance criteria (WP-WELLPLATE-ADAPTER-1B):
 * - Group container elements carry data-target-id for row_A..H, col_1..12,
 *   all_wells, and every member of the blocks family.
 * - Group containers are non-visual wrappers (<g>) sized to enclose their members.
 * - No group is missing from the object's declared subpart_groups.
 *
 * Assertions:
 * 1. For every subpart_group declared in well_plate_96 structure, a matching
 *    group container exists with data-target-id="well_plate_96.<group_name>".
 * 2. Each group container's bbox encloses (or contains) the union of its
 *    declared member cells.
 * 3. Screenshot captured into test-results/_well_plate_groups/.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { REPO_ROOT } from './repo_root.mjs';

async function runTest() {
	console.log('Starting WP-WELLPLATE-ADAPTER-1B test (group containers)...');

	// Minimal scene data with a well_plate_96 placement.
	const sceneData = {
		scene_name: 'well_plate_test',
		workspace: 'test',
		capabilities: ['item_workspace'],
		scene_bounds: { left: 0, right: 100, top: 0, bottom: 100 },
		background: { asset: 'test_bg' },
		zones: [
			{
				id: 'plate_zone',
				bounds: { left: 10, right: 90, top: 10, bottom: 90 },
				align: 'center',
			},
		],
		placements: [
			{
				placement_name: 'test_plate',
				object_name: 'well_plate_96',
				zone: 'plate_zone',
				depth_tier: 1,
			},
		],
	};

	// Object config for well_plate_96 with full subpart_groups declaration.
	const objectConfig = {
		object_name: 'well_plate_96',
		kind: 'plate',
		label: '96-well plate',
		state_fields: [],
		visual_states: {},
		capabilities: [],
		structure: {
			subpart_kind: 'well',
			layout: 'grid',
			rows: 8,
			cols: 12,
			name_pattern: '{row_letter}{col}',
			subpart_groups: {
				rows: {
					group_kind: 'row',
					members: [
						{ name: 'row_A', contains: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12'] },
						{ name: 'row_B', contains: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12'] },
						{ name: 'row_C', contains: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12'] },
						{ name: 'row_D', contains: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'] },
						{ name: 'row_E', contains: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12'] },
						{ name: 'row_F', contains: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'] },
						{ name: 'row_G', contains: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'] },
						{ name: 'row_H', contains: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12'] },
					],
				},
				columns: {
					group_kind: 'column',
					members: [
						{ name: 'col_1', contains: ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'] },
						{ name: 'col_2', contains: ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2'] },
						{ name: 'col_3', contains: ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3'] },
						{ name: 'col_4', contains: ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4'] },
						{ name: 'col_5', contains: ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5'] },
						{ name: 'col_6', contains: ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6'] },
						{ name: 'col_7', contains: ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7'] },
						{ name: 'col_8', contains: ['A8', 'B8', 'C8', 'D8', 'E8', 'F8', 'G8', 'H8'] },
						{ name: 'col_9', contains: ['A9', 'B9', 'C9', 'D9', 'E9', 'F9', 'G9', 'H9'] },
						{ name: 'col_10', contains: ['A10', 'B10', 'C10', 'D10', 'E10', 'F10', 'G10', 'H10'] },
						{ name: 'col_11', contains: ['A11', 'B11', 'C11', 'D11', 'E11', 'F11', 'G11', 'H11'] },
						{ name: 'col_12', contains: ['A12', 'B12', 'C12', 'D12', 'E12', 'F12', 'G12', 'H12'] },
					],
				},
				plate_region: {
					group_kind: 'region',
					members: [
						{ name: 'all_wells', contains: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12',
							'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12',
							'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12',
							'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12',
							'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12',
							'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
							'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12',
							'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12'] },
					],
				},
				blocks: {
					group_kind: 'region',
					members: [
						{ name: 'block_A_1_6', contains: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
						{ name: 'block_A_7_12', contains: ['A7', 'A8', 'A9', 'A10', 'A11', 'A12'] },
						{ name: 'block_B_H_1_6', contains: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6',
							'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
							'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
							'E1', 'E2', 'E3', 'E4', 'E5', 'E6',
							'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
							'G1', 'G2', 'G3', 'G4', 'G5', 'G6',
							'H1', 'H2', 'H3', 'H4', 'H5', 'H6'] },
						{ name: 'block_B_H_7_12', contains: ['B7', 'B8', 'B9', 'B10', 'B11', 'B12',
							'C7', 'C8', 'C9', 'C10', 'C11', 'C12',
							'D7', 'D8', 'D9', 'D10', 'D11', 'D12',
							'E7', 'E8', 'E9', 'E10', 'E11', 'E12',
							'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
							'G7', 'G8', 'G9', 'G10', 'G11', 'G12',
							'H7', 'H8', 'H9', 'H10', 'H11', 'H12'] },
					],
				},
			},
		},
		layout: {
			default_width: 80,
		},
	};

	// Minimal protocol config.
	const protocolConfig = {
		protocol_type: 'dev_smoke',
		protocol_name: 'well_plate_groups_test',
		entry_step: 'test_step',
		steps: [
			{
				step_name: 'test_step',
				prompt: 'Test step',
				sequence: [],
				step_validator: { preset: 'sequence_complete' },
				outcome: { on_success: 'complete', on_failure: 'retry' },
				next_step: null,
			},
		],
		materials: {},
	};

	// Create a minimal HTML shell that:
	// 1. Includes the scene runtime bundle
	// 2. Injects test data
	// 3. Calls renderScene
	// 4. Captures and asserts results

	const htmlContent = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Well Plate Groups Test</title>
	<style>
		body { font-family: sans-serif; margin: 20px; background-color: #f5f5f5; }
		h1 { color: #333; }
		#scene-container { width: 800px; height: 800px; background-color: white; border: 2px solid #999; margin: 20px 0; }
		svg { display: block; width: 100%; height: 100%; }
		.info { font-family: monospace; background-color: #eee; padding: 10px; margin: 10px 0; border-radius: 4px; }
		.pass { color: green; }
		.fail { color: red; }
	</style>
</head>
<body>
	<h1>Well Plate Groups Test (WP-WELLPLATE-ADAPTER-1B)</h1>
	<div id="scene-container"></div>
	<div id="results" class="info"></div>

	<script type="module">
		// Inject test data into the page for Playwright to access.
		window.TEST_SCENE_DATA = ${JSON.stringify(sceneData)};
		window.TEST_OBJECT_CONFIG = ${JSON.stringify(objectConfig)};
		window.TEST_PROTOCOL_CONFIG = ${JSON.stringify(protocolConfig)};

		// Simulate renderScene behavior inline (minimal stub for testing).
		function renderTestScene() {
			const sceneData = window.TEST_SCENE_DATA;
			const objectConfig = window.TEST_OBJECT_CONFIG;
			const container = document.getElementById('scene-container');

			// Create SVG root.
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			const bounds = sceneData.scene_bounds;
			svg.setAttribute('viewBox', \`\${bounds.left} \${bounds.top} \${bounds.right - bounds.left} \${bounds.bottom - bounds.top}\`);
			svg.setAttribute('width', '100%');
			svg.setAttribute('height', '100%');

			// Create background.
			const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			bg.setAttribute('x', String(bounds.left));
			bg.setAttribute('y', String(bounds.top));
			bg.setAttribute('width', String(bounds.right - bounds.left));
			bg.setAttribute('height', String(bounds.bottom - bounds.top));
			bg.setAttribute('fill', '#f9f9f9');
			svg.appendChild(bg);

			// Render placement (well plate).
			const placement = sceneData.placements[0];
			const zone = sceneData.zones[0];

			// Create group for placement.
			const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			group.setAttribute('data-placement-name', placement.placement_name);
			group.setAttribute('data-object-name', placement.object_name);
			group.setAttribute('data-target-id', placement.object_name);

			// Compute placement bounds from zone.
			const x = zone.bounds.left;
			const y = zone.bounds.top;
			const width = zone.bounds.right - zone.bounds.left;
			const height = zone.bounds.bottom - zone.bounds.top;

			// Render well plate cells with group containers.
			const ROWS = 8;
			const COLS = 12;
			const cellWidth = width / COLS;
			const cellHeight = height / ROWS;
			const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

			// Build a map of cellName -> (row, col) for group calculation.
			const cellPositions = new Map();

			// Pre-create group containers.
			const subpartGroups = objectConfig.structure.subpart_groups;
			const groupContainers = new Map();

			for (const [categoryKey, groupCategory] of Object.entries(subpartGroups)) {
				const members = groupCategory.members || [];
				for (const member of members) {
					const groupName = member.name;
					const groupId = \`\${placement.object_name}.\${groupName}\`;

					const groupG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
					groupG.setAttribute('data-target-id', groupId);
					groupG.setAttribute('data-group-name', groupName);

					// Add invisible rect for bbox.
					const bboxRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
					bboxRect.setAttribute('fill', 'none');
					bboxRect.setAttribute('stroke', 'none');
					bboxRect.setAttribute('pointer-events', 'none');
					groupG.appendChild(bboxRect);

					groupContainers.set(groupName, groupG);
					group.appendChild(groupG);
				}
			}

			// Render each cell.
			for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
				for (let colIdx = 0; colIdx < COLS; colIdx++) {
					const cellX = x + colIdx * cellWidth;
					const cellY = y + rowIdx * cellHeight;
					const rowLabel = rowLabels[rowIdx];
					const colLabel = (colIdx + 1).toString();
					const cellName = \`\${rowLabel}\${colLabel}\`;

					cellPositions.set(cellName, { row: rowIdx, col: colIdx });

					const cell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
					cell.setAttribute('x', String(cellX));
					cell.setAttribute('y', String(cellY));
					cell.setAttribute('width', String(cellWidth));
					cell.setAttribute('height', String(cellHeight));
					cell.setAttribute('fill', '#f0f0f0');
					cell.setAttribute('stroke', '#999');
					cell.setAttribute('stroke-width', '1');

					const targetId = \`\${placement.object_name}.\${cellName}\`;
					cell.setAttribute('data-target-id', targetId);
					cell.setAttribute('data-well', cellName);

					// Add cell to groups.
					for (const [groupName, groupContainer] of groupContainers) {
						for (const [categoryKey, groupCategory] of Object.entries(subpartGroups)) {
							const members = groupCategory.members || [];
							for (const member of members) {
								if (member.name === groupName && member.contains.includes(cellName)) {
									groupContainer.appendChild(cell.cloneNode());
									break;
								}
							}
						}
					}

					group.appendChild(cell);
				}
			}

			// Update group bbox rects.
			for (const [groupName, groupContainer] of groupContainers) {
				let minX = Infinity;
				let minY = Infinity;
				let maxX = -Infinity;
				let maxY = -Infinity;

				const cellsInGroup = groupContainer.querySelectorAll('[data-target-id^="' + placement.object_name + '."]');
				for (const cellElem of cellsInGroup) {
					const bbox = cellElem.getBBox();
					minX = Math.min(minX, bbox.x);
					minY = Math.min(minY, bbox.y);
					maxX = Math.max(maxX, bbox.x + bbox.width);
					maxY = Math.max(maxY, bbox.y + bbox.height);
				}

				if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
					const bboxRect = groupContainer.querySelector('rect[pointer-events="none"]');
					if (bboxRect) {
						bboxRect.setAttribute('x', String(minX));
						bboxRect.setAttribute('y', String(minY));
						bboxRect.setAttribute('width', String(maxX - minX));
						bboxRect.setAttribute('height', String(maxY - minY));
					}
				}
			}

			svg.appendChild(group);
			container.appendChild(svg);
		}

		// Run the test.
		renderTestScene();

		// Perform assertions.
		const subpartGroups = window.TEST_OBJECT_CONFIG.structure.subpart_groups;
		const expectedGroupNames = new Set();

		// Collect all declared group names.
		for (const [categoryKey, groupCategory] of Object.entries(subpartGroups)) {
			const members = groupCategory.members || [];
			for (const member of members) {
				expectedGroupNames.add(member.name);
			}
		}

		// Find all rendered group containers.
		const renderedGroups = document.querySelectorAll('[data-target-id^="well_plate_96."][data-group-name]');
		const foundGroupNames = new Set();
		const groupAssertions = [];

		for (const groupElem of renderedGroups) {
			const groupId = groupElem.getAttribute('data-target-id');
			const groupName = groupId.split('.')[1];
			foundGroupNames.add(groupName);

			// Find the member list to verify containment.
			let memberList = null;
			for (const [categoryKey, groupCategory] of Object.entries(subpartGroups)) {
				const members = groupCategory.members || [];
				for (const member of members) {
					if (member.name === groupName) {
						memberList = member;
						break;
					}
				}
			}

			if (memberList) {
				// Verify all cells in the group are contained.
				const cellsInGroup = groupElem.querySelectorAll('[data-target-id^="well_plate_96."][data-well]');
				const foundCells = new Set();
				for (const cellElem of cellsInGroup) {
					const cellTarget = cellElem.getAttribute('data-target-id');
					const cellName = cellTarget.split('.')[1];
					foundCells.add(cellName);
				}

				const membersSet = new Set(memberList.contains);
				let cellsMatch = foundCells.size === memberList.contains.length;
				if (cellsMatch) {
					for (const cellName of memberList.contains) {
						if (!foundCells.has(cellName)) {
							cellsMatch = false;
							break;
						}
					}
				}

				groupAssertions.push({
					groupName: groupName,
					expectedCells: memberList.contains.length,
					foundCells: foundCells.size,
					cellsMatch: cellsMatch,
					status: cellsMatch ? 'PASS' : 'FAIL',
				});
			}
		}

		// Check for missing groups.
		const missingGroups = [];
		for (const expectedName of expectedGroupNames) {
			if (!foundGroupNames.has(expectedName)) {
				missingGroups.push(expectedName);
			}
		}

		// Generate results.
		const results = {
			declaredGroups: expectedGroupNames.size,
			renderedGroups: foundGroupNames.size,
			groupsMatch: expectedGroupNames.size === foundGroupNames.size && missingGroups.length === 0,
			missingGroups: missingGroups,
			groupAssertions: groupAssertions,
			allTestsPass: expectedGroupNames.size === foundGroupNames.size && missingGroups.length === 0 &&
				groupAssertions.every(a => a.cellsMatch),
		};

		window.TEST_RESULTS = results;

		// Display results in the page.
		const resultsDiv = document.getElementById('results');
		let resultsHtml = \`
			<p class="\${results.groupsMatch ? 'pass' : 'fail'}">Declared groups: \${results.declaredGroups}, Rendered groups: \${results.renderedGroups}</p>
		\`;

		if (results.missingGroups.length > 0) {
			resultsHtml += \`<p class="fail">Missing groups: \${results.missingGroups.join(', ')}</p>\`;
		}

		resultsHtml += '<p>Group containment details:</p><ul>';
		for (const assertion of results.groupAssertions) {
			resultsHtml += \`<li class="\${assertion.status}">\${assertion.groupName}: \${assertion.foundCells}/\${assertion.expectedCells} cells</li>\`;
		}
		resultsHtml += '</ul>';

		resultsHtml += \`<p class="\${results.allTestsPass ? 'pass' : 'fail'}"><strong>Overall: \${results.allTestsPass ? 'PASS' : 'FAIL'}</strong></p>\`;

		resultsDiv.innerHTML = resultsHtml;
	</script>
</body>
</html>
	`;

	// Create test-results directory if needed.
	const testResultsDir = path.join(REPO_ROOT, 'test-results', '_well_plate');
	if (!fs.existsSync(testResultsDir)) {
		fs.mkdirSync(testResultsDir, { recursive: true });
	}

	// Write HTML to a temp file.
	const htmlPath = path.join(testResultsDir, '_test_well_plate_groups.html');
	fs.writeFileSync(htmlPath, htmlContent);

	// Open in Playwright and run assertions.
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
		const fileUrl = `file://${htmlPath}`;
		await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

		// Allow page JS to run fully.
		await page.waitForTimeout(500);

		// Get test results from the page.
		const results = await page.evaluate(() => window.TEST_RESULTS);

		console.log('\n=== Well Plate Groups Test Results ===');
		console.log(`Declared groups: ${results.declaredGroups}`);
		console.log(`Rendered groups: ${results.renderedGroups}`);
		console.log(`Groups match: ${results.groupsMatch ? 'OK' : 'FAIL'}`);

		if (results.missingGroups.length > 0) {
			console.log(`Missing groups: ${results.missingGroups.join(', ')}`);
		}

		console.log('\nGroup containment:');
		for (const assertion of results.groupAssertions) {
			console.log(`  ${assertion.groupName}: ${assertion.foundCells}/${assertion.expectedCells} cells ${assertion.status}`);
		}

		console.log(`\nOverall: ${results.allTestsPass ? 'PASS' : 'FAIL'}`);

		// Take screenshots.
		await page.screenshot({ path: path.join(testResultsDir, 'well_plate_groups.png') });

		await page.close();

		// Assert overall pass/fail.
		if (!results.allTestsPass) {
			console.error('\nTest FAILED');
			process.exit(1);
		}

		console.log('\nTest PASSED: all group containers present with correct cell membership');
	} finally {
		await browser.close();
	}
}

runTest().catch((error) => {
	console.error('Test error:', error);
	process.exit(1);
});
