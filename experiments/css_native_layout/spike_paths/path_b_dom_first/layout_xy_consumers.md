# Layout x / y consumers in production

Single-page audit of every production call site that reads `.x`, `.y`,
`.width`, or `.height` from a `ComputedItemLayout` (or a value sourced from
`ComputedItemLayout`).

## Method

Bounded to `src/` via `git ls-files 'src/**/*.ts'` piped to `cat | grep`.
Search pattern: `layout\.(x|y|width|height)`. Cross-checked by also
searching for `ComputedItemLayout` and `layoutMap` to catch destructured
or aliased reads.

## External consumers of ComputedItemLayout (outside the layout module)

| File                                                                                           | Lines      | Kind of read                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| ../../../../src/scene_runtime/render/scene.ts | 235-238    | `const x = layout.x; const y = layout.y; const width = layout.width; const height = layout.height;` |
| ../../../../src/scene_runtime/render/scene.ts | 253        | forwards x, y, width, height to `tryRenderWellPlate(...)`                                           |
| ../../../../src/scene_runtime/render/scene.ts | 278 onward | forwards x, y, width, height to `insertSvgAsset(...)` for non-well-plate placements                 |

Count: 1 file, 1 logical consumer block. All four fields read together.

## Internal consumers inside the layout module

These reads live in `src/scene_runtime/layout/layout_engine.ts` and are
part of the legacy solver itself. They consume their own outputs to
compute clusters, label positions, and scene-bounds containment. They
are NOT downstream consumers; Path B does not need to migrate them
because the spike replaces (not extends) the legacy solver for one
scene.

| File                                                                                                           | Notes                                                                                 |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| ../../../../src/scene_runtime/layout/layout_engine.ts | Internal solver math: cluster centering, scene-bounds containment, label positioning. |

## Downstream of render/scene.ts

The well-plate adapter at
../../../../src/scene_runtime/adapters/well_plate/render.ts:37-46
accepts `x, y, width, height` as ordinary function parameters; it does
not import or destructure `ComputedItemLayout`. So the dependency chain
is:

```
adapter.ts -> ComputedItemLayout[] -> render/scene.ts (4 reads)
            -> well_plate/render.ts (4 parameters)
```

Mutating the adapter return shape forces a change in render/scene.ts.
Changing render/scene.ts mutates how it calls well_plate/render.ts.

## Conclusion

Coordinate-field consumer count: 1 production file
(`src/scene_runtime/render/scene.ts`), reading all four rect fields
in one block. That file is on the spike packet's forbidden list. Any
Path B variant that eliminates rect emission must edit it; therefore
Path B is not a "minimal seam" under the current charter.

Path A's synthetic-coordinate strategy keeps the consumer untouched
and is the recommended approach for the spike.
