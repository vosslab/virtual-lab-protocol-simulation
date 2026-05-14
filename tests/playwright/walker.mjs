//
// Walker CLI: run the walker engine against a protocol.
//
// Usage:
//   node tests/playwright/walker.mjs <protocol_id> [--fixture <name>]
//
// Examples:
//   node tests/playwright/walker.mjs --fixture smoke
//   node tests/playwright/walker.mjs cell_culture
//
// For --fixture smoke: serves the static smoke fixture from tests/playwright/fixtures/smoke/index.html
// For a protocol_id: expects a dev server at http://localhost:8000

import { walkProtocol } from './walker/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const fixtureIdx = args.indexOf('--fixture');
const hasFixture = fixtureIdx !== -1 && fixtureIdx + 1 < args.length;

let protocolId;
let fixtureName;
let baseUrl;
let protocolConfig = undefined;

if (hasFixture) {
	fixtureName = args[fixtureIdx + 1];
	protocolId = fixtureName;  // Use fixture name as protocol ID for reporting
	const fixtureHtml = path.join(__dirname, 'fixtures', fixtureName, 'index.html');

	// Verify fixture exists
	if (!fs.existsSync(fixtureHtml)) {
		console.error(`Error: Fixture not found at ${fixtureHtml}`);
		process.exit(1);
	}

	// Load protocol config from fixture
	const protocolPath = path.join(__dirname, 'fixtures', fixtureName, 'protocol.mjs');
	if (!fs.existsSync(protocolPath)) {
		console.error(`Error: Protocol config not found at ${protocolPath}`);
		process.exit(1);
	}

	try {
		const protocolModule = await import(`file://${protocolPath}`);
		// Try multiple export names in order of preference
		protocolConfig =
			protocolModule.plateDrugTreatmentFullProtocol ||
			protocolModule.smokeProtocol ||
			protocolModule.plateDrugTreatmentProtocol ||
			protocolModule.interactionsArrayProtocol ||
			protocolModule.protocol;
		if (!protocolConfig) {
			console.error('Error: protocol.mjs must export a protocol config');
			process.exit(1);
		}
	} catch (err) {
		console.error(`Error loading protocol config: ${err}`);
		process.exit(1);
	}

	baseUrl = `file://${fixtureHtml}`;
} else {
	// Use protocol_id from args[0]
	protocolId = args[0];
	if (!protocolId) {
		console.error('Usage: node tests/playwright/walker.mjs <protocol_id> [--fixture <name>]');
		console.error('');
		console.error('Examples:');
		console.error('  node tests/playwright/walker.mjs --fixture smoke');
		console.error('  node tests/playwright/walker.mjs cell_culture');
		process.exit(2);
	}
	baseUrl = 'http://localhost:8000';
}

try {
	const result = await walkProtocol({
		protocolId,
		baseUrl,
		headless: true,
		protocolConfig,
	});

	console.log(JSON.stringify(result, null, 2));
	process.exit(result.failedStepId ? 1 : 0);
} catch (err) {
	const message = err instanceof Error ? err.message : String(err);
	console.error(`Walker error: ${message}`);
	process.exit(1);
}
