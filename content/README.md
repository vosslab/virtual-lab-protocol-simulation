# Content

Authored curriculum lives here. Everything under `content/` is hand-edited YAML; nothing under this tree is generated. Generated artifacts emit to `generated/` at the repo root (see [docs/PRIMARY_SPEC.md](../docs/PRIMARY_SPEC.md)).

## Folder layout

```
content/
  protocols/   organized into three topic clusters (see below)
  base_scenes/ shared scene definitions reused across protocols
  objects/     reusable lab object definitions, grouped by kind
```

## protocols/

Protocols are organized into three topic clusters. Each cluster contains one or more protocol folders, with each protocol folder named by its `protocol_name`. Every protocol folder always contains a top-level `protocol.yaml`. It may also contain a sibling `materials.yaml` and a `scenes/` subdirectory for protocol-local scene variants.

```
content/protocols/
  cell_culture/<protocol_name>/
    protocol.yaml          required; the authored protocol
    materials.yaml         optional; per-protocol material definitions
    scenes/                optional; protocol-local scene overrides
      <scene_name>.yaml
  sdspage/<protocol_name>/
    protocol.yaml
    ...
  runners/<runner_name>/
    protocol.yaml
```

The three clusters organize protocols by pedagogical workflow:

- `cell_culture/` -- mini-protocols for the OVCAR8 cell-culture and MTT workflow (passage, counting, dilution, treatment, assay).
- `sdspage/` -- mini-protocols for the SDS-PAGE electrophoresis workflow.
- `runners/` -- sequence runners that assemble existing mini-protocols into longer pathways (examples: `cell_culture_full`, `routine_passage`, `sdspage_full`).

Two `protocol_type` values are authored under `content/protocols/`:

- `mini_protocol`: one pedagogical unit; the standard authoring shape. Lives under `cell_culture/` or `sdspage/`.
- `sequence_runner`: assembles existing mini-protocols into a longer pathway. Lives under `runners/`.

The binding rule for cluster membership, folder naming, and enforcement lives in [docs/specs/TARGET_FILE_STRUCTURE.md](../docs/specs/TARGET_FILE_STRUCTURE.md#protocol-cluster-layout). Definitions for each protocol kind live in [docs/specs/PROTOCOL_VOCABULARY.md](../docs/specs/PROTOCOL_VOCABULARY.md). YAML schema in [docs/specs/PROTOCOL_YAML_FORMAT.md](../docs/specs/PROTOCOL_YAML_FORMAT.md). Authoring walk-through in [docs/specs/PROTOCOL_AUTHORING_GUIDE.md](../docs/specs/PROTOCOL_AUTHORING_GUIDE.md).

## base_scenes/

Shared scene definitions reused across multiple protocols. Each file is one scene. A protocol that needs a scene found nowhere else keeps its private scene under `content/protocols/<cluster>/<name>/scenes/`; a scene reused by two or more protocols moves here.

Scene YAML schema in [docs/specs/SCENE_YAML_FORMAT.md](../docs/specs/SCENE_YAML_FORMAT.md). Inheritance rules in [docs/specs/SCENE_INHERITANCE.md](../docs/specs/SCENE_INHERITANCE.md). Layout engine in [docs/specs/LAYOUT_ENGINE.md](../docs/specs/LAYOUT_ENGINE.md).

## objects/

Reusable lab object definitions. Subfolder = object `kind`. Adding a new file under `bottle/` defines a new bottle; the validator and registry pick it up automatically. New `kind` enum values are spec changes and require contract-level approval.

```
content/objects/
  bottle/        bottles, tubes, vials, conicals (any closed liquid container)
  decoration/    non-interactive props (tip boxes, avatars, kimwipe pads)
  equipment/     instruments (microscopes, plate readers, power supplies)
  flask/         tissue-culture flasks
  pipette/       pipettes, micropipettes, label pens
  plate/         multi-well plates
  rack/          tube and slide racks
  waste/         waste containers and decant bins
```

Materials inside containers (liquids, mixtures, suspensions, waste) follow [docs/specs/MATERIAL_CONVENTION.md](../docs/specs/MATERIAL_CONVENTION.md); they are not hard-coded in object YAML. Object YAML schema in [docs/specs/OBJECT_YAML_FORMAT.md](../docs/specs/OBJECT_YAML_FORMAT.md). Canonical kind enum and vocabulary in [docs/specs/OBJECT_VOCABULARY.md](../docs/specs/OBJECT_VOCABULARY.md).

## Authoring rules

- All files are YAML, hand-edited. No file under `content/` is regenerated.
- Authoring vocabularies are closed surfaces (per [docs/PRIMARY_DESIGN.md](../docs/PRIMARY_DESIGN.md)). Compose existing terms; do not invent new ones by editing YAML alone.
- Filenames are snake_case and match the primary identifier inside the file (`protocol_name`, scene name, or object name).
- There is no `schema_version` field. The repo `VERSION` is the unified schema anchor (see [docs/PRIMARY_SPEC.md](../docs/PRIMARY_SPEC.md) "No schema version").
- Validate before committing:

```bash
source source_me.sh && python3 validation/validate.py
```

See [docs/USAGE.md](../docs/USAGE.md) for per-stage runs and verbosity flags.

## Related references

- [docs/PRIMARY_CONTRACT.md](../docs/PRIMARY_CONTRACT.md): hard invariants (always wins).
- [docs/PRIMARY_DESIGN.md](../docs/PRIMARY_DESIGN.md): design philosophy.
- [docs/PRIMARY_SPEC.md](../docs/PRIMARY_SPEC.md): technical specification.
- [docs/specs/SPEC_DESIGN_CHECKLIST.md](../docs/specs/SPEC_DESIGN_CHECKLIST.md): vocabulary lock and sweep checklist.
- [docs/FILE_STRUCTURE.md](../docs/FILE_STRUCTURE.md): full repo map.
