#!/usr/bin/env node

/**
 * CLI entry point for the walker engine.
 *
 * Usage:
 *   node tests/playwright/walker/run.mjs --protocol mtt_solubilization_readout
 *   node tests/playwright/walker/run.mjs --protocol mtt_solubilization_readout --headless false
 */

import { runWalker } from './engine.mjs';

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = {
		protocol: null,
		headless: true,
		verbosity: 'info',
		screenshotDir: null,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--protocol' && i + 1 < args.length) {
			opts.protocol = args[++i];
		} else if (arg === '--headless' && i + 1 < args.length) {
			opts.headless = args[++i] !== 'false';
		} else if (arg === '--verbosity' && i + 1 < args.length) {
			opts.verbosity = args[++i];
		} else if (arg === '--screenshots' && i + 1 < args.length) {
			opts.screenshotDir = args[++i];
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Usage: node tests/playwright/walker/run.mjs [options]

Options:
  --protocol <name>          Protocol name to walk (required)
  --headless <true|false>    Run headless browser (default: true)
  --verbosity <quiet|info|debug>  Logging level (default: info)
  --screenshots <dir>        Screenshot output directory (default: test-results/<protocol>/)
  --help                     Show this help message

Example:
  node tests/playwright/walker/run.mjs --protocol mtt_solubilization_readout
`);
			process.exit(0);
		}
	}

	return opts;
}

async function main() {
	const opts = parseArgs();

	if (!opts.protocol) {
		console.error('Error: --protocol argument is required');
		process.exit(1);
	}

	const result = await runWalker({
		protocolName: opts.protocol,
		headless: opts.headless,
		verbosity: opts.verbosity,
		screenshotDir: opts.screenshotDir,
	});

	const status = result.success ? 'SUCCESS' : 'FAILED';
	console.log(`
==========================================
Walker Result
==========================================
Protocol: ${result.protocolName}
Steps: ${result.stepsWalked}/${result.stepsTotal}
Interactions: ${result.interactionsWalked}
Screenshots: ${result.screenshotsTaken}
Status: ${status}
${result.errorMessage ? `Error: ${result.errorMessage}` : ''}
==========================================
`);

	process.exit(result.success ? 0 : 1);
}

main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
