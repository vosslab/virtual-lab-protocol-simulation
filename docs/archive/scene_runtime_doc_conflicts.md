# Scene runtime doc conflicts

> **Historical audit / partially superseded.** This is a historical
> conflict-audit table from a prior plan phase. Some verdicts -- specifically
> the `plateTargets` / `tubeTargets` `matches-contract` classifications -- have
> been superseded by the unified interaction vocabulary plan; see the inline
> SUPERSEDED notes below and [PROTOCOL_VOCABULARY.md](../PROTOCOL_VOCABULARY.md).
> Do not treat stale `matches-contract` verdicts as authoritative.

This is the M0 conflict-audit table for the seven `docs/SCENE_*.md` and
`docs/PROTOCOL_*.md` docs against [docs/PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md)
and the plan at `docs/active_plans/scene_runtime_spine_plan.md`.

Status values:

- `matches-contract`: the section is already aligned with the contract and the new runtime spine. No edit needed in M0; full rewrite in M9 may still revise wording.
- `stale-sections`: the section is partially correct but references the hood-centered or `src/scenes/` model, lacks the `entry:` block, or otherwise contradicts the new runtime ownership. The WP-DOC-2* doer adds an inline `> CONTRACT MIGRATION:` margin note above the section. Full rewrite in M9.
- `must-rewrite`: the section is structurally incompatible with the contract (treats hood as parent, hardwires legacy paths into the schema, missing required contract concepts). M0 still only adds a margin note; the actual rewrite is the M9 WP-DOCS-1* work package.

Contract reference shorthand:

- C1: scene and protocol config in YAML; shared behavior in TS; no scene-as-parent.
- C2: large protocols compiled from mini-protocols; one HTML per mini-protocol.
- C3: clickable objects are SVG-backed scene objects; layout engine; custom geometry only for subparts inside structured scientific objects; liquids via LIQUID_CONVENTION.
- C4: mini-protocol complete only when visible UI walker passes.
- C5: mini-protocol scoped by `learning:` block (objectives, outcomes, goals); `entry:` block (M2 addition) declares initial scene and first step.

## SCENE_ARCHITECTURE.md (306 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-58 (Purpose, Layered model diagram) | stale-sections | Layered model hard-codes `src/scenes/<scene>/<scene>.yaml` and `src/scenes/<scene>/<scene>.ts` as the canonical home. Margin note: new runtime lives under `src/scene_runtime/` with peer adapters; old `src/scenes/` path is the legacy tree. Cite C1. |
| 60-117 (Driver and Registry) | stale-sections | Driver and registry described in `src/scenes/scene_driver.ts` and `src/scenes/scene_registry.ts` only. Margin note: the new spine relocates this to `src/scene_runtime/contract.ts` / `loader.ts` with build-time YAML loading, not browser-side YAML parsing. Cite C1. |
| 118-137 (Adapters table) | must-rewrite | The six-adapter table is the canonical statement of the legacy peer-of-hood model (cell_culture_hood listed second, well_plate_workspace described as bypassing capabilities and inlining its own dispatch). Margin note: the new runtime model treats every scene as a peer adapter under `src/scene_runtime/adapters/<scene>/`; well_plate is the first migration target. Cite C1 and the plan's "Architecture boundaries and ownership" section. |
| 138-163 (Capabilities table) | stale-sections | RESERVED/PARTIAL/ACTIVE annotation reflects the current legacy state. Margin note: capability split is being replaced by the runtime subsystems (layout, dispatch, highlight, liquid). The new spine does not preserve `instrumentWorkspace`, `plateReaderWorkspace`, `incubatorWorkspace` as identity-only placeholders. |
| 165-200 (Module-load side effects) | stale-sections | Whole section is a workaround for `src/scenes/` registration order. Margin note: build-time loader emits typed generated TS/JSON; runtime no longer relies on module-load side effects for registration. Cite the plan's `tools/build_protocol_data.py` ownership. |
| 202-228 (How a frame renders) | stale-sections | Capture-phase listener + capability fallback is the legacy dispatch model. Margin note: new dispatch lives in `src/scene_runtime/dispatch/`; this section will be replaced by the runtime contract API description. |
| 230-260 (How to add a new scene) | must-rewrite | Step list creates a new scene under `src/scenes/<name>/` and adds a side-effect import in `src/init.ts`. Both paths are deleted at M9 (WS-CLEAN). Margin note: new authoring path is `src/scene_runtime/adapters/<scene>/`; routing is via the protocol's `entry:` block, not by editing `setRenderGame`. Cite C1, C5. |
| 262-285 (Shared infrastructure) | stale-sections | `src/scenes/shared/*` modules will move (or be replaced) under the new runtime. Margin note: liquid handling moves into `src/scene_runtime/liquid/` per LIQUID_CONVENTION; the shared module catalog is migration-tracked in the plan. |
| 286-306 (Relation to scene YAML + Related docs) | matches-contract | Statement that scene YAML is engine-facing configuration today aligns with C1; the link-out structure stays correct. Wording will be revised at M9. |

## SCENE_VOCABULARY.md (237 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-12 (Purpose) | matches-contract | Doc's role as canonical vocabulary is correct. M9 will refresh the cross-links. |
| 14-38 (Terms summary table) | stale-sections | Term definitions like `adapter`, `capability`, `scene registry`, `capability registry` are written against the legacy `src/scenes/` runtime. Margin note: under the new runtime spine, adapters live under `src/scene_runtime/adapters/` and registration is build-time loader output rather than module-load side effects. Definitions remain conceptually valid; locations update. Cite C1. |
| 42-60 (scene, scene id) | stale-sections | "Adapter files live under `src/scenes/<scene_name>/<scene_name>.ts`" is the legacy path. Margin note: adapter location moves to `src/scene_runtime/adapters/<scene>/`. |
| 62-77 (adapter, capability) | stale-sections | Capability description ties to `SceneCapability` in `src/scenes/scene_driver.ts`. Margin note: capabilities are being replaced by runtime subsystems; vocabulary entry kept for migration-period compatibility. |
| 79-93 (workspace) | matches-contract | Definition is advisory-only and contract-neutral. |
| 95-117 (item, scene object, zone, layout engine) | matches-contract | These terms match C3 (SVG-backed scene objects, layout engine ownership). M9 may tighten wording but the substance is correct. |
| 119-138 (structured surface, subpart) | matches-contract | Custom geometry for subparts inside structured surfaces is exactly C3. |
| 140-162 (wrongOrderMessage, elementId, instrument-overlay) | stale-sections | All three are described relative to specific `src/scenes/` files (cell_culture_hood as `hood-scene`, microscope using `instrument-overlay`). Margin note: addressing model is being replaced by the new runtime's adapter slot system; values are migration-tracked. |
| 164-185 (module-load side effect, completion event) | must-rewrite | "Module-load side effect" is a vocabulary entry codifying the legacy registration model. Margin note: deprecated under the new spine; build-time loader emits registrations, so this term will not survive into the M9 rewrite. Cite C1. |
| 187-219 (render, dispatchInteraction, SceneContext, ClickTarget) | stale-sections | API shapes pinned to `src/scenes/scene_driver.ts` line numbers. Margin note: new contract types live in `src/scene_runtime/contract.ts`; these names may be preserved but their definitions move. |
| 221-237 (scene registry, capability registry) | must-rewrite | Both registry definitions presuppose module-load registration in `src/scenes/scene_registry.ts`. Margin note: registry replaced by build-time loader emitting typed generated TS/JSON, per the plan's M3 spine. |

## SCENE_YAML_FORMAT.md (501 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-16 (Purpose) | matches-contract | "Scene YAML is build-time runtime configuration... not a behavior language" aligns with C1. |
| 17-49 (Build pipeline) | stale-sections | Pipeline diagram routes through `tools/build_scene_data.py` -> `generated/scene_data.ts` -> `src/scenes/scene_driver.ts`. Margin note: new pipeline routes through the renamed/extended loader (the plan keeps `tools/build_protocol_data.py` ownership and may merge scene-data emission into it). |
| 50-64 (File location) | must-rewrite | "Each scene YAML lives beside its TypeScript adapter at `src/scenes/<scene>/<scene>.yaml`" is the locked legacy decision. Margin note: under the new runtime, adapter and YAML colocate under `src/scene_runtime/adapters/<scene>/` (or under `src/content/scenes/` if the doc's own deferred-migration note is taken). The current path becomes a legacy path. Cite C1. |
| 65-82 (Top-level fields table) | matches-contract | The field set (sceneId, workspace, capabilities, elementId, items, zones, sceneBounds, layoutRules, accentRules, wrongOrderMessage, tabStops) maps onto C1 and C3. M9 may strip RESERVED fields that the new runtime does not adopt; substance survives. |
| 83-143 (Items: Layout vs DispatchOnly variants) | matches-contract | Field shape is consistent with C3 (SVG-backed scene objects laid out by layout engine; structured surfaces may use custom geometry). DispatchOnlySceneItem is a structured-surface internals concession that C3 explicitly allows. |
| 144-172 (Zones) | matches-contract | Zone schema is exactly the layout-engine input C3 requires. |
| 173-247 (Scene bounds, Layout rules, Accent rules) | matches-contract | All optional/advisory; consistent with C3. |
| 248-268 (Wrong-order messages) | stale-sections | Notes the runtime hardcodes message and duration. Margin note: in the new runtime, the wrongOrderMessage block either becomes runtime-honored or is removed; either way the "RESERVED" status documented here is provisional. |
| 269-294 (Capability names) | must-rewrite | The capability allow list (itemWorkspace, modalWorkspace, instrumentWorkspace, gridCountingWorkspace, incubatorWorkspace, plateReaderWorkspace, plus whitelisted-but-unimplemented `liquidTransfer`) is the legacy capability set. Margin note: the new runtime replaces this list with the runtime subsystems (layout, dispatch, highlight, liquid). Cite C1 and the M6 subsystem workstreams. |
| 295-340 (What scene YAML must not contain + Validation rules) | matches-contract | The negative rules (no JS/TS, no behavior hooks, no defensive defaults) match C1 directly and align with `docs/PYTHON_STYLE.md` "do not hide bugs with defaults". |
| 341-417 (Examples) | stale-sections | Examples cite `src/scenes/incubator/incubator.yaml` and `src/scenes/bench/bench.yaml`. Margin note: paths update to `src/scene_runtime/adapters/...` once those adapters land. Field content of the examples is C3-aligned and survives. |
| 418-446 (The `well_plate_workspace` scene) | must-rewrite | The block describes well_plate as a one-off scene with `capabilities: []` and adapter-owned dispatch in `src/scenes/well_plate_workspace/dispatch.ts`. The plan's pause note flags this exact configuration as the unstable case driving the rewrite. Margin note: this section is replaced wholesale at M9 once the well_plate adapter lives in `src/scene_runtime/adapters/well_plate/` and uses the runtime layout engine and dispatch subsystem. Cite C1 and the plan's M5/M6 vertical proof. |
| 447-482 (Current limitations and reserved fields) | stale-sections | The bullet list is faithful to the current code but is built around `src/scenes/` paths and RESERVED capability ids. Margin note: each bullet will either resolve or be retired by the new runtime; nothing here is locked schema. |
| 483-501 (Related docs) | matches-contract | Cross-reference list is correct in shape; M9 updates URLs as files move. |

## PROTOCOL_AUTHORING_GUIDE.md (778 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-19 (Header and related references) | matches-contract | Cross-link shape is correct; reference to `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` will retarget the M4 generic walker. |
| 20-36 (What a protocol is) | stale-sections | Describes the three-file folder layout under `src/content/<protocol_name>/`. C1 still wants YAML, but the doc is silent on the contract-required `learning:` block (C5) and the M2 `entry:` block. Margin note: every mini-protocol must declare `learning.objectives`, `learning.outcomes`, `learning.goals` and an `entry:` block (or `# intended_entry_scene:` comment during M1). |
| 37-268 (Worked example: tutorial_split) | must-rewrite | Worked example is a 3-step protocol; the plan classifies tutorials under 6 steps as either absorbed into a mini-protocol, retired to `_dev_smoke/`, or expanded to >= 6 steps. tutorial_split is therefore not a valid worked example for `protocolType: mini_protocol`. The example also still uses legacy top-level `interactionSequence` and authored `completionTrigger`, which the doc itself warns about further down. Margin note: replace with a worked mini-protocol example at M9; for the M0 audit, treat as must-rewrite. Cite C2, C5. |
| 269-291 (Note on derived fields, "Step shapes: pick a completion path") | matches-contract | The four-kind taxonomy (interactionSequence, directTool, modal, multipleChoice) is the locked walker dispatch model in the plan's Walker contract. |
| 292-410 (Worked modal / multipleChoice examples) | matches-contract | Examples align with the walker contract's `completionPath.kind`-only dispatch. |
| 412-473 (Worked tubeTargets example) | matches-contract | `tubeTargets` schema is a contract-aligned layout extension consistent with C3 (structured surface) and the well_plate scene scope. |

> SUPERSEDED (unified interaction vocabulary plan, WP-DOC-C1): the
> `matches-contract` verdict on the `tubeTargets` rows is retired. `tubeTargets`
> is scene-specific drift in the protocol vocabulary, not a contract-aligned
> extension. The ratified vocabulary retires the `tubeTargets` / `plateTargets`
> keys entirely; grouped targets are named `target_groups` defined in scene
> YAML and resolved through the adapter registry. Contract item C3 governs
> scene geometry, not protocol vocabulary, so classifying a protocol-vocabulary
> key as `matches-contract` under C3 was a category error.
| 475-532 (Mini-tutorial pattern: workspace-only protocol) | stale-sections | This section already names the workspace-only pattern that the plan calls "mini-protocol". Margin note: rename in M9 from "mini-tutorial" to "mini-protocol", add the `protocolType` taxonomy (`mini_protocol`, `sequence_runner`, `dev_smoke`), and add `entry:` / `learning:` requirements. Cite C2, C5. |
| 534-580 (Per-step authoring checklist) | matches-contract | Bullet list aligns with walker contract (tool-first click model, one completionEvent on the final interaction, no banned synonyms). |
| 581-672 (Protocol audit tool, plateTargets) | matches-contract | Audit script behavior and plateTargets schema are contract-neutral. |

> SUPERSEDED (unified interaction vocabulary plan, WP-DOC-C1): the
> `matches-contract` verdict on the `plateTargets` portion of this row is
> retired. `plateTargets` is scene-specific drift in the protocol vocabulary.
> The ratified vocabulary retires the `plateTargets` / `tubeTargets` keys; row
> and group targeting moves to scene-YAML `target_groups` resolved through the
> adapter registry. Contract item C3 governs scene geometry, not protocol
> vocabulary; the `matches-contract` classification was a category error.
| 674-733 (Auto-walker contract) | must-rewrite | This section describes the existing hand-authored walker at `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`. Plan M4 replaces it with a generic engine at `tests/playwright/walker/` and a single CLI at `tests/playwright/walker.mjs <protocol_id>`. Margin note: section will be replaced by the Walker contract from the plan (no per-step branches, dispatch on completionPath.kind only, walker reads `entry:` block for startup routing). Cite C4 and the plan's Walker contract. |
| 734-778 (Build and walk loop) | stale-sections | Commands cite `tools/build_protocol_data.py` and `tools/run_protocol_walkthrough.py`. Margin note: the build pipeline is being split per mini-protocol (M7), and the walkthrough script is replaced by `tests/playwright/walker.mjs <protocol_id>`. |

## PROTOCOL_VOCABULARY.md (459 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-15 (Header, related docs) | matches-contract | Vocabulary doc role is correct. |
| 16-41 (Strict hierarchy diagram) | matches-contract | Hierarchy (Protocol -> Part -> Step -> Completion path with four kinds) is the locked walker dispatch model. Aligns with C4. |
| 42-82 (Core rule: one job per term) | matches-contract | Same. |
| 83-231 (Why these terms, key term definitions) | matches-contract | Term definitions for completion path, interaction sequence, interaction, click plan, click target, tool, source, destination, direct tool interaction, modal step, multiple-choice quiz step, microtube liquid, tube target, plate target, stock solution, intermediate dilution, working solution, state change, completion event, completion trigger, completion-event emitter, completion-event coverage, interaction index, used items, active highlight items, wrong-order click are all C4-consistent and survive the spine swap. |
| 233-249 (Container terms table) | matches-contract | Same. |
| 250-282 (Workspace concept) | stale-sections | Describes "scene" / "workspace" as the rendered viewport with cell_culture-era values. Margin note: under the new runtime, "scene" is the value picked up by the protocol's `entry:` block; the workspace concept stays but its examples update. Add note that no mini-protocol may default to `cell_culture_hood` unless its first authored step is in the hood. Cite C5 and the plan's entry-scene gate. |
| 284-303 (Field-level terms) | matches-contract | Field-level table is C4-aligned. |
| 305-313 (Runtime / state terms) | stale-sections | "Completion-event emitter" definition still routes through per-scene adapter `.ts` files under `src/scenes/<scene_name>/`. Margin note: adapter location moves to `src/scene_runtime/adapters/<scene_name>/`. |
| 315-321 (Test-tier terms) | stale-sections | "Walker" definition refers to the current single-script walker. Margin note: replace with the plan's generic engine + CLI model. Cite C4. |
| 322-361 (Banned synonyms table) | matches-contract | Banned-synonyms enforcement is contract-stable. |
| 362-430 (Worked example) | matches-contract | Generic placeholder names already use `<scene_name>`, etc. C1- and C4-clean. |
| 431-459 (State-change vs completion rule, tool-first model, Status) | matches-contract | All three subsections are C4-aligned. |

## PROTOCOL_YAML_FORMAT.md (1070 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-25 (Header, design rationale, where YAML lives) | matches-contract | C1-aligned: YAML is author-editable at build time, browser consumes generated TS only. |
| 26-65 (File locations + multiple protocols) | stale-sections | Says "The active protocol is `cell_culture`" and shows the cell_culture path as canonical. Margin note: M1 decomposes cell_culture into per-mini-protocol folders; per-mini-protocol HTML emission lands at M7. The "active protocol" framing is being retired. Cite C2. |
| 66-174 (items.yaml and reagents.yaml) | stale-sections | Items default to `scene: hood` and the example uses hood-centered ids. The plan's WS-DECOMP explicitly rescopes items so the student-use scene determines item placement; "no item defaults to hood unless hood is its real teaching scene". Margin note: examples need to be rescoped per the M1 decomposition. Cite C1, C2. |
| 175-206 (Learning block) | stale-sections | Block is marked "optional"; the contract makes it required for `protocolType: mini_protocol`. Margin note: contract C5 requires `learning.objectives`, `learning.outcomes`, `learning.goals` on every mini-protocol; loosen-to-optional language is wrong. Sub-key wording also needs the contract's "Students completing this mini-protocol will have achieved..." / "Students completing this mini-protocol will be able to..." / "Overall, this mini-protocol aims to accomplish..." prefixes. |
| 207-251 (Parts, Days, Steps) | matches-contract | Field tables are C4-aligned. |
| 252-289 (Completion paths overview, four kinds) | matches-contract | Same as PROTOCOL_VOCABULARY.md hierarchy. |
| 290-491 (interactionSequence kind incl. plateTargets, tubeTargets) | matches-contract | Schema is the locked walker dispatch model. |

> SUPERSEDED (unified interaction vocabulary plan, WP-DOC-C1): the
> `matches-contract` verdict on the `plateTargets` / `tubeTargets` portions of
> this row is retired. Those keys are scene-specific drift in the protocol
> vocabulary; the ratified vocabulary retires them in favor of scene-YAML
> `target_groups` resolved through the adapter registry. Contract item C3
> governs scene geometry, not protocol vocabulary, so the original
> `matches-contract` classification under C3 was a category error.
| 492-700 (directTool, modal, multipleChoice kinds) | matches-contract | Same. |
| 701-760 (Validator behavior + Derived fields + Migration status) | matches-contract | C4-aligned: validator dispatches on `completionPath.kind`, derived fields enforced. |
| 761-803 (Step fields for interaction-driven / non-click / modal-owned) | matches-contract | Same. |
| 804-842 (plateMap) | matches-contract | Plate-scene annotation schema is C3-aligned (structured surface labels). |
| 843-918 (Interaction object structure, completion trigger structure, worked pbs_wash example) | stale-sections | Worked example uses cell_culture's `pbs_wash` in the legacy `interactionSequence` shape ("This uses modern field names; at runtime (before Patch 1), YAML keys are still in legacy form."). Margin note: the doc itself flags the wording is mid-migration; replace at M9 with a mini-protocol-shaped worked example using `completionPath.kind: interactionSequence`. |
| 919-942 (Step anatomy) | matches-contract | Field-level explanation is correct. |
| 943-996 (Cross-file validation rules) | stale-sections | The scene allow-list `hood | bench | incubator | microscope | plate | plate_reader | well_plate_workspace` and the symmetric `HOOD_LAYOUT` / `BENCH_LAYOUT` rules hard-code the legacy scene names. The validator does not yet check the contract-required `entry:` block or `protocolType`. Margin note: add `entry:` validation (M2), `protocolType` validation (M1), and the no-`cell_culture_hood`-default-entry gate. Cite C5. |
| 997-1042 (Generated TypeScript surface) | stale-sections | Lists `generated/protocol_data.ts` and `generated/inventory_data.ts` as the only emission targets. Margin note: the new build pipeline (M7) emits one HTML per mini-protocol; the generated surface changes shape. Cite C2. |
| 1043-1070 (Stable-id discipline, item vs reagent namespace, see-also) | matches-contract | Namespace discipline is C1-aligned. |

## PROTOCOL_STEPS.md (354 lines)

| lines | status | required action |
| --- | --- | --- |
| 1-10 (Header) | matches-contract | Doc role is correct. |
| 11-36 (Source of truth + ProtocolStep table) | stale-sections | `ProtocolStep` table still lists top-level `interactionSequence`, top-level `completionTrigger`, and scene allow-list `hood | bench | incubator | microscope | plate_reader`. The PROTOCOL_VOCABULARY.md doc says this top-level field is gone post-SP-K2g; this doc has drifted. Margin note: replace top-level `interactionSequence` with `completionPath` and add `entry:` and `protocolType` to the interface. Cite C5, plan M2/M3. |
| 37-70 (Ordering: explicit, not positional) | matches-contract | nextId linked-list discipline is C4-neutral. |
| 71-90 (Adding a new step) | stale-sections | Steps 4a / 4b describe pre-registering completion-event emitters and registered-emitters sets in scene code. Margin note: under the new runtime, emitter coverage comes from the build-time loader, not from `triggerStep`/`registeredEmitters` in `src/scenes/`. Cite C1, M3. |
| 91-147 (Triggering a step + Pre-registration) | must-rewrite | Whole section codifies the legacy module-load-side-effect contract: scene code calls `triggerStep`, `registeredEmitters.add(...)` lives near the top of each `src/scenes/cell_culture_hood/cell_culture_hood.ts`-style file. The plan retires this in M3 (build-time loader emits typed contract) and M9 (delete `src/scenes/`). Margin note: section is replaced wholesale at M9. Cite C1 and the plan's "Module-load side effects" anti-pattern call-out. |
| 148-166 (Reading the current step) | matches-contract | `getCurrentStep()` discipline is contract-neutral and survives. |
| 167-189 (Hint derivation) | stale-sections | Hint helpers live in `src/scenes/cell_culture_hood/render.ts`. Margin note: adapter path moves to `src/scene_runtime/adapters/cell_culture_hood/`; logic stays. |
| 190-222 (Startup validators) | must-rewrite | All three validators (`validateProtocolGraph`, `validateCompletionEventCoverage`, `validateProtocolSteps`) live in `src/init.ts`. Plan M2 explicitly removes the `gameState.activeScene === 'hood'` legacy fallback from `src/init.ts`; plan M3 moves validation into the build-time loader so completion-event coverage is enforced before the browser runs. Margin note: validators move out of `src/init.ts` into the build-time loader. Cite C1, M2, M3. |
| 223-247 (Graph smoke test + UI walker) | must-rewrite | Section describes the legacy `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` as "canonical real-UI regression test". Plan M4 replaces both the graph smoke and the per-protocol UI walker with the generic engine at `tests/playwright/walker/` + CLI `tests/playwright/walker.mjs <protocol_id>`. Margin note: section is replaced at M9. Cite C4 and the plan's Walker contract. |
| 248-262 (Completion trigger wiring) | stale-sections | Describes the manual `triggerStep`-based wiring contract. Margin note: contract changes to build-time loader emission + runtime dispatch; wiring is no longer hand-authored per scene. |
| 263-329 (Tube-target dilution prep steps) | matches-contract | Runtime behavior described is C3-consistent (microtube liquid stacking, structured-surface state). |
| 330-354 (Plate-target transfer steps, MultipleChoice completion paths) | matches-contract | C3- and C4-aligned. |

## Summary counts

| status | rows |
| --- | --- |
| matches-contract | 31 |
| stale-sections | 30 |
| must-rewrite | 11 |
| total | 72 |

## Per-doc summary

- `SCENE_ARCHITECTURE.md`: 9 rows (1 matches, 6 stale, 2 must-rewrite)
- `SCENE_VOCABULARY.md`: 11 rows (4 matches, 5 stale, 2 must-rewrite)
- `SCENE_YAML_FORMAT.md`: 13 rows (8 matches, 3 stale, 2 must-rewrite)
- `PROTOCOL_AUTHORING_GUIDE.md`: 9 rows (4 matches, 3 stale, 2 must-rewrite)
- `PROTOCOL_VOCABULARY.md`: 11 rows (8 matches, 3 stale, 0 must-rewrite)
- `PROTOCOL_YAML_FORMAT.md`: 13 rows (7 matches, 6 stale, 0 must-rewrite)
- `PROTOCOL_STEPS.md`: 11 rows (4 matches, 4 stale, 3 must-rewrite)

## Zero-conflict docs

None. Every one of the seven docs has at least one row that requires either a margin note (`stale-sections`) or a full M9 rewrite (`must-rewrite`).

## Ambiguity calls and assumptions

- `PROTOCOL_VOCABULARY.md` has no `must-rewrite` rows in this audit because its substantive content (term definitions, banned-synonyms ban list, walker dispatch hierarchy) is already aligned with the plan's Walker contract and the four-kind completion-path taxonomy. The only edits needed are location updates (`src/scenes/` -> `src/scene_runtime/adapters/`), which are `stale-sections`. If a future reviewer disagrees, the candidate rows would be 305-313 (runtime/state terms) and 250-282 (workspace concept).
- `PROTOCOL_YAML_FORMAT.md` line 175-206 (Learning block) is classified `stale-sections` rather than `must-rewrite` because the existing structure (objectives / outcomes / goals) matches C5; only the optional-vs-required language and the leading-sentence templates need adjustment.
- Section line ranges are approximate (heading-anchored). The WP-DOC-2* doers should re-anchor by heading text rather than copy line numbers verbatim, since insertions during margin-note authoring will shift downstream line numbers.
- The `must-rewrite` label still means "M0 only adds a margin note"; the actual rewrite is M9 (WP-DOCS-1*). The classification flags which sections will need the deepest rework, not which sections WP-DOC-2* changes today.
