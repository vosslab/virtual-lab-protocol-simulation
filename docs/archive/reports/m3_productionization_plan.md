# M3 productionization plan

**Status:** Draft. Forward-looking only. No implementation occurs in this lane.

**Lane:** F4 (planner role), M2d track of the M2b-M2d program.

**Date drafted:** 2026-05-23.

**Authority:** This plan is bound by [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md), [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md), [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md), the Core invariants in the M2b-M2d plan, the protocol vocabulary in [PROTOCOL_VOCABULARY.md](../../specs/PROTOCOL_VOCABULARY.md), the scene vocabulary in [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md), and [SPEC_DESIGN_CHECKLIST.md](../../specs/SPEC_DESIGN_CHECKLIST.md). Contract-level changes require user approval; this plan does not propose any. Architecture-level decisions across modules require architect approval before M3 starts.

---

## 1. Context

### 1.1 Where M3 picks up

M2b proved one bench scene renders through the real generated content path. M2c proved the renderer generalizes across the D1 scene set (simple bench, dense bench, instrument-heavy, glassware, plate/rack, hood, zoom, Schema B, long labels, adversarial). M2d closed with a visual report, diagnostics, scorecard, viewport sweep, cleanup queue, and this plan.

The M2b-M2d renderer is read-only by design:

- It paints `PipelineResult.final` into the DOM.
- It emits six data attributes per item (`data-placement-name`, `data-object-name`, `data-zone`, `data-kind`, `data-depth`, `data-target-id`).
- It refuses to paint on structural-guard violations.
- It hardcodes one scene at M2b (`src/main.ts` imports `SCENES.bench_basic`), and at M2c carries an allowlist read by the codegen (`SCENE_ALLOWLIST`).
- It does nothing on click. It does not mutate state. It does not transition between scenes. It does not run protocols.

M3 turns the read-only renderer into an interactive runtime that drives mini-protocols end-to-end. This plan stays at the milestone-and-workstream level. Implementation specifics (TypeScript types, validator parameters, file-by-file edits) are deferred to per-lane briefs at M3 dispatch time. No new contract items are introduced.

### 1.2 What M2c and M2d will tell M3 (still pending at draft time)

This plan is drafted in parallel with M2b lanes. Several inputs will refine M3 before dispatch:

- **D5 failure taxonomy** (`docs/active_plans/reports/m2_generalization_failures.md`): M3 may need to absorb classified pipeline-spacing bugs, content-authoring gaps, and renderer bugs that are M3-deferrable rather than M2c-blocking. Open placeholder in section 5.
- **E5 visual report** (`docs/active_plans/reports/m2_visual_report.html`): designer review of best/worst screenshots may surface label-readability hardening or aspect-tolerance tuning that becomes M3 work. Open placeholder in section 5.
- **F2 state-mutation readiness audit** (`docs/active_plans/reports/m2_state_mutation_readiness.md`): already landed. 72 of 125 assets are READY for `ObjectStateChange` targeting; 28 are PARTIAL; 25 NEED RE-AUTHORING. M3 phase ordering in section 4.3 keys off F2's Phase 1/2/3 ordering.

### 1.3 What this plan is not

- Not a re-architecture proposal. M3 builds on the M2c renderer surface as-is. If M2c surfaces architectural drift (e.g. structural guards turn out to need geometry the pipeline does not expose), the manager files a small M3-prep architecture lane separately. This plan does not pre-empt that.
- Not a contract amendment. No new vocabulary, no new gesture, no new scene-op primitive proposed here. New primitives require the SPEC_DESIGN_CHECKLIST process plus user approval.
- Not a stabilization plan. M3 dispatches only after M2c-M2d close cleanly. If M2c reveals unresolved layout-pipeline bugs, the manager produces a separate stabilization plan and defers M3.

---

## 2. Goals

M3 closes when a real student can complete one full mini-protocol end-to-end through the visible UI, using only clicks the renderer wires to authored protocol interactions, with `ObjectStateChange` operations mutating SVG sub-elements as the protocol demands, and a strict build-time validator gating bad content before runtime.

Concrete M3 goals:

1. **Multi-scene selector.** Replace the hardcoded `SCENES.bench_basic` import in `src/main.ts` with a runtime scene selector driven by URL hash plus a dev-only picker.
2. **Click handling.** Wire pointer events on `[data-target-id]` to the authored protocol interaction chain.
3. **`ObjectStateChange` wiring.** Implement the M3 scene-op primitive on the renderer side per [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md). The renderer mutates SVG sub-elements identified in F2's per-asset readiness map, never by swapping whole asset files.
4. **Strict build-time validator.** Deferred from M2b per briefing 06.02. Throws (not diagnostics) on `unknown_object`, multi-level extends, locked-field mutations, missing assets, and any class of authoring error the runtime would otherwise discover late.
5. **Protocol step wiring.** Drive flow via `entry_step` plus `next_step` traversal. The runtime fires `step_validator`, applies `outcome` (`complete` advances; `retry` resets the whole sequence), and runs to a terminal `next_step: null`.
6. **Frozen-baseline Playwright mode.** Enable `toHaveScreenshot` for at least one mini-protocol after the designer confirms section-7 fixture heights (briefing 06.01).

Each goal corresponds to a workstream in section 4.

### 2.1 Non-goals for M3

- No state mutation requiring re-authored SVGs in F2's NEEDS_RE_AUTHORING bucket. M3 ships the wiring; asset-authoring is a content-team queue that runs alongside, prioritized per F2 phase 1.
- No new gestures beyond the closed set in [PROTOCOL_VOCABULARY.md](../../specs/PROTOCOL_VOCABULARY.md) (`click`, `drag`, `adjust`, `select`, `type`). If M3 surfaces a gesture gap, the manager files a contract amendment, not an inline addition.
- No new scene-op primitives beyond the five named in [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md) (`ObjectStateChange`, `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`). Same rule applies.
- No multi-scene production rendering beyond the D1 set plus the protocol scenes that mini-protocols actually use. Broad migration is later.
- No background-image support. Gradient-only stays as the contract.
- No backend, no persistence, no student-progress store. M3 is browser-only and stateless across reloads.

---

## 3. Workstreams (parallel-plan-ready)

The six M3 goals split into six workstream tracks. Tracks are mostly independent and dispatch in parallel under `delegate-manager-to-subagents`. Inter-track gates appear in section 6.

Each track lists a one-line scope, the files it touches (forward-looking; references may not yet exist at draft time), the closed deliverable surface, and the verification gate. File names follow the M2b file-ownership matrix conventions and the canonical TypeScript layout in [TYPESCRIPT_STYLE.md](../../TYPESCRIPT_STYLE.md).

### Track G: multi-scene selector

| Lane | Role | Deliverable | Touched files (forward-looking) |
| --- | --- | --- | --- |
| G1. URL-hash scene loader | coder | `loadSceneFromHash()` reads `location.hash` (`#scene=bench_basic`), validates against `SCENE_ALLOWLIST`, returns the selected `SceneA \| SceneB`. Default scene named explicitly (e.g. `bench_basic`); empty hash uses default. Invalid hash renders a "scene not in allowlist" diagnostic page, not a fallback scene. | `src/main.ts`, new `src/scene_runtime/scene_selector.ts` |
| G2. Dev-only picker UI | coder | Floating dev panel listing every scene in `SCENE_ALLOWLIST`, gated behind a query param (`?dev=1`) or a `process.env.NODE_ENV === "development"` check at build time. Clicking a scene updates `location.hash` and re-renders. Never present in production builds. | `src/scene_runtime/dev_scene_picker.ts`, `src/style.css` (panel chrome only, outside `#scene-root`) |
| G3. Hash-change re-render | coder | `window.addEventListener("hashchange", ...)` clears the DOM under `#scene-root` and re-runs the pipeline + renderer for the new scene. Idempotent; double-render of the same scene is a no-op. | `src/main.ts` |
| G4. Allowlist hygiene test | tester | Playwright test that visits each `SCENE_ALLOWLIST` entry via hash, asserts common acceptance criteria from the M2b plan still pass, and asserts the dev picker only appears under the dev flag. | `tests/playwright/test_scene_selector.spec.mjs` |

**Replaces (M2b):** `src/main.ts` hardcoded `const scene = SCENES.bench_basic;`.

**Constraints:**

- No `if (scene === "bench_basic")` branches anywhere in `src/scene_runtime/**`. Core invariant 7 from the M2b plan stays in force.
- The picker is dev-only chrome and lives outside `#scene-root`. It is never a scientific object. CSS rules on the picker container are exempt from B3's scene-content content policy.
- URL hash is the production scene-selection contract. No `?scene=` query parsing.

### Track H: click handling

| Lane | Role | Deliverable | Touched files (forward-looking) |
| --- | --- | --- | --- |
| H1. Click dispatcher | coder | `attachClickDispatcher(root: HTMLElement, runtime: ProtocolRuntime): void`. Single delegated `click` listener on `#scene-root`. Walks `event.target` ancestors to the first `[data-target-id]`; calls `runtime.dispatchClick(targetId)`. Pointer-capture and double-click guards. No per-scene branches. | new `src/scene_runtime/runtime/click_dispatcher.ts` |
| H2. Target resolver | coder | `resolveTarget(targetId: string): Placement \| null`. Maps `data-target-id` to a placement via the scene's target registry. The registry is built at codegen time from the scene YAML's `placements[].target_id` field if present, or derived from `placement_name` when no explicit `target_id` is authored. Decision deferred to G's allowlist expansion: see section 5 open questions. | `tools/gen_scene_index.py`, `generated/scenes.ts`, new `src/scene_runtime/runtime/target_resolver.ts` |
| H3. Interaction-chain runner | coder | `runInteraction(interaction, runtime): InteractionResult`. Calls the interaction's `validator` preset against the resolved target plus the gesture payload; on pass, applies the `response.scene_operations` in order; on fail, increments the step retry count. Pure-function shape; no DOM access. | new `src/scene_runtime/runtime/interaction_runner.ts` |
| H4. Other-gesture stubs | coder | Closed-enum dispatch on `gesture`: `click`, `drag`, `adjust`, `select`, `type`. M3 ships `click` and `select` end-to-end (mini-protocol need); `drag`, `adjust`, `type` throw "gesture not implemented in M3" with the gesture name. Throw, not silent. Future work plans add them. | `src/scene_runtime/runtime/gesture_dispatch.ts` |
| H5. Playwright click coverage | tester | Per mini-protocol in scope (see section 4), a Playwright test that clicks through the full visible interaction chain and confirms `next_step: null` is reached. No internal-API state writes. Per [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) rule 4: visible UI only. | `tests/playwright/test_<mini_protocol>_walkthrough.spec.mjs` |

**Replaces (M2b):** the renderer's silent ignoring of clicks.

**Constraints:**

- The renderer never grows a click handler. The dispatcher attaches to `#scene-root` and reads attributes the renderer already emits.
- No internal-API click. Playwright tests must use `page.click(...)` against visible elements; calls into the runtime from test code are rejected at L review.
- Click targets are addressed by `target_id`, never by DOM selector. The renderer-to-runtime contract is the data-attribute set, not CSS classes.

### Track J: `ObjectStateChange` wiring

| Lane | Role | Deliverable | Touched files (forward-looking) |
| --- | --- | --- | --- |
| J1. `ObjectStateChange` primitive | coder | `applyObjectStateChange(op: ObjectStateChange, dom: HTMLElement): void`. Reads `op.target` (semantic object name) and `op.state_fields` (flat primitive fields per [SPEC_DESIGN_CHECKLIST.md](../../specs/SPEC_DESIGN_CHECKLIST.md)). Mutates the named sub-element of the inline SVG (e.g. `liquid_level` rectangle's `height` attr, `lid` group's `transform`). Never swaps whole asset files. | new `src/scene_runtime/runtime/object_state_change.ts` |
| J2. Asset state-map codegen | coder | `tools/gen_object_state_map.py` reads each object YAML's `visual_states:` block and emits `generated/object_state_map.ts`. The map declares, per object, which `state_fields` exist and which SVG sub-element id they target. Failures: missing sub-element id in the SVG, type mismatch, undeclared field. | `tools/gen_object_state_map.py`, `generated/object_state_map.ts` |
| J3. State-mutation guards | coder | Pre-mutation guards parallel to M2b's structural guards: reject any `ObjectStateChange` whose `target.kind` and `state_fields` are not declared in the object's `visual_states`. Reject any mutation that would push a sub-element outside its declared bounds (e.g. liquid level greater than container height). | `src/scene_runtime/renderer/object_state_guards.ts` |
| J4. F2 phase-1 asset wiring | coder + content | The eight Phase 1 assets from F2 (consolidated coomassie, destain, BME, laemmli, running-buffer, heat-block) ship with single-SVG variants and named `liquid_level` / `lid` / `display_temperature` IDs. Content team authors; coder wires. Gates on F2's per-asset SVG list. | `assets/equipment/*.svg`, `content/objects/**/*.yaml` (object-side `visual_states` declarations) |
| J5. State-change Playwright coverage | tester | Per Phase 1 asset, a Playwright test that triggers the relevant `ObjectStateChange` via a click chain (no direct DOM writes) and asserts the sub-element changed as declared. | `tests/playwright/test_object_state_<asset>.spec.mjs` |

**Replaces (M2b):** nothing. M2b does not handle state mutation; this is new surface.

**Constraints:**

- `ObjectStateChange` is the **sole** protocol-side primitive that mutates declared object state. Per [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md), `SvgSwap`, `ColorChange`, `LiquidDisplayChange`, and `SetPointDisplayChange` are object/render-layer concerns invoked by `visual_states`, not protocol scene-ops. M3 must not introduce a parallel protocol-side variant.
- Sub-element targeting names declared IDs (e.g. `target.liquid_level`). New ID conventions require an OBJECT_VOCABULARY edit, not an inline addition.
- F2 NEEDS_RE_AUTHORING assets are out of M3 scope unless the content team ships them during M3. M3 dispatches with whatever Phase 1 plus PARTIAL completions are ready.

### Track K: strict build-time validator

| Lane | Role | Deliverable | Touched files (forward-looking) |
| --- | --- | --- | --- |
| K1. Validator scope sweep | planner | Enumerate every error class the runtime currently surfaces as a diagnostic (`unknown_object`, multi-level extends, locked-field mutations, missing asset, malformed background, unauthorized scene-op type, gesture-target mismatch, etc.). Document each as a validator gate, with severity (hard fail vs warn). | new `docs/active_plans/reports/m3_validator_scope.md` |
| K2. Validator implementation | coder | `tools/validate_content.py` runs as an npm `pre*` hook before any `build` / `typecheck` / `test:node` step. Reads `content/**/*.yaml`, runs every K1-scoped gate, exits non-zero on any hard fail with file path and field path visible. No try/except per [PYTHON_STYLE.md](../../PYTHON_STYLE.md). | `tools/validate_content.py`, `package.json` script entries |
| K3. Diagnostic-to-throw migration | coder | For each diagnostic the runtime currently emits, decide whether K2 should throw at build time (most cases) or whether the runtime diagnostic remains useful in dev (rare cases). Update the pipeline to skip emitting now-build-time-rejected diagnostics. | `src/scene_runtime/layout/*` (small touches) |
| K4. Validator coverage test | tester | `tests/test_validator_coverage.py` plus per-error-class fixture YAMLs under `tests/content/dev_smoke/validator_*/`. Each fixture must be rejected by the validator with the expected error message. | `tests/test_validator_coverage.py`, fixtures |

**Replaces (M2b):** M2b's codegen-time loud failures (which already reject some classes). K extends coverage and centralizes the gate.

**Constraints:**

- The validator is a **gate**, not a linter. Failing the validator fails the build. No "warn and continue" middle ground unless K1 explicitly identifies a class that warrants it.
- The validator catches errors **before** runtime. The runtime stops emitting diagnostics for classes the validator now rejects; "diagnostic plus throw" is a redundant duplicate.
- The validator runs from `tools/validate_content.py` as a Python script with the same style rules as the M2b codegen scripts. Tabs, no try/except, no defensive defaults.

### Track L: protocol step wiring

| Lane | Role | Deliverable | Touched files (forward-looking) |
| --- | --- | --- | --- |
| L1. Protocol codegen | coder | `tools/gen_protocols.py` reads `content/protocols/**/protocol.yaml` and emits `generated/protocols.ts` with one typed const per mini-protocol plus a `PROTOCOL_ALLOWLIST`. Validates the full schema in [PROTOCOL_YAML_FORMAT.md](../../specs/PROTOCOL_YAML_FORMAT.md): closed gesture enum, closed scene-op enum, required step slots, valid `entry_step`, `next_step` reachability, learning-block required for `mini_protocol` and `sequence_runner`. | `tools/gen_protocols.py`, `generated/protocols.ts` |
| L2. Protocol runtime | coder | `class ProtocolRuntime`: holds `currentStep`, advances on `step_validator` pass, restarts the whole `sequence` on `on_failure: retry`. Drives via `entry_step` and `next_step`; never reads YAML directly. Pure state machine; DOM interaction goes through Track H's dispatcher and Track J's mutators. | new `src/scene_runtime/runtime/protocol_runtime.ts` |
| L3. Validator preset library | coder | The closed preset library named in [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md): interaction presets (`correct_target`, `correct_choice`, `target_with_value`), step presets (`sequence_complete`, `final_state_matches`). Each preset is a function of typed params; authors do not write custom validation logic. | new `src/scene_runtime/runtime/validators/*.ts` |
| L4. Event emitter | coder | Emit `<step_name>_complete` on `step_validator` pass and `<equipment_name>_elapsed` on `TimedWait` completion. Snake_case, derived from the step or equipment name. No hand-authored event names. | `src/scene_runtime/runtime/events.ts` |
| L5. Mini-protocol pilot set | tester | Pick 2 mini-protocols (recommend `passage_hood_detachment` and `trypan_blue_counting` per `cell_culture`) and run them end-to-end through L2's runtime under Playwright. Saves before/after screenshots for each step. | `tests/playwright/test_passage_hood_detachment.spec.mjs`, `tests/playwright/test_trypan_blue_counting.spec.mjs` |

**Replaces (M2b):** nothing. M2b has no protocol runtime.

**Constraints:**

- Flow is always `entry_step` plus `next_step` traversal. Array position in the `steps` list never controls flow.
- `outcome: on_failure: retry` resets the **whole step sequence**, not just the failing interaction. This is the [PROTOCOL_VOCABULARY.md](../../specs/PROTOCOL_VOCABULARY.md) rule.
- Walker rule (Core invariant 4 / [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md)): no per-protocol or per-step branches anywhere in the runtime. Branching from `step_name` is grounds for L review rejection.

### Track N: frozen-baseline Playwright mode

| Lane | Role | Deliverable | Touched files (forward-looking) |
| --- | --- | --- | --- |
| N1. Section-7 height confirmation | tester | Block on the designer confirming corrected `_height` values in [SCALING_MODEL.md](../../specs/SCALING_MODEL.md) section 7 (briefing 06.01). No N work proceeds until this is signed off. | (designer artifact, not lane-owned code) |
| N2. Baseline capture | tester | After N1, capture one canonical PNG per D1-allowlist scene plus one per mini-protocol terminal state at fixed viewport (1200x900, headless Chromium, deterministic load). Stored under `tests/playwright/baselines/`. | `tests/playwright/baselines/*.png` (tracked but generated; managed via `playwright update-snapshots` workflow) |
| N3. `toHaveScreenshot` enablement | tester | Convert M2c's artifact-only Playwright tests to `toHaveScreenshot` calls with N2's baselines. Diff threshold tuned to absorb sub-pixel rendering jitter. | `tests/playwright/test_*.spec.mjs` updates |
| N4. CI gate for visual regressions | tester | `npm run test:visual` script runs the frozen-baseline suite. Failure produces a diff image artifact for review. | `package.json` script entries, `check_codebase.sh` |

**Replaces (M2b):** M2b's "no frozen baselines anywhere" rule for the post-N1 set only. M2b's rule was correct under M2b conditions (section-7 wrong, would freeze the bug). N1 removes that condition.

**Constraints:**

- N is **blocked on N1**. The plan cannot start by enabling frozen baselines while section-7 heights remain wrong. Briefing 06.01 must close first.
- Baselines freeze visible UI only. They are not a substitute for the structural-guard tests; both must continue to pass independently.
- Frozen baselines are committed to git, unlike `generated/`. They are content-team artifacts, not codegen output.

---

## 4. Milestone structure

M3 is one milestone, not three. The six tracks dispatch in parallel under `delegate-manager-to-subagents`. The closing gate is "one mini-protocol walks end-to-end through the visible UI with `ObjectStateChange` operations changing the scene as authored, with the strict validator catching at least one new error class that the M2c diagnostic stream previously absorbed silently".

### 4.1 Suggested M3 phases for execution sequencing

Phases are an execution-order hint, not separate milestones. The closing gate stays single.

- **Phase 1 (parallel-safe, week 1):** K1 (validator scope), G1 + G3 (hash selector), L1 (protocol codegen), J2 (state-map codegen). All four can dispatch immediately. None block on the others.
- **Phase 2 (depends on Phase 1, week 2):** H1 + H2 + H3 (click dispatcher chain), K2 (validator), L2 + L3 (runtime + validator presets), J1 + J3 (state-change primitive + guards), G2 + G4 (dev picker + selector test).
- **Phase 3 (depends on Phase 2, week 3):** J4 (asset re-authoring for F2 Phase 1 assets; runs in parallel with M3 from the content team), L5 (mini-protocol pilot), H5 (per-protocol click coverage), J5 (per-asset state coverage), K4 (validator coverage), L4 (events), N1 + N2 + N3 + N4 (frozen baselines, dependency-gated on designer signoff).
- **Phase 4 (close):** review per closing gate; docs/changelog.

Phase 3 contains all the gates that depend on real assets being ready and on the designer signing off section-7. If section-7 slips, Track N defers to a follow-up milestone; the rest of M3 still closes.

### 4.2 Concurrency cap

Per the M2b-M2d concurrency rule, M3 keeps the same cap: at most 4 code-edit lanes active simultaneously. Audit, report, and read-only-test lanes are uncapped.

### 4.3 Asset-authoring dependency

F2 Phase 1 (eight assets) is the M3 critical content path. The content team's queue runs alongside M3 and lands assets one at a time. M3 does not block on the full Phase 1 set; it ships as each asset lands. If only three Phase 1 assets land before M3 closes, M3 covers three; the rest roll to M4.

---

## 5. Open questions

Each question lists the resolution path. These resolve at M3 dispatch time, not at draft time. None require contract-level changes.

### 5.1 Target-id authoring convention (Track H)

The renderer emits `data-target-id` per the M2b plan. The plan is silent on whether `target_id` is an authored scene-YAML field or derived from `placement_name`. Two paths:

- **Option A**: authored. `placement.target_id: "ethanol_bottle_back"` lives in scene YAML.
- **Option B**: derived. Codegen sets `target_id = placement.placement_name`; YAML stays geometry-free and target-name-free at the scene layer.

Recommendation: Option B by default. The scene layer's job is placement, not protocol-target naming. Authoring drift between `placement_name` and `target_id` produces silent breakage. If a protocol genuinely needs to address two placements with the same `target_id` (e.g. a treatment-plate well that two interactions both name), the protocol-side adapter handles the fan-out, not the scene-side.

Resolves at: K1 (validator scope sweep) plus L1 (protocol codegen) before H2 dispatches.

### 5.2 D5 failure carryover

Failure taxonomy not yet landed at draft time. When `m2_generalization_failures.md` lands, the manager refines M3 by appending an "absorbed from M2c" subsection here. Each absorbed item names the failing scene, the classification, the responsible M3 track, and the lane that takes it.

Resolves at: lane D5 close.

### 5.3 E5 designer-driven hardening

Visual report not yet landed at draft time. If the designer's review flags label-readability cases that warrant promotion from warnings to hard failures, those promotions land in M3's strict validator (Track K) or in the renderer's font-size guard (Track J's guards module, by analogy).

Resolves at: lane E5 close.

### 5.4 Gesture-set coverage

Per Track H4, M3 ships `click` and `select` end-to-end. The mini-protocol pilot set (Track L5) governs whether `drag`, `adjust`, or `type` are needed. If a pilot mini-protocol requires `drag` (pipette-to-flask carry), that gesture moves from "stub-throw" to "implement" inside M3.

Resolves at: L5 pilot selection.

### 5.5 Scene-op coverage beyond `ObjectStateChange`

Per [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md), the five protocol scene-op primitives are `ObjectStateChange`, `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`. M3 must ship at least `ObjectStateChange` and `SceneChange` (mini-protocols cannot transition scenes otherwise). `CursorAttach`, `LayoutMove`, and `TimedWait` depend on pilot-protocol coverage and may land later.

Resolves at: L5 pilot selection.

### 5.6 Frozen-baseline scope

Track N enables `toHaveScreenshot` for "at least one mini-protocol". The set may grow once N1 closes. Designer signoff defines the scope, not this plan.

Resolves at: N1 close.

### 5.7 Sequence-runner coverage

[PROTOCOL_VOCABULARY.md](../../specs/PROTOCOL_VOCABULARY.md) defines `sequence_runner` as the protocol kind that chains mini-protocols into a larger pathway. M3 must decide whether sequence runners ship in M3 or defer. Lean toward defer: M3 closes once one mini-protocol walks. Sequence runners are an M4 candidate.

Resolves at: M3 dispatch; recorded in the M3 changelog entry.

### 5.8 Protocol-progress persistence

A returning student should resume mid-protocol. M3 does not ship persistence (no backend, no LocalStorage of student state per section 2.1). When a learner reloads, they restart at `entry_step`. If this regresses pedagogy in the pilot mini-protocols, persistence becomes an M4 lane, not a contract amendment.

Resolves at: M3 dispatch; revisited at M3 close in the M4 plan.

---

## 6. Dependencies

### 6.1 Must land before M3 dispatch

These are M2b-M2d outputs that M3 reads directly:

- M2b: bench_basic renders. (M2b closing gate.)
- M2c: D1 set renders per allowlist. (M2c closing gate.) M3 inherits `SCENE_ALLOWLIST`.
- M2c: failure taxonomy (D5). M3 absorbs M3-deferrable items per section 5.2.
- M2d: visual report (E5). M3 absorbs designer-flagged hardening per section 5.3.
- M2d: cleanup queue (F3). M3 starts from a clean source tree.
- F2 state-mutation readiness audit. M3 reads F2's READY list to scope J1-J3 and F2's Phase 1 ordering to scope J4. (Already landed.)
- F1 interaction readiness audit. M3 confirms the six required data-attrs are present before H1 dispatches.

### 6.2 Designer dependencies

- Briefing 06.01 (section-7 fixture heights): blocks Track N entirely. Other tracks proceed without it.
- Designer review of F2 Phase 1 asset designs (per F2's "Designer review" next step): blocks J4 per-asset wiring lanes one at a time.

### 6.3 Content-team dependencies

- F2 Phase 1 asset re-authoring (eight assets, ~7 person-hours per F2's estimate). Runs alongside M3. M3 lanes that need a specific asset block on that asset; the rest proceed.

### 6.4 Cross-track gates inside M3

- H2 (target resolver) depends on G's allowlist (target-id source decided in section 5.1).
- H3 (interaction runner) depends on L3 (validator presets).
- L2 (protocol runtime) depends on L1 (protocol codegen) and H1+H2+H3 (click dispatcher chain).
- L5 (mini-protocol pilot) depends on L2 + J1 + J3 + K2 all landing.
- N2+ depends on N1.

### 6.5 Architect approval

This plan proposes no contract changes and no cross-cutting design surface changes that an architect must ratify before M3 starts. The single architect call-out: **resolving section 5.1 (target-id authoring convention) is an architecture decision** because it touches the scene-vs-protocol boundary. The manager surfaces 5.1 to the architect at M3 dispatch.

---

## 7. Acceptance

M3 closes when all of the following hold:

### 7.1 Common (carries forward from M2b plan)

- All M2b Common acceptance criteria still pass on every D1 scene. M3 does not regress M2b/M2c invariants. (No clipping, no cropping, no placeholder content, aspect preserved, no overlap, no off-page items, no `if (scene ===` branches, etc.)
- `bash check_codebase.sh` passes (typecheck, lint, format, tests, build, plus new K2 validator step).
- Lane H reproducibility passes (clean state to running pilot mini-protocol in one shell session).

### 7.2 M3-specific

- `src/main.ts` has no hardcoded scene import. Scene selection runs through Track G's URL-hash plus dev-picker chain.
- Track G allowlist test (G4) passes for every `SCENE_ALLOWLIST` entry.
- One pilot mini-protocol (`passage_hood_detachment` or `trypan_blue_counting`) walks end-to-end through Playwright using only visible UI clicks. Test passes from `entry_step` to a terminal step with `next_step: null`. Per-step screenshots saved.
- `ObjectStateChange` operations on at least three F2 Phase 1 assets (after content team ships them) mutate the named sub-element as authored. Playwright tests pass.
- Strict build-time validator (Track K) rejects at least one error class that the M2c runtime diagnostic stream previously absorbed silently. K4 fixtures pass.
- Frozen-baseline mode (Track N) enabled for at least one mini-protocol after N1 closes. If N1 does not close before M3 dispatch close, Track N rolls to M4 and the rest of M3 still closes.

### 7.3 Documentation

- `docs/CHANGELOG.md` carries the M3 entry under the closing date, listing each track's deliverable.
- `docs/CODE_ARCHITECTURE.md` updated to reflect the new runtime modules (`runtime/`, `runtime/validators/`, `dev_scene_picker.ts`, etc.).
- `docs/USAGE.md` updated to document the URL-hash scene selector and the dev picker.
- `docs/active_plans/reports/m3_validator_scope.md` exists (Track K1 deliverable).
- This plan is moved with `git mv` from `docs/active_plans/reports/` to `docs/archive/` once M3 closes (per [REPO_STYLE.md](../../REPO_STYLE.md) close-out rule for plans).

### 7.4 Known-failures table (mirrored from M2b plan)

Every M3 scene or interaction that does not work as authored lands a row in the M3 known-failures table with a classification:

- missing asset (waiting on F2 Phase 1)
- partial asset (in PARTIAL bucket, ID renaming queued)
- pipeline state-mutation bug
- runtime bug
- validator rejected (content fix queued)
- deferred to M4 (sequence runner, frozen-baseline section)

M3 does not close with a silent failure. Each known failure is classified and routed.

---

## 8. Anti-idle directives

If a critical-path M3 track is blocked, the manager keeps these lanes moving:

- **N blocked on designer (section-7 heights):** dispatch K1 (validator scope), L1 (protocol codegen), J2 (state-map codegen) ahead of the gated work.
- **J4 blocked on content team:** the J track stays on J1-J3 implementation against F2 PARTIAL assets that already have the needed IDs (e.g. existing `anchor_liquid_clip` on bottles); J4 ships per-asset as content lands.
- **Pilot mini-protocol blocked on scene-op gap:** if the pilot needs a scene-op M3 has not yet shipped (CursorAttach, LayoutMove, TimedWait), the manager dispatches that scene-op as a sub-lane within Track J's pattern.

No work is "wait and see." If two lanes disagree on a fact, the manager dispatches a verifier subagent rather than asking the user.

---

## 9. What M3 explicitly does NOT do

- No new gestures beyond the closed set. Contract change, not lane work.
- No new scene-op primitives beyond the five. Contract change, not lane work.
- No backend, no persistence, no LocalStorage of progress.
- No sequence-runner runtime (deferred per section 5.7).
- No M3-wide asset re-authoring; F2 Phase 1 is the only re-authoring inside M3.
- No background-image support; gradient-only stays.
- No mining of old engine code, `salvage/`, archived runtime, or public-renderer pattern matching. Core invariants 3 and 4 from M2b carry forward.
- No commit of `generated/`. Codegen pre-hooks (Track J2, Track L1) extend the M2b pre-hook map; they do not bypass it.

---

## 10. Cross-references

- M2b-M2d plan: `~/.claude/plans/familiarize-yourself-with-this-humming-lemon.md`.
- M2b file-ownership matrix: same plan, Group 2 section.
- F2 state-mutation audit: docs/active_plans/reports/m2_state_mutation_readiness.md.
- F3 cleanup queue: docs/active_plans/reports/m2_cleanup_queue.md.
- D1 scene selection: docs/active_plans/reports/m2_generalization_scene_set.md.
- D5 failure taxonomy: docs/active_plans/reports/m2_generalization_failures.md (placeholder; not yet landed at draft time).
- E5 visual report: docs/active_plans/reports/m2_visual_report.html (placeholder; not yet landed at draft time).
- Briefing 06.01 (section-7 heights): `design_advice/MANAGER_BRIEFING.html` section 06, decision 01.
- Briefing 06.02 (strict validator): `design_advice/MANAGER_BRIEFING.html` section 06, decision 02. M3 ships per Track K.
- Briefing 06.03 (`_shrunk_passes` field): decision recorded as "keep in production." No M3 lane needed.

---

## 11. Revision policy

This plan is a draft. The manager refines it after D5 and E5 land:

- D5 absorbed items go in section 5.2's placeholder.
- E5 designer-flagged hardening items go in section 5.3's placeholder.
- Section 6.4's gate list is re-checked against the actual dispatch order chosen at M3 start.

After M3 closes, this file moves to `docs/archive/` with `git mv` per [REPO_STYLE.md](../../REPO_STYLE.md) close-out rule.
