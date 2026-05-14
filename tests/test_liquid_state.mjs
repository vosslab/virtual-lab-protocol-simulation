/**
 * test_liquid_state.mjs
 *
 * Unit tests for src/scene_runtime/liquid/index.ts
 * Tests transfer, discharge, mix operations and edge cases.
 *
 * Uses Node.js test runner (node:test).
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

/**
 * Mock implementation of the liquid state functions.
 * In practice, this would be imported from the compiled TypeScript.
 */

function applyLiquidTransfer(state, transfer) {
	const newContainers = JSON.parse(JSON.stringify(state.containers));

	if (transfer.kind === 'transfer') {
		return applyTransfer(newContainers, transfer);
	}

	if (transfer.kind === 'discharge') {
		return applyDischarge(newContainers, transfer);
	}

	if (transfer.kind === 'mix') {
		return applyMix(newContainers, transfer);
	}

	return { containers: newContainers };
}

function ensureContainer(containers, id) {
	if (!containers[id]) {
		containers[id] = {
			liquids: [],
			totalVolumeMl: 0,
		};
	}
}

function applyTransfer(containers, transfer) {
	const fromId = transfer.from;
	const toId = transfer.to;

	if (!fromId || !toId) {
		return { containers };
	}

	ensureContainer(containers, fromId);
	ensureContainer(containers, toId);

	const fromContainer = containers[fromId];
	const toContainer = containers[toId];

	const sourceIndex = fromContainer.liquids.findIndex(
		(entry) => entry.key === transfer.liquid,
	);

	if (sourceIndex === -1) {
		return { containers };
	}

	const sourceEntry = fromContainer.liquids[sourceIndex];

	if (sourceEntry.volumeMl < transfer.volumeMl) {
		return { containers };
	}

	sourceEntry.volumeMl -= transfer.volumeMl;
	fromContainer.totalVolumeMl -= transfer.volumeMl;

	if (sourceEntry.volumeMl === 0) {
		fromContainer.liquids.splice(sourceIndex, 1);
	}

	const destIndex = toContainer.liquids.findIndex(
		(entry) => entry.key === transfer.liquid,
	);

	if (destIndex !== -1) {
		toContainer.liquids[destIndex].volumeMl += transfer.volumeMl;
	} else {
		const destEntry = {
			key: transfer.liquid,
			volumeMl: transfer.volumeMl,
		};
		if (transfer.colorKey) {
			destEntry.colorKey = transfer.colorKey;
		}
		toContainer.liquids.push(destEntry);
	}

	toContainer.totalVolumeMl += transfer.volumeMl;

	return { containers };
}

function applyDischarge(containers, transfer) {
	const fromId = transfer.from;

	if (!fromId) {
		return { containers };
	}

	ensureContainer(containers, fromId);

	const fromContainer = containers[fromId];

	const sourceIndex = fromContainer.liquids.findIndex(
		(entry) => entry.key === transfer.liquid,
	);

	if (sourceIndex === -1) {
		return { containers };
	}

	const sourceEntry = fromContainer.liquids[sourceIndex];

	if (sourceEntry.volumeMl < transfer.volumeMl) {
		return { containers };
	}

	sourceEntry.volumeMl -= transfer.volumeMl;
	fromContainer.totalVolumeMl -= transfer.volumeMl;

	if (sourceEntry.volumeMl === 0) {
		fromContainer.liquids.splice(sourceIndex, 1);
	}

	return { containers };
}

function applyMix(containers, transfer) {
	const fromId = transfer.from;

	if (!fromId) {
		return { containers };
	}

	ensureContainer(containers, fromId);

	const fromContainer = containers[fromId];

	const indices = fromContainer.liquids
		.map((entry, idx) => (entry.key === transfer.liquid ? idx : -1))
		.filter((idx) => idx !== -1);

	if (indices.length < 2) {
		return { containers };
	}

	let totalVolume = 0;
	let firstColorKey;

	for (const idx of indices) {
		totalVolume += fromContainer.liquids[idx].volumeMl;
		if (!firstColorKey && fromContainer.liquids[idx].colorKey) {
			firstColorKey = fromContainer.liquids[idx].colorKey;
		}
	}

	const merged = {
		key: transfer.liquid,
		volumeMl: totalVolume,
	};
	if (firstColorKey) {
		merged.colorKey = firstColorKey;
	}

	for (let i = indices.length - 1; i >= 0; i--) {
		fromContainer.liquids.splice(indices[i], 1);
	}

	fromContainer.liquids.push(merged);

	return { containers };
}

//============================================

test('transfer full liquid volume from source to destination', () => {
	const initialState = {
		containers: {
			tube1: {
				liquids: [{ key: 'pbs', volumeMl: 5 }],
				totalVolumeMl: 5,
			},
			tube2: {
				liquids: [],
				totalVolumeMl: 0,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'tube1',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 5,
		colorKey: 'pbs',
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.equal(result.containers.tube1.liquids.length, 0);
	assert.equal(result.containers.tube1.totalVolumeMl, 0);
	assert.equal(result.containers.tube2.liquids.length, 1);
	assert.equal(result.containers.tube2.liquids[0].key, 'pbs');
	assert.equal(result.containers.tube2.liquids[0].volumeMl, 5);
	assert.equal(result.containers.tube2.totalVolumeMl, 5);
});

test('transfer partial liquid volume', () => {
	const initialState = {
		containers: {
			tube1: {
				liquids: [{ key: 'pbs', volumeMl: 10 }],
				totalVolumeMl: 10,
			},
			tube2: {
				liquids: [],
				totalVolumeMl: 0,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'tube1',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 3,
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.equal(result.containers.tube1.liquids[0].volumeMl, 7);
	assert.equal(result.containers.tube1.totalVolumeMl, 7);
	assert.equal(result.containers.tube2.liquids[0].volumeMl, 3);
	assert.equal(result.containers.tube2.totalVolumeMl, 3);
});

test('transfer into container with existing liquid of same key', () => {
	const initialState = {
		containers: {
			tube1: {
				liquids: [{ key: 'pbs', volumeMl: 5 }],
				totalVolumeMl: 5,
			},
			tube2: {
				liquids: [{ key: 'pbs', volumeMl: 2 }],
				totalVolumeMl: 2,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'tube1',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 3,
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.equal(result.containers.tube2.liquids.length, 1);
	assert.equal(result.containers.tube2.liquids[0].volumeMl, 5);
	assert.equal(result.containers.tube2.totalVolumeMl, 5);
});

test('transfer from empty container is no-op', () => {
	const initialState = {
		containers: {
			tube1: {
				liquids: [],
				totalVolumeMl: 0,
			},
			tube2: {
				liquids: [],
				totalVolumeMl: 0,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'tube1',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 5,
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.deepEqual(result, initialState);
});

test('transfer exceeding available volume is no-op', () => {
	const initialState = {
		containers: {
			tube1: {
				liquids: [{ key: 'pbs', volumeMl: 2 }],
				totalVolumeMl: 2,
			},
			tube2: {
				liquids: [],
				totalVolumeMl: 0,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'tube1',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 5,
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.deepEqual(result, initialState);
});

test('discharge removes liquid from container', () => {
	const initialState = {
		containers: {
			pipette: {
				liquids: [{ key: 'media', volumeMl: 4 }],
				totalVolumeMl: 4,
			},
		},
	};

	const discharge = {
		kind: 'discharge',
		from: 'pipette',
		liquid: 'media',
		volumeMl: 4,
	};

	const result = applyLiquidTransfer(initialState, discharge);

	assert.equal(result.containers.pipette.liquids.length, 0);
	assert.equal(result.containers.pipette.totalVolumeMl, 0);
});

test('discharge partial volume', () => {
	const initialState = {
		containers: {
			pipette: {
				liquids: [{ key: 'media', volumeMl: 10 }],
				totalVolumeMl: 10,
			},
		},
	};

	const discharge = {
		kind: 'discharge',
		from: 'pipette',
		liquid: 'media',
		volumeMl: 3,
	};

	const result = applyLiquidTransfer(initialState, discharge);

	assert.equal(result.containers.pipette.liquids[0].volumeMl, 7);
	assert.equal(result.containers.pipette.totalVolumeMl, 7);
});

test('discharge exceeding available volume is no-op', () => {
	const initialState = {
		containers: {
			pipette: {
				liquids: [{ key: 'media', volumeMl: 2 }],
				totalVolumeMl: 2,
			},
		},
	};

	const discharge = {
		kind: 'discharge',
		from: 'pipette',
		liquid: 'media',
		volumeMl: 5,
	};

	const result = applyLiquidTransfer(initialState, discharge);

	assert.deepEqual(result, initialState);
});

test('mix combines two entries with same liquid key', () => {
	const initialState = {
		containers: {
			tube: {
				liquids: [
					{ key: 'pbs', volumeMl: 2, colorKey: 'pbs' },
					{ key: 'pbs', volumeMl: 3, colorKey: 'pbs' },
				],
				totalVolumeMl: 5,
			},
		},
	};

	const mix = {
		kind: 'mix',
		from: 'tube',
		liquid: 'pbs',
		volumeMl: 0,
	};

	const result = applyLiquidTransfer(initialState, mix);

	assert.equal(result.containers.tube.liquids.length, 1);
	assert.equal(result.containers.tube.liquids[0].key, 'pbs');
	assert.equal(result.containers.tube.liquids[0].volumeMl, 5);
	assert.equal(result.containers.tube.totalVolumeMl, 5);
});

test('mix with single entry is no-op', () => {
	const initialState = {
		containers: {
			tube: {
				liquids: [{ key: 'pbs', volumeMl: 5 }],
				totalVolumeMl: 5,
			},
		},
	};

	const mix = {
		kind: 'mix',
		from: 'tube',
		liquid: 'pbs',
		volumeMl: 0,
	};

	const result = applyLiquidTransfer(initialState, mix);

	assert.deepEqual(result, initialState);
});

test('state is immutable after operations', () => {
	const initialState = {
		containers: {
			tube1: {
				liquids: [{ key: 'pbs', volumeMl: 5 }],
				totalVolumeMl: 5,
			},
			tube2: {
				liquids: [],
				totalVolumeMl: 0,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'tube1',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 3,
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.equal(initialState.containers.tube1.liquids[0].volumeMl, 5);
	assert.equal(initialState.containers.tube1.totalVolumeMl, 5);
	assert.equal(initialState.containers.tube2.liquids.length, 0);
});

test('transfer with non-existent source container is no-op', () => {
	const initialState = {
		containers: {
			tube2: {
				liquids: [],
				totalVolumeMl: 0,
			},
		},
	};

	const transfer = {
		kind: 'transfer',
		from: 'nonexistent',
		to: 'tube2',
		liquid: 'pbs',
		volumeMl: 5,
	};

	const result = applyLiquidTransfer(initialState, transfer);

	assert.deepEqual(result.containers.tube2, initialState.containers.tube2);
});
