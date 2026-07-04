// tests/playwright/e2e/helper_protocol_discovery.mjs
//
// Shared curriculum-protocol discovery for the runner-model walker sweep.
//
// Support file (helper_ prefix) per PLAYWRIGHT_TEST_STYLE.md file-layout rules:
// it exports a helper and is not itself a test. Extracted from the legacy
// walk_all_protocols.mjs sweep so the runner spec (protocol_walkthrough.spec.ts)
// can enumerate protocols WITHOUT importing that file (whose top-level main()
// would launch the old library-model sweep on import).
//
// Source of truth: content/protocols/**/protocol.yaml. That tree IS the
// definitional set of curriculum protocols -- one protocol.yaml per protocol
// package. Deriving the id list from it means a protocol added or removed under
// content/ is picked up automatically, so the sweep can never silently
// under-test a real protocol. The protocol id is the parent directory name of
// each protocol.yaml, which matches the authored protocol_name field for every
// curriculum protocol.

import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "../repo_root.mjs";

//============================================
// Protocol discovery
//============================================

// Directory that defines the curriculum protocols: one <id>/protocol.yaml per
// protocol package, grouped under cluster subdirectories.
const CONTENT_DIR = path.join(REPO_ROOT, "content", "protocols");

// Recursively collect the id (parent directory name) of every protocol.yaml.
function walkForProtocolYaml(dirPath, ids) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkForProtocolYaml(entryPath, ids);
    } else if (entry.isFile() && entry.name === "protocol.yaml") {
      ids.push(path.basename(dirPath));
    }
  }
}

// Return the sorted list of curriculum protocol ids discovered from
// content/protocols/. Sorted so the per-protocol test matrix order is
// deterministic across runs and platforms.
export function discoverProtocolIds() {
  const ids = [];
  walkForProtocolYaml(CONTENT_DIR, ids);
  ids.sort();
  return ids;
}
