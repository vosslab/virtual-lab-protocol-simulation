# ADR 001: Frontend framework for shell UI

## Status

Accepted (provisional pending esbuild proof in WP-0-2). If WP-0-2 fails, the
fallback path in this ADR takes effect and this ADR is updated in place to
record the switch.

## Context

The repo `virtual-lab-protocol-simulation` ships an imperative SVG scene
renderer, a layout engine, a YAML-driven protocol vocabulary, codegen scripts,
and a click-dispatch path that together form the authoritative protocol
execution surface. These layers are contract-locked by
[PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 (clickable
SVG-backed scene objects, layout-engine placement) and item 4 (visible UI
walker requirement).

The user is new to TypeScript and asked whether the current vanilla TS plus
esbuild route is best, or whether React, Vue, Svelte, Solid, or Lit would
serve the lab simulation better. The user has ratified that any framework
adopted applies to the shell UI only (HUD, modal, tray, protocol launcher,
results, help and professor overlay, status panels). The imperative SVG
scene renderer, scene adapters, layout engine, protocol execution, YAML
schema, and click dispatch must remain untouched.

Relevant constraints:

- `PRIMARY_CONTRACT.md` item 3 requires clickable scene objects to be
  SVG-backed and laid out by the layout engine. Replacing this with a
  canvas runtime would also break the Playwright `[data-item-id]`
  selectors that item 4 depends on.
- `PRIMARY_CONTRACT.md` item 4 requires the walker to drive the visible
  UI through real focusable DOM nodes; any shadow-DOM-by-default
  framework would force walker complexity.
- [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) "Visual
  integrity" forbids cropping or aspect distortion of scientific SVG
  assets; a virtual-DOM reconciler inside the scene `<svg>` subtree
  would re-trigger layout and risk fighting bbox assertions.
- [REPO_STYLE.md](../../REPO_STYLE.md) core philosophy
  "fix the design, not the symptom" -- the right fix is to mount the
  reactive framework only where it earns its bundle weight, not to
  retrofit a VDOM onto an SVG-imperative renderer.
- [TYPESCRIPT_STYLE.md](../../TYPESCRIPT_STYLE.md) pins
  strict tsconfig (`strict`, `noImplicitAny`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) and the
  esbuild canonical build (`--bundle --format=esm --target=es2020
  --platform=browser`). The framework must integrate with that build,
  not require swapping in Vite, Rollup, or Webpack.

## Decision

Adopt Solid.js for the shell UI only. Concretely:

- `src/shell/` and `src/launcher/` (HUD, modal, inventory tray,
  feedback toast, help / professor overlay, status panels, launcher)
  are authored as Solid components using JSX with
  `--jsx-import-source=solid-js --jsx=automatic`.
- `src/scene_runtime/` (layout engine and imperative SVG renderer),
  the YAML schema, the protocol execution path, the click dispatcher,
  and all codegen scripts remain untouched. Solid imports are
  forbidden under `src/scene_runtime/` and enforced by boundary lint
  (WP-1-7).
- Shell mounts as a sibling of the scene `<svg>`, never as a parent
  or child of it. The shell observes protocol state through a
  read-only adapter; it does not advance, retry, or dispatch.

Rationale:

- Solid uses fine-grained signals with no virtual DOM, so reactive
  updates do not re-render the scene `<svg>` subtree managed by the
  imperative renderer.
- Solid integrates with esbuild via a single JSX flag pair, preserving
  the canonical build per
  [TYPESCRIPT_STYLE.md](../../TYPESCRIPT_STYLE.md).
- Solid emits real focusable DOM nodes with stable attributes, which
  the walker contract in `PRIMARY_CONTRACT.md` item 4 requires.
- Bundle weight is small (informational, not a gate): the Solid runtime
  is expected to add roughly 7 KB minified plus gzipped to the shared
  shell bundle. This is informational; bundle-size gating is not
  introduced by this ADR.

## Consequences

Positive:

- The shell gets reactive bindings where many small bits of state
  change (current step, prompt, progress, modal open, feedback toast),
  without touching the scene runtime or the protocol runtime.
- The strict tsconfig surface is preserved; Solid JSX type-checks
  under `noImplicitAny` and `noUncheckedIndexedAccess`.
- The boundary between shell and scene becomes lint-enforceable:
  Solid imports under `src/scene_runtime/` fail CI.

Negative or constraining:

- A new devDependency (`solid-js`) is added; rollback means deleting
  `src/shell/` and `src/launcher/`, removing `solid-js`, and reverting
  the esbuild JSX flags.
- Authors writing shell components must learn Solid's signal model.
  Scope is narrow (shell only); scene authors are unaffected.
- Shell CSS must not target scene internals (`.scene`,
  `[data-item-id]`, SVG elements). Enforced at review time.
- Shell `data-*` attributes live in a closed namespace
  (`data-hud-*`, `data-modal-*`, `data-tray-tool-id`, `data-help-*`,
  `data-feedback-*`, `data-protocol-id`, `data-launcher-*`) documented
  in `docs/specs/INTERFACE_VOCABULARY.md`.

Neutral:

- The bundle grows by approximately the Solid runtime size noted
  above. No gate is set on this number; it is recorded so future
  reviewers have a baseline.

## Alternatives considered

| Option | Reason rejected |
| --- | --- |
| React | Virtual-DOM reconciler conflicts with the hand-managed imperative SVG renderer required by `PRIMARY_CONTRACT.md` item 3, and the runtime plus reconciler inflates bundle weight beyond the shell's needs. |
| Vue | Single-file-component template DSL adds a second authoring surface that competes with the YAML vocabulary that `PRIMARY_CONTRACT.md` item 1 declares canonical for scene and protocol configuration. |
| Svelte | Compile-time pipeline forces moving off the canonical esbuild build pinned by [TYPESCRIPT_STYLE.md](../../TYPESCRIPT_STYLE.md), a measurable build-toolchain cost the shell does not justify. |
| Lit | Shadow-DOM-by-default fights the Playwright walker contract in `PRIMARY_CONTRACT.md` item 4 (selectors must reach real focusable DOM); switching Lit to light-DOM removes its main differentiator and leaves a heavier runtime than Solid. |
| Pixi or Konva (canvas) | Replaces SVG with canvas, directly violating `PRIMARY_CONTRACT.md` item 3 (clickable SVG-backed scene objects laid out by the layout engine) and breaking `[data-item-id]` selectors the walker depends on. |

## Fallback path

If WP-0-2 (esbuild Solid JSX proof) fails, the fallback is vanilla
TypeScript plus a small (~40-line) `signal()` helper in
`src/shell/signals.ts` providing a minimal subscribe / notify
primitive. The shell components are then authored as plain TS
functions that take signal accessors and return DOM nodes.

Lit is explicitly not the fallback:

- Lit with shadow DOM fights the Playwright walker contract in
  `PRIMARY_CONTRACT.md` item 4.
- Lit with light DOM contradicts the rationale for rejecting Lit in
  the alternatives table above and still ships a heavier runtime than
  a 40-line helper.

The fallback decision is recorded in this ADR (status section updated
in place) and in `docs/CHANGELOG.md`. No user sign-off gate is
required; the trigger is purely whether WP-0-2 passes.

## References

- [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) items 3 and 4
- [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) "Visual integrity"
- [REPO_STYLE.md](../../REPO_STYLE.md) core philosophies
- [TYPESCRIPT_STYLE.md](../../TYPESCRIPT_STYLE.md) strict tsconfig and esbuild canonical build
