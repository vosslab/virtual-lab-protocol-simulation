# Interface vocabulary

The interface is the locked, repo-wide surface that surrounds the
scene: HUD panel, modal panel, tray panel, feedback toast, help
overlay, and launcher. There is exactly one interface for the whole
repo. A protocol changes the scene, the objects, the materials, and
the steps; it does not invent a new interface. New interface panels
require editing this doc and shipping new component code, never a
protocol YAML change.

The scene is a panel inside the interface, with its own selector
contract in [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md). This doc
covers every panel except the scene panel.

This is a closed test-selector contract. Components emit only the
`data-*` attributes listed below; tests rely on these selectors.
Adding a new attribute requires editing this file.

Scope: interface DOM only. Scene-side selectors (`data-item-id`,
`data-object-name`, `data-placement-name`, `data-zone`, `data-kind`,
`data-depth`, `data-target-id`, `data-label`, `data-label-for`) are
owned by the imperative SVG renderer and documented under
[SCENE_VOCABULARY.md](SCENE_VOCABULARY.md).

## Reserved namespaces

- `data-hud-*` -- HUD presentation surface
  ([seam_interface.md](../archive/web_ui/seam_interface.md)).
- `data-modal-*` -- modal dialog surface.
- `data-tray-*` -- inventory tray.
- `data-help-*` -- help / professor overlay.
- `data-feedback-*` -- feedback toast.
- `data-protocol-id` -- launcher link target.
- `data-launcher-*` -- launcher chrome.

## Currently emitted attributes

| Attribute | Emitted by | Value |
| --- | --- | --- |
| `data-hud-step` | `src/shell/hud/ProtocolHud.tsx` | current step name or empty string |
| `data-hud-prompt` | `src/shell/hud/ProtocolHud.tsx` | current step prompt or empty string |
| `data-hud-progress` | `src/shell/hud/ProtocolHud.tsx` | `<completed>/<total>` |
| `data-protocol-id` | `src/launcher/Launcher.tsx` | protocol_name from PROTOCOLS_INDEX |
| `data-launcher-root` | `src/launcher/Launcher.tsx` | empty, marker |
| `data-launcher-title` | `src/launcher/Launcher.tsx` | empty, marker |
| `data-launcher-entry` | `src/launcher/Launcher.tsx` | per-protocol link wrapper |
| `data-launcher-cluster` | `src/launcher/Launcher.tsx` | cluster name |
| `data-launcher-name` | `src/launcher/Launcher.tsx` | protocol_name label slot |
| `data-launcher-hook` | `src/launcher/Launcher.tsx` | learning_hook text |
| `data-launcher-empty` | `src/launcher/Launcher.tsx` | empty-state marker |
| `data-bg-asset-pending` | `src/scene_runtime/renderer/render_background.ts` | asset name pending registry wiring (scene-side, listed for cross-reference) |

## Modal / tray / help / feedback

The modal, tray, help, and feedback surfaces are not yet authored as
shell components. Attributes are reserved (above). The first component
patch in each namespace must update this file with the exact attribute
names and values.

## Plan amendment policy

Any new selector added to the shell requires:

1. A row in the table above.
2. A short note in
   [seam_interface.md](../archive/web_ui/seam_interface.md)
   if the selector reflects a new state surface (modal / help / tray /
   feedback transitions).
3. The component patch and this doc update land together.

Scene-side selectors are out of scope here; edit
[SCENE_VOCABULARY.md](SCENE_VOCABULARY.md) for those.
