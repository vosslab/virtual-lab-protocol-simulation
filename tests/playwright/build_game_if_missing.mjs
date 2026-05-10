/**
 * build_game_if_missing.mjs
 *
 * Bootstrap helper that ensures the portable single-file HTML exists at
 * dist-single/game.html. If missing, runs export_single_file.sh to build
 * it on demand.
 *
 * Usage:
 *   import { ensureGameBuilt } from './build_game_if_missing.mjs';
 *   const gamePath = await ensureGameBuilt(__repoRoot);
 */

import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const PORTABLE_HTML_REL = path.join('dist-single', 'game.html');

/**
 * Ensures the portable HTML exists at <repoRoot>/dist-single/game.html.
 * If missing, runs export_single_file.sh from repoRoot to build it.
 * Throws if the build fails or the file still does not exist.
 *
 * @param {string} repoRoot - Repository root directory
 * @returns {Promise<string>} - Absolute path to dist-single/game.html
 */
export async function ensureGameBuilt(repoRoot) {
	const gamePath = path.resolve(repoRoot, PORTABLE_HTML_REL);

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
			`Failed to build ${PORTABLE_HTML_REL} via export_single_file.sh: ${err.message}`
		);
	}

	// Verify file now exists after the build
	if (!fs.existsSync(gamePath)) {
		throw new Error(
			`export_single_file.sh completed but ${PORTABLE_HTML_REL} still missing at ${gamePath}`
		);
	}

	return gamePath;
}

/**
 * Returns the absolute path to the portable HTML, building it on demand if missing.
 * Shorthand for ensuring the file exists and getting its path in one call.
 *
 * @param {string} repoRoot - Repository root directory
 * @returns {Promise<string>} - Absolute path to dist-single/game.html
 */
export async function gameFilePath(repoRoot) {
	return await ensureGameBuilt(repoRoot);
}
