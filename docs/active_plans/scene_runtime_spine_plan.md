# Plan: Fresh scene/protocol runtime spine, content migration, legacy strip

## Context

The repo's "shared" scene tooling grew as a side branch off the cell_culture_hood scene. Subsequent scenes (well_plate_workspace, bench, microscope) were treated as derivatives, which violates `docs/PRIMARY_CONTRACT.md` item 1 (YAML config + TypeScript shared runtime, no scene as parent model). The most recent mini-protocol, `tutorial_plate_drug_additions` on `well_plate_workspace`, paused on 2026-05-12 because each incremental fix surfaced another scene-engine flaw (launcher routing, click-target derivation, capability schema, pointer-events scoping, pulse-keyframe duplication, missing dispatch branches, microtube data-attribute mismatch). The pause note concludes the scene interaction model is under-specified.

Continuing to surgically clean the existing tree keeps preserving hood's center of gravity. This plan replaces the broken core with a fresh contract-compliant scene/protocol runtime under `src/scene_runtime/`, proves it on the broken mini-protocol (well_plate) first, then migrates hood and the remaining adapters into the new runtime. The long protocol is restructured as connected mini-protocols, each compiled to its own HTML. Legacy hood-centered branches are deleted only after every migrated mini-protocol walker-verifies on the new spine.

## Objectives

- Ship a contract-compliant scene/protocol runtime in fresh modules (`src/scene_runtime/`) that no current scene adapter contaminates.
- Prove the new runtime by running the decomposed `tutorial_plate_drug_additions` end-to-end with the generic Playwright walker for all 8-10 of its steps.
- Decompose the curriculum first: break the 909-line `cell_culture` and the 866-line `tutorial_plate_drug_additions` into coherent 6-10 step mini-protocols, each with its own learning block; absorb or reclassify the existing tiny (<30 line, 1-2 step) tutorials.
- Rescope items in `items.yaml` so each clickable item lives in the scene where the student actually uses it, not in hood by default.
- Add a protocol-level `entry:` block (initial scene plus first step) so a mini-protocol can start in its declared scene without a hood detour, and route the launcher accordingly.
- Migrate cell_culture_hood, bench, microscope, and capability workspaces to the new runtime as peer adapters.
- Compile each mini-protocol to its own HTML, linked from a launcher index page, with a shared library bundle.
- Ship a schema-driven E2E walker that drives the visible UI from protocol/scene YAML with zero per-protocol branches and zero state writes.
- Delete or archive legacy `src/scenes/` and align all `docs/SCENE_*.md` / `docs/PROTOCOL_*.md` to the contract.

## Design philosophy

Controlled replacement, not big-bang rewrite. The current generic-looking core (`scene_driver`, `scene_registry`, `layout_engine`, `capabilities/`, `shared/`) is treated as a reference and content source, not as the architectural foundation. The new spine is validated on the hardest broken case (well_plate) before the easiest working case (hood) migrates, which avoids re-baking hood assumptions into the spine. "Fix the design, not the symptom" (`docs/REPO_STYLE.md`) is the operating principle: prior incremental refactors hid contract violations behind shared utilities. Rejected alternatives: (a) incremental hood-extract refactor (keeps wrong center of gravity); (b) full structural refocus with folder renames and a formal Scene SDK release (architecture astronautics); (c) stabilization-only well_plate patching (does not address contract).

Walker drives the UI, not the model. The E2E walker reads protocol and scene YAML to know the expected student journey, but every action is performed through the visible browser UI. The walker is a runtime verifier generated from the same YAML contract that drives the runtime, not a second hand-authored protocol. A walker that needs a per-step or per-protocol branch is evidence that the YAML is under-specified or the UI is not exposing a usable affordance, not a license to add a branch.

Walking-skeleton rule. No broad runtime-subsystem work is allowed in M3 beyond what is needed to support one visible well_plate interaction in M5. Subsystem expansion (layout, dispatch, highlight, liquid) happens in M6 as steps demand it. The vertical proof in M5 comes before subsystem completion in M6. This rule overrides any temptation to "finish the spine first" and is the primary anti-astronautics guardrail in this plan.

Curriculum-first rule. Mini-protocol decomposition (M1) happens before any new runtime code. The content model has been confusing the codebase by encoding tiny one-click "tutorials" as if they were mini-protocols; fixing the curriculum first stops the new runtime from inheriting that mistake. Existing tiny stubs are absorbed, retired to a developer-smoke folder, or expanded to >= 6 steps before they ride the new spine.

## Scope

- Audit and reconcile `docs/SCENE_ARCHITECTURE.md`, `docs/SCENE_VOCABULARY.md`, `docs/SCENE_YAML_FORMAT.md`, `docs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/PROTOCOL_VOCABULARY.md`, `docs/PROTOCOL_YAML_FORMAT.md`, `docs/PROTOCOL_STEPS.md` against `docs/PRIMARY_CONTRACT.md` (conflict table first at M0, full rewrites at M9).
- Build new module tree under `src/scene_runtime/` exporting contract APIs at build-time-loaded form: layout engine, click dispatcher, highlight derivation, liquid state. Browser runtime consumes generated TypeScript or JSON only; YAML is parsed at build time by `tools/build_protocol_data.py` (or its replacement), never in the browser.
- Implement `well_plate_workspace` adapter on the new runtime and ship `tutorial_plate_drug_additions` walker-verified.
- Split build pipeline so each mini-protocol emits its own HTML; add launcher index.
- Migrate `cell_culture_hood`, `bench`, `microscope`, and capability workspaces as peer adapters.
- Delete or archive legacy `src/scenes/` once all adapters migrated.
- Build `tests/playwright/walker/` schema-driven walker engine plus a single `tests/playwright/walker.mjs` entry point that runs against any protocol id. Walker engine lives in the test tree, not the production runtime tree, so production APIs are not shaped for the test harness.
- Rewrite the seven SCENE_*/PROTOCOL_* docs against the locked runtime APIs.

## Non-goals

- Rewriting all scenes simultaneously (big-bang prohibited per design philosophy).
- Folder renames, registry redesign, or a published Scene SDK package (architecture astronautics).
- Pre-emptive full doc rewrites in M0 (conflict table only; full rewrites at M9).
- Changing protocol YAML semantics (`learning.objectives`, `outcomes`, `goals` block stays per contract item 5).
- Touching unmigrated scenes between M3 and M8 (spine must lock before mass migration).
- Reworking the asset SVG normalization pipeline (works today; reused as-is).
- Hand-authoring per-protocol walker scripts (walker is generic and YAML-driven; no `if step.id === ...` branches).
- Walker writing to `window.gameState`, forcing `activeScene`, setting `selectedTool`, or calling internal APIs to make progress.

## Current state summary

- Generic-looking core (`scene_driver.ts`, `scene_registry.ts`, `layout_engine.ts`, `capabilities/`, `shared/`) exists but is hood-leaky: hood-specific completion events, label rules, and item-id checks live in `src/scenes/cell_culture_hood/`. `src/init.ts` lines 410-414 special-case the legacy `'hood'` activeScene name.
- Nine protocols live under `src/content/<protocol>/` as `items.yaml`, `reagents.yaml`, `protocol.yaml`. Mini-protocols are selected at runtime via `?protocol=<id>` URL parameter and compile to a single `dist/index.html` (~914 KB), not per-HTML.
- `well_plate_workspace` bypasses the layout engine, declares `capabilities: []`, hard-codes a five-region CSS grid in TypeScript, and inlines dispatch logic. Pause note (2026-05-12) records only step 6 of 16 walker-verified, with discharge/multi-tube/plate-transfer at 0% coverage. `WP-C1-VISUAL` and `WP-G1` visual gates never passed. Breadcrumb metadata broken; `distilled_water` orphaned.
- Reusable artifacts retained from prior work: `multipleChoice` / `tubeTargets` / `plateTargets` schemas and validators, reagent-driven liquid state (`tubeLiquids`, `plateLiquids`), Bioicons asset normalization pipeline, launcher-initial-scene routing fix, walker scene-isolation assertion, shared `next-target-pulse` keyframe.
- Verification baseline at pause: `tsc-exit=0`, `pytest tests/` 417 passed, `tools/build_protocol_data.py` clean, `npm run build` clean.

## Architecture boundaries and ownership

Ownership layers (grouped by content, runtime, test, and build concerns):

| Layer | Owns |
| --- | --- |
| Protocol YAML | `learning` block, `entry:` block, `protocolType`, steps, completion paths, sequencing |
| Scene YAML | SVG object declarations, layout zones, static scene config |
| Build-time loader (`tools/build_protocol_data.py`) | parses YAML, validates schema, emits typed generated TypeScript / JSON |
| `src/scene_runtime/` shared TypeScript | layout engine, click routing, highlight derivation, completion dispatch, liquid state. Consumes generated typed data; no YAML parser in browser |
| `src/scene_runtime/adapters/<scene>/` | scene-specific rendering and structured-object behavior only |
| `tests/playwright/walker/` | schema-driven E2E walker; lives in test tree |
| Build pipeline | per-mini-protocol HTML, shared library bundle, launcher index |

Shared physical items (micropipette, media_bottle, well_plate when it appears in multiple scenes, etc.) are declared as scene objects per scene where they appear. If a shared identity is needed across scenes (e.g., a single bottle whose state persists), it is represented by a shared inventory identity referenced from each scene's declaration. Items must not be faked into a single global scene to dodge the per-scene declaration rule.

Protocol type taxonomy:

- `mini_protocol` -- public tutorial; subject to 6-10 step gate and complete `learning` block.
- `sequence_runner` -- linked-sequence runner that executes other mini-protocols in order; not subject to step-count gate; still has a `learning` block scoped to the overall goal.
- `dev_smoke` -- developer smoke test or fixture; lives under `src/content/_dev_smoke/`; exempt from step-count and learning-block gates.

Ownership rules:

- `src/scene_runtime/` core never imports from any adapter.
- Adapters never import from each other.
- Scene YAML may not embed TypeScript identifiers or computed fields; loader enforces.
- All clickable objects declared in scene YAML, placed by layout engine, with custom geometry allowed only inside structured scientific objects (per contract item 3).

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M0 / WS-DOC | `docs/SCENE_*`, `docs/PROTOCOL_*`, `docs/active_plans/scene_runtime_doc_conflicts.md` | 2-4 |
| M1 / WS-DECOMP | curriculum decomposition: new `src/content/<mini_protocol>/` folders for the proposed mini-protocol set; reclassify tiny tutorials; rescope `items.yaml` per scene | 4-7 |
| M2 / WS-ENTRY | protocol YAML `entry:` block schema, loader validation, `src/init.ts` startup routing, per-protocol audit | 2-3 |
| M3 / WS-SPINE | `src/scene_runtime/contract.ts`, `types.ts`, build-time `loader.ts` | 3-5 |
| M4 / WS-WALKER-ENGINE | `tests/playwright/walker/`, `tests/playwright/walker.mjs` | 2-3 |
| M5 / WS-WP-VERTICAL | one well_plate step end-to-end (minimal adapter + YAML + walker run) | 1-2 |
| M6 / WS-WP-SCENE | `src/scene_runtime/adapters/well_plate/` complete | 2-3 |
| M6 / WS-WP-CONTENT | `src/content/<plate_addition_mini_protocols>/` YAML | 2-3 |
| M6 / WS-WP-WALKER | walker proof run for each plate-addition mini-protocol | 2-3 |
| M6 / WS-LAYOUT | `src/scene_runtime/layout/` | 2-3 |
| M6 / WS-DISPATCH | `src/scene_runtime/dispatch/`, `src/scene_runtime/highlight/` | 2-3 |
| M6 / WS-LIQUID | `src/scene_runtime/liquid/` | 1-2 |
| M7 / WS-BUILD | `tools/build_protocol_data.py`, npm build config | 2-4 |
| M7 / WS-LAUNCHER | `src/launcher/`, `dist/index.html` generator | 1-2 |
| M8 / WS-HOOD | `src/scene_runtime/adapters/cell_culture_hood/` | 3-5 |
| M8 / WS-BENCH | `src/scene_runtime/adapters/bench/` | 1-2 |
| M8 / WS-MICRO | `src/scene_runtime/adapters/microscope/` plus capability workspaces | 1-2 |
| M9 / WS-CLEAN | `src/scenes/` archive/delete, `src/init.ts` cleanup | 2-3 |
| M9 / WS-DOCS-FINAL | full rewrite of seven SCENE_*/PROTOCOL_* docs | 1-2 |

## Walker contract

The E2E walker is a runtime verifier generated from the same protocol and scene YAML that drives the application. The walker reads YAML to know what a real student should be able to do, then performs every action through the visible browser UI. The walker is not a parallel hand-authored protocol.

### Allowed walker behavior

- Load the page through the normal launcher or `?protocol=<id>` URL.
- Dismiss the welcome screen using the visible dismiss control.
- Dispatch on `completionPath.kind` only. Allowed values for dispatch:
  - `interactionSequence` -- click visible tool, visible source, visible destination as declared in YAML.
  - `directTool` -- click visible tool or visible instrument control.
  - `modal` -- click the visible opener, then the visible advance or confirm control.
  - `multipleChoice` -- click the visible answer choice declared in `choices`.
- Resolve click targets from YAML fields: `tool`, `source`, `destination`, `openClick`, `advanceClick`, `choices`. Use scene YAML to know which DOM nodes should exist and where.
- Read `window.gameState` and scene DOM only for verification (visibility checks, highlight assertions, completion confirmation).
- Screenshot the visible viewport before and after every meaningful action (every click), filed under `test-results/walker/<protocol_id>/step_<NN>/<action_NN>_<before|after>.png`. End-of-step summary screenshot also retained.

### Forbidden walker behavior

- Branching on `step.id`, `protocolId`, or `modal.owner`.
- Writing to `window.gameState`, `window.activeScene`, `window.selectedTool`, or any internal runtime state.
- Mutating `window.prompt`, `window.confirm`, or other DOM globals to short-circuit interaction.
- Calling internal runtime APIs to make progress (only YAML-declared UI affordances).
- Clicking DOM nodes that are technically present but not visible or not styled as a clickable affordance.
- Forcing a scene transition the user could not trigger themselves.

### Hard gates

If the walker needs a special branch to make progress, one of the following is true and must be fixed before the walker is patched:

1. The YAML schema is missing declarative information the walker needs (extend the schema and the YAML, never the walker).
2. The runtime is not exposing a visible clickable affordance the YAML declared (fix the adapter or the runtime).
3. The scene YAML is missing a clickable object the protocol step references (fix the YAML).

Walker fixes never take the form of adding a `step.id` branch.

Entry-scene gate: no mini-protocol may rely on `cell_culture_hood` as its entry scene unless its first authored step is in the hood. Walker startup must reach the protocol's declared entry scene by normal page load, not by clicking through hood.

## Milestone plan

### Milestone M0: Doc audit and conflict table

- Depends on: none.
- Workstreams: WS-DOC.
- Entry criteria: `docs/PRIMARY_CONTRACT.md` published and stable (true).
- Exit criteria:
  - `docs/active_plans/scene_runtime_doc_conflicts.md` exists with rows for all seven SCENE_*/PROTOCOL_* docs.
  - Each row classified as `matches-contract`, `stale-sections`, or `must-rewrite` with line refs and required action.
  - Stale sections receive an inline `> CONTRACT MIGRATION:` margin note (no full rewrites yet).
  - `docs/CHANGELOG.md` entry under `### Documentation`.
- Parallel-plan ready: no -- single doc-audit workstream.

### Milestone M1: Mini-protocol curriculum decomposition

- Depends on: M0.
- Workstreams: WS-DECOMP.
- Entry criteria: M0 exit met.
- Exit criteria:
  - Proposed mini-protocol set authored under `src/content/` (target list, subject to user confirmation in Open questions):
    - `tutorial_hood_setup_and_flask_prep` (6-8 steps, hood, `protocolType: mini_protocol`)
    - `tutorial_cell_counting_and_seeding` (6-8 steps, bench or hood, `protocolType: mini_protocol`)
    - `tutorial_drug_dilution_planning` (6-10 steps, well_plate_workspace or hood, `protocolType: mini_protocol`)
    - `tutorial_plate_drug_additions` (8-10 steps, well_plate_workspace, `protocolType: mini_protocol`; replaces current 866-line monolith)
    - `tutorial_mtt_assay_readout` (6-8 steps, hood or bench, `protocolType: mini_protocol`)
    - `tutorial_cell_culture_full` (linked sequence runner of the above; `protocolType: sequence_runner`; launcher entry only)
  - Each new mini-protocol has its own folder with `protocol.yaml`, `items.yaml`, `reagents.yaml`.
  - Each `protocol.yaml` declares `protocolType` and (for `mini_protocol`) `learning.objectives`, `learning.outcomes`, `learning.goals` per contract item 5.
  - Each `mini_protocol` has between 6 and 10 steps. `sequence_runner` and `dev_smoke` are exempt.
  - Each new `protocol.yaml` records the intended entry scene at the top of the file as a comment line `# intended_entry_scene: <scene_id>` (the formal `entry:` block lands in M2).
  - Existing tiny tutorials (`tutorial_bench_direct` 26 lines, `tutorial_cell_counter` 27 lines, `tutorial_plate_reader` 27 lines, `tutorial_hood_transfer` 40 lines, `tutorial_hemocytometer_count` 50 lines, `tutorial_drug_dilution` 54 lines) audited: each is absorbed into a new mini-protocol as steps, retired to `src/content/_dev_smoke/` with `protocolType: dev_smoke`, or expanded to >=6 steps with `protocolType: mini_protocol` and a learning block.
  - Items rescoped per scene: every `items.yaml` entry declares the scene where the student uses the item. Shared physical items (micropipette, media_bottle, etc.) appear as a scene object in each scene they appear in, with a shared inventory identity if state must persist across scenes. No item defaults to hood unless hood is its real teaching scene.
  - Curriculum map filed at `docs/active_plans/curriculum_decomposition.md` showing source-step-to-mini-protocol mapping for both the 909-line `cell_culture` and the 866-line `tutorial_plate_drug_additions`, plus intended entry scene per mini-protocol.
  - Pytest gate (`tests/test_mini_protocol_size_and_learning.py`): every protocol under `src/content/` with `protocolType: mini_protocol` has 6-10 steps and a complete `learning` block. `sequence_runner` and `dev_smoke` types are exempt from the step-count check.
  - M1 validation scope is content-shape only: YAML parses; step counts pass per `protocolType`; `learning` block present where required; `completionPath` fields are syntactically present. Full schema validation (entry-block enforcement, completionPath kind checks) happens in M2 and M3.
  - WS-DECOMP coordinator rule: no two doers may edit the same existing tutorial folder concurrently during WP-DECOMP-7. Tiny-stub triage proceeds only after WP-DECOMP-1..5 land.
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: yes -- max parallel doers: 5 (one per new mini-protocol via WP-DECOMP-1..5). WP-DECOMP-7 (triage) runs sequentially after authors finish.

### Milestone M2: Protocol entry and launcher routing

- Depends on: M1 -- decomposition output determines what entry scenes the launcher must support.
- Workstreams: WS-ENTRY.
- Entry criteria: M1 exit met.
- Exit criteria:
  - Protocol YAML schema gains an explicit `entry:` block: `entry.scene` (initial scene id) and `entry.step` (id of first step). Explicit block required for every protocol. Loader emits a warning if absent and derives from the first step as a temporary compatibility behavior (controlled by an Open-questions decision).
  - The `entry:` block is inserted into every `protocol.yaml` under `src/content/`, including dev_smoke and sequence_runner types.
  - Loader validates that `entry.step` exists in `steps`, that `entry.scene` matches that step's `scene`, and that the scene is registered.
  - `src/init.ts` honors the protocol's `entry.scene` on page load. The `gameState.activeScene === 'hood'` legacy fallback removed.
  - Hard gate test (`tests/test_protocol_entry_no_hood_default.py`): no protocol may declare `entry.scene === 'cell_culture_hood'` unless its first authored step is also in the hood.
  - Per-protocol entry recorded in `docs/active_plans/protocol_entry_audit.md`.
  - `docs/PROTOCOL_YAML_FORMAT.md` margin note updated (full rewrite at M9).
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: no -- single coordinated entry-routing workstream (entry: spans every protocol and `src/init.ts`).

### Milestone M3: Minimal fresh runtime spine

- Depends on: M2 -- entry schema feeds runtime types.
- Workstreams: WS-SPINE.
- Entry criteria: M2 exit met. `src/scene_runtime/` folder created. Contract types stub merged.
- Exit criteria:
  - Contract API types exported: `SceneConfig`, `ProtocolConfig` (including `entry:` block), `CompletionPath`, `LayoutResult`, `DispatchResult`, `HighlightState`, `LiquidState`.
  - Build-time loader parses YAML and emits typed generated TypeScript/JSON. Browser runtime consumes generated TypeScript/JSON only.
  - `src/scene_runtime/` compiles standalone (`npx tsc --noEmit` clean).
  - Zero imports from `src/scenes/` into `src/scene_runtime/` (enforced by pytest).
  - `docs/scene_runtime/CONTRACT.md` documents exported APIs.
  - Legacy banner header added to every `src/scenes/` file.
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: no -- single spine workstream gating downstream work.

### Milestone M4: Generic visible-UI walker skeleton

- Depends on: M3.
- Workstreams: WS-WALKER-ENGINE.
- Entry criteria: M3 exit met.
- Exit criteria:
  - `tests/playwright/walker/` exports a walker engine that dispatches only on `completionPath.kind`. Click resolver uses YAML fields (`tool`, `source`, `destination`, `openClick`, `advanceClick`, `choices`).
  - `tests/playwright/walker.mjs <protocol_id>` runs against any protocol id and produces per-action before/after screenshots.
  - Walker starts every run by loading the page normally and lets the runtime's `entry:` routing reach the first scene.
  - Walker smoke-tested against a dedicated private fixture under `tests/playwright/fixtures/smoke/` (not a public mini-protocol). The fixture exercises one of each `completionPath.kind` value end-to-end.
  - Static enforcement test (`tests/test_walker_no_step_branches.py`) green.
  - Walker refuses to click DOM nodes lacking computed visibility.
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: yes after WP-WALKER-1 lands -- max parallel doers: 3 (click resolver, screenshot pipeline, static enforcement test in parallel; CLI entry depends on resolver and screenshot).

### Milestone M5: Vertical visible-UI proof (one well_plate step)

- Depends on: M4.
- Workstreams: WS-WP-VERTICAL.
- Entry criteria: M4 exit met.
- Exit criteria:
  - One step of the new `tutorial_plate_drug_additions` runs end-to-end through visible UI driven by the generic walker.
  - Proven step has `completionPath.kind === interactionSequence` (most common kind) to exercise the hardest dispatch path first.
  - Page loads directly into `well_plate_workspace` from the `entry:` block; no hood detour.
  - Before/after screenshots saved; completion verified by walker reading `gameState`.
  - Adapter scaffolding for `well_plate` exists only to the extent this one step requires.
  - No subsystem (layout, dispatch, highlight, liquid) added beyond what the vertical step needs.
  - `docs/CHANGELOG.md` entry tagged "vertical proof".
- Parallel-plan ready: no -- single-threaded vertical workstream. This is the convergence point that defines what subsystem surface area M6 must expand; splitting it dilutes the proof.

### Milestone M6: Full well_plate 8-10 step proof

- Depends on: M5.
- Workstreams: WS-WP-SCENE, WS-WP-CONTENT, WS-WP-WALKER, WS-LAYOUT, WS-DISPATCH, WS-LIQUID (parallel; subsystems expand only as steps demand).
- Entry criteria: M5 exit met. Subsystem expansion must be justifiable as "needed for an unblocked well_plate step or for the migration of an already-working scene".
- Type-ownership rule: only the WS-SPINE owner may edit `src/scene_runtime/contract.ts` and `src/scene_runtime/types.ts` during M6. Other workstreams requesting type additions submit a small patch queue handled by the spine owner; concurrent edits to shared type files are forbidden.
- Exit criteria:
  - The decomposed `tutorial_plate_drug_additions` (8-10 steps) runs end-to-end on `src/scene_runtime/` driven only by visible UI.
  - Generic walker completes every step with zero per-step or per-protocol branches.
  - Per-action before/after screenshots under `test-results/walker/tutorial_plate_drug_additions/`.
  - `WP-C1-VISUAL` and `WP-G1` visual gates pass.
  - `distilled_water` orphan and broken breadcrumb metadata removed.
  - Adapter declares zero custom CSS grid; layout via runtime layout engine for the workspace zone (96-well plate retains custom geometry per contract item 3).
  - Layout, dispatch, highlight, liquid subsystems unit-tested for the surface area used.
  - `docs/active_plans/well_plate_workspace_pause_note.md` archived under `docs/archive/`.
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: yes -- max parallel doers: 4 (layout, dispatch/highlight, liquid, well_plate render in parallel; well_plate dispatch and walker proof gated by render plus YAML).

### Milestone M7: Per-mini-protocol HTML split and launcher

- Depends on: M6.
- Workstreams: WS-BUILD, WS-LAUNCHER (parallel).
- Entry criteria: M6 exit met.
- Exit criteria:
  - `tools/build_protocol_data.py` (or replacement) emits one HTML per mini-protocol under `dist/`.
  - Shared library bundled separately so per-HTML stays under the size budget.
  - The plate-additions mini-protocol HTML runs standalone from a static file server.
  - Launcher `dist/index.html` lists all current mini-protocols with link per HTML and `learning.goals` as subtitle. The launcher presents the curriculum (set of mini-protocols) plus the full-protocol runner.
  - `?protocol=<id>` URL parameter still functional for direct linking.
  - `docs/USAGE.md` updated.
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: yes -- max parallel doers: 2.

### Milestone M8: Migrate hood, bench, microscope, capability workspaces

- Depends on: M6 (runtime proven), M7 (build pipeline proven).
- Workstreams: WS-HOOD, WS-BENCH, WS-MICRO (parallel).
- Entry criteria: M6 and M7 exits met.
- Exit criteria:
  - `cell_culture_hood`, `bench`, `microscope`, and capability workspaces ported as peer adapters.
  - Every mini-protocol in the new curriculum (plus the `tutorial_cell_culture_full` linked-sequence runner) walker-verified on the new runtime.
  - `src/init.ts` no longer special-cases scene-id aliases.
  - Static no-branch enforcement test still passes.
  - No new walker source code added during migration.
  - `docs/CHANGELOG.md` entry per workstream.
- Parallel-plan ready: yes -- max parallel doers: 3.

### Milestone M9: Legacy archive and doc finalize

- Depends on: M8.
- Workstreams: WS-CLEAN, WS-DOCS-FINAL (parallel).
- Entry criteria: M8 exit met. Zero remaining imports from `src/scenes/` confirmed by grep. Every protocol walker-verified.
- Exit criteria:
  - `src/scenes/` archived under `src/archive/scenes_legacy_<YYYY_MM>/` for one release cycle (default; delete deferred to a follow-up patch).
  - `npm run build` clean, `pytest tests/` baseline holds.
  - All seven SCENE_*/PROTOCOL_* docs rewritten to match runtime APIs; `entry:` block and walker contract documented.
  - PRIMARY_CONTRACT.md cross-refs added in each canonical doc.
  - `docs/active_plans/scene_runtime_doc_conflicts.md`, `docs/active_plans/protocol_entry_audit.md`, and `docs/active_plans/curriculum_decomposition.md` archived.
  - `git tag scene-runtime-v1` recommended.
  - `docs/CHANGELOG.md` entry.
- Parallel-plan ready: yes -- max parallel doers: 2.

## Workstream breakdown

### Workstream WS-DOC: Doc audit and reconcile

- Owner: planner.
- Interfaces:
  - Needs: `docs/PRIMARY_CONTRACT.md`, all SCENE_*/PROTOCOL_* docs.
  - Provides: conflict table and margin notes; signals contract-compliant API shape constraints to WS-SPINE.
- Expected patches: 2-4.

### Workstream WS-DECOMP: Mini-protocol curriculum decomposition

- Owner: bptools-writer.
- Interfaces:
  - Needs: M0 conflict table.
  - Provides: new `src/content/<mini_protocol>/` folders, curriculum map, rescoped `items.yaml` per scene, pytest gate enforcing 6-10 steps and learning block. Consumed by WS-ENTRY (entry blocks added to new mini-protocols) and WS-WP-CONTENT.
- Expected patches: 4-7.

### Workstream WS-ENTRY: Protocol entry and launcher routing

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M1 exit (new mini-protocol set landed).
  - Provides: `entry:` block schema, loader validation, legacy `src/init.ts` routing patch, per-protocol audit document, no-hood-default enforcement test. Consumed by WS-SPINE (carries the schema into the fresh runtime).
- Expected patches: 2-3.

### Workstream WS-SPINE: Runtime contract types and loader

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M2 exit (entry schema locked).
  - Provides: TypeScript contract types plus build-time YAML loader emitting typed generated data, consumed by every downstream workstream.
- Expected patches: 3-5.

### Workstream WS-WALKER-ENGINE: Schema-driven walker engine

- Owner: tester.
- Interfaces:
  - Needs: M3 exit (contract types and generated data shape locked).
  - Provides: `tests/playwright/walker/` engine and `tests/playwright/walker.mjs` CLI entry consumed by every adapter from M5 onward.
- Expected patches: 2-3.

### Workstream WS-WP-VERTICAL: One well_plate visible step

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M4 exit.
  - Provides: minimum well_plate adapter, minimum scene/protocol YAML, and one walker-passing step. Consumed by WS-WP-SCENE in M6.
- Expected patches: 1-2.

### Workstream WS-LAYOUT: Layout subsystem

- Owner: typescript-engineer.
- Interfaces:
  - Needs: WS-SPINE types from M3; vertical proof from M5.
  - Provides: pure `layoutScene()` function consumed by well_plate adapter and all M8 adapters.
- Expected patches: 2-3.

### Workstream WS-DISPATCH: Click routing and highlight derivation

- Owner: typescript-engineer.
- Interfaces:
  - Needs: WS-SPINE types; vertical proof from M5.
  - Provides: `dispatchClick()` plus `deriveHighlights()`; canonical `.is-next-target` adoption pattern.
- Expected patches: 2-3.

### Workstream WS-LIQUID: Liquid state subsystem

- Owner: typescript-engineer.
- Interfaces:
  - Needs: WS-SPINE types; vertical proof from M5.
  - Provides: liquid state model honoring `docs/LIQUID_CONVENTION.md`; reagent-driven `tubeLiquids` and `plateLiquids` preserved.
- Expected patches: 1-2.

### Workstream WS-WP-SCENE: well_plate adapter completion

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M5 vertical proof.
  - Provides: completed `src/scene_runtime/adapters/well_plate/` adapter consumed by walker and build.
- Expected patches: 2-3.

### Workstream WS-WP-CONTENT: well_plate protocol YAML

- Owner: bptools-writer.
- Interfaces:
  - Needs: M5 vertical proof; M1 decomposed plate-additions YAML draft.
  - Provides: final contract-compliant YAML for the decomposed plate-additions mini-protocol(s).
- Expected patches: 2-3.

### Workstream WS-WP-WALKER: well_plate full walker proof

- Owner: tester.
- Interfaces:
  - Needs: WS-WP-SCENE, WS-WP-CONTENT, and WS-WALKER-ENGINE.
  - Provides: proof that the generic walker completes the decomposed plate-additions mini-protocol(s) end-to-end via visible UI with per-action screenshot evidence. No new walker code; only YAML, fixture, and assertion work.
- Expected patches: 2-3.

### Workstream WS-BUILD: Per-mini-protocol HTML emit

- Owner: coder.
- Interfaces:
  - Needs: M6 exit.
  - Provides: per-protocol HTML outputs and shared library bundle config.
- Expected patches: 2-4.

### Workstream WS-LAUNCHER: Launcher index

- Owner: coder.
- Interfaces:
  - Needs: WS-BUILD output.
  - Provides: `dist/index.html` listing the curriculum mini-protocols plus the full-protocol runner.
- Expected patches: 1-2.

### Workstream WS-HOOD: Hood adapter migration

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M6 and M7 exits.
  - Provides: `cell_culture_hood` adapter; hood-anchored mini-protocols from the decomposed curriculum running on the new runtime.
- Expected patches: 3-5.

### Workstream WS-BENCH: Bench adapter migration

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M6 and M7 exits.
  - Provides: bench adapter; any bench-anchored mini-protocols walker-verified.
- Expected patches: 1-2.

### Workstream WS-MICRO: Microscope and capability workspaces migration

- Owner: typescript-engineer.
- Interfaces:
  - Needs: M6 and M7 exits.
  - Provides: microscope adapter and capability workspaces (grid_counting, incubator, instrument, item, modal, plate_reader).
- Expected patches: 1-2.

### Workstream WS-CLEAN: Legacy archive or delete

- Owner: maintainer.
- Interfaces:
  - Needs: M8 exit.
  - Provides: archived (or deleted) legacy tree, `src/init.ts` simplified.
- Expected patches: 2-3.

### Workstream WS-DOCS-FINAL: Final doc rewrites

- Owner: docset-updater.
- Interfaces:
  - Needs: M8 exit (final API shapes locked).
  - Provides: contract-aligned SCENE_*/PROTOCOL_* docs.
- Expected patches: 1-2.

## Work packages

Work packages are file-scoped where practical so multiple doers can run concurrently without colliding. Touch points are listed per work package; two work packages should not list the same file unless one explicitly depends on the other.

### Work package WP-DOC-1: Build doc conflict table

- Owner: planner.
- Touch points: `docs/active_plans/scene_runtime_doc_conflicts.md` (new).
- Depends on: none.
- Acceptance criteria:
  - Table covers all seven docs (SCENE_ARCHITECTURE, SCENE_VOCABULARY, SCENE_YAML_FORMAT, PROTOCOL_AUTHORING_GUIDE, PROTOCOL_VOCABULARY, PROTOCOL_YAML_FORMAT, PROTOCOL_STEPS).
  - Each row: status (matches-contract / stale-sections / must-rewrite), specific line refs, required action.
- Verification commands:
  - `ls docs/active_plans/scene_runtime_doc_conflicts.md`
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2a: Margin notes - SCENE_ARCHITECTURE.md

- Owner: planner.
- Touch points: `docs/SCENE_ARCHITECTURE.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: every stale-sections row for this doc has a `> CONTRACT MIGRATION:` margin note.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2b: Margin notes - SCENE_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/SCENE_VOCABULARY.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: margin notes added per conflict table.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2c: Margin notes - SCENE_YAML_FORMAT.md

- Owner: planner.
- Touch points: `docs/SCENE_YAML_FORMAT.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: margin notes added per conflict table.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2d: Margin notes - PROTOCOL_AUTHORING_GUIDE.md

- Owner: planner.
- Touch points: `docs/PROTOCOL_AUTHORING_GUIDE.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: margin notes added per conflict table.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2e: Margin notes - PROTOCOL_VOCABULARY.md

- Owner: planner.
- Touch points: `docs/PROTOCOL_VOCABULARY.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: margin notes added per conflict table.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2f: Margin notes - PROTOCOL_YAML_FORMAT.md

- Owner: planner.
- Touch points: `docs/PROTOCOL_YAML_FORMAT.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: margin notes added per conflict table.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOC-2g: Margin notes - PROTOCOL_STEPS.md

- Owner: planner.
- Touch points: `docs/PROTOCOL_STEPS.md`.
- Depends on: WP-DOC-1.
- Acceptance criteria: margin notes added per conflict table.
- Verification commands: manual diff vs conflict table.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-0: Curriculum decomposition map

- Owner: bptools-writer.
- Touch points: `docs/active_plans/curriculum_decomposition.md` (new).
- Depends on: WP-DOC-1.
- Acceptance criteria:
  - Step-by-step mapping from `src/content/cell_culture/protocol.yaml` (909 lines) and `src/content/tutorial_plate_drug_additions/protocol.yaml` (866 lines) to the proposed mini-protocol set (M1 milestone exit criteria).
  - Each new mini-protocol's draft step count, scene, and learning block summarized in one row.
- Verification commands: `ls docs/active_plans/curriculum_decomposition.md`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-1: Author tutorial_hood_setup_and_flask_prep

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_hood_setup_and_flask_prep/protocol.yaml`, `items.yaml`, `reagents.yaml` (new).
- Depends on: WP-DECOMP-0.
- Acceptance criteria:
  - `protocolType: mini_protocol`.
  - 6-8 steps with completionPath per step.
  - `learning.objectives`, `learning.outcomes`, `learning.goals` present.
  - All `items.yaml` items scoped to hood (matches first authored step).
  - Intended entry scene recorded as `# intended_entry_scene: cell_culture_hood` comment.
- Verification commands: content-shape check only at M1 -- `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -k tutorial_hood_setup_and_flask_prep`. Full schema validator runs at M2/M3.
- Obvious follow-ons: none (milestone changelog entry covers).

### Work package WP-DECOMP-2: Author tutorial_cell_counting_and_seeding

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_cell_counting_and_seeding/protocol.yaml`, `items.yaml`, `reagents.yaml` (new).
- Depends on: WP-DECOMP-0.
- Acceptance criteria: `protocolType: mini_protocol`; 6-8 steps; learning block complete; items scoped to bench or hood per first authored step; intended entry scene recorded.
- Verification commands: `source source_me.sh && python3 tools/build_protocol_data.py --validate tutorial_cell_counting_and_seeding`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-3: Author tutorial_drug_dilution_planning

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_drug_dilution_planning/protocol.yaml`, `items.yaml`, `reagents.yaml` (new).
- Depends on: WP-DECOMP-0.
- Acceptance criteria: `protocolType: mini_protocol`; 6-10 steps; learning block complete; items scoped to well_plate_workspace or hood per first authored step; intended entry scene recorded.
- Verification commands: `source source_me.sh && python3 tools/build_protocol_data.py --validate tutorial_drug_dilution_planning`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-4: Author tutorial_plate_drug_additions (decomposed)

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_plate_drug_additions/protocol.yaml`, `items.yaml`, `reagents.yaml` (rewrite from 866-line monolith).
- Depends on: WP-DECOMP-0.
- Acceptance criteria: `protocolType: mini_protocol`; 8-10 steps; learning block complete; intended entry scene `well_plate_workspace` recorded as `# intended_entry_scene:` comment (formal `entry:` block lands in M2); `distilled_water` orphan removed; broken breadcrumb metadata fixed.
- Verification commands: `source source_me.sh && python3 tools/build_protocol_data.py --validate tutorial_plate_drug_additions`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-5: Author tutorial_mtt_assay_readout

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_mtt_assay_readout/protocol.yaml`, `items.yaml`, `reagents.yaml` (new).
- Depends on: WP-DECOMP-0.
- Acceptance criteria: `protocolType: mini_protocol`; 6-8 steps; learning block complete; items scoped to hood or bench per first authored step; intended entry scene recorded.
- Verification commands: `source source_me.sh && python3 tools/build_protocol_data.py --validate tutorial_mtt_assay_readout`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-6: Author tutorial_cell_culture_full sequence runner

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_cell_culture_full/protocol.yaml` (new).
- Depends on: WP-DECOMP-1, WP-DECOMP-2, WP-DECOMP-3, WP-DECOMP-4, WP-DECOMP-5.
- Acceptance criteria: `protocolType: sequence_runner`; declares the sequence of constituent mini-protocols; no duplicated steps; `learning` block scoped to the overall goal; intended entry scene recorded as the first mini-protocol's entry scene; exempt from 6-10 step gate.
- Verification commands: `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py` (sequence_runner type passes the size-exempt branch).
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-7: Tiny-stub triage

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_bench_direct/`, `tutorial_cell_counter/`, `tutorial_plate_reader/`, `tutorial_hood_transfer/`, `tutorial_hemocytometer_count/`, `tutorial_drug_dilution/`, `tutorial_pbs/`, `tutorial_split/`; `src/content/_dev_smoke/` (new).
- Depends on: WP-DECOMP-1, WP-DECOMP-2, WP-DECOMP-3, WP-DECOMP-4, WP-DECOMP-5 -- must run after new mini-protocols land so absorption is unambiguous.
- Acceptance criteria:
  - Each existing tutorial classified: absorbed (steps merged into a new mini-protocol; original folder deleted), retired (moved to `src/content/_dev_smoke/<name>/` with `protocolType: dev_smoke`), or kept (expanded to >=6 steps with `protocolType: mini_protocol` and learning block).
  - Decision recorded per tutorial in `docs/active_plans/curriculum_decomposition.md`.
  - Coordinator rule: no two doers edit the same existing tutorial folder concurrently. WP-DECOMP-7 is single-threaded by design.
- Verification commands: `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py` (gate passes for every `mini_protocol`).
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-8: items.yaml rescope per scene

- Owner: bptools-writer.
- Touch points: `src/content/<each_mini_protocol>/items.yaml`.
- Depends on: WP-DECOMP-1..6.
- Acceptance criteria:
  - Every item's `scene:` field matches the scene where the student actually uses it.
  - Shared physical items (micropipette, media_bottle, well plate when it appears in multiple scenes, etc.) are declared as a scene object per scene that uses them. If state must persist across scenes, the item carries a shared `inventoryId` referenced from each scene's declaration. No item is faked into a single global scene.
  - No item defaults to hood unless hood is its real teaching scene.
- Verification commands: `source source_me.sh && pytest tests/test_items_scene_no_hood_default.py` (new test under WP-ENTRY-3).
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DECOMP-9: Mini-protocol size and learning-block gate

- Owner: tester.
- Touch points: `tests/test_mini_protocol_size_and_learning.py` (new), `tests/git_file_utils.py` (import).
- Depends on: WP-DECOMP-1..6.
- Acceptance criteria:
  - Pytest enumerates `src/content/*/protocol.yaml` and asserts:
    - `protocolType: mini_protocol` -- 6-10 steps and a complete `learning` block.
    - `protocolType: sequence_runner` -- exempt from step-count check; must have a `learning` block scoped to the overall goal.
    - `protocolType: dev_smoke` -- exempt from both gates; lives only under `src/content/_dev_smoke/`.
  - Test fails loud if a protocol declares an unknown `protocolType`.
- Verification commands: `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-ENTRY-1: Protocol YAML entry block schema

- Owner: typescript-engineer.
- Touch points: documentation stub in `docs/PROTOCOL_YAML_FORMAT.md` margin note (already added at M0); schema reference snippet under `docs/active_plans/protocol_entry_audit.md` (new).
- Depends on: WP-DECOMP-9.
- Acceptance criteria:
  - Schema documented: `entry.scene` (scene id) and `entry.step` (step id).
  - Audit file lists each protocol with its planned `entry:` block values.
- Verification commands: `ls docs/active_plans/protocol_entry_audit.md`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-ENTRY-2: Add entry block to every protocol.yaml

- Owner: bptools-writer.
- Touch points: `src/content/<each_protocol>/protocol.yaml`.
- Depends on: WP-ENTRY-1.
- Acceptance criteria:
  - Every `protocol.yaml` under `src/content/` (including `_dev_smoke/`) has an explicit `entry:` block.
  - `entry.scene` matches the first step's `scene`; `entry.step` matches the first step's `id`.
- Verification commands: `source source_me.sh && pytest tests/test_protocol_entry_no_hood_default.py` (created in WP-ENTRY-4).
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-ENTRY-3: Items-scene no-hood-default test

- Owner: tester.
- Touch points: `tests/test_items_scene_no_hood_default.py` (new).
- Depends on: WP-DECOMP-8.
- Acceptance criteria:
  - Test asserts every `items.yaml` entry's `scene` matches the scene where its protocol step uses it (or, for shared items, an explicit allow-list).
- Verification commands: `source source_me.sh && pytest tests/test_items_scene_no_hood_default.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-ENTRY-4: Protocol entry no-hood-default test

- Owner: tester.
- Touch points: `tests/test_protocol_entry_no_hood_default.py` (new).
- Depends on: WP-ENTRY-1.
- Acceptance criteria:
  - Test asserts no protocol declares `entry.scene === 'cell_culture_hood'` unless its first authored step's `scene` is also `cell_culture_hood`.
- Verification commands: `source source_me.sh && pytest tests/test_protocol_entry_no_hood_default.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-ENTRY-5: src/init.ts routing patch

- Owner: typescript-engineer.
- Touch points: `src/init.ts`.
- Depends on: WP-ENTRY-2.
- Acceptance criteria:
  - On page load, the legacy app reads `entry.scene` from the generated protocol data (no YAML parser) and routes the first visible scene from that field.
  - The `gameState.activeScene === 'hood'` legacy fallback removed.
  - For protocols whose `entry.scene !== 'cell_culture_hood'`, the page renders that scene first.
- Verification commands: `npx tsc --noEmit`; manual screenshot via `npm run ui:review`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-SPINE-1: Define SceneConfig and ProtocolConfig types

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/contract.ts` (new).
- Depends on: WP-ENTRY-5.
- Acceptance criteria:
  - `SceneConfig`, `ProtocolConfig` (including `entry:` block), and `CompletionPath` exported.
  - `npx tsc --noEmit` clean.
  - Zero imports from `src/scenes/`.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: skeleton `docs/scene_runtime/CONTRACT.md`.

### Work package WP-SPINE-2: Define runtime result types

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/types.ts` (new).
- Depends on: WP-SPINE-1.
- Acceptance criteria:
  - `LayoutResult`, `DispatchResult`, `HighlightState`, `LiquidState` exported.
  - `npx tsc --noEmit` clean.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-SPINE-3: Build-time YAML loader

- Owner: coder.
- Touch points: `tools/build_protocol_data.py` (extend; default). A TypeScript helper under `src/build/load.ts` is permitted only if TypeScript-side code generation cannot be driven from Python.
- Depends on: WP-SPINE-1, WP-SPINE-2.
- Acceptance criteria:
  - Loader parses scene and protocol YAML at build time and emits typed generated TypeScript/JSON under `src/generated/`.
  - Loader validates the `entry:` block, `protocolType`, and `completionPath.kind` per the contract.
  - Loader rejects YAML that embeds TypeScript identifiers or computed fields.
  - Browser runtime imports only generated data; no YAML parser shipped in browser bundle.
- Verification commands: `source source_me.sh && python3 tools/build_protocol_data.py --validate`; `npm run build`.
- Obvious follow-ons: none (milestone changelog entry covers).

### Work package WP-SPINE-4: Loader schema-violation unit tests

- Owner: tester.
- Touch points: `tests/test_scene_runtime_loader.py` (new) or `tests/test_scene_runtime_loader.mjs` (new).
- Depends on: WP-SPINE-3.
- Acceptance criteria:
  - Tests cover happy path plus at least two schema-violation cases (missing `entry`, mismatched `entry.scene`).
  - Tests cover loader rejection of embedded TypeScript identifiers.
- Verification commands: `source source_me.sh && pytest tests/test_scene_runtime_loader.py` or `npm test -- scene_runtime/loader`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-SPINE-5: No-scenes-imports lint test

- Owner: tester.
- Touch points: `tests/test_scene_runtime_no_scenes_imports.py` (new).
- Depends on: WP-SPINE-1.
- Acceptance criteria:
  - Pytest greps every file under `src/scene_runtime/` for `from src/scenes` or `from "../scenes` patterns and fails on match.
- Verification commands: `source source_me.sh && pytest tests/test_scene_runtime_no_scenes_imports.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-SPINE-6: Legacy banner header on every src/scenes/ file

- Owner: maintainer.
- Touch points: every file under `src/scenes/`.
- Depends on: WP-SPINE-1.
- Acceptance criteria:
  - Every file under `src/scenes/` carries `// LEGACY: superseded by src/scene_runtime/*. Do not extend.` as its first line (or right after a shebang).
  - `tests/test_scenes_legacy_banner.py` (new) enforces.
- Verification commands: `source source_me.sh && pytest tests/test_scenes_legacy_banner.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-LAYOUT-1: Port layout engine pure function

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/layout/index.ts` (new).
- Depends on: WP-SPINE-2.
- Acceptance criteria:
  - Pure function `layoutScene(SceneConfig)` returns `LayoutResult`.
  - No DOM access from the layout module.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-LAYOUT-2: Layout engine unit tests

- Owner: tester.
- Touch points: `tests/test_layout_engine.mjs` (new).
- Depends on: WP-LAYOUT-1.
- Acceptance criteria:
  - Tests cover row, zone, and depth fit behavior from `docs/LAYOUT_ENGINE.md`.
- Verification commands: `npm test -- scene_runtime/layout`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DISPATCH-1: Click router pure function

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/dispatch/index.ts` (new).
- Depends on: WP-SPINE-2.
- Acceptance criteria:
  - `dispatchClick(SceneConfig, ProtocolStep, target)` returns `DispatchResult`.
  - Wrong-order detection implemented.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DISPATCH-2: Click router unit tests

- Owner: tester.
- Touch points: `tests/test_dispatch_click.mjs` (new).
- Depends on: WP-DISPATCH-1.
- Acceptance criteria:
  - Tests cover item-zone, `tubeTargets`, `plateTargets`, `multipleChoice` schemas.
  - Wrong-order case unit-tested.
- Verification commands: `npm test -- scene_runtime/dispatch`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DISPATCH-3: Highlight derivation

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/highlight/index.ts` (new).
- Depends on: WP-DISPATCH-1.
- Acceptance criteria:
  - `deriveHighlights(ProtocolStep, SceneState)` returns `HighlightState`.
  - Single canonical `.is-next-target` adoption pattern documented in `docs/scene_runtime/CONTRACT.md`.
- Verification commands: `npx tsc --noEmit`; `npm test -- scene_runtime/highlight`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WALKER-1: Walker engine core dispatch

- Owner: tester.
- Touch points: `tests/playwright/walker/index.ts` (new).
- Depends on: WP-SPINE-3.
- Acceptance criteria:
  - Engine exports `walkProtocol(protocolId)` that loads the page and runs the protocol end-to-end.
  - Dispatch is a single switch over `completionPath.kind` with cases `interactionSequence`, `directTool`, `modal`, `multipleChoice`.
  - Engine source contains zero `step.id ===`, `protocolId ===`, `modal.owner ===` occurrences.
  - Engine source contains zero `gameState.<prop> =`, `activeScene =`, `selectedTool =`, `window.prompt =`, `window.confirm =` write patterns. Reads allowed.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WALKER-2: Walker click resolver

- Owner: tester.
- Touch points: `tests/playwright/walker/click_resolver.ts` (new).
- Depends on: WP-WALKER-1.
- Acceptance criteria:
  - Resolves click targets from YAML fields (`tool`, `source`, `destination`, `openClick`, `advanceClick`, `choices`); no per-protocol or per-step lookup table.
  - Refuses to click DOM nodes lacking computed visibility (size > 0, not `display: none`, not `visibility: hidden`, not `pointer-events: none`).
- Verification commands: `npm test -- walker/click_resolver`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WALKER-3: Screenshot pipeline

- Owner: tester.
- Touch points: `tests/playwright/walker/screenshot.ts` (new).
- Depends on: WP-WALKER-1.
- Acceptance criteria:
  - Captures before/after screenshots for every click under `test-results/walker/<protocol_id>/step_<NN>/<action_NN>_<before|after>.png`.
  - End-of-step summary screenshot retained.
- Verification commands: `node tests/playwright/walker.mjs tutorial_hood_setup_and_flask_prep` (smoke).
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WALKER-4: CLI entry and private smoke fixture

- Owner: tester.
- Touch points: `tests/playwright/walker.mjs` (new); `tests/playwright/fixtures/smoke/` (new private fixture: a small generated protocol exercising one of each `completionPath.kind`).
- Depends on: WP-WALKER-2, WP-WALKER-3.
- Acceptance criteria:
  - `node tests/playwright/walker.mjs <protocol_id>` runs the engine against any compiled protocol id.
  - The private smoke fixture exercises `interactionSequence`, `directTool`, `modal`, and `multipleChoice` paths end-to-end. The fixture lives in the test tree, never in `src/content/`, and is not surfaced in the launcher.
  - Non-zero exit on any walker failure.
- Verification commands: `node tests/playwright/walker.mjs --fixture smoke`.
- Obvious follow-ons: `docs/WALKTHROUGH_GUIDE.md` updated.

### Work package WP-WALKER-5: Static no-branch enforcement test

- Owner: tester.
- Touch points: `tests/test_walker_no_step_branches.py` (new).
- Depends on: WP-WALKER-1.
- Acceptance criteria:
  - Pytest greps walker source for forbidden patterns (`step.id ===`, `protocolId ===`, `modal.owner ===`, `gameState\.\w+\s*=`, `activeScene\s*=`, `selectedTool\s*=`, `window.prompt\s*=`, `window.confirm\s*=`) and fails on match.
  - Test runs under default `pytest tests/`.
- Verification commands: `source source_me.sh && pytest tests/test_walker_no_step_branches.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-LIQUID-1: Liquid state model

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/liquid/index.ts` (new).
- Depends on: WP-SPINE-2.
- Acceptance criteria:
  - Pure function `applyLiquidTransfer(state, transfer)` returns new `LiquidState`.
  - Honors `docs/LIQUID_CONVENTION.md`.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-LIQUID-2: Liquid state unit tests

- Owner: tester.
- Touch points: `tests/test_liquid_state.mjs` (new).
- Depends on: WP-LIQUID-1.
- Acceptance criteria:
  - Tests cover transfer, discharge, mix.
- Verification commands: `npm test -- scene_runtime/liquid`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WP-V1: well_plate vertical slice (one step)

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/well_plate/index.ts` (new), `src/scene_runtime/adapters/well_plate/render.ts` (new).
- Depends on: WP-WALKER-4, WP-DECOMP-4.
- Acceptance criteria:
  - Adapter renders enough of the well_plate scene that one `interactionSequence` step from `tutorial_plate_drug_additions` is clickable.
  - Page loads directly into well_plate_workspace from the `entry:` block.
  - Walker passes on the chosen step.
- Verification commands: `npx tsc --noEmit`; `node tests/playwright/walker.mjs tutorial_plate_drug_additions --until-step <id>`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry tagged "vertical proof".

### Work package WP-WP-1: well_plate adapter complete render

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/well_plate/render.ts`.
- Depends on: WP-WP-V1, WP-LAYOUT-1.
- Acceptance criteria:
  - Renders 96-well plate, source rack, and tool zone using runtime layout for the workspace zone (well grid keeps custom geometry as a structured object).
  - No CSS grid hard-coded in TypeScript.
- Verification commands: `npx tsc --noEmit`; `npm run ui:review`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WP-2: well_plate adapter dispatch

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/well_plate/dispatch.ts` (new).
- Depends on: WP-WP-V1, WP-DISPATCH-1.
- Acceptance criteria:
  - Adapter delegates click handling to `src/scene_runtime/dispatch/`; no inline dispatch.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WP-3: well_plate scene YAML

- Owner: bptools-writer.
- Touch points: `src/content/tutorial_plate_drug_additions/scene.yaml` (new), `src/content/tutorial_plate_drug_additions/items.yaml` (rewrite).
- Depends on: WP-DECOMP-4.
- Acceptance criteria:
  - Scene YAML declares all SVG-backed scene objects needed for the 8-10 step protocol.
  - Items scoped to well_plate_workspace.
- Verification commands: `source source_me.sh && python3 tools/build_protocol_data.py --validate tutorial_plate_drug_additions`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-WP-4: well_plate full walker proof

- Owner: tester.
- Touch points: per-protocol fixture under `tests/playwright/fixtures/tutorial_plate_drug_additions/` (new); screenshot baseline manifest under `test-results/walker/tutorial_plate_drug_additions/MANIFEST.md`.
- Depends on: WP-WP-1, WP-WP-2, WP-WP-3, WP-WALKER-4.
- Acceptance criteria:
  - `node tests/playwright/walker.mjs tutorial_plate_drug_additions` exits zero across all 8-10 steps.
  - Per-action before/after screenshots produced; `WP-C1-VISUAL` and `WP-G1` visual gates pass.
  - Zero new walker source code (any walker change escalates to WP-WALKER-* work).
- Verification commands: `node tests/playwright/walker.mjs tutorial_plate_drug_additions`.
- Obvious follow-ons: archive `docs/active_plans/well_plate_workspace_pause_note.md`; `docs/CHANGELOG.md` entry.

### Work package WP-BUILD-1: Per-mini-protocol HTML emit

- Owner: coder.
- Touch points: `tools/build_protocol_data.py`, `package.json` build scripts, build config.
- Depends on: WP-WP-4.
- Acceptance criteria:
  - One HTML per protocol id under `dist/`.
  - Shared library bundled separately under `dist/shared/`.
  - Plate-additions mini-protocol HTML runs standalone from `python3 -m http.server`.
- Verification commands: `npm run build`; `ls dist/*.html`.
- Obvious follow-ons: `docs/USAGE.md` update.

### Work package WP-BUILD-2: Per-HTML size budget gate

- Owner: tester.
- Touch points: `tests/test_per_html_size_budget.py` (new).
- Depends on: WP-BUILD-1.
- Acceptance criteria:
  - Pytest enforces a configurable per-HTML size cap (default 500 KB) for every emitted mini-protocol HTML.
- Verification commands: `npm run build && source source_me.sh && pytest tests/test_per_html_size_budget.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-LAUNCH-1: Launcher index page

- Owner: coder.
- Touch points: `src/launcher/index.ts` (new), `src/launcher/launcher.css` (new), `dist/index.html` generator entry in build config.
- Depends on: WP-BUILD-1.
- Acceptance criteria:
  - `dist/index.html` lists every mini-protocol in the curriculum plus the full-protocol runner with a link per HTML.
  - Each entry shows protocol title and `learning.goals` as subtitle.
  - `?protocol=<id>` URL parameter still functional for direct linking.
- Verification commands: `npm run build && ls dist/index.html`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-HOOD-1: cell_culture_hood adapter render

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/cell_culture_hood/render.ts` (new).
- Depends on: WP-LAYOUT-1, WP-BUILD-1.
- Acceptance criteria:
  - Adapter renders hood scene via runtime layout engine; no hood-specific label suppression code (label rules moved to YAML).
- Verification commands: `npx tsc --noEmit`; `npm run ui:review`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-HOOD-2: cell_culture_hood adapter dispatch

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/cell_culture_hood/dispatch.ts` (new).
- Depends on: WP-HOOD-1, WP-DISPATCH-1.
- Acceptance criteria:
  - Adapter delegates dispatch to `src/scene_runtime/dispatch/`; no hood-specific completion-event hardcoding.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-HOOD-3: Hood mini-protocols walker proof

- Owner: tester.
- Touch points: walker fixtures under `tests/playwright/fixtures/<each_hood_mini_protocol>/`.
- Depends on: WP-HOOD-2.
- Acceptance criteria:
  - Generic walker passes for every hood-anchored mini-protocol from the decomposed curriculum.
- Verification commands: `node tests/playwright/walker.mjs <each_hood_mini_protocol_id>`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-BENCH-1: bench adapter render and dispatch

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/bench/render.ts` (new), `src/scene_runtime/adapters/bench/dispatch.ts` (new).
- Depends on: WP-LAYOUT-1, WP-DISPATCH-1, WP-BUILD-1.
- Acceptance criteria:
  - Adapter renders bench scene via runtime layout; delegates dispatch.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-BENCH-2: Bench mini-protocols walker proof

- Owner: tester.
- Touch points: walker fixtures under `tests/playwright/fixtures/<each_bench_mini_protocol>/`.
- Depends on: WP-BENCH-1.
- Acceptance criteria:
  - Generic walker passes for every bench-anchored mini-protocol from the decomposed curriculum.
- Verification commands: `node tests/playwright/walker.mjs <each_bench_mini_protocol_id>`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-MICRO-1: microscope adapter render and dispatch

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/adapters/microscope/render.ts` (new), `src/scene_runtime/adapters/microscope/dispatch.ts` (new).
- Depends on: WP-LAYOUT-1, WP-DISPATCH-1, WP-BUILD-1.
- Acceptance criteria:
  - Adapter renders microscope scene via runtime layout; delegates dispatch.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-MICRO-2: Capability workspaces port

- Owner: typescript-engineer.
- Touch points: `src/scene_runtime/capabilities/grid_counting.ts`, `incubator.ts`, `instrument.ts`, `item_workspace.ts`, `modal_workspace.ts`, `plate_reader.ts` (each new).
- Depends on: WP-DISPATCH-1.
- Acceptance criteria:
  - Each capability workspace ported as a generic module; no hood-specific imports.
- Verification commands: `npx tsc --noEmit`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-MICRO-3: Microscope and capability walker proof

- Owner: tester.
- Touch points: walker fixtures under `tests/playwright/fixtures/<each_microscope_mini_protocol>/`.
- Depends on: WP-MICRO-1, WP-MICRO-2.
- Acceptance criteria:
  - Generic walker passes for every microscope- or capability-anchored mini-protocol from the decomposed curriculum.
- Verification commands: `node tests/playwright/walker.mjs <each_micro_mini_protocol_id>`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-FULL-SEQ-1: tutorial_cell_culture_full walker proof

- Owner: tester.
- Touch points: walker fixture under `tests/playwright/fixtures/tutorial_cell_culture_full/`.
- Depends on: WP-HOOD-3, WP-BENCH-2, WP-MICRO-3, WP-WP-4.
- Acceptance criteria:
  - Generic walker drives the linked sequence end-to-end, completing every constituent mini-protocol in order.
- Verification commands: `node tests/playwright/walker.mjs tutorial_cell_culture_full`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-CLEAN-1: Pre-archive grep sweep

- Owner: maintainer.
- Touch points: `tests/test_no_scenes_imports_repo_wide.py` (new).
- Depends on: WP-FULL-SEQ-1.
- Acceptance criteria:
  - Pytest greps the entire repo for `from src/scenes`, `from "../../scenes`, or relative paths into `src/scenes/` outside that folder itself; fails on match.
- Verification commands: `source source_me.sh && pytest tests/test_no_scenes_imports_repo_wide.py`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-CLEAN-2: Archive legacy src/scenes/ tree

- Owner: maintainer.
- Touch points: `src/scenes/` (move via `git mv` to `src/archive/scenes_legacy_<YYYY_MM>/`), `src/init.ts` (remove legacy scene aliases).
- Depends on: WP-CLEAN-1.
- Acceptance criteria:
  - Legacy tree moved (default) or deleted per Open-questions decision.
  - `src/init.ts` no longer special-cases scene-id aliases.
  - `npm run build` clean, `pytest tests/` baseline holds.
- Verification commands: `npm run build`; `source source_me.sh && pytest tests/`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1a: Rewrite docs/SCENE_ARCHITECTURE.md

- Owner: docset-updater.
- Touch points: `docs/SCENE_ARCHITECTURE.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: matches runtime APIs; PRIMARY_CONTRACT cross-ref added; margin notes resolved.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1b: Rewrite docs/SCENE_VOCABULARY.md

- Owner: docset-updater.
- Touch points: `docs/SCENE_VOCABULARY.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: matches runtime APIs; PRIMARY_CONTRACT cross-ref added.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1c: Rewrite docs/SCENE_YAML_FORMAT.md

- Owner: docset-updater.
- Touch points: `docs/SCENE_YAML_FORMAT.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: matches scene YAML schema actually consumed by the build-time loader.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1d: Rewrite docs/PROTOCOL_AUTHORING_GUIDE.md

- Owner: docset-updater.
- Touch points: `docs/PROTOCOL_AUTHORING_GUIDE.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: documents new `entry:` block, walker contract, and curriculum-decomposition pattern.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1e: Rewrite docs/PROTOCOL_VOCABULARY.md

- Owner: docset-updater.
- Touch points: `docs/PROTOCOL_VOCABULARY.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: matches runtime APIs and contract.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1f: Rewrite docs/PROTOCOL_YAML_FORMAT.md

- Owner: docset-updater.
- Touch points: `docs/PROTOCOL_YAML_FORMAT.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: documents `entry:` block schema and validation rules; matches loader behavior.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-1g: Rewrite docs/PROTOCOL_STEPS.md

- Owner: docset-updater.
- Touch points: `docs/PROTOCOL_STEPS.md`.
- Depends on: WP-CLEAN-2.
- Acceptance criteria: documents canonical step behavior; matches dispatcher cases.
- Verification commands: manual review.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

### Work package WP-DOCS-2: Archive active-plan trackers

- Owner: docset-updater.
- Touch points: `docs/archive/` (destination), `docs/active_plans/scene_runtime_doc_conflicts.md`, `docs/active_plans/protocol_entry_audit.md`, `docs/active_plans/curriculum_decomposition.md` (sources).
- Depends on: WP-DOCS-1a..1g.
- Acceptance criteria: all three trackers moved via `git mv` to `docs/archive/`.
- Verification commands: `ls docs/archive/`.
- Obvious follow-ons: `docs/CHANGELOG.md` entry.

## Acceptance criteria and gates

- Per-patch gate: `npx tsc --noEmit` clean, `source source_me.sh && pytest tests/` 417 or more passing (includes walker no-branch enforcement test), no new pyflakes warnings.
- Per-mini-protocol gate: generic walker (`tests/playwright/walker.mjs <protocol_id>`) completes every step with per-action before/after screenshots under `test-results/walker/<protocol_id>/`.
- Walker source gate: zero `step.id ===`, `protocolId ===`, `modal.owner ===`, `gameState.<prop> =`, `activeScene =`, `selectedTool =`, `window.prompt =`, `window.confirm =` occurrences in `tests/playwright/walker/`.
- Curriculum gate: every protocol under `src/content/` (excluding `_dev_smoke/`) has 6-10 steps and a complete `learning` block.
- Entry-scene gate: no protocol declares `entry.scene === 'cell_culture_hood'` unless its first authored step is in the hood.
- Integration gate: the `tutorial_cell_culture_full` linked sequence walker-passes end-to-end on the new runtime before M8 closes.
- Per-HTML size gate: each mini-protocol HTML stays under the bundle target (see Open questions).
- Release gate: `dist/index.html` lists every curriculum mini-protocol plus the full-sequence runner, each standalone runnable; legacy `src/scenes/` archived or deleted; all SCENE_*/PROTOCOL_* docs aligned; PRIMARY_CONTRACT cross-refs in place.

## Test and verification strategy

- Unit (pytest plus node tests): pure functions in `src/scene_runtime/` (layout, dispatch, highlight, liquid). Each subsystem work package in M3 (types) and M6 (subsystems) ships with unit tests.
- Curriculum tests (pytest): `tests/test_mini_protocol_size_and_learning.py`, `tests/test_protocol_entry_no_hood_default.py`, `tests/test_items_scene_no_hood_default.py` enforce M1 and M2 contracts. Run on every `pytest tests/` invocation from M1 onward.
- Integration: build-time loader parses real YAML for each mini-protocol; loader rejection cases asserted.
- E2E (Playwright): single generic walker entry `tests/playwright/walker.mjs <protocol_id>` runs against every mini-protocol. No per-protocol walker file. Per-action before/after screenshots filed under `test-results/walker/<protocol_id>/`.
- Walker source enforcement: `tests/test_walker_no_step_branches.py` greps walker source for forbidden patterns each `pytest tests/` run.
- Repo-wide no-scenes-import enforcement: `tests/test_no_scenes_imports_repo_wide.py` (added at M9) verifies the legacy tree is no longer referenced.
- Regression: baseline `pytest tests/` (417 passing plus the new gates) must stay green across all milestones; a regression is a milestone blocker.
- Visual review: `artifacts/ui-review/` screenshots produced for each migrated scene at M5, M6, and M8 exits via `npm run ui:review`.
- Failure semantics: any walker step that fails blocks the milestone; flaky walker is treated as a block, not a warning. Walker failure that points to YAML or runtime gap is routed back to the spine workstream, not the walker workstream.

## Migration and compatibility policy

- Additive rollout: `src/scene_runtime/` ships alongside `src/scenes/` from M3 through M8. Both trees compile.
- Backward compatibility: during M2 through M8, the existing `?protocol=<id>` URL parameter routes to whichever runtime owns the protocol. M7 launcher continues to honor this URL parameter for direct linking.
- Legacy extension policy: after M3, no new feature work in `src/scenes/`. Compatibility shims required to keep existing tests green are allowed, must be flagged with a `// COMPAT SHIM:` comment, and must be removed by M9 (WP-CLEAN-2).
- Legacy banner: every file under `src/scenes/` gets a `// LEGACY: superseded by src/scene_runtime/*. Do not extend.` header at the top of M3 (WP-SPINE-6).
- Deletion criteria: M8 exit met and zero imports remain from `src/scenes/` (grep-enforced gate in WP-CLEAN-1).
- Rollback strategy:
  - Per milestone: revert workstream branches; legacy tree stays functional through M8.
  - At M9: legacy archive (or delete) is a single squashed patch; revert by reverting that one patch.
  - Doc rollback: `docs/active_plans/scene_runtime_doc_conflicts.md` is the authoritative record of what changed and why.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Curriculum decomposition stalls plan | high | WP-DECOMP-* drags past 2 weeks; runtime work waits | bptools-writer | WP-DECOMP-0 (map) is the only sequential gate. WP-DECOMP-1..6 run in parallel by mini-protocol; tiny-stub triage (WP-DECOMP-7) runs concurrently |
| Spine over-designs before proof scene works | high | M3 exit before M5 vertical proof started | planner | Walking-skeleton rule: M3 ships only contract types and loader; subsystems wait until M6 driven by well_plate needs |
| well_plate proof reveals spine gaps mid-M6 | high | walker fails on a step beyond the vertical proof | typescript-engineer | M3 contract allows additive API; spine adds, not breaks. Hot-patch back to M3 in same milestone |
| Per-HTML bundle balloons | medium | bundle exceeds size budget | coder | Shared library bundle plus code splitting; budget gate enforced in WP-BUILD-2 |
| Hood migration uncovers latent hood-only assumptions | medium | WS-HOOD walker fail at M8 | typescript-engineer | Hood is migrated after M6/M7 so spine is locked; failures become adapter bugs, not spine bugs |
| Doc audit creates churn that conflicts with code shape | low | doc rewrites in M0 contradict M3 APIs | planner | M0 emits conflict table plus margin notes only; full rewrites deferred to M9 (WS-DOCS-FINAL) |
| Parallel doers collide on shared walker fixtures | medium | fixture conflicts between WS-WP-WALKER and WS-HOOD/WS-BENCH walkers at M8 | tester | Per-mini-protocol fixture isolation under `tests/playwright/fixtures/<protocol_id>/`; one fixture owner per protocol |
| Architecture astronautics relapse | high | M3 adds more than types and loader, or M6 grows beyond four subsystems, or any milestone proposes folder renames | planner | Hard cap. Any addition requires user approval |
| Legacy archive breaks unmigrated content paths | medium | WP-CLEAN-2 patch fails `npm run build` | maintainer | Pre-archive grep sweep (WP-CLEAN-1) is M9 entry gate; M8 exit confirms zero legacy refs |
| Loader strictness blocks valid YAML | medium | WP-DECOMP or WP-WP-3 fails validation despite contract-clean YAML | typescript-engineer | Loader emits a structured error with line refs and an opt-in escape hatch documented in `docs/scene_runtime/CONTRACT.md` |
| Walker temptation to add step.id branch | high | WP-WP-4 fails on a step the walker cannot resolve; doer reaches for a quick branch in walker source | tester | Static no-branch enforcement test (WP-WALKER-5) is part of `pytest tests/`. Any walker source change requires escalation through WP-WALKER-1; YAML or runtime gets fixed instead |
| Walker mutates state to make progress | high | walker passes only when `gameState.<prop>` or `selectedTool` written; UI affordance never wired | tester | Same static enforcement test bans state-write patterns. Hard gate: walker failure = adapter or YAML gap, not walker scope |
| YAML schema gap blocks generic walker | medium | walker engine cannot resolve a click target from declared YAML fields for a protocol step | typescript-engineer | Extend the protocol/scene YAML schema in `src/scene_runtime/contract.ts`; doc the new field in CONTRACT.md; never extend walker dispatch logic |
| Tiny-stub triage drops important developer smoke coverage | low | retiring a stub removes a useful affordance check | bptools-writer | Retired stubs move to `src/content/_dev_smoke/` rather than deleted; remain runnable for dev diagnostics |
| Entry-routing patch breaks existing scenes mid-plan | medium | WP-ENTRY-5 alters `src/init.ts` and an existing scene fails to load | typescript-engineer | M2 audit covers every existing protocol; entry block must match the first authored step before routing patch lands |

## Rollout and release checklist

- [ ] M0 conflict table merged; margin notes added to all seven SCENE_*/PROTOCOL_* docs.
- [ ] M1 curriculum decomposition map published; new mini-protocol set authored; tiny stubs triaged; `tests/test_mini_protocol_size_and_learning.py` green.
- [ ] M2 every `protocol.yaml` has an `entry:` block; `src/init.ts` honors it; `tests/test_protocol_entry_no_hood_default.py` green.
- [ ] M3 `src/scene_runtime/` compiles; contract types and loader documented in `docs/scene_runtime/CONTRACT.md`; legacy banner header on every `src/scenes/` file.
- [ ] M4 generic walker engine runs end-to-end on a smoke fixture; `tests/test_walker_no_step_branches.py` green.
- [ ] M5 well_plate vertical-proof walker passes on its chosen step with before/after screenshots.
- [ ] M6 decomposed `tutorial_plate_drug_additions` walker green on all 8-10 steps; layout, dispatch, highlight, liquid subsystems unit-tested; `well_plate_workspace_pause_note.md` archived.
- [ ] M7 per-mini-protocol HTML emission working; size budget met; launcher `dist/index.html` lists every curriculum mini-protocol plus the full-sequence runner.
- [ ] M8 hood, bench, microscope adapters walker green for every migrated mini-protocol via the generic walker; `tutorial_cell_culture_full` linked sequence passes; zero new walker source.
- [ ] M9 legacy `src/scenes/` archived or deleted; `src/init.ts` aliases removed; all seven SCENE_*/PROTOCOL_* docs rewritten and cross-referenced with PRIMARY_CONTRACT.md; active-plan trackers archived.
- [ ] `docs/CHANGELOG.md` entry per milestone exit.
- [ ] `docs/INSTALL.md` and `docs/USAGE.md` updated for launcher and per-HTML outputs.
- [ ] `git tag scene-runtime-v1` proposed at M9 close.

## Documentation close-out requirements

- Active plan / progress tracker: a copy of this plan filed at `docs/active_plans/scene_runtime_spine_plan.md` on first commit.
- Changelog policy: one `docs/CHANGELOG.md` entry per milestone exit (not per patch). The milestone owner writes a single block summarizing what landed under that milestone's workstreams. Exceptions that warrant a separate per-patch changelog entry: (a) user-visible behavior change shipped mid-milestone, (b) closure of a previously documented failure or paused work item, (c) breaking change to a public contract surface. Required categories used as applicable: `### Additions and New Features`, `### Behavior or Interface Changes`, `### Removals and Deprecations`, `### Decisions and Failures`, `### Developer Tests and Notes`.
- Archive / closure notes:
  - `docs/active_plans/well_plate_workspace_pause_note.md` archived to `docs/archive/` at M6 exit.
  - `docs/active_plans/curriculum_decomposition.md`, `docs/active_plans/protocol_entry_audit.md`, and `docs/active_plans/scene_runtime_doc_conflicts.md` archived to `docs/archive/` at M9 exit.
- Final doc rewrite owner: WS-DOCS-FINAL for the seven SCENE_*/PROTOCOL_* docs.
- PRIMARY_CONTRACT.md cross-refs added in each canonical doc at M9.

## Patch plan and reporting format

Each work package closes with one patch. Patches are listed by milestone in approximate dispatch order; patches sharing a milestone with no `Depends on` between them run in parallel.

**M0 (WS-DOC):**

- Patch 1: doc conflict table (WP-DOC-1).
- Patches 2a-2g: margin notes per doc (WP-DOC-2a..2g, parallel).

**M1 (WS-DECOMP):**

- Patch 3: curriculum decomposition map (WP-DECOMP-0).
- Patches 4-8: per-mini-protocol authoring (WP-DECOMP-1..5, parallel).
- Patch 9: full-sequence runner (WP-DECOMP-6, blocked by 4-8).
- Patch 10: tiny-stub triage (WP-DECOMP-7, parallel with 4-8).
- Patch 11: items.yaml rescope (WP-DECOMP-8, blocked by 4-8).
- Patch 12: mini-protocol size and learning-block gate (WP-DECOMP-9).

**M2 (WS-ENTRY):**

- Patch 13: entry-block schema doc (WP-ENTRY-1).
- Patch 14: entry block added to every protocol.yaml (WP-ENTRY-2, parallel within file boundaries).
- Patch 15: items-scene no-hood-default test (WP-ENTRY-3).
- Patch 16: protocol-entry no-hood-default test (WP-ENTRY-4).
- Patch 17: src/init.ts routing patch (WP-ENTRY-5, blocked by 14-16).

**M3 (WS-SPINE):**

- Patch 18: contract types (WP-SPINE-1).
- Patch 19: runtime result types (WP-SPINE-2).
- Patch 20: build-time loader (WP-SPINE-3).
- Patch 21: loader unit tests (WP-SPINE-4).
- Patch 22: no-scenes-imports lint (WP-SPINE-5).
- Patch 23: legacy banner header sweep (WP-SPINE-6).

**M4 (WS-WALKER-ENGINE):**

- Patch 24: walker core dispatch (WP-WALKER-1).
- Patch 25: walker click resolver (WP-WALKER-2).
- Patch 26: walker screenshot pipeline (WP-WALKER-3).
- Patch 27: walker CLI entry (WP-WALKER-4).
- Patch 28: walker no-branch enforcement test (WP-WALKER-5).

**M5 (WS-WP-VERTICAL):**

- Patch 29: well_plate vertical slice (WP-WP-V1).

**M6 (subsystems plus well_plate completion):**

- Patches 30-31: layout pure function plus tests (WP-LAYOUT-1, WP-LAYOUT-2).
- Patches 32-33: dispatch pure function plus tests (WP-DISPATCH-1, WP-DISPATCH-2).
- Patch 34: highlight derivation (WP-DISPATCH-3).
- Patches 35-36: liquid state plus tests (WP-LIQUID-1, WP-LIQUID-2).
- Patches 37-38: well_plate adapter render and dispatch (WP-WP-1, WP-WP-2).
- Patch 39: well_plate scene YAML (WP-WP-3).
- Patch 40: well_plate full walker proof (WP-WP-4).

**M7 (WS-BUILD, WS-LAUNCHER):**

- Patch 41: per-mini-protocol HTML emit (WP-BUILD-1).
- Patch 42: per-HTML size budget gate (WP-BUILD-2).
- Patch 43: launcher index page (WP-LAUNCH-1).

**M8 (WS-HOOD, WS-BENCH, WS-MICRO):**

- Patches 44-46: hood adapter render, dispatch, walker proof (WP-HOOD-1, WP-HOOD-2, WP-HOOD-3).
- Patches 47-48: bench adapter and walker proof (WP-BENCH-1, WP-BENCH-2).
- Patches 49-51: microscope adapter, capabilities, walker proof (WP-MICRO-1, WP-MICRO-2, WP-MICRO-3).
- Patch 52: full-sequence runner walker proof (WP-FULL-SEQ-1).

**M9 (WS-CLEAN, WS-DOCS-FINAL):**

- Patch 53: pre-archive grep sweep test (WP-CLEAN-1).
- Patch 54: archive legacy `src/scenes/` (WP-CLEAN-2).
- Patches 55a-55g: rewrite each SCENE_*/PROTOCOL_* doc (WP-DOCS-1a..1g, parallel).
- Patch 56: archive active-plan trackers (WP-DOCS-2).

Cadence target: 1 to 2 patches per coder per week. Each patch closes one work package and ships a `docs/CHANGELOG.md` entry.

## Open questions and decisions needed

- Confirm proposed mini-protocol set (`tutorial_hood_setup_and_flask_prep`, `tutorial_cell_counting_and_seeding`, `tutorial_drug_dilution_planning`, `tutorial_plate_drug_additions`, `tutorial_mtt_assay_readout`, plus `tutorial_cell_culture_full` runner). Decision owner: user. Default: proceed with this set; refine names and step counts during WP-DECOMP-0.
- Disposition of each tiny tutorial (`tutorial_bench_direct`, `tutorial_cell_counter`, `tutorial_plate_reader`, `tutorial_hood_transfer`, `tutorial_hemocytometer_count`, `tutorial_drug_dilution`, `tutorial_pbs`, `tutorial_split`): absorb, retire to `_dev_smoke/`, or expand? Decision owner: user. Default: WP-DECOMP-7 makes per-tutorial recommendations subject to user review.
- Folder name for new runtime root: `src/scene_runtime/` vs `src/runtime/`? Decision owner: user. Default: `src/scene_runtime/`.
- Legacy tree at M9: archive under `src/archive/scenes_legacy_<YYYY_MM>/` for one release cycle or delete outright? Decision owner: user. Default: archive only; delete deferred to a follow-up patch.
- Launcher styling: minimal text list or themed cards? Decision owner: user. Default: minimal text list with `learning.goals` subtitle.
- Mini-protocol HTML filename convention: `<protocol_id>.html` or `protocol_<protocol_id>.html`? Decision owner: user. Default: `<protocol_id>.html`.
- Keep `?protocol=<id>` URL parameter after launcher ships? Decision owner: user. Default: keep for direct linking.
- Per-mini-protocol HTML size cap: Decision owner: user. Default: 500 KB per HTML, shared library separate.
- Single canonical highlight class name: stay with `.is-next-target`, or rename in the new runtime? Decision owner: user. Default: keep `.is-next-target`.
- Adapter-folder naming when protocol-facing scene name differs from internal id (the legacy `hood` vs `cell_culture_hood` mismatch): canonical name in the new runtime? Decision owner: user. Default: `cell_culture_hood` everywhere, no protocol-facing alias.
- Walker behavior on missing visible affordance: hard fail with structured diff (expected click target vs nearest visible candidate), or pause for screenshot then fail? Decision owner: user. Default: hard fail with structured diff so CI fails fast.
- Screenshot storage: commit `test-results/walker/<protocol_id>/MANIFEST.md` only, or also commit baseline images? Decision owner: user. Default: manifest only; images ephemeral artifacts.
- `entry:` block: explicit (required) vs derived (from first step) for existing tutorials? Decision owner: user. Default: explicit `entry:` block required for every protocol in M1; loader emits warning if absent and derives.
