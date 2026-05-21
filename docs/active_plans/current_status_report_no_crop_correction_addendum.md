# Status Report No-Crop Correction Addendum

Date: 2026-05-21
Status: Addendum to docs/active_plans/current_css_native_layout_manager_status_report.md and companion PDF

## Why this addendum exists

User review of the corrected status report PDF found visible cropped SVG assets in multiple screenshots, including pages 10, 11, 24, and 26. The report states scenes have 0 hard fails but the screenshots themselves do NOT support "no cropped SVG" as a visual claim.

The no-crop hard rule is now the priority over scorecard polish, reports, and broader Batch 6 work. This addendum records what the current status report overstates and what is being repaired.

## Core framing

0 hard fails is not sufficient visual proof.

The hard rule: visible scientific SVG cropping is NOT acceptable, regardless of whether a current advisory metric flags it as HARD_FAIL. If a human reviewer sees a cropped bottle, flask, or pipette in a screenshot, the scene fails the visual rule.

Possible explanations for the gap:
1. Diagnostic does not yet catch all visible crops (clipped_by_parent + aspect_distorted_HF cover most, but specific failure modes may slip)
2. Diagnostic is correct but screenshot rendering itself reveals an issue the metric measures correctly but the score weight does not penalize sufficiently
3. Static stress harness uses hardcoded footprint mapping (render_stress_to_html.py:27-44) divergent from production runtime, so same scene renders differently in production vs harness

## Suspicious screenshots in the current report

Per user review:
- Page 10: electrophoresis or instrument-heavy scene example
- Page 11: dense workspace example
- Page 24: best/worst examples gallery (figure 6 or 7)
- Page 26: worst examples gallery continuation

Specific objects most likely showing visible crop:
- Volumetric flasks (bottoms cropped against card boundary)
- Tall narrow bottles (cropped tops or bottoms)
- Pipettes (extreme aspect ratio - tips cropped against cards too wide)
- Electrophoresis tank (large landscape in cards biased portrait)
- Power supply (square asset in landscape-biased large-equipment card)

These suspicions are catalogued by the no-crop repair round and confirmed via Workstream A (screenshot audit) + Workstream E (asset sizing table).

## Claims in the report to soften until repairs land

### Section 4 (What works now) - "no-crop rule enforcement"
Current wording implies the rule is enforced everywhere. Soften to: "no-crop hard rule is documented and partially enforced via precheck artwork_integrity sub-checks; visible cropping audit (in progress) may surface diagnostic gaps."

### Section 7 (No-crop hard rule)
Phase 1 hardFailCount proposal is correctly tagged PROPOSAL. Add: "Visible cropping detected by human review still possible while scorecard reports 0 hard fails. Diagnostic semantic alignment proposal pending user approval."

### Section 15 (Best Examples Gallery)
Captions imply pedagogy-quality renderings. Replace any claim of "no cropping" with "no hard-fail per current advisory metrics; visible review pending."

### Section 16 (Worst Examples Gallery)
Captions currently identify visible problems honestly. No softening needed.

### Section 19 (Evidence Table)
Entry "no-crop diagnostics work" should clarify: "no-crop diagnostics catch most cases under current metric definition; gap audit in progress."

### Section 22 (Verdict)
"Production promotion remains blocked by contract and visual-polish decisions" already candid. No softening needed.

## What the repair round is doing

Workstream A: catalogue suspicious screenshots from current report + galleries. Per-object: scene, issue type, precheck-caught Y/N, cause, fix class.

Workstream B: re-render 10 production templates + 10 gold scenes at 1920x1080. Crop-focused contact sheets.

Workstream C: diagnostic gap audit. Which visible crops are missed by precheck? Root cause: parent overflow / card sizing / viewBox / object-fit / max-height / scale. Proposal-only if requires diagnostic semantic change.

Workstream D: bounded CSS-only fix trials against the most common crop causes. Per trial: before/after screenshot + precheck + scorecard + keep/reject.

Workstream E: per-asset sizing table. Natural viewBox vs rendered size vs card size vs recommended minimum.

Workstream F: this addendum.

Workstream G: final summary after A-F land.

## Hold pattern for the status report

Do not update the full status report (HTML + MD + PDF) until repair round closes.

When repair round closes (Workstream G):
1. Update section 7 (no-crop hard rule) to reflect what is now actually working
2. Replace worst-cropped screenshots in galleries with after-repair versions
3. Update evidence table entries for no-crop and visual quality claims
4. Regenerate HTML + PDF

## Cross-references

- docs/active_plans/current_css_native_layout_manager_status_report.md (the report being corrected)
- docs/active_plans/no_cropped_svg_screenshot_audit.md (Workstream A, forthcoming)
- test-results/no_cropped_svg/current_render_crop_audit/INDEX.html (Workstream B, forthcoming)
- docs/active_plans/no_cropped_svg_diagnostic_gap_audit.md (Workstream C, forthcoming)
- experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials.md (Workstream D, forthcoming)
- docs/active_plans/no_cropped_svg_asset_sizing_table.md (Workstream E, forthcoming)
- docs/active_plans/no_cropped_svg_repair_summary.md (Workstream G, forthcoming)
- docs/PRIMARY_DESIGN.md (no-crop hard rule canonical source)
- docs/specs/SVG_PIPELINE.md (SVG-pipeline-side rule)
- docs/specs/LAYOUT_ENGINE.md (layout-engine-side rule)

## Handoff

Status: DONE
Purpose: short addendum, not full report rewrite.
Cross-references list: 9
Suspicious pages flagged: 10, 11, 24, 26 (per user)
Claims to soften: 5 sections
Repair workstreams: 7 (A-G)
