/**
 * render/clock.ts
 *
 * Clock abstraction for deterministic time handling in the scene runtime.
 *
 * Defines a Clock interface with two implementations:
 * - productionClock: real time, backed by setTimeout (for production runs).
 * - testClock: advance-on-command (for unit tests, ensures instant deterministic execution).
 *
 * The applier receives an injected clock instance, not a global. This permits
 * tests to inject a testClock that advances instantly on command, while production
 * code injects productionClock for real time behavior.
 */

/**
 * Clock interface.
 *
 * schedule(durationMs, callback) arranges a callback to fire after durationMs milliseconds
 * (wall-clock time in production, test-clock advance in tests). Returns a cancel function
 * that prevents the callback if called before the deadline.
 */
export interface Clock {
  schedule(durationMs: number, callback: () => void): () => void;
}

/**
 * Test clock: advances on command.
 *
 * Extends Clock with an advance(ms) method that fires all callbacks
 * whose deadline has elapsed.
 */
export interface TestClock extends Clock {
  advance(ms: number): void;
}

/**
 * Production clock implementation.
 *
 * Backed by setTimeout. schedule() returns a cancel function via clearTimeout.
 */
export const productionClock: Clock = {
  schedule(durationMs: number, callback: () => void): () => void {
    const timeoutId = setTimeout(callback, durationMs);
    return () => clearTimeout(timeoutId);
  },
};

/**
 * Factory: create a test clock.
 *
 * Test clock maintains a scheduled-callbacks queue with deadlines (current time + duration).
 * advance(ms) increments the internal clock time and fires any callbacks whose deadline
 * has elapsed.
 */
export function createTestClock(): TestClock {
  let currentTimeMs = 0;
  interface ScheduledCallback {
    deadline: number;
    callback: () => void;
    cancelled: boolean;
  }
  const scheduledCallbacks: ScheduledCallback[] = [];

  return {
    schedule(durationMs: number, callback: () => void): () => void {
      const scheduled: ScheduledCallback = {
        deadline: currentTimeMs + durationMs,
        callback,
        cancelled: false,
      };
      scheduledCallbacks.push(scheduled);

      // Return a cancel function.
      return () => {
        scheduled.cancelled = true;
      };
    },

    advance(ms: number): void {
      currentTimeMs += ms;

      // Fire all callbacks whose deadline has elapsed (and have not been cancelled).
      for (const scheduled of scheduledCallbacks) {
        if (!scheduled.cancelled && scheduled.deadline <= currentTimeMs) {
          scheduled.callback();
          scheduled.cancelled = true;
        }
      }
    },
  };
}
