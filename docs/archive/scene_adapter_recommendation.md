# Scene-adapter resolution: architect recommendation

**Decision needed by: user (per cleanup-gate plan M1 close deadline).**

This memo proposes one of four candidate scene-adapter resolution algorithms
for user ratification. Once ratified, the spec amendments and architect-plan
close-out land in a follow-up patch. The parent plan is
[yaml_cleanup_gate.md](yaml_cleanup_gate.md); the evidence base is
[yaml_cleanup_triage.md](yaml_cleanup_triage.md); the architect plan being
closed out is
[scene_adapter_resolution_design.md](scene_adapter_resolution_design.md).

## 1. Triage summary

Per [yaml_cleanup_triage.md](yaml_cleanup_triage.md), the stepper emits 478
raw `unknown_target_active_scene` warnings, deduped to 219 unique signatures
(`protocol_name + step_name + code + target + active_scene`), across 8 of 12
shipped protocols. The per-protocol breakdown classifies these as 92 raw / 25
unique S0 (spec gap, scene-adapter algorithm could resolve), 386 raw / 194
unique S1 (authoring bug, no algorithm can save these), and 0 S2 (stepper
false positive). The S1 mass is dominated by 193 missing `well_plate_96.<RC>`
placements in the `read_absorbance` step of `mtt_solubilization_readout` (and
the same step surfacing again in the `cell_culture_full` sequence runner).
The 25 S0 signatures are all "workspace object lives in a sibling scene of
the same protocol's `scenes/` directory" -- targets like `incubator`,
`t75_flask`, `conical_15ml`, `label_pen`, `lens_tissue`, `micropipette`,
`hemocytometer_slide`, and `dilution_tube_rack_8` referenced from a step
whose active scene is a different workspace authored by the same protocol.

## 2. Per-algorithm analysis

### Option 1: Active-only (status quo)

- **S0 signatures resolved: 0 of 25.** Every S0 warning stays a warning.
- **Interaction with SCENE_INHERITANCE.md:** none. The one-level inheritance
  rule and the four named placement operations are unaffected.
- **Authoring complexity:** highest. Authors must add a SceneChange back to
  the prior scene before any cross-workspace reference, or split the step
  across scenes. Every "label tube, return to incubator, spin centrifuge"
  composite step fragments into per-workspace sub-steps that hurt pedagogy.
- **Runtime complexity:** lowest. `resolve_target` consults exactly one
  scene's placements (the currently-active one).

### Option 2: Full-protocol-scenes registry

- **S0 signatures resolved: 25 of 25.** All 25 S0 signatures name objects
  that are placed in some sibling `content/protocols/<name>/scenes/<other>.yaml`
  of the same protocol. The runtime builds a per-protocol registry by union
  over the protocol's declared scenes (and the base scenes they `extends`),
  then `resolve_target` consults the registry when the active scene misses.
- **Interaction with SCENE_INHERITANCE.md:** clean. The registry is built
  from the same resolved placement set the scene-inheritance validator
  already produces (after `remove_placements` / `deactivate_placements` /
  `reposition_placements` / `add_placements` apply). `placement_name`
  uniqueness is already enforced per scene; cross-scene collisions on
  `object_name` are common and expected (a `micropipette` placed in both
  the hood and the cell-counter workspace is fine -- the registry stores
  both and the stepper warns only on `ambiguous_target_in_scene` if the
  protocol references the bare name where there are multiple). Deactivated
  placements are excluded from the registry per the deactivation rule
  (placement runtime availability).
- **Authoring complexity:** zero new YAML surface. Authors add nothing.
  Anti-drift cost is one new closure principle: a target name resolves
  across the protocol's full scene set, so a typo'd target is still caught
  (will not appear in any of the protocol's scenes).
- **Runtime complexity:** low. One per-protocol pre-pass builds a
  `Dict[object_name, List[(scene_name, placement_name)]]` registry. The
  resolver checks active scene first (preserves "where am I now?" semantics
  in error messages), then falls back to the registry. Implementation lives
  in `tools/stepper/state.py` `resolve_target`; no new spec field, no new
  vocabulary term beyond naming the registry.

### Option 3: Explicit YAML adapter block

- **S0 signatures resolved: 25 of 25 (in principle).** Authors declare a
  `scene_adapter:` block in `protocol.yaml` enumerating which scenes
  contribute which placements to a given step.
- **Interaction with SCENE_INHERITANCE.md:** adds a new top-level
  protocol-side vocabulary surface that names scene files and placement
  names, duplicating information already declarable in scene files.
- **Authoring complexity:** highest of the four. Adds a closed schema
  to `protocol.yaml` that every protocol must learn. Adds a new
  authoring-surface concept (`scene_adapter`) on top of the existing
  `entry_step` + `next_step` + `SceneChange` model. Violates the
  closure principle by adding meaning to the protocol layer that
  already exists in the scene layer.
- **Runtime complexity:** medium. Resolver must reconcile the adapter
  block against the actual scene placement set, surfacing mismatches as
  a new error class.

### Option 4: Hybrid (active first, then registry or adapter fallback)

- **S0 signatures resolved: 25 of 25 (matches Option 2 or 3 fallback).**
- **Interaction with SCENE_INHERITANCE.md:** depends on fallback choice.
- **Authoring complexity:** equal to whichever fallback is selected.
- **Runtime complexity:** equal to whichever fallback is selected; no
  added cost over Option 2 since Option 2 already checks active scene
  first.

Note: Option 2 as described above is already "active scene first, then
registry fallback". Option 4 with a registry fallback collapses into
Option 2. Option 4 with an adapter fallback collapses into Option 3
plus the active-scene short-circuit. Treating it as a distinct fourth
candidate is a labelling artifact; the real decision is "registry
fallback or adapter fallback".

## 3. Recommendation

**Recommend Option 2: full-protocol-scenes registry, with active-scene
check first.**

Justification: It resolves all 25 S0 unique signatures (92 raw warnings)
with zero new authoring surface and the smallest runtime addition. The
registry is a derived view over data the scene-inheritance validator
already resolves, so no new vocabulary term is introduced at the
authoring layer and the closure principle from
[docs/PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md) is preserved. Authors continue
to use only `entry_step`, `next_step`, and `SceneChange` to express flow
between workspaces; cross-scene target resolution becomes a runtime
concern, not an authoring concern. Option 3 would expand the closed
authoring surface for a problem the runtime can solve transparently;
Option 1 leaves 92 raw warnings unresolved and forces pedagogy-distorting
step fragmentation; Option 4 collapses into Option 2 once "active first"
is folded in.

Under Option 2, the S1 fix shapes split as follows. **Trivial under
Option 2**: zero. None of the 194 S1 unique signatures resolve from
the registry because none of those targets are placed in any sibling
scene of the same protocol; the S1 mass is genuine missing placements
(96 well subparts) or missing-workspace cases that no algorithm can
invent. **Still hard**: the 193 `well_plate_96.<RC>` subpart references
in `mtt_solubilization_readout.read_absorbance` require either adding
96 explicit `add_placements` entries to the plate-reader scene or a
spec amendment to treat declared subparts of a placed plate as
implicitly resolvable (a separate scene-vocabulary question, NOT
folded into this recommendation -- it is a subpart-resolution
question, not a scene-adapter question). The single `micropipette`
S1 signature in the same step is a genuine missing-placement bug.

## 4. Next steps on user ratification

1. **Amend `docs/specs/SCENE_VOCABULARY.md`** -- add a "Scene-adapter
   resolution" subsection that defines the protocol-scene registry as
   the canonical resolver, names the order (active scene first, then
   registry), and points to `SCENE_INHERITANCE.md` for the resolved
   placement set the registry consumes.
2. **Amend `docs/specs/PROTOCOL_YAML_FORMAT.md`** -- add a short note
   under the "Targets and the scene boundary" section (mirroring the
   existing scene-boundary text in `PRIMARY_SPEC.md`) clarifying that
   target resolution consults the protocol's full scene set when the
   active scene does not contain the named target. Cite the new
   `SCENE_VOCABULARY.md` subsection.
3. **Close out and archive
   [scene_adapter_resolution_design.md](scene_adapter_resolution_design.md)**
   per the retire-rule contract in that plan (move to
   `docs/archive/scene_adapter_resolution_design.md`).
4. **Resume the cleanup gate.** WS-STEPPER (Patch 3) implements the
   resolver change in `tools/stepper/state.py` and re-promotes the
   check from WARNING to ERROR. WS-AUTHOR-SCENE (Patches 4-6) fixes
   the 194 surviving S1 unique signatures. The
   `well_plate_96.<RC>` subpart-resolution question is filed as a
   separate spec question and tracked outside this gate.

If the user rejects Option 2 in favor of Option 3, both `SCENE_VOCABULARY.md`
and `PROTOCOL_YAML_FORMAT.md` need a new `scene_adapter:` schema table; the
architect plan stays open until the schema is ratified. If the user picks
Option 1, no spec amendment is needed but the 25 S0 signatures must be
fixed by adding `SceneChange` operations across 8 protocols, and the
parent gate plan's "0 unresolved WARNINGs" exit criterion forces those
fixes regardless.
