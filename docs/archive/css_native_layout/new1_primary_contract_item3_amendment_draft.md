# NEW1 contract item 3 amendment draft

## Status

Draft. Not applied. Decision deferred until well_plate_96_zoom spike result.

This document does not modify `PRIMARY_CONTRACT.md`. It records two candidate amendments to contract item 3 so that, when the spike result lands, the reviewer can pick one (or reject both) without re-deriving the wording.

## Current contract item 3 (verbatim quote)

The following is a verbatim quote of contract item 3 from `PRIMARY_CONTRACT.md`, lines 19-24:

> 3. **Clickable objects are SVG-backed scene objects laid out by the layout engine.**
>    All clickable objects, including pipettes, instruments, bottles, flasks, plates, racks, tubes, and wells, have SVG representations stored in `assets/`. All asset SVG files must be normalized. All SVGs used in a scene are declared in that scene's YAML file.
>
>    Scene object layout is handled by the layout engine. Scenes must use the layout engine for positioning clickable objects. Custom geometry is allowed only for subparts inside a structured scientific object, such as wells inside a plate, tubes inside a rack, lanes inside a gel, or marks inside an instrument display. The structured object itself still remains a YAML-declared scene object placed by the layout engine.
>
>    See `LAYOUT_ENGINE.md`. All materials in objects (liquids, mixtures, suspensions, waste, future solids) are handled by `MATERIAL_CONVENTION.md`. Materials should not be hard-coded into objects. This will take effort before inserting a new asset.

## Version A: minimal amendment

Proposes that a CSS-native semantic-region renderer counts as a conforming implementation of "the layout engine" for contract purposes, as long as it positions YAML-declared scene objects from declarative inputs.

### Proposed new wording (full replacement text)

> 3. **Clickable objects are SVG-backed scene objects laid out by the layout engine.**
>    All clickable objects, including pipettes, instruments, bottles, flasks, plates, racks, tubes, and wells, have SVG representations stored in `assets/`. All asset SVG files must be normalized. All SVGs used in a scene are declared in that scene's YAML file.
>
>    Scene object layout is handled by the layout engine. Scenes must use the layout engine for positioning clickable objects. The layout engine is the layer that resolves YAML-declared scene objects into on-screen positions; both the absolute-coordinate solver and the CSS-native semantic-region renderer are conforming implementations of the layout engine when driven by the same YAML scene declarations. Custom geometry is allowed only for subparts inside a structured scientific object, such as wells inside a plate, tubes inside a rack, lanes inside a gel, or marks inside an instrument display. The structured object itself still remains a YAML-declared scene object placed by the layout engine.
>
>    See `LAYOUT_ENGINE.md`. All materials in objects (liquids, mixtures, suspensions, waste, future solids) are handled by `MATERIAL_CONVENTION.md`. Materials should not be hard-coded into objects. This will take effort before inserting a new asset.

### Diff against current wording

Added lines (in the second paragraph):

```
+ The layout engine is the layer that resolves YAML-declared scene objects
+ into on-screen positions; both the absolute-coordinate solver and the
+ CSS-native semantic-region renderer are conforming implementations of
+ the layout engine when driven by the same YAML scene declarations.
```

Removed lines: none.

### Rationale (one sentence)

The contract names "the layout engine" as a singular authority, but the term denotes a role (resolve YAML to positions), not a specific implementation, so naming both solvers as conforming implementations removes an unintended ban on the CSS-native renderer.

### What this allows that current contract blocks

- Shipping a CSS-native semantic-region renderer as the production layout path for at least one scene without amending or violating contract item 3.
- Running both solvers side-by-side in the same repo without one being implicitly out-of-contract.
- Treating the choice of solver as a per-scene implementation decision rather than a contract-level decision.

### What risk it accepts

- Two conforming implementations of "the layout engine" may drift in subtle ways (rounding, overflow handling, hit-target geometry), and the contract no longer forces a single canonical positioning result.
- The walker may need to tolerate small per-renderer pixel differences in screenshot evidence.
- "Conforming implementation" is not defined in the contract; the definition is pushed into `LAYOUT_ENGINE.md`, which is agent-editable.

## Version B: conservative amendment

Keeps the current wording intact and adds a single clause that marks the CSS-native renderer as experimental until it passes documented promotion gates. The absolute-coordinate solver remains the only contract-default layout engine.

### Proposed new wording (full replacement text)

> 3. **Clickable objects are SVG-backed scene objects laid out by the layout engine.**
>    All clickable objects, including pipettes, instruments, bottles, flasks, plates, racks, tubes, and wells, have SVG representations stored in `assets/`. All asset SVG files must be normalized. All SVGs used in a scene are declared in that scene's YAML file.
>
>    Scene object layout is handled by the layout engine. Scenes must use the layout engine for positioning clickable objects. Custom geometry is allowed only for subparts inside a structured scientific object, such as wells inside a plate, tubes inside a rack, lanes inside a gel, or marks inside an instrument display. The structured object itself still remains a YAML-declared scene object placed by the layout engine.
>
>    Alternative layout implementations (such as a CSS-native semantic-region renderer) are experimental and may be used only in clearly labeled spike scenes until they pass the promotion gates documented in `LAYOUT_ENGINE.md`. Production scenes use the absolute-coordinate layout engine.
>
>    See `LAYOUT_ENGINE.md`. All materials in objects (liquids, mixtures, suspensions, waste, future solids) are handled by `MATERIAL_CONVENTION.md`. Materials should not be hard-coded into objects. This will take effort before inserting a new asset.

### Diff against current wording

Added lines (a new paragraph inserted before the "See [specs/LAYOUT_ENGINE.md]" paragraph):

```
+ Alternative layout implementations (such as a CSS-native semantic-region
+ renderer) are experimental and may be used only in clearly labeled spike
+ scenes until they pass the promotion gates documented in
+ specs/LAYOUT_ENGINE.md. Production scenes use the absolute-coordinate
+ layout engine.
```

Removed lines: none.

### Rationale (one sentence)

The contract should not pre-bless a renderer that has not yet shipped a production scene; gating promotion through documented criteria keeps contract item 3 honest while allowing the spike to continue.

### Gates the spike must pass before promotion

The spike must produce documented evidence for all of the following before `LAYOUT_ENGINE.md` can promote the CSS-native renderer from experimental to conforming:

- A non-trivial production scene (for example, well_plate_96_zoom) runs end-to-end under the CSS-native renderer.
- The walker completes the scene's mini-protocol through visible UI, satisfying contract item 4.
- Hit-target geometry for every clickable object matches the absolute-coordinate solver within a documented pixel tolerance.
- Material overlays, set-point displays, and highlight overlays render correctly under both solvers from the same YAML.
- Layer-boundary purity holds: the renderer reads only scene YAML and object state; it does not learn protocol or material semantics.
- A regression suite (screenshot or geometry diff) exists and runs in CI.

### What this preserves that Version A weakens

- A single canonical positioning result for every production scene.
- A clear contract-level distinction between shipped layout behavior and experimental layout behavior.
- A forcing function (the gates) that prevents the CSS-native renderer from quietly becoming the default before it has been proven.
- The current reading that "the layout engine" denotes one production implementation, not a role with multiple peers.

## Decision criteria

| Criterion             | Favors Version A                                                | Favors Version B                                             |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Spike outcome         | Spike passes cleanly, no surprises, parity with absolute solver | Spike passes with caveats, edge cases, or partial parity     |
| Migration scope       | Many scenes are ready to switch immediately                     | Only the spike scene is ready; others need work              |
| Runtime risk          | Per-renderer drift is small and bounded                         | Per-renderer drift is observable in walker evidence          |
| Walker compatibility  | Walker handles both renderers without per-renderer branching    | Walker needs renderer-aware tolerance or fixtures            |
| Layer-boundary purity | CSS-native renderer reads only YAML and object state            | CSS-native renderer requires extra adapters or hidden inputs |

## Recommendation

None. Reviewer decides after spike result.

## Open questions

The amendment alone cannot answer these; the spike report or a follow-up spec edit must resolve them:

- What is the canonical definition of "conforming implementation of the layout engine"? Does it live in the contract, in `LAYOUT_ENGINE.md`, or in a new spec?
- What pixel or geometry tolerance is acceptable between solvers for the same YAML scene?
- Does the walker need a per-renderer screenshot baseline, or one shared baseline with tolerance?
- If both renderers ship, how is the per-scene choice recorded (scene YAML field, build flag, registry entry)?
- Does the CSS-native renderer need its own entry in `SCENE_VOCABULARY.md`, or is it invisible at the vocabulary layer?
- How are material overlays and set-point displays guaranteed to render identically under both solvers?
- What is the rollback path if a promoted scene fails in production under the CSS-native renderer?
- Does "absolute-coordinate solver" need a contract-level definition, or is the current shared understanding enough?
