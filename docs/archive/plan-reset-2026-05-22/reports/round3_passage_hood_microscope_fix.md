# Round 3: passage_hood_detachment scene reference fix

## Task

Resolve missing scene reference in `passage_hood_detachment` mini-protocol. The protocol was referencing a scene that did not exist in SCENE_CATALOG.

## Investigation

1. **Scene search**: Checked `content/scenes/` for any microscope-named scenes. None found.
2. **Protocol scene files**: Found `content/protocols/cell_culture/passage_hood_detachment/scenes/microscope_view.yaml` exists locally in the protocol folder.
3. **SCENE_CATALOG inspection**: Generated `scene_data.ts` contains 43 scenes total, including:
   - `microscope_basic`
   - `microscope_basic_row_slot`
   - `passage_hood_detachment_microscope_view` (namespaced)
4. **Protocol references**: The protocol YAML referenced `microscope_view` (short form) in two locations:
   - `inspect_confluence` step (line 33)
   - `confirm_detachment` step (line 255)

## Verdict

**TYPO** - The protocol was using the short form `microscope_view` instead of the full namespaced form `passage_hood_detachment_microscope_view` that the scene was registered under in SCENE_CATALOG.

## Fix Applied

Updated `content/protocols/cell_culture/passage_hood_detachment/protocol.yaml`:
- Line 33: Changed `to_scene: microscope_view` -> `to_scene: passage_hood_detachment_microscope_view`
- Line 255: Changed `to_scene: microscope_view` -> `to_scene: passage_hood_detachment_microscope_view`

## Verification

1. **Build success**: `bash build_github_pages.sh` -> Generated 26 HTML files, including `passage_hood_detachment.html` OK
2. **TypeScript check**: `npx tsc --noEmit -p tsconfig.json` -> Clean OK
3. **Protocol data regeneration**: Ran `python3 pipeline/build_protocol_data.py` and verified protocol_data.ts contains correct scene references OK

## Status

OK **COMPLETE** - The scene reference issue is resolved. The protocol now correctly references `passage_hood_detachment_microscope_view` and all builds pass.

---

**Changes made:**
- `content/protocols/cell_culture/passage_hood_detachment/protocol.yaml` (2 edits)

**No commits created** (per task boundaries).
