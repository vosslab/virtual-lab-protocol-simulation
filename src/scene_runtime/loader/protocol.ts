/**
 * src/scene_runtime/loader/protocol.ts
 *
 * Protocol loader: validates and returns a typed ProtocolConfig.
 *
 * Validates:
 * - entry_step exists in steps[].step_name
 * - every next_step (when non-null) exists in steps[].step_name
 * - no duplicate step names
 * - all required fields present (no silent defaults)
 *
 * Throws loud errors on every violation with the offending protocol / step / field cited.
 */

import type { ProtocolConfig } from "../types";

// Runtime-injected by the test harness or runtime entry point.
// Module-level cache to avoid re-importing.
let PROTOCOL_CATALOG_INJECTED: Record<string, ProtocolConfig> | null = null;

/**
 * Set the protocol catalog for the loader.
 * Must be called with the PROTOCOL_CATALOG from generated/protocol_data.ts
 * before any loadProtocol() calls.
 *
 * Exported for test use; normally set by bundle/entry.ts at runtime startup.
 */
export function setProtocolCatalog(
  catalog: Record<string, ProtocolConfig>,
): void {
  PROTOCOL_CATALOG_INJECTED = catalog;
}

/**
 * Brand type for protocol names.
 * Validates that the name exists in PROTOCOL_CATALOG.
 */
export type ProtocolName = string & { readonly __brand: "ProtocolName" };

/**
 * Validate and construct a ProtocolName brand.
 * Throws if the name is not in PROTOCOL_CATALOG_INJECTED.
 * Requires setProtocolCatalog() to have been called first.
 */
export function ProtocolName(raw: string): ProtocolName {
  if (!PROTOCOL_CATALOG_INJECTED) {
    throw new Error(
      "Protocol loader not initialized; call setProtocolCatalog() first",
    );
  }
  if (!(raw in PROTOCOL_CATALOG_INJECTED)) {
    throw new Error(`unknown protocol name: ${raw}`);
  }
  return raw as ProtocolName;
}

/**
 * loadProtocol(name: ProtocolName): ProtocolConfig
 *
 * Load a protocol by name from the injected PROTOCOL_CATALOG.
 * Validate entry_step and all next_step references.
 * Throw loud errors on missing fields or invalid references.
 * Return the typed, validated ProtocolConfig.
 *
 * Requires setProtocolCatalog() to have been called first.
 */
export function loadProtocol(name: ProtocolName): ProtocolConfig {
  if (!PROTOCOL_CATALOG_INJECTED) {
    throw new Error(
      "Protocol loader not initialized; call setProtocolCatalog() first",
    );
  }
  const proto = PROTOCOL_CATALOG_INJECTED[name];

  if (!proto) {
    throw new Error(`missing protocol in catalog: ${name}`);
  }

  // Validate required top-level fields.
  if (!proto.protocol_type) {
    throw new Error(
      `missing required field protocol_type on protocol: ${name}`,
    );
  }
  if (!proto.protocol_name) {
    throw new Error(
      `missing required field protocol_name on protocol: ${name}`,
    );
  }
  if (proto.entry_step === undefined) {
    throw new Error(`missing required field entry_step on protocol: ${name}`);
  }
  if (!Array.isArray(proto.steps)) {
    throw new Error(`missing required field steps on protocol: ${name}`);
  }

  // Build a set of step names for validation.
  const stepNameSet = new Set<string>();
  const stepNames: string[] = [];

  for (let i = 0; i < proto.steps.length; i++) {
    const step = proto.steps[i]!;

    // Validate each step has required fields.
    if (!step.step_name) {
      throw new Error(
        `missing required field step_name at steps[${i}] on protocol: ${name}`,
      );
    }
    if (!step.prompt) {
      throw new Error(
        `missing required field prompt at steps[${i}].step_name="${step.step_name}" on protocol: ${name}`,
      );
    }
    if (!Array.isArray(step.sequence)) {
      throw new Error(
        `missing required field sequence at steps[${i}].step_name="${step.step_name}" on protocol: ${name}`,
      );
    }
    if (!step.step_validator) {
      throw new Error(
        `missing required field step_validator at steps[${i}].step_name="${step.step_name}" on protocol: ${name}`,
      );
    }
    if (!step.outcome) {
      throw new Error(
        `missing required field outcome at steps[${i}].step_name="${step.step_name}" on protocol: ${name}`,
      );
    }
    if (step.next_step === undefined) {
      throw new Error(
        `missing required field next_step at steps[${i}].step_name="${step.step_name}" on protocol: ${name}`,
      );
    }

    // Check for duplicate step names.
    if (stepNameSet.has(step.step_name)) {
      throw new Error(
        `duplicate step_name "${step.step_name}" on protocol: ${name}`,
      );
    }

    stepNameSet.add(step.step_name);
    stepNames.push(step.step_name);
  }

  // Validate entry_step.
  if (!stepNameSet.has(proto.entry_step)) {
    throw new Error(
      `entry_step "${proto.entry_step}" not found in steps on protocol: ${name}`,
    );
  }

  // Validate every next_step reference.
  for (let i = 0; i < proto.steps.length; i++) {
    const step = proto.steps[i]!;
    const nextStep = step.next_step;

    if (nextStep !== null && !stepNameSet.has(nextStep)) {
      throw new Error(
        `next_step "${nextStep}" not found in steps at step_name="${step.step_name}" on protocol: ${name}`,
      );
    }
  }

  // If we got here, the protocol is valid. Return it.
  return proto;
}
