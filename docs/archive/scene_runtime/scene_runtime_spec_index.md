# Scene runtime spec index

WP-SPEC-INDEX-1 deliverable (M0 / WS-SPEC-CONSOLIDATION).

This document maps every runtime component listed in the plan's
"Architecture boundaries and ownership / Component map" section
to its canonical `docs/specs/` source(s) of truth. It is read-only
evidence; no spec is edited here. Downstream coders open the listed
specs before touching the named component.

Plan reference: `/Users/vosslab/.claude/plans/serene-stargazing-moore.md`

---

## Component-to-spec cross-reference

Each row is one component. "Component path" is the path the plan names (with
`(new)` or `(existing skeleton)` notation matching the plan). "Purpose" is one
line from the plan. "Canonical spec(s)" are relative links to `docs/specs/`
files whose definitions, vocabulary, and schema the component must conform to.
"Notes" surface inheritance, boundary, or resolution constraints relevant to
that component.

| Component path | Purpose | Canonical spec(s) | Notes |
| --- | --- | --- | --- |
| `src/scene_runtime/contract.ts` | Runtime type contract for the closed protocol vocabulary; consumed by every other runtime module. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [PROTOCOL_STEPS.md](../specs/PROTOCOL_STEPS.md), [PROTOCOL_YAML_FORMAT.md](../specs/PROTOCOL_YAML_FORMAT.md) | Must define the closed `Gesture`, `SceneOperation`, validator-preset, and `Outcome` unions exactly as the vocab doc specifies. No retired types (`completionPath`, `plateTargets`, `tubeTargets`, `requiredItems`, `errorHints`). |
| `src/scene_runtime/types.ts` | Runtime types for scene and object models. | [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md), [SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md), [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md), [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md) | Must cover `SceneConfig`, `Zone`, `Placement`, `ObjectConfig`, `StateField`, `VisualState`, `Capability`, `SubpartGroup`. No legacy `liquidCapable` / `capacityMl` / `containsAny` types. |
| `src/scene_runtime/loader/` (new) | Loads generated protocol, scene, object, and material data; cross-references resolve; consumes fully-resolved scenes. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [PROTOCOL_YAML_FORMAT.md](../specs/PROTOCOL_YAML_FORMAT.md), [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md), [SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md), [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md), [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md), [MATERIAL_CONVENTION.md](../specs/MATERIAL_CONVENTION.md), [SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md) | Scene inheritance is fully resolved Python-side per SCENE_INHERITANCE.md; loader sees one resolved scene per id. Loud error on any missing required field; no silent defaults. |
| `src/scene_runtime/render/` (new) | Renderer core; resolves object `visual_states`, applies the five `scene_operation` primitives, requests redraw, owns the clock abstraction. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [PROTOCOL_STEPS.md](../specs/PROTOCOL_STEPS.md), [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md), [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md), [MATERIAL_CONVENTION.md](../specs/MATERIAL_CONVENTION.md) | Five `scene_operation` types: `ObjectStateChange`, `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`. All five defined in PROTOCOL_VOCABULARY.md and PROTOCOL_STEPS.md. Clock abstraction internal to `render/clock.ts`. |
| `src/scene_runtime/render/clock.ts` (new) | Production clock (real time) and test clock (advance-on-command); injected into `TimedWait` handling. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [PROTOCOL_STEPS.md](../specs/PROTOCOL_STEPS.md) | `TimedWait` spec lives in PROTOCOL_STEPS.md. Clock is adapter-internal; does not add protocol vocabulary. Test-clock contract is a docs gap (see Unmapped components). |
| `src/scene_runtime/dispatch/` (existing skeleton) | DOM event capture, gesture extraction, target resolution to a semantic object id. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md) | Closed `gesture` set (`click`, `drag`, `adjust`, `select`, `type`) from PROTOCOL_VOCABULARY.md. Semantic `target` name mapping from SCENE_VOCABULARY.md scene adapter. |
| `src/scene_runtime/layout/` (existing skeleton) | Layout module bound to the closed object vocabulary. | [LAYOUT_ENGINE.md](../specs/LAYOUT_ENGINE.md), [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md), [SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md), [SCALING_MODEL.md](../specs/SCALING_MODEL.md) | Must cover row/zone placement, `blocks` family, per-cell fallback, label collision, and `visual_states`-driven re-render per LAYOUT_ENGINE.md. Scale factor from SCALING_MODEL.md. |
| `src/scene_runtime/highlight/` (existing skeleton) | Target-highlight overlay driven by the current `interaction.target`. | [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md), [SVG_PIPELINE.md](../specs/SVG_PIPELINE.md) | Highlight is presentation-only; must not mutate `RuntimeWorld`. SVG overlay mechanics per SVG_PIPELINE.md. |
| `src/scene_runtime/liquid/` (existing skeleton) | Liquid render rules driven by MATERIAL_CONVENTION.md. | [MATERIAL_CONVENTION.md](../specs/MATERIAL_CONVENTION.md), [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md), [SVG_PIPELINE.md](../specs/SVG_PIPELINE.md) | Must fail loudly for unsupported material render fields; no transparent/water fallback. Material field kinds (`material_name`, `material_volume`, `held_material_name`, `held_material_volume`) from OBJECT_VOCABULARY.md. |
| `src/scene_runtime/adapters/` (existing skeleton) | Per-object render adapters (one per object `kind`). | [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md), [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md), [SVG_PIPELINE.md](../specs/SVG_PIPELINE.md), [MATERIAL_CONVENTION.md](../specs/MATERIAL_CONVENTION.md), [LAYOUT_ENGINE.md](../specs/LAYOUT_ENGINE.md) | SVG render mechanics from SVG_PIPELINE.md. Visual state resolution from OBJECT_YAML_FORMAT.md. Subpart-group `data-target-id` encoding must match OBJECT_VOCABULARY.md subpart-group definitions. |
| `src/scene_runtime/chrome/` (new) | Minimal chrome: scene viewport, prompt panel, next / feedback area. Welcome / launcher / polished MCQ deferred. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [PROTOCOL_STEPS.md](../specs/PROTOCOL_STEPS.md), [WALKTHROUGH_GUIDE.md](../specs/WALKTHROUGH_GUIDE.md) | Prompt text verbatim from `step.prompt`. Feedback from `interaction.response.feedback`. Validator advance from `step_validator` presets per PROTOCOL_STEPS.md. Walker `data-testid` hooks per WALKTHROUGH_GUIDE.md. |
| `src/scene_runtime/bundle/entry.ts` (new) | esbuild entry point that exports the initializer the per-protocol HTML shells call. | [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [SCENE_ARCHITECTURE.md](../specs/SCENE_ARCHITECTURE.md) | Entry point must be thin; all runtime logic lives in the modules above. One top-level error boundary allowed per plan rules. Error boundary spec gap noted in Unmapped components. |
| `pipeline/build_runtime_bundle.sh` (new) | esbuild invocation producing one shared `dist/runtime.bundle.js` plus source map. | [TARGET_FILE_STRUCTURE.md](../specs/TARGET_FILE_STRUCTURE.md) | Emits to `dist/` (gitignored). No per-protocol bundle; one shared bundle. No secondary bundler. Interchange shape decision deferred to WP-GENERATED-DATA-1 (see Unmapped components). |
| `pipeline/build_protocol_html.py` (new) | Per-mini-protocol HTML shell generator; each shell references the shared runtime bundle and inlines or sibling-loads per-protocol generated data. | [TARGET_FILE_STRUCTURE.md](../specs/TARGET_FILE_STRUCTURE.md), [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md) | Emits `dist/<protocol_name>.html` per mini-protocol; no monolithic HTML per PRIMARY_CONTRACT item 2. Protocol name list derived from generated data, not raw YAML. |
| `tests/playwright/walker/` (existing scaffold) | Generic walker engine driven by the realigned contract; one walker, no per-protocol branches. | [WALKTHROUGH_GUIDE.md](../specs/WALKTHROUGH_GUIDE.md), [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md) | Walker clicks only visible DOM; no internal API calls. Zero per-protocol or per-step branches per WALKTHROUGH_GUIDE.md and plan invariant (`tests/test_walker_no_step_branches.py`). |

---

## Unmapped components

The following components the plan names have no single clear canonical spec that
fully covers them. Each entry classifies the gap and proposes a resolution path.
None of these gaps block M0; they are surfaced now so downstream WPs do not
treat the plan text as their spec source.

### `src/scene_runtime/render/clock.ts` -- test-clock contract

The clock abstraction (production `setTimeout`-backed vs advance-on-command test
clock) is a runtime-internal adapter concern. The `TimedWait` operation it serves
is specified in [PROTOCOL_STEPS.md](../specs/PROTOCOL_STEPS.md) and
[PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md), but neither doc defines
test-clock requirements or clock-injection API contracts.

Gap classification: renderer gap -- the runtime needs an internal abstraction
that no spec covers because it is purely a testing concern, not a protocol
vocabulary concern.

Proposal: extend [WALKTHROUGH_GUIDE.md](../specs/WALKTHROUGH_GUIDE.md) with a
short "Clock control" section covering (a) walker must use injected test clock,
(b) walker must not call `page.waitForTimeout` against a real `TimedWait`
duration, (c) the clock-advance API shape. No new protocol primitive needed.
Add a `docs/TODO.md` entry.

### `src/scene_runtime/bundle/entry.ts` -- top-level error boundary surface

The plan permits exactly one top-level UI error boundary at the runtime entry
point. No spec covers what a runtime initialization failure surface must look
like for developer-facing error display.

Gap classification: renderer gap -- presentation-layer concern with no spec home.

Proposal: add a brief "Runtime initialization error surface" note to
[SCENE_ARCHITECTURE.md](../specs/SCENE_ARCHITECTURE.md). If the rule is stable
after M1.5, promote it to a short `docs/specs/RUNTIME_INIT.md`.
Add a `docs/TODO.md` entry.

### `pipeline/build_runtime_bundle.sh` and `pipeline/build_protocol_html.py` -- bundler and interchange contracts

[TARGET_FILE_STRUCTURE.md](../specs/TARGET_FILE_STRUCTURE.md) documents desired
steady-state file layout but does not specify the bundler invocation contract,
the exact fields each HTML shell must declare, or how generated data is
referenced (inline vs sidecar). The plan assigns this decision to WP-GENERATED-DATA-1.

Gap classification: generated-data gap -- the interchange shape decision belongs
in the generated-data audit document, not in any current spec.

Proposal: the WP-GENERATED-DATA-1 audit document
(`docs/active_plans/generated_data_audit.md`, to be written) becomes the
authoritative interchange-shape spec for these two pipeline scripts. If the shape
stabilizes after M1, graduate it to a `docs/specs/GENERATED_DATA.md` stub.
Add a `docs/TODO.md` entry.

---

## Spec inventory

Every file under `docs/specs/` with its one-line purpose. This is the
cross-check that no spec is orphaned from the runtime component table above.

| Spec file | One-line purpose |
| --- | --- |
| [LAYOUT_ENGINE.md](../specs/LAYOUT_ENGINE.md) | How the layout engine places objects in a scene: zones, rows, cells, scaling, and placement coordinates. |
| [MATERIAL_CONVENTION.md](../specs/MATERIAL_CONVENTION.md) | Material type taxonomy, material fields on objects, palette shape, and render color rules. |
| [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md) | Canonical vocabulary for the object system: kinds, state_fields, visual_states, capabilities, subpart_groups. |
| [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md) | Schema for object YAML files: top-level fields, state_field schema, visual_state formula tokens, capability set, subpart group declarations. |
| [PROTOCOL_AUTHORING_GUIDE.md](../specs/PROTOCOL_AUTHORING_GUIDE.md) | Author walkthrough for writing a protocol from scratch: three YAML files, validator, and real-UI walker. |
| [PROTOCOL_STEPS.md](../specs/PROTOCOL_STEPS.md) | How protocol steps are shaped, ordered, validated, and resolved: step structure, interaction sequence, scene operations, validator presets, outcome mapping. |
| [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md) | Canonical vocabulary for protocol authoring and runtime: protocol kinds, step, interaction, gesture set, scene operation set, validator preset set, outcome, event naming. |
| [PROTOCOL_YAML_FORMAT.md](../specs/PROTOCOL_YAML_FORMAT.md) | Schema for the three-file protocol YAML surface: `protocol.yaml`, `materials.yaml`, optional `scenes/<name>.yaml` overrides. |
| [SCALING_MODEL.md](../specs/SCALING_MODEL.md) | Real-world-dimension scaling model: `display_width_cm`, `px_per_cm`, and how items are sized in scenes. |
| [SCENE_ARCHITECTURE.md](../specs/SCENE_ARCHITECTURE.md) | How scenes are wired and run at runtime: scene-adapter boundary, scene resolution flow, scene-change lifecycle. |
| [SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md) | Three-layer scene resolution rule: base layer + per-protocol override + inheritance keys; all resolved Python-side before the runtime sees data. |
| [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md) | Canonical vocabulary for the scene system: scene, zone, placement, target, scene adapter, scene registry. |
| [SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md) | Schema for scene YAML files: top-level fields, zone declarations, placement records, inheritance keys. |
| [SPEC_DESIGN_CHECKLIST.md](../specs/SPEC_DESIGN_CHECKLIST.md) | Anti-drift sweep checklist for auditing canonical spec docs: smell classes, severity labels, section-context tags, past-pitfall references. |
| [SVG_PIPELINE.md](../specs/SVG_PIPELINE.md) | Ownership boundary between the SVG asset pipeline and the runtime: normalization, asset registration, color-patch, overlay. |
| [TARGET_FILE_STRUCTURE.md](../specs/TARGET_FILE_STRUCTURE.md) | Desired steady-state repository layout after the scene-runtime refactor: directory map, protocol cluster layout, generated-data locations. |
| [WALKTHROUGH_GUIDE.md](../specs/WALKTHROUGH_GUIDE.md) | Real-browser protocol walkthrough system: walker rules, visible-UI requirement, screenshot discipline, no-internal-API constraint. |

All 17 spec files are mapped to at least one runtime component in the table
above. No orphaned spec detected.

---

*WP-SPEC-INDEX-1, owner: reviewer, 2026-05-17.*
