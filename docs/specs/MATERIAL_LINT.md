# Material lint

This document is the canonical **validator and audit** surface for the material
system: the rules that enforce the other material docs' decisions, the
cross-YAML agreement rules, the resolver error contract, and the validator
implementation hooks that attach each rule to a concrete function in the
existing validators.

This doc owns enforcement only. It does not redefine the material terms, the
schema, or the render convention; it cites the doc that owns each and writes
the rule that makes a violation fail. The owning docs are:

- The closed material terms (material, sentinel, visible material, registry,
  mixture, waste, transfer, color resolver) and the settled sentinel/visible
  classification are defined in [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md).
- The `materials.yaml` file schema (keys, `label`, the scalar `display_color`
  hex format, the D1 predicate, the closed-key rule, sentinel exemption) is
  defined in [MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md).
- The design rationale is in [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md).
- The runtime render convention and the resolver typed result are defined in
  [MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md).

Where a term is used below, it carries the meaning fixed in
[MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md).

## What this doc enforces

The material decisions live in three docs; this doc turns each decision into a
validator rule that fails when an author violates it. The lint surface has two
homes that together cover authoring time and walk time:

- The static **YAML schema validators** under `validation/yaml_schema/` check
  one file (or a cross-file pair) against the closed schema. They run without
  walking a protocol.
- The **stepper** under `validation/stepper/` walks a protocol's interactions
  and checks each material write against the active registry as state mutates.
  This is where the `s-unregistered` gate lives.

No rule below introduces a new authoring field, a new sentinel, or a new color
surface. Every rule rejects a violation of a decision already owned by one of
the four cited docs.

## Rule set

Each rule names the decision it enforces, the owning doc, and the observable
outcome of a violation. The validator hook list later in this doc maps each
rule to a concrete `file:function`.

### L1: protocol writes only declared object fields

A protocol interaction's `ObjectStateChange` may write only a `field_name`
declared in the target object's `state_fields` (or `subpart_state_fields`).
Writing material identity or amount through any field the object does not
declare is an error. This is the overpowered-setter lock from
[SPEC_DESIGN_CHECKLIST.md](SPEC_DESIGN_CHECKLIST.md) (rule 14) applied to
material fields: `material_name`, `material_volume`, `held_material_name`, and
`held_material_volume` are written only where the object declares them.

- Owning decision: object owns its `state_fields`; protocol writes declared
  fields only ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md),
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).
- Violation outcome: error against the offending interaction; the write does
  not validate.

### L2: material write requires the material_container capability

A `material_name` or `held_material_name` write targets an object only if that
object declares the `material_container` capability. An object that holds no
material cannot be given one by the protocol. This keeps material state on the
objects the convention scopes it to (see "Convention scope" in
[MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)).

- Owning decision: capability gate ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)).
- Violation outcome: error; the material write does not validate.

### L3: registry coverage for every visible material (s-unregistered)

Every material name a protocol writes into a `material_name` /
`held_material_name` field must satisfy the D1 predicate from
[MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md):

```
valid(m, P)  ==  m in {empty, mixed}            # closed sentinel allowlist
              OR m in registry_keys(P)          # keys of P's materials.yaml
```

A non-sentinel material name absent from the active protocol's registry is an
unregistered-material error: the `s-unregistered` gate. The sentinel allowlist
exempts **exactly** `empty` and `mixed` and nothing else. `cells`, `formazan`,
`formazan_dmso_solution`, `mtt`, `carboplatin`, `carboplatin_metformin_combo`,
and every `waste_*` stream are registry-required visible materials, not
sentinels (settled classification table in
[MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md)). Writing one of those without
a `materials.yaml` entry is an `s-unregistered` error, the same as any other
unregistered visible material.

- Owning decision: D1 predicate and the two-value sentinel allowlist
  ([MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md),
  [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md)).
- Violation outcome: error against the writing interaction; the write does not
  validate.

### L4: visible-but-uncolored is an error

A non-`empty` material name that resolves to no color is a resolver failure,
never a silent invisible success. This is the binding invariant (D2) from
[MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md). The resolver surfaces the
failure; no consumer substitutes a fallback color and no consumer treats the
failure as an empty well. A registered material whose `display_color` is
missing or malformed, and an unregistered non-built-in name, are both visible
materials with no color: both are errors, routed to the observable per-item
degrade path (see "Resolver error contract" below).

- Owning decision: D2 binding invariant
  ([MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md));  resolver typed result
  ([MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)).
- Violation outcome: resolver returns `{ ok: false, reason }`; the region
  renders the degrade path, never a painted color and never silent absence.

### L5: scalar display_color required; nested rejected (required after sweep)

`display_color` is a single scalar hex string matching `^#[0-9a-f]{6}$`. The
nested `display_color.light` / `display_color.dark` mapping is rejected; the
six-lowercase-hex scalar is required. Both the scalar requirement and the exact
pattern are owned by [MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md).

The hard rule has two halves and a sequencing constraint:

- **Reject nested.** A `display_color` written as a mapping (any
  `light` / `dark` shape) is a schema error.
- **Require scalar.** A `display_color` that is not a string matching
  `^#[0-9a-f]{6}$` (uppercase hex, three-digit shorthand, eight-digit alpha,
  named color, or `rgb(...)` / `hsl(...)`) is a schema error.

Sequencing constraint (binding): the nested-rejection half of this rule must
**not** be enabled in the validator until the WP-MAT-SWEEP migration has
converted every `materials.yaml` entry from nested to scalar. Today the
validator enforces the inverse (it rejects scalar and requires nested); flipping
the validator before the content is migrated would reject every existing
`materials.yaml` mid-migration and block the sweep. The flip is a single change
to one function (see the L5 hook) and lands together with, or immediately after,
the sweep that makes the content scalar. Until that sweep passes, this doc
documents the target rule and leaves the hook as a TODO; the validator stays on
its current behavior so it never blocks migration midstream.

- Owning decision: scalar `^#[0-9a-f]{6}$`, nested rejected
  ([MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md)).
- Violation outcome (after sweep): schema error against the offending entry;
  the registry file does not validate.

### L6: closed material entry schema

A `materials.yaml` entry has exactly two keys, `label` and `display_color`,
both required, no optional keys and no third key. The only top-level key is
`materials`. Any unknown per-entry key (`color`, `colour`, `hex`, `theme`,
`light`, `dark`, `kind`, `metadata`, `notes`, `description`) and any unknown
top-level key is a closure error. A `mixed` or `empty` entry written into the
file is rejected, because sentinels are not registry entries.

- Owning decision: closed entry schema and sentinel non-appearance
  ([MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md)).
- Violation outcome: closure error; the registry file does not validate.

### L7: sentinel rendering rules

The two sentinels render by fixed rule, not by registry lookup:

- `empty` is the only non-rendering material name. A container whose
  `material_name` is `empty`, or whose `material_volume` is `0`, renders no
  fill; the base art shows through. The resolver returns `{ ok: true, color:
  null }` for `empty`; `null` is a success, never a failure.
- `mixed` is the only built-in visible material. The resolver returns
  `{ ok: true, color: "#686868" }` for `mixed` from the spec-fixed built-in,
  never from a registry lookup; `mixed` never renders invisible and is never a
  `materials.yaml` entry.

Any consumer that paints `null` as a color, or treats `empty` as a failure, or
looks `mixed` up in the registry, violates the convention.

- Owning decision: sentinel render rules and the `#686868` built-in
  ([MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md),
  [MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)).
- Violation outcome: a resolver or consumer that breaks these rules is a code
  defect, caught by the resolver-contract tests, not an authoring error.

### L8: no per-material variant asset

Every material-name case in an object's `visual_states` resolves to the same
`asset_name`. A per-material variant SVG (`<object>_empty.svg`,
`<object>_filled.svg`, `<object>_with_<material>.svg`) is the fan-out smell the
convention forbids. Material color comes from the runtime overlay, not a second
base SVG.

- Owning decision: single base SVG, no per-material variant
  ([MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)).
- Violation outcome: object-schema error; the object does not validate.

### L9: no runtime DOM-id construction and no arbitrary DOM access

Runtime material code must not construct a DOM id by concatenating asset, scene,
placement, target, or anchor names (`<asset_name>__anchor_liquid_clip`,
`<placement>_<target>`, a string-built `url(#...)` reference, or any equivalent).
The material layer owns declarative target names only; a bare authored anchor
target is resolved to a concrete instance element through the SVG-injection
path's lookup seam, never by an id the material layer builds. This is the
no-id-concat invariant from
[MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md) ("No id construction by name
concatenation"), which exists because the SVG-injection path namespaces internal
ids per render instance and a per-asset prefix cannot address one instance.

The same rule forbids arbitrary DOM access from material or Solid code. Material
code reaches the injected SVG only through the lookup seam; it must not issue
`document.querySelector`, `getElementById`, or any other arbitrary DOM query, and
must not read a value back out of the DOM as application state. SVG DOM is the
rendering substrate, never a state store. Solid owns state, reactivity, and
attribute updates: once the lookup seam returns the declared element, the
material renderer updates only the declared attributes (`fill`, `x`, `y`,
`width`, `height`, `clip-path`, `opacity`) on it through Solid reactivity. This
is the DOM-access-isolation and Solid-ownership invariant from
[MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md) ("Lookup contract for an
SVG-anchor target").

- Owning decision: bare authored targets resolved per SVG instance through the
  lookup seam, DOM access isolated in that seam, Solid owns reactive attribute
  updates ([MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)); per-instance id
  namespacing ([SVG_PIPELINE.md](SVG_PIPELINE.md)).
- Violation outcome: a renderer or helper that name-concatenates a DOM id, queries
  arbitrary DOM, or writes a declared attribute outside Solid reactivity is a code
  defect, caught by the L9 hook below, not an authoring error.

### L10: declared material/anchor target requires injected SVG DOM

Render mode is declaration-based, not state-based. An object that declares
material rendering or anchor targeting (a `visual_states` entry with a
`render_effect` on a material-name, material-volume, or anchor target) must be
rendered as injected, per-instance-namespaced SVG DOM, never as an `<img>`
element, even when its material state is currently empty. An `<img>` exposes no
internal DOM, cannot be per-instance namespaced, and cannot host the anchor ids
the lookup seam resolves. This is the declaration-based render-mode invariant
from [MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md) ("Declaration-based render
mode").

- Owning decision: declaration-based render mode
  ([MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md)).
- Violation outcome: an object that declares a material/anchor render effect but
  is rendered through `<img>` is a render-mode defect, caught by the L10 hook
  below.

## Resolver error contract (D3)

The color resolver returns the typed result owned by
[MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md):

```
type ColorResult =
  | { ok: true; color: string | null }
  | { ok: false; reason: string };
```

D3 enumerates every failure case. Each `{ ok: false }` case carries a
human-readable `reason` and routes, unmodified, to the **observable per-item
degrade path**: the one region (well subpart, vessel fill, or pipette fill)
that failed is rendered through the degrade path so the fault is visible at
that item, and no other region is affected. The degrade path is never a silent
fallback color and never a silent empty well; a consumer must not catch an
`{ ok: false }` and substitute a color, and must not treat `{ color: null }` as
a failure.

The two success rows are listed first for contrast; the rest are the D3 failure
cases.

| Case | Input condition | Resolver result | Routed to |
| --- | --- | --- | --- |
| empty success | material name `empty` (or `material_volume` / `held_material_volume` is `0`) | `{ ok: true, color: null }` | no fill; base art shows through (not a failure) |
| color success | registry-backed name with a valid scalar `display_color`, or built-in `mixed` | `{ ok: true, color: "#rrggbb" }` | the resolved color is painted |
| unknown material | non-`empty` name absent from the registry and not a built-in | `{ ok: false, reason }` | observable per-item degrade path |
| missing display_color | registry-backed name whose entry has no `display_color` | `{ ok: false, reason }` | observable per-item degrade path |
| invalid hex | registry-backed name whose `display_color` is not `^#[0-9a-f]{6}$` | `{ ok: false, reason }` | observable per-item degrade path |
| sentinel other than empty | a name treated as a no-render sentinel that is not `empty` (only `empty` renders no fill; `mixed` renders the built-in) | `{ ok: false, reason }` | observable per-item degrade path |
| material_name null | the driving identity field is `null` rather than a material name (`empty` is the named-absence value, not `null`) | `{ ok: false, reason }` | observable per-item degrade path |
| zero-volume with non-empty material | `material_volume` is `0` while `material_name` is a non-`empty` material (amount says empty, identity says present) | `{ ok: false, reason }` | observable per-item degrade path |
| non-empty with missing volume | a non-`empty` material name whose driving `material_volume` field is absent (`null`) where a `fill_height` effect needs an amount | `{ ok: false, reason }` | observable per-item degrade path |

Notes on the failure rows:

- "unknown material", "missing display_color", and "invalid hex" are the three
  ways a visible material resolves to no color; all three are the L4
  visible-but-uncolored error seen from the resolver.
- "sentinel other than empty", "material_name null", "zero-volume with
  non-empty material", and "non-empty with missing volume" are the four
  inconsistent-state failures: the identity layer and the amount layer disagree,
  or a no-render path is taken for a name that is not `empty`. The honest visual
  for absence is `material_name: empty` (identity) with `material_volume: 0`
  (amount) agreeing; any disagreement is a fault to be seen, not hidden behind a
  transparent well.

`empty` is the single no-fill success; every other no-fill outcome above is a
fault routed to the degrade path.

## Cross-YAML agreement rule

A material's presence on screen is authored across four files, and the four
must agree. No single file is authoritative for the whole chain; each owns one
link, and a break in any link is an error.

| File | Owns | Must agree that |
| --- | --- | --- |
| object YAML (`content/objects/<object_name>.yaml`) | the subpart structure and the `state_fields` / `subpart_state_fields` that hold material, plus the `visual_states` that render it | the field the protocol writes is a declared material field on this object, and the object declares `material_container` |
| materials YAML (`content/protocols/<cluster>/<P>/materials.yaml`) | the registry of visible material values for protocol `P` | every non-sentinel material the protocol writes is registered here with a scalar `display_color` |
| protocol YAML (`content/protocols/<cluster>/<P>/protocol.yaml`) | the `ObjectStateChange` writes that set material state | it writes only declared fields (L1, L2) and only sentinel-or-registered values (L3) |
| scene YAML (base scene + protocol-local scene) | the placement that puts the object in the workspace | the object the protocol targets is actually placed in a reachable scene, so the material has somewhere to render |

The agreement chain in one sentence: the **object** declares the material
field, the **materials** registry registers the material value, the
**protocol** writes that value into that field, and the **scene** places the
object so the write has a visible home. A protocol that writes `media` into a
`well_plate_96` subpart is valid only when `well_plate_96` declares a
per-subpart `material_name` field with `material_container`, the protocol's
`materials.yaml` registers `media` with a scalar `display_color`, and a
reachable scene places `well_plate_96`. Any missing link is a cross-YAML
disagreement and an error.

## Validator implementation hooks

This section is the handoff list: where each rule above attaches in the
existing validators. It describes the hook (file, function, and the rule to
add or change); it is not a validator implementation. An entry tagged
**EXISTS** is already enforced and is listed so the rule's home is unambiguous;
an entry tagged **TODO** is a change to make when its workstream lands.

### Static YAML schema validators

| Rule | Hook (`file:function`) | Status | What to add or change |
| --- | --- | --- | --- |
| L1 (declared fields) | `validation/yaml_schema/protocol_validator.py:ProtocolValidator._validate_sequence` | EXISTS | The `ObjectStateChange` branch resolves each `state` `field_name` through `db.resolve_state_field(op_target, field_name)` and emits `T1_STATE_FIELD` when absent. Keep; this is the L1 material-field case. |
| L3 (registry coverage, static) | `validation/yaml_schema/protocol_validator.py:ProtocolValidator._validate_sequence` | EXISTS | The `T1_MATERIAL_REF` branch already exempts only `('empty', 'mixed')` and resolves other values through `db.resolve_material(protocol_name, value)`. Keep the two-value exemption; it matches the narrowed allowlist. |
| L5 (scalar required, nested rejected) | `validation/yaml_schema/material_validator.py:MaterialValidator._validate_display_color` | EXISTS | Rejects a `dict` (nested) `display_color` with tag `PALETTE_NESTED`; accepts only a scalar string matching `^#[0-9a-f]{6}$` (tag `PALETTE_MALFORMED` on mismatch). Module-level `HEX_COLOR_RE` is `^#[0-9a-f]{6}$`. Updated by WP-MAT-SWEEP. |
| L5 (cross-protocol color agreement) | `validation/yaml_schema/material_validator.py:MaterialValidator.validate_cross_protocol` | EXISTS | Tracks `(label, display_color)` scalar tuples; divergence in either field emits `PALETTE_DIVERGENT`. Updated by WP-MAT-SWEEP. |
| L6 (closed entry schema) | `validation/yaml_schema/material_validator.py:MaterialValidator._validate_entry` | EXISTS | Closure on `MATERIAL_ALL_KEYS` (currently `{label, display_color}`) and snake_case key check already reject unknown keys and bad names. Keep. |
| L6 (sentinel not an entry) | `validation/yaml_schema/material_validator.py:MaterialValidator._validate_entry` | TODO | Add a check that rejects `empty` and `mixed` as registry keys (sentinels never appear in `materials.yaml`, per MATERIAL_YAML_FORMAT.md). Emit a closure-class error naming the offending key. |
| L8 (no per-material variant asset) | `validation/yaml_schema/object_validator.py:ObjectValidator.validate` (visual-states branch) | EXISTS | The object validator's `visual_states` completeness check enforces one `asset_name` per object; a per-material variant SVG is rejected there. Keep; cite this doc and MATERIAL_CONVENTION.md in the rule. |
| Constants (allowlist) | `validation/yaml_schema/constants.py` | EXISTS | `MATERIAL_REQUIRED_KEYS = {label, display_color}` and `MATERIAL_ALL_KEYS` are correct for the scalar schema; no nested-color key set is introduced. The `# spec:` comment now cites `MATERIAL_YAML_FORMAT.md "Material entry schema"` (updated by WP-MAT-CROSSREF). |

### Stepper (walk-time) validators

| Rule | Hook (`file:function`) | Status | What to add or change |
| --- | --- | --- | --- |
| L1 (declared fields) | `validation/stepper/state.py:StateMap.mutate_state_field` | EXISTS | Emits `undeclared_state_field` when `tree.get_state_field(object_name, field_name)` returns nothing. Keep; this is the walk-time L1 gate. |
| L2 (material_container capability) | `validation/stepper/state.py:StateMap.mutate_state_field` | EXISTS | The material-field branch emits `capability_mismatch` when the object lacks `material_container`. Keep. |
| L3 (s-unregistered) | `validation/stepper/state.py:StateMap.mutate_state_field` | EXISTS | The inline material-field branch exempts only `("empty", "mixed")` and emits `unknown_material` otherwise, which is the correct narrowed allowlist. The `spec_cite` now reads `docs/specs/MATERIAL_YAML_FORMAT.md D1 registry-backed membership` (updated by WP-MAT-CROSSREF). |
| L3 (sentinel allowlist source) | `validation/stepper/sentinels.py:NON_RENDERING_MATERIAL_SENTINELS` + `BUILTIN_VISIBLE_MATERIALS` | EXISTS | The eight-value `MATERIAL_SENTINEL_ALLOWLIST` was retired and split into two narrower frozensets: `NON_RENDERING_MATERIAL_SENTINELS = {"empty"}` (the only non-rendering sentinel, returns null color) and `BUILTIN_VISIBLE_MATERIALS = {"mixed"}` (the only built-in visible material, returns fixed `#686868`). All stepper and TS runtime paths that previously read the eight-value set now read the appropriate narrower frozenset. `cells`, `formazan`, `mtt`, and every `waste_*` stream are registry-required visible materials and are rejected by the `unknown_material` gate unless registered. |
| L4 / D3 (visible-but-uncolored, walk-time) | `validation/stepper/state.py:StateMap.mutate_state_field` | TODO | After L3 confirms a material is registered, add a check that the registered entry has a resolvable scalar `display_color` (present and `^#[0-9a-f]{6}$`); a registered-but-uncolored material is the L4 error at walk time, distinct from the `unknown_material` (unregistered) error. Depends on WP-MAT-SWEEP making colors scalar. |
| Cross-YAML scene agreement | `validation/stepper/state.py:StateMap._load_placements` and `:resolve_target` | EXISTS | Placement load emits `unknown_object_in_scene`; target resolution emits `unknown_target_active_scene` / `ambiguous_target_in_scene`. These enforce the scene link of the cross-YAML chain. Keep. |

### Resolver contract (TypeScript, M3)

| Rule | Hook (`file:function`) | Status | What to add |
| --- | --- | --- | --- |
| D3 resolver result | `src/scene_runtime/renderer/material_color.ts` (WP-COLOR, M3) | EXISTS | `resolve_color_result(material_name, registry)` returns the D3 discriminated union `{ ok: true; color: string | null } | { ok: false; reason: string }`: `empty` -> `{ ok: true, color: null }`, built-in `mixed` -> `{ ok: true, color: "#686868" }`, registry-backed scalar -> `{ ok: true, color }`, non-sentinel absent from registry or invalid hex -> `{ ok: false, reason }`. No local fallback color; every `{ ok: false }` routes to the degrade path. Contract locked by 12 pure tests in `tests/test_material_color.mjs`. |
| L4 / L7 consumer rules | `src/scene_runtime/renderer/subpart_visual_state_renderer.tsx` (WP-SUBPART-RENDER, M3) | EXISTS | The subpart renderer paints `color` on `{ ok: true, color }`, renders `fill="transparent"` for `{ ok: true, color: null }` (empty/sentinel/unseeded, D4), and routes `{ ok: false }` to the per-item degrade sink. It never catches a failure and substitutes a color, and never treats `null` as a failure. Contract locked by `tests/test_subpart_visual_state_renderer.mjs`. |
| L9 (no id concatenation, no arbitrary DOM) | material/anchor renderer that reads an anchor target (WP-SUBPART-RENDER, M3) | TODO | The anchor-rendering path must resolve a bare authored target (`anchor_liquid_bounds`, `anchor_liquid_clip`) through the SVG-injection path's lookup seam (the SVG plan's M5 deliverable), never by building a DOM id from asset/scene/placement/target/anchor names. The current subpart renderer builds no DOM id, queries no arbitrary DOM, and references no base-SVG id. Anchor-target resolution through the lookup seam is a future M5 deliverable. |
| L10 (declaration-based render mode) | scene render-mode selection that chooses `<img>` vs injected SVG (WP-SUBPART-RENDER, M3) | EXISTS | `subpart_dispatch.ts` (`find_material_tint_subpart_field`) dispatches from the DECLARATION (`render_effect == material_tint`, `applies_to == subpart`, generated `subpart_geometry`/`view_box`), not from the runtime value. The render mode is decided from the declaration; `<img>` is never chosen for a declared material/anchor object, even when the current material value is `empty`. |

### Sequencing summary

One hard flip still waits on content migration:

- **L5 nested-rejection** flips in
  `material_validator.py:_validate_display_color` only after WP-MAT-SWEEP makes
  every `materials.yaml` scalar. Flipping early rejects all current content and
  blocks the sweep. Status: EXISTS (WP-MAT-SWEEP completed the scalar migration;
  the validator now enforces the scalar `^#[0-9a-f]{6}$` rule and rejects nested).

The following flips previously listed as TODO are now EXISTS:

- **L3 sentinel narrowing** in `sentinels.py`: completed (task #23). The
  eight-value `MATERIAL_SENTINEL_ALLOWLIST` was split into two narrower frozensets;
  `cells`, `formazan`, `mtt`, and every `waste_*` stream are now registry-required.
- **L4 walk-time color check** in `state.py`: TODO. After L3 narrowing, a
  registered-but-uncolored material is still not checked at walk time. This remains
  a future task once all authored materials are confirmed to have valid scalar colors.

## What this doc does not own

- The closed material terms, the sentinel allowlist values, and the settled
  sentinel/visible classification:
  [MATERIAL_VOCABULARY.md](MATERIAL_VOCABULARY.md).
- The `materials.yaml` schema, the scalar `display_color` format, and the D1
  predicate: [MATERIAL_YAML_FORMAT.md](MATERIAL_YAML_FORMAT.md).
- The resolver typed result, the render-effect and target tokens, and the
  empty/zero render rules: [MATERIAL_CONVENTION.md](MATERIAL_CONVENTION.md).
- The design rationale for scalar color, transparent empty, and separate
  identity/amount layers: [MATERIAL_DESIGN.md](MATERIAL_DESIGN.md).
- Object-side `state_fields`, `subpart_state_fields`, and `visual_states`:
  [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).
- Protocol-side `ObjectStateChange` semantics:
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).
</content>
</invoke>
