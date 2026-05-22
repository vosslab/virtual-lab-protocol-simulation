# Layout manager baseline reframing

Round 3 framing correction for the procedural layout engine
(`src/scene_runtime/layout/layout_engine.ts`). Earlier Round 1 and Round 2
artifacts implicitly treated the current engine as a working visual baseline.
It is not. This note formalizes the reframing so downstream Round 3 work
stops citing "matches legacy" as a quality bar.

## Required statements

1. The current procedural layout engine is the current broken baseline, not
   a visual gold standard.
2. The replacement is judged against visual and runtime gates, not "matches
   legacy."
3. No-crop is the first forcing function.
4. The project will not build "legacy forever" or "hybrid forever."

## Why this reframing now

The active no-crop corpus exposes roughly 101 visible crop failures across
the current scene set. Those failures are produced by the procedural layout
engine that ships today. Legacy carries the failures, so legacy cannot be
the reference. Any status report or spike note that compares a replacement
candidate against legacy output and reports "parity" is reporting parity
with a broken baseline. Round 3 work must measure against visual gates
(no-crop, label readability, click-target stability) and runtime gates
(`ObjectStateChange` re-render, layout stability across protocol steps),
not against legacy pixels.

## Implications for in-flight docs

The following categories of in-flight documents still phrase legacy as
correct and need a follow-up sweep. Do not edit them in this task; this
list only enumerates the scope of the future sweep.

- Round 1 status reports under `docs/active_plans/reports/` that frame
  "matches legacy layout" as a success criterion.
- Round 2 status reports that adopt the same framing for hybrid or
  replacement candidates.
- Gold-scene captions and visual-acceptance notes that label legacy
  output as the reference image.
- NEW0 and NEW1 spike notes that compare candidate engines against
  legacy as if legacy output were the target.
- Any audit log entry that scores a candidate higher because it
  reproduces a legacy crop.

## Retirement criteria

The replacement candidate retires the current procedural layout engine
when it passes the same visual and runtime gates that legacy fails:

- No-crop: zero visible crops on the corpus that currently shows about
  101 crops under legacy. Scientific SVG assets render without clipped
  bottoms, necks, caps, tips, or edges, and without aspect distortion
  greater than 5 percent for lab glassware, pipettes, plates, and
  instruments.
- Label readability: every authored label on a placed scene object
  renders inside its placement card, at the authored size, with no
  overflow clip and no overlap that hides the text.
- Click-target stability: every interactive `target` named by a
  protocol step resolves to a stable, visible, hit-testable region
  across the full step sequence. Re-layout between steps does not
  move a target out from under a pending click.
- `ObjectStateChange` re-render: when a protocol response writes a
  declared object state field (including `material_name`,
  `material_volume`, `held_material_name`, `held_material_volume`,
  `set_volume`, `set_temperature`, `set_rpm`), the affected object
  re-renders without forcing a full scene rebuild and without losing
  its layout slot.

Passing all four gates is the condition for retirement. Matching
legacy output is not a gate and is not a substitute for any gate.

## Scope of this decision

This note is a framing decision. It does not change YAML schema,
TypeScript runtime code, or the layout engine source. It does not
authorize a rewrite. It establishes the standard that any rewrite,
hybrid, or replacement spike must meet to be accepted. Architecture
changes still require architect approval through the normal Round 3
plan review path.

## Related references

- [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) (visual integrity rule,
  never crop scientific assets).
- [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) (clickable objects
  are SVG-backed scene objects laid out by the layout engine).
- [no_crop_round3_sizing_source_reconciliation.md](no_crop_round3_sizing_source_reconciliation.md)
  (sibling Round 3 decision on sizing source reconciliation).
