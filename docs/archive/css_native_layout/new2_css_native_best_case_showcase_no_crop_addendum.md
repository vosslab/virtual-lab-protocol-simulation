# NEW2 CSS-native best-case showcase: no-crop addendum

Addendum to `new2_css_native_best_case_showcase.md` (sibling, on disk but untracked).

This addendum exists because the existing best-case showcase report did NOT
enforce the "NEVER crop SVG assets in display" hard rule. Several scenes in
the showcase were accepted with visible SVG cropping (cut-off glassware
bottoms, clipped pipette tips, hidden instrument edges) because the
`hard_fail_count = 0` precheck did not catch parent-overflow clipping of
artwork.

This addendum re-asserts the hard rule against the showcase set.

## Acknowledgment

The existing showcase report
(`new2_css_native_best_case_showcase.md` (sibling, on disk but untracked))
did NOT enforce the no-crop rule. Any "PASS" or high score recorded in that
report is not, by itself, evidence that the scene meets the no-crop hard
rule. Re-review under the rule below is required before any showcase scene
is promoted as a production exemplar.

## Hard rule: NEVER crop SVG assets in display

A scene cannot pass visual review if any scientific SVG asset is cropped or
aspect-distorted enough to change what the object is.

This rule applies even if precheck reports `hard_fail_count = 0`. Visible
cropping or distortion is a visual failure regardless of bbox-level checks.

Forbidden in any rendered scene:

- Cropped bottoms of volumetric flasks
- Cropped bottle necks or caps
- Clipped pipette tips
- Hidden instrument edges
- Object artwork cut off by cards, regions, wrappers, `overflow: hidden`, or
  `.object-graphic` containers
- Squashing or stretching that changes the intended asset aspect ratio

Diagnostic requirement:

The `artwork_integrity` check must:

- Compare the rendered `.object-graphic` or `img`/`svg` bbox against its
  parent placement card.
- Flag if the asset is clipped by parent `overflow`.
- Flag if rendered aspect ratio deviates from expected asset aspect ratio
  beyond a small tolerance (default: 5%).
- Treat visible clipping as a HARD FAIL.
- Treat mild aspect distortion as advisory at first; escalate to hard fail
  for lab glassware, pipettes, plates, and instruments.

Fix direction (not a substitute for the rule):

- Use `object-fit: contain`, never `cover`.
- Preserve SVG `preserveAspectRatio="xMidYMid meet"` (default).
- Remove parent `overflow: hidden` where it clips assets.
- Size cards around assets, not assets into too-small cards.
- Add `min-height` / `min-width` for tall glassware cards.

Anti-patterns (forbidden):

- Do NOT "fix" cropping by hiding cropped assets, deleting DOM, or weakening
  diagnostics.
- Do NOT accept a high score if the asset is visibly cropped.
- Do NOT claim visual success while glassware bottoms are cut off.

## AUDIT-NOCROP findings

The AUDIT-NOCROP pass enumerates, per showcase scene, every placement whose
rendered artwork is clipped by parent overflow or whose aspect ratio
deviates beyond tolerance. Findings will be appended here when the audit
lands on disk.

Pointer (forward reference, not yet on disk): `AUDIT-NOCROP findings`. This
section will be populated with a per-scene table once the audit runner
emits its report. Until then, no scene in the existing showcase may be
promoted as a no-crop exemplar.

## Cross-references

- `new2_css_native_best_case_showcase.md` (sibling, on disk but untracked)
- [new2_css_native_production_blocker_plan.md](new2_css_native_production_blocker_plan.md)
- [../../experiments/css_native_layout/VISUAL_TARGETS.md](../../experiments/css_native_layout/VISUAL_TARGETS.md)
- [../../experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md](../../experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md)
