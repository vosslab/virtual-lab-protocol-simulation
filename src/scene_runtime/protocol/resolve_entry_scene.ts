// src/scene_runtime/protocol/resolve_entry_scene.ts
//
// Entry-scene resolution for protocols. Extracted from protocol_host.tsx so
// that unit tests can import and exercise the logic without a DOM environment.
//
// Resolution precedence:
//   1. The entry step's optional `scene:` field.
//   2. The first SceneChange.to_scene in the entry step's sequence (compat fallback).
//   3. Throw a clear error.
//
// For sequence_runner protocols: the runner has no steps of its own; it carries
// only a mini_protocols ordered list. Resolution delegates to the first listed
// mini-protocol by looking it up in the protocols map and applying the same
// precedence to its entry step.
//
// No protocol-level entry_scene field is read (forbidden by PRIMARY_SPEC.md).
// The brittle protocol-name prefix guess is removed.

import type { ProtocolConfig, ProtocolKind } from "../../shell/adapter/types.js";

//============================================

/**
 * Assert that a rendered scene is non-empty for a student-visible protocol.
 *
 * An empty final[] would silently paint only the background, violating the
 * fail-loud rule. The only exemption is dev_smoke protocols, which are
 * test scaffolds that intentionally exercise partial or empty scenes.
 *
 * @param final_count - Number of ComputedItems in pipeline_result.final.
 * @param protocol_type - The protocol_type discriminator.
 * @param protocol_name - For the error message.
 * @param scene_name - For the error message.
 * @throws Error if final_count === 0 and protocol_type is not dev_smoke.
 */
export function assert_scene_not_empty(
  final_count: number,
  protocol_type: ProtocolKind,
  protocol_name: string,
  scene_name: string,
): void {
  if (final_count === 0 && protocol_type !== "dev_smoke") {
    throw new Error(
      `protocol_host: scene "${scene_name}" for protocol "${protocol_name}" rendered ` +
        `empty (final.length === 0). The scene must contain at least one placement. ` +
        `Check that the scene YAML has placements and that the object library resolves them.`,
    );
  }
}

//============================================

/**
 * Resolve the initial scene name for a protocol.
 *
 * @param config - The protocol config to resolve.
 * @param protocols - The full PROTOCOLS map, needed for runner delegation.
 * @returns The resolved scene name.
 * @throws Error if resolution fails (no scene: field, no SceneChange, or runner delegation fails).
 */
export function resolve_entry_scene_name(
  config: ProtocolConfig,
  protocols: Readonly<Record<string, ProtocolConfig>>,
): string {
  // For sequence runners, delegate to the first listed mini-protocol.
  if (config.protocol_type === "sequence_runner") {
    const mini_protocols = config.mini_protocols;
    if (!mini_protocols || mini_protocols.length === 0) {
      throw new Error(
        `protocol_host: sequence_runner "${config.protocol_name}" has no mini_protocols list`,
      );
    }
    const first_mini_name = mini_protocols[0];
    if (first_mini_name === undefined) {
      // Already guarded by .length === 0 above, but noUncheckedIndexedAccess requires this.
      throw new Error(
        `protocol_host: sequence_runner "${config.protocol_name}" mini_protocols list is empty`,
      );
    }
    const first_mini_config = protocols[first_mini_name];
    if (!first_mini_config) {
      throw new Error(
        `protocol_host: sequence_runner "${config.protocol_name}" first mini-protocol ` +
          `"${first_mini_name}" not found in PROTOCOLS`,
      );
    }
    // Recurse: apply the same precedence to the mini-protocol's entry step.
    return resolve_entry_scene_name(first_mini_config, protocols);
  }

  // Find the entry step in config.steps.
  // sequence_runner protocols branch and return earlier; this path is mini_protocol/dev_smoke only.
  const steps = config.steps ?? [];
  for (const step of steps) {
    if (step.step_name !== config.entry_step) {
      continue;
    }
    // Precedence 1: the step's explicit scene: field.
    if (step.scene !== undefined && step.scene !== "") {
      return step.scene;
    }
    // Precedence 2: first SceneChange.to_scene in the step's sequence (compat fallback).
    for (const interaction of step.sequence) {
      for (const op of interaction.response.scene_operations) {
        if (op.type === "SceneChange") {
          return op.to_scene;
        }
      }
    }
  }

  throw new Error(
    `protocol_host: cannot resolve entry scene for protocol "${config.protocol_name}" ` +
      `(entry_step "${config.entry_step}" has no scene: field and no SceneChange in its sequence)`,
  );
}
