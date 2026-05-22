# No-Cropped SVG Phase 1 Diagnostic Proposal (D1 + D2)

Date: 2026-05-21
Status: PROPOSAL - awaits user approval
Authority: Adds HARD_FAIL categories to artwork_integrity in precheck.mjs. Per repo policy, diagnostic semantic change requires user approval.

## Context

Workstream A (no_cropped_svg_screenshot_audit.md) flagged 52 visible crop failures.
Workstream C (no_cropped_svg_diagnostic_gap_audit.md) showed precheck catches ~20/52 in AFTER state. Two root causes account for ~30-38 misses:

- RC1: overflow:visible region spillage (~10-14 misses)
- RC2: PLACEHOLDER asset loading failures (~20-24 misses)

This proposal adds two HARD_FAIL categories addressing those root causes.

## D1: overflow:visible spillage detection

### What it does

New sub-check g in checkArtworkIntegrity.
Computes SVG img bbox vs region container boundary (via el.closest('.region')).
Flags HARD_FAIL when img bbox extends beyond region in any direction, regardless of CSS overflow value.

### Code sketch (NOT applied; for user review)

Note for implementer: use parameter name `el` not `img` to match existing sub-check e convention at precheck.mjs lines 534-610.

```javascript
// In checkArtworkIntegrity, after sub-check f (around line 660)
const spillResult = await artworkElem.evaluate((el, tolerancePx) => {
  const imgRect = el.getBoundingClientRect();
  if (imgRect.width === 0 || imgRect.height === 0) return null;
  const region = el.closest(".region");
  if (!region) return null;
  const regionRect = region.getBoundingClientRect();
  const spillTop = Math.max(0, regionRect.top - imgRect.top);
  const spillBottom = Math.max(0, imgRect.bottom - regionRect.bottom);
  const spillLeft = Math.max(0, regionRect.left - imgRect.left);
  const spillRight = Math.max(0, imgRect.right - regionRect.right);
  const totalSpill = spillTop + spillBottom + spillLeft + spillRight;
  if (totalSpill < tolerancePx) return null;
  return {
    is_overflow_visible_spillage: true,
    spill_top: spillTop,
    spill_bottom: spillBottom,
    spill_left: spillLeft,
    spill_right: spillRight,
    total_spill: totalSpill,
    region_class: region.className,
    severity: "HARD_FAIL",
  };
}, CLIP_TOLERANCE_PX);
```

Add to checks output: spillage_detected array. Append to hardFails at precheck.mjs lines 1083-1099 (existing pattern matches integrityClippedByParent / integrityAspectHardFails).

### Expected behavior

- Catches ~10-14 of 52 A-audit failures (overflow:visible rear_shelf + front_tools spillage)
- Excludes popup_layer per existing checkRegionOverflow pattern
- False-positive risk: low (legitimate overflow uses explicit overflow:hidden parents)
- Performance: 1 getBoundingClientRect + closest() per placement; negligible

### Risks

- Existing scenes with legitimate visual overflow (decorative bleed) would newly fail. Need exclusion list or audit before adoption.
- Sub-check e already catches placement-card clipping; D1 covers a different layer. No overlap with current sub-check e behavior.

## D2: PLACEHOLDER asset detection

### What it does

New HARD_FAIL branch inserted into existing naturalDims read in checkArtworkIntegrity.
Flags when img element has naturalWidth === 0 AND naturalHeight === 0 (broken/missing src).

### Code sketch (NOT applied; for user review)

Note for implementer: the existing code at precheck.mjs lines 352-359 already reads naturalDims using `img.naturalWidth || img.width` with fallback. Insert the HARD_FAIL branch immediately AFTER that existing read, do not add a second evaluate call.

```javascript
// AFTER existing naturalDims read at precheck.mjs lines 352-359
// Existing code reads: { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
// Insert this branch before the existing skip:

if (naturalDims.width === 0 && naturalDims.height === 0) {
    placeholderAssets.push({
        placeholder_detected: true,
        src: naturalDims.src,
        severity: 'HARD_FAIL',
        placement_name: placement.name
    });
    continue; // skip remaining sub-checks for 0-dimension images
}
```

The `continue` statement is correct here - it makes the previously-silent skip explicit and skips sub-checks a/e/f for broken images.

Add to checks output: placeholder_assets array. Append to hardFails.

### Expected behavior

- Catches ~20-24 of 52 A-audit failures (PLACEHOLDER scenes)
- False-positive risk: near zero (naturalWidth === 0 means broken image load in all browsers; no legitimate scenario)
- Performance: existing naturalDims read used; no additional cost

### Risks

- Currently passing scenes with PLACEHOLDER objects (~20-24 across corpus) will newly FAIL
- This is the INTENDED behavior per no-crop hard rule (visible PLACEHOLDER is visual quality failure)
- User must accept new failure class before adoption

## Rollout plan

### Phase 1A: D2 first (largest impact, lowest risk)

1. User reviews this proposal
2. User approves D2 only
3. Implementer adds D2 branch to checkArtworkIntegrity (per code sketch + implementer note)
4. Implementer adds placeholder_assets to hardFails array
5. Re-run precheck against Corpus v1 and 10 production templates
6. Report new failure count; user reviews
7. If acceptable, D2 is canonical

### Phase 1B: D1 second (architectural addition)

1. After D2 stabilizes, user approves D1
2. Implementer adds sub-check g (per code sketch + implementer note)
3. Re-run, report, accept

### Phase 2 / 3 separate proposals

- D3 (real viewBox in manifest) - separate doc
- D4 (template-mode exception) - separate doc
- D5 (minimum rendered area per kind) - separate doc

## Expected catch rate improvement

| State                            | Caught | Total visible failures | Catch rate |
| -------------------------------- | ------ | ---------------------- | ---------- |
| Current AFTER (sub-check e + f)  | 20     | 52                     | 38%        |
| + D2 PLACEHOLDER (Phase 1A)      | ~40-44 | 52                     | ~77-85%    |
| + D1 overflow:visible (Phase 1B) | ~50-54 | 52                     | ~96-104%   |

Note: >100% indicates same object flagged by multiple sub-checks; not double-counted in summary.

## User-decision points

1. Approve Phase 1A (D2 only)? Recommended yes; near-zero false positive risk.
2. Approve Phase 1B (D1 added)? Recommended yes once Phase 1A stabilizes.
3. Existing scenes that newly fail: triage as legitimate bugs OR add exclusion patterns. Latter only by user approval.

## Implementer notes (for when user approves)

### D1 implementation

- Use `(el, tolerancePx)` parameter naming, NOT `(img, tolerancePx)`, to match existing sub-check e convention at precheck.mjs lines 534-610.
- Insert AFTER sub-check f, before final return.
- CLIP_TOLERANCE_PX constant already defined at precheck.mjs line 294. Reuse.
- popup_layer exclusion pattern from existing checkRegionOverflow.
- Append to hardFails array using existing pattern (see integrityClippedByParent at lines 1086-1096).

### D2 implementation

- DO NOT add a second imgElem.evaluate call.
- Reuse the existing naturalDims read at precheck.mjs lines 352-359 (`img.naturalWidth || img.width` with fallback).
- Insert HARD_FAIL branch immediately AFTER that read, before existing skip.
- The `continue` statement makes the previously-silent skip explicit; this is correct behavior.
- Append placeholder_assets to hardFails.

## Cross-references

- docs/active_plans/no_cropped_svg_diagnostic_gap_audit.md (Workstream C; D1+D2 detailed analysis)
- docs/active_plans/no_cropped_svg_screenshot_audit.md (Workstream A; 52 visible failures)
- docs/active_plans/no_cropped_svg_repair_summary.md (Workstream G; repair round close)
- docs/PRIMARY_DESIGN.md (no-crop hard rule)
- docs/specs/SVG_PIPELINE.md (SVG-pipeline-side rule)
- experiments/css_native_layout/precheck.mjs (target file; lines noted in code sketches)

## Handoff

Status: DONE (proposal complete)
Phase 1A expected catch gain: +20 to +24 of 52 (D2 PLACEHOLDER; ~77-85% total catch rate)
Phase 1B expected catch gain: +10 to +14 of 52 (D1 overflow:visible; ~96-104% total catch rate)
User-decision count: 3
Implementer corrections: 2 (D1 parameter naming `el` not `img`; D2 reuse existing naturalDims read not add second evaluate)
Blocker: User approval required before implementation. No code changes attempted.
