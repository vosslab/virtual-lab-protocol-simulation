/**
 * render/request.ts
 *
 * RenderRequest queue and subscriber API.
 *
 * Collapses redundant redraw requests within one animation frame.
 * Permits walkers and other consumers to listen for world-changed events
 * without polling.
 *
 * Design:
 * - requestRedraw() queues a redraw. Multiple calls within one frame -> one flush.
 * - subscribe() registers a listener; returns unsubscribe function.
 * - notifyWorldChanged() fires all current subscribers exactly once per call.
 * - requestAnimationFrame scheduling (browser); flushPending() for tests (node).
 */

/**
 * Listener type: a no-arg callback fired when the world changes.
 */
export type WorldChangedListener = () => void;

/**
 * Module-level state: the set of current subscribers and the pending redraw flag.
 */
let subscribers: Set<WorldChangedListener> = new Set();
let pendingRedraw = false;
let rafHandle: number | null = null;

/**
 * Internal flush: runs the pending redraw action (currently a no-op; intended for
 * integration with the render loop). Clears the pending flag.
 */
function flushRedraw(): void {
	pendingRedraw = false;
	// Placeholder for future render-loop integration. The redraw action itself
	// (re-rendering DOM, updating visuals) happens via subscribers.
}

/**
 * Schedules a redraw for the next animation frame.
 * Idempotent within one frame: multiple calls produce one flush.
 * Browser context: uses requestAnimationFrame.
 * Node context (tests): marked pending; flushPending() runs it synchronously.
 */
export function requestRedraw(): void {
	// Redraw already scheduled for this frame; no-op.
	if (pendingRedraw) {
		return;
	}

	pendingRedraw = true;

	// Browser context: schedule via requestAnimationFrame.
	if (typeof requestAnimationFrame !== 'undefined') {
		rafHandle = requestAnimationFrame(() => {
			flushRedraw();
		});
	}
	// Node context (tests): no auto-scheduling. flushPending() runs it synchronously.
}

/**
 * Registers a listener to be called whenever the world changes.
 * Returns an unsubscribe function that removes the listener.
 *
 * @param listener A no-arg callback.
 * @returns Unsubscribe function.
 */
export function subscribe(listener: WorldChangedListener): () => void {
	subscribers.add(listener);

	return () => {
		subscribers.delete(listener);
	};
}

/**
 * Fires all current subscribers exactly once per call.
 * Called by the runtime after every applySceneOperation.
 * Subscribers are called in insertion order (Set iteration order).
 */
export function notifyWorldChanged(): void {
	// Snapshot the current set; iterate and call each listener.
	// This prevents issues if a listener unsubscribes during iteration.
	const current = Array.from(subscribers);
	current.forEach(listener => {
		listener();
	});
}

/**
 * Test helper: synchronously flushes the pending redraw.
 * Used in node tests to avoid waiting for requestAnimationFrame.
 * Browser context: no-op if not pending.
 */
export function flushPending(): void {
	if (pendingRedraw) {
		// Cancel any scheduled RAF if present.
		if (rafHandle !== null) {
			cancelAnimationFrame(rafHandle);
			rafHandle = null;
		}
		// Immediately run the flush.
		flushRedraw();
	}
}

/**
 * Test helper: clears all subscribers and resets pending state.
 * Used between tests to ensure clean state.
 */
export function resetState(): void {
	subscribers.clear();
	pendingRedraw = false;
	if (rafHandle !== null) {
		cancelAnimationFrame(rafHandle);
		rafHandle = null;
	}
}
