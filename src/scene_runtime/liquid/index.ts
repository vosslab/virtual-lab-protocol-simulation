/**
 * liquid/index.ts
 *
 * Pure liquid state management. Applies transfers, discharges, and mixes to
 * a liquid state model that tracks container contents by volume and reagent key.
 *
 * Honors docs/LIQUID_CONVENTION.md:
 * - transfer: subtract from source, add to destination
 * - discharge: subtract from source only
 * - mix: combine liquids within one container
 *
 * No side effects, no module state, pure functions only.
 */

import type {
	ContainerLiquid,
	LiquidEntry,
	LiquidState,
	LiquidTransfer,
} from '../types';

/**
 * Apply a single liquid transfer to the state and return a new state.
 * Pure function: does not mutate input.
 *
 * Transfer: subtract from `from`, add to `to` with merged entry.
 * Discharge: subtract from `from` only.
 * Mix: combine entries in `from` with same `liquid` key.
 *
 * Edge cases:
 * - Transfer from empty container or insufficient volume: no-op, return state unchanged.
 * - Discharge from empty container: no-op, return state unchanged.
 * - Mix from single-entry container: no-op, return state unchanged.
 */
export function applyLiquidTransfer(
	state: LiquidState,
	transfer: LiquidTransfer,
): LiquidState {
	const newContainers = JSON.parse(JSON.stringify(state.containers)) as Record<
		string,
		ContainerLiquid
	>;

	if (transfer.kind === 'transfer') {
		return applyTransfer(newContainers, transfer);
	}

	if (transfer.kind === 'discharge') {
		return applyDischarge(newContainers, transfer);
	}

	if (transfer.kind === 'mix') {
		return applyMix(newContainers, transfer);
	}

	return state;
}

//============================================

/**
 * Apply a transfer: subtract from source, add to destination.
 * Returns new state with both containers updated.
 * No-op if source is empty or does not exist.
 */
function applyTransfer(
	containers: Record<string, ContainerLiquid>,
	transfer: LiquidTransfer,
): LiquidState {
	const fromId = transfer.from;
	const toId = transfer.to;

	// Validate required fields
	if (!fromId || !toId) {
		return { containers };
	}

	// Ensure both containers exist
	ensureContainer(containers, fromId);
	ensureContainer(containers, toId);

	const fromContainer = containers[fromId];
	const toContainer = containers[toId];

	if (!fromContainer || !toContainer) {
		return { containers };
	}

	// Find the liquid entry in source
	const sourceIndex = fromContainer.liquids.findIndex(
		(entry) => entry.key === transfer.liquid,
	);

	// No-op if liquid not found in source
	if (sourceIndex === -1) {
		return { containers };
	}

	const sourceEntry = fromContainer.liquids[sourceIndex];

	if (!sourceEntry) {
		return { containers };
	}

	// No-op if source does not have enough volume
	if (sourceEntry.volumeMl < transfer.volumeMl) {
		return { containers };
	}

	// Subtract from source
	sourceEntry.volumeMl -= transfer.volumeMl;
	fromContainer.totalVolumeMl -= transfer.volumeMl;

	// Remove entry if volume is zero
	if (sourceEntry.volumeMl === 0) {
		fromContainer.liquids.splice(sourceIndex, 1);
	}

	// Add to destination
	const destIndex = toContainer.liquids.findIndex(
		(entry) => entry.key === transfer.liquid,
	);

	if (destIndex !== -1) {
		// Merge with existing entry
		const destEntry = toContainer.liquids[destIndex];
		if (destEntry) {
			destEntry.volumeMl += transfer.volumeMl;
		}
	} else {
		// Add new entry
		const destEntry: LiquidEntry = {
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

//============================================

/**
 * Apply a discharge: subtract from source only.
 * Returns new state with source container updated.
 * No-op if source is empty or does not exist.
 */
function applyDischarge(
	containers: Record<string, ContainerLiquid>,
	transfer: LiquidTransfer,
): LiquidState {
	const fromId = transfer.from;

	// Validate required field
	if (!fromId) {
		return { containers };
	}

	// Ensure container exists
	ensureContainer(containers, fromId);

	const fromContainer = containers[fromId];

	if (!fromContainer) {
		return { containers };
	}

	// Find the liquid entry in source
	const sourceIndex = fromContainer.liquids.findIndex(
		(entry) => entry.key === transfer.liquid,
	);

	// No-op if liquid not found in source
	if (sourceIndex === -1) {
		return { containers };
	}

	const sourceEntry = fromContainer.liquids[sourceIndex];

	if (!sourceEntry) {
		return { containers };
	}

	// No-op if source does not have enough volume
	if (sourceEntry.volumeMl < transfer.volumeMl) {
		return { containers };
	}

	// Subtract from source
	sourceEntry.volumeMl -= transfer.volumeMl;
	fromContainer.totalVolumeMl -= transfer.volumeMl;

	// Remove entry if volume is zero
	if (sourceEntry.volumeMl === 0) {
		fromContainer.liquids.splice(sourceIndex, 1);
	}

	return { containers };
}

//============================================

/**
 * Apply a mix: combine liquids with the same key within one container.
 * Returns new state with combined entries.
 * No-op if container is empty or does not exist.
 */
function applyMix(
	containers: Record<string, ContainerLiquid>,
	transfer: LiquidTransfer,
): LiquidState {
	const fromId = transfer.from;

	// Validate required field
	if (!fromId) {
		return { containers };
	}

	// Ensure container exists
	ensureContainer(containers, fromId);

	const fromContainer = containers[fromId];

	if (!fromContainer) {
		return { containers };
	}

	// Find all entries with the target liquid key
	const indices = fromContainer.liquids
		.map((entry, idx) => (entry.key === transfer.liquid ? idx : -1))
		.filter((idx) => idx !== -1);

	// No-op if fewer than 2 entries to merge
	if (indices.length < 2) {
		return { containers };
	}

	// Sum volumes
	let totalVolume = 0;
	let firstColorKey: string | undefined;

	for (const idx of indices) {
		const entry = fromContainer.liquids[idx];
		if (entry) {
			totalVolume += entry.volumeMl;
			if (!firstColorKey && entry.colorKey) {
				firstColorKey = entry.colorKey;
			}
		}
	}

	// Replace all with a single merged entry
	const merged: LiquidEntry = {
		key: transfer.liquid,
		volumeMl: totalVolume,
	};
	if (firstColorKey) {
		merged.colorKey = firstColorKey;
	}

	// Remove old entries (in reverse order to avoid index shift)
	for (let i = indices.length - 1; i >= 0; i--) {
		const idx = indices[i];
		if (idx !== undefined) {
			fromContainer.liquids.splice(idx, 1);
		}
	}

	// Add merged entry
	fromContainer.liquids.push(merged);

	return { containers };
}

//============================================

/**
 * Ensure a container exists in the state.
 * Modifies containers in place.
 */
function ensureContainer(
	containers: Record<string, ContainerLiquid>,
	id: string,
): void {
	if (!containers[id]) {
		containers[id] = {
			liquids: [],
			totalVolumeMl: 0,
		};
	}
}
