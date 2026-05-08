/**
 * build_game_if_missing.mjs
 *
 * Bootstrap helper that ensures cell_culture_game.html exists.
 * If missing, runs export_single_file.sh to build it on demand.
 *
 * Usage:
 *   import { ensureGameBuilt } from './build_game_if_missing.mjs';
 *   const gamePath = await ensureGameBuilt(__repoRoot);
 */

import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * Ensures cell_culture_game.html exists at repoRoot.
 * If missing, runs export_single_file.sh from repoRoot to build it.
 * Throws if the build fails or the file still does not exist.
 *
 * @param {string} repoRoot - Repository root directory
 * @returns {Promise<string>} - Path to cell_culture_game.html
 */
export async function ensureGameBuilt(repoRoot) {
	const gamePath = path.resolve(repoRoot, 'cell_culture_game.html');

	if (fs.existsSync(gamePath)) {
		return gamePath;
	}

	// File missing; rebuild it
	try {
		execFileSync('bash', ['export_single_file.sh'], {
			cwd: repoRoot,
			stdio: 'inherit',
		});
	} catch (err) {
		throw new Error(
			`Failed to build cell_culture_game.html via export_single_file.sh: ${err.message}`
		);
	}

	// Verify file now exists after the build
	if (!fs.existsSync(gamePath)) {
		throw new Error(
			`export_single_file.sh completed but cell_culture_game.html still missing at ${gamePath}`
		);
	}

	return gamePath;
}
