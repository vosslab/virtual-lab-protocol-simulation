# Bundle audit and split

Date: 2026-05-28

## Problem

`dist/main.js` was 2.2 MB. The single bundle loaded on the launcher and on
every per-protocol host page. The launcher needs only metadata + Solid + CSS,
so the runtime, renderer, SVG registry, and full protocol data should not be
loaded there.

## Measurement (esbuild metafile)

Set `BUILD_METAFILE=1` before invoking `tools/build_main_bundle.mjs` to emit
`dist/launcher.meta.json` and `dist/protocol_host.meta.json`. The default
build does not write metafiles.

### Top imports by bytes in output

| File | launcher.js bytes | protocol_host.js bytes |
| --- | ---: | ---: |
| generated/svg_registry.ts            |       0 |   1,934,990 |
| generated/protocols.ts               |       0 |     170,081 |
| generated/scenes.ts                  |       0 |      56,664 |
| generated/object_library.ts          |       0 |      18,996 |
| node_modules/solid-js/dist/solid.js  |   8,038 |       6,777 |
| generated/protocols_index_slim.ts    |   6,482 |           0 |
| node_modules/solid-js/web/dist/web.js|   4,608 |       4,574 |
| src/scene_runtime/protocol/step_machine.ts |  0 |       5,825 |
| src/scene_runtime/renderer/structural_guards.ts | 0 | 4,362 |
| src/launcher/Launcher.tsx            |     582 |           0 |

### Bundle totals

| Bundle | Minified size |
| --- | ---: |
| dist/launcher.js      | 19.5 KB |
| dist/protocol_host.js |  2.1 MB |

The 2.0 MB SVG registry dominates the protocol_host bundle and is the
correct location for it (the registry is needed at scene-render time, not
at launcher time).

## Split

Two entry points, two esbuild outputs:

- `src/launcher_entry.tsx` -> `dist/launcher.js`
  - Imports `generated/protocols_index_slim.ts` (metadata only:
    `protocol_name`, `cluster`, `display_title`, `learning_goal_hook`).
  - Solid + Launcher component only.
- `src/protocol_host_entry.tsx` -> `dist/protocol_host.js`
  - DOM-presence router. With `#shell-root` + `window.__PROTOCOL_NAME__`,
    mounts the protocol host (full M2 runtime + M3 shell). Otherwise
    mounts the bench smoke (legacy `src/main.ts` path).
  - Shares the runtime bundle with the bench page since both need the
    scene runtime, renderer, and full SVG registry.

`tools/gen_protocols.py` now emits both
`generated/protocols.ts` (full ProtocolConfig surface) and
`generated/protocols_index_slim.ts` (slim launcher metadata).
`display_title` is derived from `protocol_name` using a hard-coded
acronym list (SDS-PAGE, MTT, PBS, DMSO, HEPES).

## Status of dist_entry.tsx

`src/dist_entry.tsx` is no longer referenced by the build (the two new
entry points replace it). It still type-checks (rewired to use
`PROTOCOLS_INDEX_SLIM` so type-checking stays green) but is otherwise
dead. The agent does not run git, so the file is left in place for the
human to retire with `git rm src/dist_entry.tsx` and a follow-up
changelog entry. Same for `src/launcher/main.tsx`, which is now an
orphan once the launcher template loads `launcher.js` instead of
`main.js`.
