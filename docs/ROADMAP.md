# Roadmap


Completed: Solid shell vertical slice

A first Solid-based protocol shell vertical slice is complete.

The current green proof is sdspage_heat_denature_samples:

* Launcher renders student-visible protocols.
* Protocol host opens from launcher.
* Per-protocol scene YAML is indexed.
* Scene renders.
* HUD shows prompt and progress.
* Runtime advances through visible object clicks.
* Protocol reaches terminal completion.
* Screenshots are captured during the Playwright walker.
* ?shell=off confirms the runtime is not shell-dependent.
* npm run check passes.
* M4 Playwright specs pass headless.

This milestone proves the shell / runtime / scene / walker path can work end-to-end for a click-only protocol.

Next milestone: Complete the shell UI surface

Goal: turn the current bare-bones shell into the reusable protocol shell.

Scope:

* Inventory / tool tray
* Interaction modal
* Feedback toast
* Professor / help overlay
* Results screen
* Basic shell styling
* Keyboard accessibility for all shell controls
* Shell CSS isolation from scene internals

Completion criteria:

* Shell components are mounted through the protocol host.
* Each shell component has stable test selectors.
* Keyboard access works for tray and modals.
* Modal focus behavior is correct.
* Shell components do not mutate protocol state directly.
* Shell CSS does not target renderer-owned scene elements.

Next milestone: Add adjust gesture support

Goal: support real lab protocol interactions that require setting values, not just clicking objects.

Initial target: mtt_reagent_prep.

Scope:

* Define visible affordance for adjust.
* Support value input for pipette volume and similar set-points.
* Emit typed runtime event with target, gesture, and value.
* Validate through existing validator system.
* Add Playwright proof for an adjust protocol.

Completion criteria:

* A protocol with adjust completes through visible UI.
* Walker does not use hidden controls.
* Screenshots show the value-setting interaction.
* Runtime, not shell, remains authoritative for validation and step progression.

Next milestone: Expand pilot coverage

Goal: prove the shell across more than one simple click-only protocol.

Pilot selection should cover:

* HUD
* Tray
* Feedback
* Modal or help overlay
* At least one protocol with adjust

Candidate protocols:

* sdspage_heat_denature_samples as current green baseline.
* mtt_reagent_prep after adjust support.
* mtt_solubilization_readout if modal or readout flow coverage is needed.
* open_plate_workspace if a simpler click-only comparison is needed.

Completion criteria:

* At least two protocols complete through visible UI.
* At least one protocol exercises more than HUD and basic clicking.
* Walker evidence is stored under tests/playwright/artifacts/<protocol_name>/.

Next milestone: Scene integrity and scene YAML hardening

Goal: make scene YAML reliable enough that protocol authors can use it without hidden layout failures.

Scope:

* Scene lint coverage for per-protocol scenes.
* Fix layout drift in flagged scenes.
* Confirm scientific assets are not cropped or aspect-distorted.
* Replace neutral background placeholders with real asset rendering.
* Keep asset integrity tests running with shell mounted.

Completion criteria:

* Flagged scenes pass scene-integrity checks.
* Background assets render correctly.
* Scene lint catches common scene YAML failures before browser tests.
* Shell chrome does not alter scene layout or crop assets.

Next milestone: Protocol content cleanup

Goal: reduce broken and ambiguous protocol references before scaling protocol coverage.

Scope:

* Resolve 6 unresolved protocol targets.
* Review ambiguous target mappings.
* Review intentional fanouts.
* Confirm protocol object references match scene object names.
* Add or improve audits so these issues stay caught.

Completion criteria:

* No unresolved targets in student-visible protocols.
* Ambiguous mappings are either fixed or explicitly documented as intentional.
* Fanout behavior is walker-safe and visible.

Next milestone: Codegen pipeline consolidation

Goal: keep one canonical codegen path.

Scope:

* Archive scripts marked SAFE_TO_ARCHIVE.
* Decide build_new_scene_data.py.
* Decide build_protocol_html.py.
* Keep generated artifacts deterministic.
* Ensure docs match package.json and actual build scripts.

Completion criteria:

* One canonical pipeline path is documented.
* Dead pipeline scripts are archived by the human via git mv.
* docs/FILE_STRUCTURE.md and build scripts agree.
* Build and generated protocol / scene artifacts are reproducible.

Longer-term roadmap

* Add richer lab gestures beyond click and adjust as needed.
* Add results screen and scoring display.
* Add better shell styling once functional coverage is stable.
* Expand protocol library coverage.
* Add optional debug panel for protocol state snapshots.
* Improve authoring diagnostics for protocol / scene mismatches.
* Add full accessibility review after core shell surfaces are complete.
* Consider mobile / touch support only after desktop protocol flow is stable.


Planned features and improvements for the cell culture simulation game.

## Delivered

- Two-scene workspace: hood (sterile work) and bench (equipment) peer scenes
- 96-well plate geometry with 8-point carboplatin dose response and metformin sensitization
- 25-step protocol across 3 days (Day 1 split/count/seed, Day 2 dilute/treat, Day 4 MTT/read)
- 22 hood reagents and equipment organized in tab-stop clusters
- 6 bench instruments: centrifuge, water bath, vortex, cell counter, microscope, incubator
- Depth-based visual layering (back/mid/front tiers with opacity and brightness)
- Cell model with metformin sensitization (2x IC50 shift)
- MTT assay readout with OD560 absorbance and realistic noise
- Protocol-fidelity scoring (5 categories: dilution, plate map, timing, MTT technique, absorbance plausibility)
- Dilution prep validation (intermediate, low-range, high-range, metformin stocks)
- Day timeline state machine (day1/day2/day4 with incubator-gated transitions)
- Capability-based scene dispatch migration (Patches 1-16, 2026-05-08 to 2026-05-09; archived plan: [archive/scene_capability_architecture_2026-05-09.md](archive/scene_capability_architecture_2026-05-09.md))
- Scene render-ownership migration: render moved from flat `src/scenes/{hood,bench,microscope,plate,incubator}.ts` source modules into per-scene adapters under `src/scenes/<scene>/<scene>.ts`; `SceneAdapter.render(ctx)` made required; new first-class `plate_reader` adapter; helper duplicates consolidated into `shared/liquid_transfer.ts` and `shared/legacy_tokens.ts`; `sceneRouter` flag retired (decision: REMOVED, see "sceneRouter resolution" below). Completed 2026-05-09 (Patches A1-B4; archived plan: [archive/scene_render_migration_2026-05-09.md](archive/scene_render_migration_2026-05-09.md)).
- Scene migration closeout (Plans A/B/C): generated TS moved out of `src/content/` into gitignored `generated/`; four authored facades (`src/svg_assets.ts`, `src/scene_configs.ts`, `src/inventory.ts`, `src/protocol.ts`); scene YAML extended schema with formal typed `sceneBounds` and `layoutRules.label*`; bench and hood layout migrated to scene YAML and `src/bench_config.ts` + `src/hood_config.ts` deleted; bench split into render/dispatch/effects siblings; microscope manual hemocytometer extracted into a sibling module; hood compatibility-token ladder folded into K2 completionPath dispatch; `src/scenes/shared/legacy_tokens.ts` deleted. Completed 2026-05-09 (Patches A1-A6, B1-B12, C1-C5; archived plan: [archive/scene_migration_completion_2026-05-09.md](archive/scene_migration_completion_2026-05-09.md)).

## sceneRouter resolution (recorded 2026-05-09)

The per-protocol `sceneRouter` flag was migration scaffolding from the
2026-05-08 capability migration. Patch B3 of the render-ownership
migration applied the decision rule from the archived plan and resolved
the flag as **REMOVED**:

- Every protocol used `driver` (no `legacy` opt-out remained).
- Patch B2 retired the alternative implementation (the flat source
  modules), so `legacy` had no backing path.
- No roadmap product feature would consume the field.

The flag, the `SceneRouterMode` type, and the `resolveSceneRouter`
function are gone. There is one render and one dispatch path. The
field is intentionally absent rather than missing by oversight.

## Future enhancements

## Glossary doc (planned)

A single repo-wide `docs/GLOSSARY.md` defining the wet-lab +
simulation vocabulary used across EVERY lab protocol in this
repo, not just the MTT/OVCAR8 work that triggered it. Scope spans
cell culture (passage, seeding, trypan blue counting), drug
dilutions (carboplatin / metformin / serial dilution math),
colorimetric assays (MTT, formazan), electrophoresis (SDS-PAGE,
ladder, lanes, running buffer, destain), pipetting mechanics
(draw / dispense / aspirate / trituration), instrumentation
(multichannel pipette, plate reader, centrifuge, vortex,
microscope, incubator), and the simulation-side vocabulary
(material_volume well-total semantics, subpart groups, scene_op
primitives, learning block, mini-protocol vs sequence runner).

Triggering incident: the MTT cleanup work (2026-05-16) where
multiple terms drifted within a single protocol family (MTT
etymology, aspirate vs draw vs dispense, formazan identity, well-
total volume semantics, trituration). Same drift class is likely
in every other lab area; the glossary prevents repeat work.

Acceptance criteria:

- Single file at `docs/GLOSSARY.md` indexed from `README.md`.
- Covers terms used by EVERY lab protocol family in
  `content/protocols/`, not a one-lab subset. Group by domain
  (Cell culture, Drug dilution, Colorimetric assay,
  Electrophoresis, Pipetting mechanics, Instrumentation,
  Simulation-side authoring) for scannability.
- Each term: one-line definition, a "do" usage, a "do not
  confuse with" cross-reference where relevant.
- Cross-linked from `docs/MARKDOWN_STYLE.md` and `AGENTS.md` so
  authors hit it before introducing new vocabulary.
- Cross-linked from existing authoring vocabularies
  (`docs/specs/PROTOCOL_VOCABULARY.md`,
  `docs/specs/SCENE_VOCABULARY.md`,
  `docs/specs/OBJECT_VOCABULARY.md`) so spec layers reference
  glossary instead of restating definitions.
- Glossary tested by a markdown link check; no orphan terms.

Surfaced cleanups that would land alongside:

- [protocol_manual.py](../validation/manual/protocol_manual.py) already enforces
  "draw" for pipette loading + "aspirate and remove" for vacuum-to-waste;
  glossary ratifies the convention.
- Repo-wide pass replacing remaining authored "aspirate" prose in
  pipette-loading contexts (8 protocols flagged in
  [TODO.md](TODO.md)).
- Authoring vocabularies (PROTOCOL_VOCABULARY, SCENE_VOCABULARY,
  OBJECT_VOCABULARY) shrink as they cite the glossary.

Defer until the next vocabulary drift incident in a different
lab family (the MTT incident alone is insufficient justification
for a one-lab glossary; the cross-lab pattern is the value).

## Next deferred item: split `src/layout_engine.ts` (promoted 2026-05-09)

Promoted to the top of the deferred queue by the scene migration closeout
(Patch C5). `src/layout_engine.ts` is ~857 LOC and coherent at its current
size, but it is the next decomposition target after the scene migration:
split into `layout_assets.ts` + a slimmed `layout_engine.ts`. Revisit if it
crosses 1000 LOC, or pair it with any further layout-policy work in
`src/scenes/shared/scene_layout.ts`. Backref:
`~/.claude/plans/sharded-imagining-diffie.md` (origin of the split idea)
and the closeout archive
[archive/scene_migration_completion_2026-05-09.md](archive/scene_migration_completion_2026-05-09.md).

## Scene adapter responsibility-seam decomposition (closed 2026-05-09)

Closed by the scene migration closeout (Plans A/B/C). Concrete outcomes:

- Hood interaction-ladder cleanup: folded into K2 completionPath dispatch (Patch C1).
- Bench dispatch decomposition: bench split into `render.ts` / `dispatch.ts` / `effects.ts` siblings with `bench.ts` as the thin SceneAdapter shell (Patch C2).
- Microscope dispatch decomposition: manual hemocytometer flow extracted into a sibling module so the automated and manual paths no longer share a single dispatcher (Patch C3).
- `buildLegacyToken` call sites reached zero; `src/scenes/shared/legacy_tokens.ts` deleted (Patch C4).
- Plate / incubator: surfaces remain small; revisit only if they grow.

Archived plan: [archive/scene_migration_completion_2026-05-09.md](archive/scene_migration_completion_2026-05-09.md).

## Hood setup phase

- Add a pre-protocol step where students arrange equipment inside the biosafety hood themselves
- Items start outside or on a staging area; students drag each into the hood workspace
- Teach sterile field layout: clean-to-dirty direction, airflow awareness, spacing
- Score placement based on proper technique (e.g., not blocking rear vents, waste on dirty side, spacing items)
- Could serve as an intro tutorial before the main cell culture protocol

- **Split `src/layout_engine.ts` (857 LOC) into 2 modules: `layout_assets.ts` + slimmed `layout_engine.ts`.** Coherent at
  current size; revisit if it crosses 1000 LOC. Some of this logic moves into `src/scenes/shared/scene_layout.ts` during this
  plan; the residual layout engine stays where it is.
- **Add `tests/types/` with `Expect<Equal<...>>` scaffold + 2 type-test files for `ProtocolStep` and `CompletionPath`.** Wire
  into all three build scripts. Would have caught the K2 drift at compile time.
- **Capability contract type tests.** When the type-test suite lands, add a third file that asserts every capability module
  conforms to the `SceneCapability` interface and every YAML scene config conforms to the `SceneConfig` schema. This is the
  type-level safety net for the new system.

## Capability-based scene architecture (added 2026-05-08)

Items below were deferred from the capability-based scene architecture refactor plan
(`~/.claude/plans/sharded-imagining-diffie.md`). They are tracked here so they survive
the migration and surface during planning.

### Deferred work items

- **Add `tests/types/` with `Expect<Equal<...>>` scaffold + 2 type-test files for `ProtocolStep` and `CompletionPath`.**
  Wire into all three build scripts. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Capability contract type tests.** When the type-test suite lands, add a third file that asserts every capability module
  conforms to the `SceneCapability` interface and every YAML scene config conforms to the `SceneConfig` schema.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Scene YAML validator pytest.** Replace the one-time manual experiment in MS-FOUNDATION with an automated builder test
  that asserts a corpus of malformed scene YAMLs fail loudly and a corpus of valid ones load cleanly. Add once at least one
  real scene YAML exists. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Move scene YAML to `src/content/scenes/` if it becomes author-facing content.** Currently lives beside the adapter under
  `src/scenes/<scene>/`; if scenes become protocol-authored content, relocate in a separate migration.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.

### Locked-decision reminders (guardrails)

- **Mini-protocol failures are design evidence, not nuisance failures.** If a mini-protocol fails during a scene migration,
  fix the scene model or capability boundary before proceeding. Do not patch around the failure.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **`sceneRouter` was migration scaffolding, not a product feature.** Resolved 2026-05-09 (Patch B3) as REMOVED; see "sceneRouter resolution" above.
  Do not reintroduce the flag or a near-equivalent without an explicit product reason.
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Patch report contract.** Every subagent patch report must answer 3 questions in order: (1) what changed? (2) which
  mini-protocol (or full protocol) proves it? (3) which legacy path still exists?
  Backref: `~/.claude/plans/sharded-imagining-diffie.md`.
- **Adapter LOC budgets are warning lights, not gates.** If an adapter exceeds budget, classify the excess (capability
  candidate? scene-specific? unrealistic budget?) and act on the classification -- do not squeeze code purely to hit the
  number. Backref: `~/.claude/plans/sharded-imagining-diffie.md`.

## Deferred cleanups (post 2026-05-09 render migration)

The render-ownership migration (Patches A1-B4) and the scene migration
closeout (Plans A/B/C, Patches A1-A6 + B1-B12 + C1-C5) cleared the layout
duplication item: `src/bench_config.ts` and `src/hood_config.ts` were
retired and bench/hood layout is now sourced from scene YAML.

The next deferred layout-engine item is the `src/layout_engine.ts` split
described in "Next deferred item" above.
