#!/usr/bin/env node
/**
 * walker_row_slot_smoke.mjs
 *
 * Smoke test: validate row+slot scene descriptor against protocol walker expectations.
 *
 * This script:
 * 1. Loads the passing protocol (mtt_reagent_prep) which extends bench_basic.
 * 2. Loads both scene variants (bench_basic and bench_basic_row_slot) from generated catalog.
 * 3. Compares their structure to validate row+slot has required placement semantics.
 * 4. Reports compatibility status + any structural gaps.
 *
 * Output: test-results/_walker_row_slot/result.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo_root.mjs';

const OUTPUT_DIR = path.join(REPO_ROOT, 'test-results', '_walker_row_slot');
const RESULT_JSON = path.join(OUTPUT_DIR, 'result.json');

// Scene pairs: (legacy, row+slot)
const SCENE_PAIRS = [
	['bench_basic', 'bench_basic_row_slot'],
	['hood_basic', 'hood_basic_row_slot'],
	['heat_block_bench', 'heat_block_bench_row_slot'],
	['cell_counter_basic', 'cell_counter_basic_row_slot'],
	['electrophoresis_bench', 'electrophoresis_bench_row_slot'],
	['imaging_bench', 'imaging_bench_row_slot'],
	['microscope_basic', 'microscope_basic_row_slot'],
	['sample_prep_bench', 'sample_prep_bench_row_slot'],
	['staining_bench', 'staining_bench_row_slot'],
];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

//============================================
// Validation helper functions
//============================================

function countRowSlotPlacements(sceneData) {
	let count = 0;
	if (sceneData.rows) {
		for (const row of sceneData.rows) {
			if (row.slots) {
				count += row.slots.length;
			}
		}
	}
	return count;
}

function extractPlacementNames(sceneData) {
	const names = new Set();
	if (sceneData.placements) {
		for (const placement of sceneData.placements) {
			if (placement.placement_name) {
				names.add(placement.placement_name);
			}
		}
	}
	if (sceneData.rows) {
		for (const row of sceneData.rows) {
			if (row.slots) {
				for (const slot of row.slots) {
					if (slot.placement_name) {
						names.add(slot.placement_name);
					}
				}
			}
		}
	}
	return names;
}

//============================================
// Main validation
//============================================

async function validateRowSlotWalker() {
	console.log('Row+Slot Walker Compatibility Check (All 9 Pairs)');
	console.log('====================================================\n');

	const result = {
		test_date: new Date().toISOString(),
		total_pairs: SCENE_PAIRS.length,
		pairs: [],
		summary: {
			compatible: 0,
			incompatible: 0,
			missing: 0,
			total_placements_preserved: 0,
		},
		overall_verdict: 'PENDING',
		details: [],
		errors: [],
	};

	try {
		// Load scene catalog
		console.log('Loading scene catalog...');
		const mod = await import(path.join(REPO_ROOT, 'generated', 'scene_data.ts'));
		const { SCENE_CATALOG } = mod;

		// Validate each scene pair
		for (const [zoneSceneName, rowSlotSceneName] of SCENE_PAIRS) {
			const zoneScene = SCENE_CATALOG[zoneSceneName];
			const rowSlotScene = SCENE_CATALOG[rowSlotSceneName];

			const pairResult = {
				zone_scene: zoneSceneName,
				row_slot_scene: rowSlotSceneName,
				zone_status: 'MISSING',
				row_slot_status: 'MISSING',
				zone_placements: 0,
				row_slot_placements: 0,
				placement_names_match: false,
				verdict: 'INCOMPATIBLE',
				errors: [],
			};

			// Check zone scene
			if (zoneScene) {
				pairResult.zone_status = 'FOUND';
				pairResult.zone_placements = zoneScene.placements?.length || 0;
			} else {
				pairResult.errors.push(`Zone scene "${zoneSceneName}" not found`);
			}

			// Check row+slot scene
			if (rowSlotScene) {
				pairResult.row_slot_status = 'FOUND';
				pairResult.row_slot_placements = countRowSlotPlacements(rowSlotScene);

				// Validate required fields
				const requiredFields = ['scene_name', 'workspace', 'capabilities'];
				for (const field of requiredFields) {
					if (!rowSlotScene[field]) {
						pairResult.errors.push(`Row+slot scene missing field: ${field}`);
					}
				}

				// Check row/slot structure
				if (!rowSlotScene.rows) {
					pairResult.errors.push('Row+slot scene missing "rows" field');
				} else if (!Array.isArray(rowSlotScene.rows) || rowSlotScene.rows.length === 0) {
					pairResult.errors.push('Row+slot scene "rows" is empty or not an array');
				} else {
					for (let i = 0; i < rowSlotScene.rows.length; i++) {
						const row = rowSlotScene.rows[i];
						if (!row.slots || !Array.isArray(row.slots)) {
							pairResult.errors.push(`Row ${i} missing or invalid "slots" array`);
						}
					}
				}
			} else {
				pairResult.errors.push(`Row+slot scene "${rowSlotSceneName}" not found`);
			}

			// Validate placement preservation
			if (zoneScene && rowSlotScene) {
				if (pairResult.zone_placements === pairResult.row_slot_placements) {
					// Check that placement names match
					const zoneNames = extractPlacementNames(zoneScene);
					const rowSlotNames = extractPlacementNames(rowSlotScene);

					if (zoneNames.size === rowSlotNames.size && [...zoneNames].every(n => rowSlotNames.has(n))) {
						pairResult.placement_names_match = true;
					} else {
						pairResult.errors.push(`Placement names do not match: zone has ${zoneNames.size}, row+slot has ${rowSlotNames.size}`);
					}
				} else {
					pairResult.errors.push(`Placement count mismatch: zone=${pairResult.zone_placements}, row+slot=${pairResult.row_slot_placements}`);
				}
			}

			// Determine verdict
			if (pairResult.errors.length === 0 && pairResult.zone_status === 'FOUND' && pairResult.row_slot_status === 'FOUND') {
				pairResult.verdict = 'COMPATIBLE';
				result.summary.compatible++;
				result.summary.total_placements_preserved += pairResult.zone_placements;
			} else if (pairResult.zone_status === 'MISSING' || pairResult.row_slot_status === 'MISSING') {
				pairResult.verdict = 'INCOMPLETE';
				result.summary.missing++;
			} else {
				pairResult.verdict = 'INCOMPATIBLE';
				result.summary.incompatible++;
			}

			result.pairs.push(pairResult);
			console.log(`[${pairResult.verdict}] ${pairResult.zone_scene} ↔ ${pairResult.row_slot_scene}`);
			if (pairResult.errors.length > 0) {
				for (const err of pairResult.errors) {
					console.log(`  - ${err}`);
				}
			}
		}

		// Overall verdict
		if (result.summary.incompatible === 0 && result.summary.missing === 0 && result.summary.compatible === SCENE_PAIRS.length) {
			result.overall_verdict = 'COMPATIBLE';
			result.details.push('All 9 scene pairs are compatible.');
			result.details.push(`Total placements preserved: ${result.summary.total_placements_preserved}`);
		} else if (result.summary.missing > 0) {
			result.overall_verdict = 'INCOMPLETE';
			result.details.push(`${result.summary.missing} pairs have missing scenes.`);
		} else {
			result.overall_verdict = 'INCOMPATIBLE';
			result.details.push(`${result.summary.incompatible} pairs have structural issues.`);
		}

	} catch (error) {
		console.error('Validation error:', error.message);
		result.errors.push(error.message);
		result.overall_verdict = 'ERROR';
	}

	// Write result JSON
	fs.writeFileSync(RESULT_JSON, JSON.stringify(result, null, 2), 'utf-8');
	console.log(`\nResult written to: ${RESULT_JSON}`);

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('WALKER ROW+SLOT COMPATIBILITY SUMMARY');
	console.log('='.repeat(60));
	console.log(`Overall Verdict: ${result.overall_verdict}`);
	console.log(`Compatible: ${result.summary.compatible}/${SCENE_PAIRS.length}`);
	console.log(`Incompatible: ${result.summary.incompatible}/${SCENE_PAIRS.length}`);
	console.log(`Missing: ${result.summary.missing}/${SCENE_PAIRS.length}`);
	console.log(`Total placements preserved: ${result.summary.total_placements_preserved}`);
	if (result.errors.length > 0) {
		console.log(`Fatal errors: ${result.errors.length}`);
	}
	console.log('='.repeat(60));

	process.exit(result.overall_verdict === 'COMPATIBLE' ? 0 : 1);
}

validateRowSlotWalker().catch(err => {
	console.error('Fatal error:', err);
	process.exit(2);
});
