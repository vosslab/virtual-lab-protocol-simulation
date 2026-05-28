# Solid.js shell + new typed runtime seam (new build)

## Context

`virtual-lab-protocol-simulation` ships a YAML-authored scene + protocol
vocabulary, codegen under `tools/gen_*.py`, and a TypeScript scene
runtime under `src/scene_runtime/{layout,renderer}/` (~2.4K LOC). The
layout engine is satisfactory. `src/main.ts` is a 30-line bench-only
entry: it loads `hood_basic` from `generated/scenes.ts`, runs the layout
pipeline, and renders the scene. There is no protocol runtime, no shell,
no launcher.

Pipeline scripts (`pipeline/build_protocol_html.py`,
`pipeline/build_runtime_bundle.sh`) describe an old `window.gameState`
runtime that was deleted from this repo and is out of scope. **The
forward direction is new code from the current repo state.** No revert,
restore, copy, cherry-pick, or "reference behavior" from historical
files. Source of truth: current specs, current `src/scene_runtime/`,
current tests, current `package.json`.

Intended outcome: a typed Solid.js shell + a new typed protocol runtime
that together complete one student-visible mini-protocol headless and in
browser, on top of the existing layout/renderer. From there, every
additional mini-protocol is a content-only landing.

## Objectives

- Define a small, typed seam (`ProtocolShellEvent` discriminated union)
  that the shell consumes and the runtime emits.
- Build a new TypeScript protocol runtime that authoritatively owns step
  progression, validator dispatch, scene-operation dispatch, and click
  resolution. Consumes existing `src/scene_runtime/{layout,renderer}/`
  as a library. No `window.gameState`. No untyped globals.
- Build a Solid.js shell (HUD + modal + tray + feedback + help +
  launcher) that mounts as a sibling of the scene `<svg>` and renders
  only typed signals derived from the seam.
- Ship one vertical slice end-to-end: `mtt_reagent_prep` mini-protocol,
  visible-UI walker green headless.
- Run codegen consolidation and vocabulary-closure cleanup in parallel.

## Design philosophy

Imperative SVG rendering stays. Reactive Solid.js owns only the shell
outside the scene `<svg>`. Protocol authority lives inside one new
runtime module that publishes typed events; the shell observes those
events and never mutates protocol state. Tests precede broad UI: the
seam interface is the first artifact, a smoke walker proving visible-UI
progression on one protocol is the second. Cite `docs/REPO_STYLE.md`
"fix the design, not the symptom" -- the design fix here is writing the
runtime as a typed observer surface from day one, not as an untyped
global with a polling test harness.

## Scope

- `src/shell/adapter/types.ts` -- typed seam interfaces.
- `src/scene_runtime/protocol/` -- new runtime module (step machine,
  validators, scene-op dispatcher, click resolver, event emitter).
- `src/shell/` -- Solid components (HUD, modal, tray, feedback, help
  overlay).
- `src/launcher/` -- Solid launcher reading a generated protocol index.
- One per-protocol HTML host build path producing
  `dist/<protocol_name>.html` plus `dist/index.html` launcher.
- New Playwright walker that consumes the typed seam (no
  `window.gameState`).
- Boundary lint: no `solid-js` import under `src/scene_runtime/{layout,
  renderer}/`; no `src/shell/` or `src/launcher/` import under
  `src/scene_runtime/{layout,renderer}/`.
- Parallel cleanup: codegen pipeline consolidation, vocabulary-closure
  fixes (12 BLOCKING items from `audits/vocabulary_closure_audit.md`).

## Non-goals

- Restoring deleted runtime code from history. Out of scope.
- Preserving `window.gameState` as a contract surface. Out of scope.
- Touching `src/scene_runtime/{layout,renderer}/` semantics. Untouched
  unless a narrow integration point is explicitly named here.
- Touching YAML schemas, scene adapters, scene click dispatch (delegated
  to existing renderer), object library, asset normalization.
- React, Vue, Svelte, Lit, canvas frameworks. Solid is the choice.
- SSR, multi-user state, save/resume, analytics, auth, mobile.
- Brand / theme work. Accessibility floor only.
- Pipeline scripts (`pipeline/build_protocol_html.py`,
  `pipeline/build_runtime_bundle.sh`): not consumed, not extended.
  Will archive in M5 if codegen consolidation chooses `tools/gen_*` as
  canonical.

## Assumptions

- Solid.js bundles cleanly under existing esbuild config with
  `--jsx-import-source=solid-js --jsx=automatic`. Verified in M1 by a
  one-time probe.
- Current `generated/scenes.ts`, `generated/object_library.ts`,
  `generated/svg_registry.ts` carry every artifact the renderer needs;
  no protocol artifacts ship under `generated/` yet (M2 adds them via a
  new `tools/gen_protocols.py`).
- Walker tests under `tests/playwright/` may read `window.gameState`
  for legacy reasons; they are not consumed by this plan and will be
  superseded by the M4 typed-seam walker. No edits to existing walkers
  required by this plan.
- `prettier` and ESLint are devDeps; `npm run check` is green on main.

## Constraints

- Strict TS per `docs/TYPESCRIPT_STYLE.md`. No `any`.
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` on.
- ESM only. No IIFE. No `file://`.
- ASCII / ISO-8859-1 only.
- All clickable shell DOM nodes carry stable `data-*` selectors from a
  closed shell-namespaced set (`data-hud-*`, `data-modal-*`,
  `data-tray-*`, `data-help-*`, `data-feedback-*`, `data-protocol-id`,
  `data-launcher-*`).
- No git commands in any work package. Human commits.
- No `npm install` without explicit user approval per Claude hook rules.
  Adding `solid-js` to `devDependencies` is a one-time user-approved
  step at M1 start.

## Milestones

### M1 -- Typed seam interface + Solid esbuild probe

Goal: lock the contract before anyone writes a component.

- WP-1-1 -- write `src/shell/adapter/types.ts`. Discriminated union
  `ProtocolShellEvent` covering: `load`, `step_started`,
  `step_completed`, `interaction_validated`, `interaction_rejected`,
  `scene_changed`, `modal_opened`, `modal_closed`, `help_opened`,
  `help_closed`, `tray_changed`, `protocol_completed`. Readonly
  `ShellViewSnapshot` derived from the union for Solid signal
  consumption. Every field strictly typed (no `string` where an enum
  fits). Depends on: none.
- WP-1-2 -- user-approved `npm install --save-dev solid-js` (single
  step). Scaffold `src/shell/_probe.tsx` rendering
  `<button data-probe="ok">` driven by a Solid signal. Build via a
  probe-only `tools/build_probe.sh`. Headless Playwright assertion
  finds `data-probe="ok"`. Probe artifacts deleted at M1 exit;
  canonical `build_github_pages.sh` untouched. Depends on: WP-1-1.
- WP-1-3 -- write `docs/active_plans/active/web_ui/seam_interface.md`
  documenting the seam types, the event lifecycle, the no-mutation
  rule, and the snapshot derivation. Depends on: WP-1-1.

Exit:
- `types.ts` compiles strict. ProtocolShellEvent has at least one
  variant per state transition the M2 runtime will emit.
- Probe boots in headless Chromium; Solid + esbuild known good.
- `seam_interface.md` is the test-selector contract for downstream
  work.

### M2 -- New typed protocol runtime

Goal: an authoritative runtime module that emits the seam and consumes
the existing layout/renderer.

- WP-2-1 -- `src/scene_runtime/protocol/step_machine.ts`. Pure state
  machine: input = `ProtocolConfig` (from `generated/protocols.ts`,
  new in WP-2-5), output = signals for current step, current
  interaction index, last outcome, pending validator. No DOM. No
  setters exposed externally. Depends on: WP-1-1.
- WP-2-2 -- `src/scene_runtime/protocol/validators.ts`. Pure functions
  for the five preset validators (`correct_target`, `correct_choice`,
  `target_with_value`, `sequence_complete`, `final_state_matches`) per
  `PRIMARY_SPEC.md`. Compile-time exhaustive. Depends on: WP-2-1.
- WP-2-3 -- `src/scene_runtime/protocol/scene_operations.ts`.
  Imperative calls into the existing `src/scene_runtime/renderer/`.
  Five primitives: `ObjectStateChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, `TimedWait`. Each typed; unknown ops are a compile
  error. Depends on: WP-2-1.
- WP-2-4 -- `src/scene_runtime/protocol/click_resolver.ts`. Reads
  scene click events (`data-item-id` on rendered SVG) and routes them
  to the step machine. Emits `interaction_validated` or
  `interaction_rejected`. Depends on: WP-2-1, WP-2-2.
- WP-2-5 -- `tools/gen_protocols.py` (new Python generator). Reads
  `content/protocols/**/protocol.yaml`, emits
  `generated/protocols.ts` exporting
  `PROTOCOLS: Record<string, ProtocolConfig>` and
  `PROTOCOLS_INDEX: ProtocolIndexEntry[]` (excluding `dev_smoke`).
  Wire into `package.json` `prebuild` script. Depends on: WP-1-1.
- WP-2-6 -- `src/scene_runtime/protocol/emitter.ts`. Typed event bus.
  `emit(event: ProtocolShellEvent)`; subscribers register typed
  handlers. No global; instance scoped. Depends on: WP-1-1.
- WP-2-7 -- `tests/test_protocol_runtime.mjs`. Node tests for step
  machine, validators, scene_operations, click_resolver, emitter. No
  DOM; pure logic. Depends on: WP-2-1..WP-2-6.

Exit:
- Runtime exposes only emitter subscription + a constructor. No
  globals. No `window.gameState`. No `window.PROTOCOL_STEPS`.
- Node tests green; validator exhaustiveness enforced at compile time.
- `generated/protocols.ts` builds clean from `npm run prebuild`.

### M3 -- First vertical slice

Goal: one Solid shell + one protocol completing visible UI end to end.

- WP-3-1 -- `src/shell/signals.ts`. Re-exports `createSignal`,
  `createMemo`, `createEffect`. Helper
  `subscribeEventToSignal(emitter, selector)` mapping
  `ProtocolShellEvent` -> Solid signal. Depends on: WP-1-2.
- WP-3-2 -- `src/shell/hud/ProtocolHud.tsx`. Renders `data-hud-step`,
  `data-hud-prompt`, `data-hud-progress`. Pure presentation. Depends
  on: WP-3-1, WP-1-1.
- WP-3-3 -- `src/shell/modal/InteractionModal.tsx`. `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby`, initial focus on first
  control, focus return on close, Escape closes (cancel, not commit),
  tab containment. `data-modal-open`, `data-choice-id`. Depends on:
  WP-3-1.
- WP-3-4 -- `src/shell/tray/InventoryTray.tsx`. Toolbar semantics with
  arrow-key nav. `data-tray-tool-id`. Depends on: WP-3-1.
- WP-3-5 -- `src/shell/feedback/FeedbackToast.tsx`. `role="status"`,
  `data-feedback-kind`. Depends on: WP-3-1.
- WP-3-6 -- `src/shell/help/HelpOverlay.tsx`. Same focus rules as
  modal. `data-help-open`, `data-help-topic`. Depends on: WP-3-1.
- WP-3-7 -- `src/launcher/Launcher.tsx`. Solid component reading
  `PROTOCOLS_INDEX` from `generated/protocols.ts`. Renders
  `<a data-protocol-id href="<protocol_name>.html">` per entry.
  `data-launcher-*` namespace. Depends on: WP-2-5, WP-3-1.
- WP-3-8 -- `src/protocol_host.tsx`. Mounts: scene root (existing
  renderer), runtime instance, shell components bound to runtime
  emitter. Per-protocol HTML files built from this template. Depends
  on: WP-2-1..WP-2-7, WP-3-2..WP-3-6.
- WP-3-9 -- boundary lint. Two rules: no `solid-js` import under
  `src/scene_runtime/{layout,renderer}/`; no `src/shell/` or
  `src/launcher/` import under `src/scene_runtime/{layout,renderer}/`.
  Plus shell CSS may not target `.scene`, `[data-item-id]`, SVG
  elements, or renderer-owned classes. Depends on: WP-3-1.
- WP-3-10 -- extend `build_github_pages.sh` to produce
  `dist/index.html` (launcher) + `dist/<protocol_name>.html` for every
  entry in `PROTOCOLS_INDEX`. Shared `dist/main.js` bundle. Depends
  on: WP-3-7, WP-3-8.
- WP-3-11 -- shell-disable flag `?shell=off` parsed at mount,
  documented debug-only; never in launcher links. Depends on: WP-3-8.

Pilot protocol: `mtt_reagent_prep` (lowest-risk per
`protocol_corpus_inventory.md`: 4 steps, 1 scene transition,
click+adjust gestures, single-scene). Authored YAML already exists; no
content changes required.

Exit:
- `npm run check` green.
- `dist/index.html` opens, launcher lists every mini-protocol +
  sequence-runner, `dev_smoke` absent.
- Clicking `mtt_reagent_prep` navigates to
  `dist/mtt_reagent_prep.html`, runtime mounts, shell mounts, scene
  renders.
- Manually clicking through the 4 steps completes the protocol in
  Chrome.

### M4 -- Playwright proof via typed seam

Goal: machine-verifiable completion of the M3 slice via visible UI
only.

- WP-4-1 -- `tests/playwright/test_solid_walker.mjs`. Walker that
  attaches to the typed emitter via a debug-only test hook (exposed
  only when `?walker=expose` is set; documented debug-only). Walker
  dispatches DOM clicks per the emitted events. Screenshots before
  and after every interaction to
  `tests/playwright/artifacts/<protocol_name>/`. No
  `window.gameState` reads. No per-protocol branching. Depends on:
  WP-3-8, WP-3-10.
- WP-4-2 -- shell primitive tests:
  `tests/playwright/test_shell_primitives.mjs`. Modal focus return,
  initial focus, Escape, tab containment, toolbar arrow-key nav,
  focus return on help overlay close. Depends on:
  WP-3-2..WP-3-6.
- WP-4-3 -- launcher test: `tests/playwright/test_launcher.mjs`.
  Asserts `data-protocol-id` set, `dev_smoke` absent, links resolve.
  Depends on: WP-3-7, WP-3-10.
- WP-4-4 -- accessibility floor pass on the M3 pilot. Blocking
  failures: modal focus trap broken, Escape commits state, keyboard
  cannot complete the protocol, tray unreachable. File-as-followup:
  label wording, color contrast beyond palette, extended WCAG.
  Depends on: WP-4-1.

Exit:
- All four Playwright specs green headless.
- `mtt_reagent_prep` completes via keyboard only.
- Artifacts under `tests/playwright/artifacts/mtt_reagent_prep/` show
  before and after each interaction.

### M5 -- Parallel cleanup (not a gate)

Runs alongside M1-M4. Independent owners.

- WP-5-1 -- codegen consolidation. `tools/gen_*.py` is canonical
  (already wired into `npm run prebuild`). Archive
  `pipeline/build_new_*.py`, `pipeline/build_protocol_html.py`,
  `pipeline/build_runtime_bundle.sh`, `pipeline/generate_svg_globals.py`
  to `docs/archive/` (human runs `git mv`). Update
  `docs/FILE_STRUCTURE.md`. Depends on: none.
- WP-5-2 -- vocabulary-closure cleanup. Address the 12 BLOCKING items
  in `audits/vocabulary_closure_audit.md` across PROTOCOL_VOCABULARY,
  SCENE_VOCABULARY, OBJECT_VOCABULARY, MATERIAL_CONVENTION. Spec
  edits only; no code consumer behavior changes. Depends on: none.
- WP-5-3 -- broken-asset cleanup. Fix the 4 broken SVG refs flagged
  in `audits/object_asset_inventory.md` (electrophoresis_tank
  variants). Either author the missing SVGs or update the object
  YAML to point at existing assets. Depends on: none.
- WP-5-4 -- protocol-object xref full enumeration (the audit covered
  8 of 34). Dispatch a general-purpose agent to walk every protocol
  and resolve every target. Update
  `audits/protocol_object_xref.md` from spot-check to full table.
  Depends on: none.

Exit: independent. M5 can ship in any order; M3 / M4 do not block on
it.

## Architecture boundaries

```
+-------------------------+
|  src/launcher/  (Solid) |  dist/index.html
+-------------------------+
|  src/shell/  (Solid)    |  HUD, modal, tray, feedback, help
|    adapter/types.ts     |  ProtocolShellEvent + ShellViewSnapshot
|    signals.ts           |  Solid re-exports + subscribeEventToSignal
+-------------------------+
|  src/scene_runtime/     |
|    protocol/  (new)     |  step_machine, validators, scene_ops,
|                         |  click_resolver, emitter
|    layout/  (untouched) |  contract-locked
|    renderer/ (untouched)|  contract-locked, imperative SVG
+-------------------------+
|  tools/gen_*.py (Python)|  prebuild generators (live)
|    gen_protocols.py NEW |  emits generated/protocols.ts
+-------------------------+
|  generated/ (gitignored)|  scenes, object_library, svg_registry,
|                         |  protocols, protocols_index
+-------------------------+
```

- The scene `<svg>` subtree is owned by `renderer/`. Solid JSX never
  touches it.
- The runtime under `src/scene_runtime/protocol/` is authoritative for
  protocol state. Shell observes only.
- Shell components communicate with the runtime exclusively through
  `ProtocolShellEvent` subscriptions.
- No `window.*` global is added or read.

## Quality gates

Per WP: `npm run check` (typecheck, lint, format:check, css:policy,
test:node, build). Per milestone: relevant Playwright spec green
headless. No `any`. No new `data-*` outside the shell-namespaced set.
Boundary lint enforces import direction. Shell CSS scope rule enforced
by review (lint rule if practical).

Removed gates: byte-identical bundle hash; threshold-less bundle-size
gate.

## Risk register

- **Risk:** scope creep -- coder reaches for deleted runtime code as a
  shortcut. **Trigger:** any patch citing historical runtime files or
  "as it used to work". **Mitigation:** review rejects such citations
  on sight. The forward plan has zero references to deleted code.
  **Owner:** patch reviewer.
- **Risk:** Solid signals leak into scene renderer. **Trigger:**
  boundary lint catches an import. **Mitigation:** WP-3-9 ships the
  lint with a passing fixture; failing fixture during dev only.
  **Owner:** WP-3-9.
- **Risk:** runtime exposes a mutation backdoor. **Trigger:** any
  public export from `src/scene_runtime/protocol/` other than the
  constructor + emitter subscription. **Mitigation:** index re-exports
  are explicit; reviewer audit at M2 close. **Owner:** WP-2-7.
- **Risk:** vocabulary BLOCKING items bite runtime design. **Trigger:**
  WP-2-1 designs a step machine around `target_with_value` and finds
  the value mapping is open-ended. **Mitigation:** M5 WP-5-2 lands the
  closure fixes; M2 declares an interim accepted-keys list scoped to
  the M3 pilot if M5 has not finished. **Owner:** WP-2-1 + WP-5-2.
- **Risk:** generator drift -- `tools/gen_protocols.py` (new) shape
  does not match the YAML vocabulary. **Trigger:** WP-2-5 fails on
  real protocol files. **Mitigation:** generator validates against
  the closed schema on every invocation; gen failure breaks
  `npm run prebuild`, not silent partial output. **Owner:** WP-2-5.
- **Risk:** asset cropping on shell-mounted protocol. **Trigger:**
  `artwork_integrity` check fails with shell mounted. **Mitigation:**
  shell mounts as fixed-position overlay sibling, never as ancestor;
  shell CSS scope rule forbids `overflow: hidden` on any ancestor of
  the scene root. **Owner:** WP-3-8.

## Documentation

- Per patch: append entry under today's `## YYYY-MM-DD` block in
  `docs/CHANGELOG.md`.
- M1 publishes: `seam_interface.md`.
- M2 publishes: `tools/gen_protocols.py` module docstring, runtime
  module docstrings.
- M3 publishes: `docs/CODE_ARCHITECTURE.md` updates (add `src/shell/`,
  `src/scene_runtime/protocol/`, `src/launcher/`).
- M4 publishes: walker test descriptions.
- M5 publishes: archive notes in `docs/archive/` for pipeline scripts;
  `docs/FILE_STRUCTURE.md` updates; `vocabulary_closure_audit.md`
  resolution notes.

## Open decisions

- **First UI vertical:** HUD-first or launcher-first inside M3?
  Default HUD-first (test the runtime + shell binding before adding
  navigation). Owner picks at M3 start; document choice in patch
  description.
- **Tray semantics:** toolbar (command) or single-select (radiogroup
  with `aria-pressed`)? Default toolbar for M3 pilot; revisit if a
  later pilot needs persistent selected state.
- **Walker test hook:** the M4 walker needs to attach to the emitter
  without student-visible state changes. Default: a debug-only
  `?walker=expose` query param exposes `window.__shellEmitter` for
  the test harness, removed from launcher links. Document in
  `seam_interface.md`.
- **Codegen consolidation timing (M5 WP-5-1):** archive pipeline
  scripts before or after M3 ships? Default after, so the pivot is
  one human commit instead of two.

## Verification

End-to-end checklist:

1. `npm run check` clean (typecheck, lint with boundary rules,
   format:check, css:policy, test:node, build).
2. `npm run browser:smoke` clean.
3. `node tests/playwright/test_shell_primitives.mjs` clean (M3
   onward).
4. `node tests/playwright/test_solid_walker.mjs` clean (M4 onward).
5. `node tests/playwright/test_launcher.mjs` clean (M3 onward).
6. Manual: open `dist/index.html` in Chrome, click
   `mtt_reagent_prep`, complete the 4-step protocol with keyboard
   only.
7. Manual: open `dist/mtt_reagent_prep.html?shell=off`, confirm the
   runtime still emits events (debug log via `?walker=expose`);
   proves shell is observational, not load-bearing.
