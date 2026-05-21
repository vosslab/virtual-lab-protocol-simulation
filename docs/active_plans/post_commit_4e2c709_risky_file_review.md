# Post-Commit 4e2c709 Risky File Review

Date: 2026-05-21
Status: DONE_WITH_CONCERNS
Files reviewed: 7
User-decision count: 3
Recommended-action count: 6
Blocker: tests/data/scenes_freeze_baseline.json is modified in working tree but not committed. Freeze gate test will report a violation for src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts on every CI run until resolved.

## Item 1: src/scene_runtime/layout/css_native_adapter.ts

Verdict: PRESERVE

File correctly labeled spike code, well-isolated behind feature flag gate in adapter.ts line 48, uses correct types throughout, carries explicit "do NOT extend with" comment block (lines 162-168) - unusually strong anti-drift guard. No any casts. Snake_case throughout matches docs/TYPESCRIPT_STYLE.md.

Test coverage: tests/playwright/spike_css_native_well_plate_zoom.mjs exercises this path when flag enabled. increment_css_native_invocation_count() call at line 208 provides measurable trip-wire. No unit-level .mjs or .ts test covers compute_scene_layout_css_native directly; all coverage requires live DOM.

Remaining risk:
- SVG viewBox shim (lines 167-176) uses hardcoded constants (svg_x_min=1, svg_x_max=99, svg_y_min=5, svg_y_max=95) not derived from scene YAML or shared constant. Different production viewport bounds = silently wrong coordinates. Comment says "NOT a layout engine" but math IS coordinate arithmetic.
- Scaffold attaches to document.body (line 128), removes after measurement (line 201). If exception fires between attach and remove, DOM permanently polluted. Repo style avoids try/except; alternative is deferred cleanup call.
- Function only gated from callers by sceneId check in adapter.ts. Nothing in type system prevents direct call without flag check.

Recommended next action: Document DOM leak risk as known limitation in file comment. Extract hardcoded SVG shim constants to named constants with comment tracing origin.

## Item 2: src/scene_runtime/layout/feature_flags.ts

Verdict: PRESERVE

Minimal, self-documenting. Spike-only warning at lines 8-10 accurate. Default false (compile-time constant, line 14). Test-only override API correctly named. Invocation counter is lightweight Playwright observable.

Test coverage: no dedicated unit test. Exercised indirectly through adapter.ts in Playwright spike runs. reset_css_native_invocation_count() has no test confirming it zeroes counter.

Remaining risk:
- Module-level mutable state (css_native_well_plate_zoom_spike_override, css_native_invocation_count) shared across module instance. Test forgetting reset pollutes subsequent tests. Documented but not enforced.
- CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE_DEFAULT not exported; tests cannot assert on its value.
- "Spike-only API. Must be removed" comment at line 9 carries no enforcement; nothing prevents leaving file permanently after stalled promotion.

Recommended next action: No immediate action. When NEW1 promotion decided, this file should be first deletion or replacement with proper feature-flag system.

## Item 3: src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts

Verdict: PRESERVE with concern

Scene adapter deliberately minimal: two no-op functions + registerScene call. Correctly delegates all rendering to layout engine. File header lines 1-3 clearly marks as spike code to be removed.

S6 finding: SceneAdapter object literal not typed. Lines 47-51 define well_plate_96_zoom_adapter as object literal without declared type annotation. Comment line 46 names required interface (SceneAdapter) but no `: SceneAdapter` annotation on const. TypeScript structural inference catches mismatch only at registerScene() call site, not at object literal. Per docs/TYPESCRIPT_STYLE.md, annotation improves clarity and reduces drift risk.

Test coverage: registeredEmitters.add('zoom_complete') side effect at line 20 fires on import. Freeze test counts this file at 57 lines. No unit test covers adapter itself; only Playwright spike script exercises it at runtime.

Remaining risk:
- File lives in src/scenes/ under legacy freeze gate (docs/SRC_SCENES_FREEZE.md). Freeze test (line 174 of test_scenes_freeze_baseline.py) treats new files lacking baseline entry as violations with baseline=0. Working-tree baseline update not committed. Test CURRENTLY FAILING in working tree (see Item 6).
- File NOT imported by src/init.ts (confirmed). Spike scene not registered at production build time. Correct, but module-load side-effect warning (lines 13-19) describes hazard currently dormant only because import absent. Future author adding init.ts import could activate production behavior unintentionally.
- Missing `: SceneAdapter` annotation (S6 finding above).

Recommended next action: Add `: SceneAdapter` annotation to well_plate_96_zoom_adapter. Add explicit "NOT imported from src/init.ts -- do not add there without user approval" note to file comment.

## Item 4: src/style.css

Verdict: PRESERVE pending visual verification

Specific concern: overflow: hidden on .scene-mode--detail svg (lines 257-263).

```css
.scene-container.scene-mode--detail svg {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    overflow: hidden;    /* <-- concern */
}
```

overflow: hidden on SVG element clips SVG's own rendering area. If scientific asset's viewBox extends beyond rendered box (common for tall glassware - volumetric flasks, pipettes), content outside computed box is clipped. PRIMARY_DESIGN.md explicitly lists overflow: hidden as forbidden anti-pattern ("Remove parent overflow: hidden where it clips assets") and names visible cropping as HARD FAIL regardless of other score metrics. Prohibition targets parent elements but mechanism is identical when applied to SVG itself.

Test coverage: no automated artwork_integrity check fires for .scene-mode--detail. Playwright precheck scripts in experiments/css_native_layout/ measure bounding boxes only under spike experimental CSS, not under src/style.css as served from production build.

Visual verification command:
```bash
bash experiments/css_native_layout/run_built_app_precheck.sh
```
Inspect screenshots for pipette tips, bottle necks, flask bottoms in any scene using scene-mode--detail. Document result before any production scene adopts this modifier class.

Remaining risk: Until visual verification documented, this rule is contract-violation risk. Class name is generic; other scenes may adopt it.

USER DECISION NEEDED (Decision 1):
- Option A: Remove overflow: hidden from .scene-container.scene-mode--detail svg and replace with overflow: visible.
- Option B: Run visual verification on every scene receiving scene-mode--detail, confirm no clipping, document evidence before any production scene uses this modifier class.

## Item 5: docs/active_plans/new1_primary_contract_item3_amendment_draft.md

Verdict: PRESERVE as draft

File correctly labeled "Draft. Not applied." at line 5. Accurately quotes current contract item 3 verbatim. Both candidate amendments well-structured with explicit diffs, rationale, risk trade-offs. Manual check confirms docs/PRIMARY_CONTRACT.md still contains original item 3 text; neither version applied.

Version A summary: Names both absolute-coordinate solver and CSS-native semantic-region renderer as "conforming implementations of the layout engine." Treats solver choice as per-scene implementation decision. Lower adoption barrier; higher risk of silent renderer divergence becoming production default before proven.

Version B summary: Preserves current contract wording unchanged. Adds one paragraph marking CSS-native renderer as experimental until passes six documented promotion gates. Maintains single canonical positioning result for all production scenes. Stronger gate; Version B forces second explicit decision before any CSS-native scene ships to production.

Test coverage: not testable. Documentation only.

Remaining risk: Future workstream may skim file header and treat as pre-approved. "Draft. Not applied." marker at line 5 mitigates but does not fully prevent in agentic workflow.

USER DECISION NEEDED (Decision 2): Choose Version A, Version B, or reject both before any workstream references this file as authorization for contract change.

Recommended next action: Add prominent "DECISION PENDING: DO NOT TREAT AS APPROVED" banner at very top of line 1 to reduce agent-skim risk. Once user decides, move chosen wording into docs/PRIMARY_CONTRACT.md (user-approved only) and archive or delete draft.

## Item 6: tests/data/scenes_freeze_baseline.json update

Verdict: REVISE (commit the update OR revert it)

THIS IS THE CURRENT BLOCKER. git status shows tests/data/scenes_freeze_baseline.json as " M" (modified in working tree, not staged). Committed HEAD baseline (from commit 81ee89e3, original seeding commit) contains 29 entries and does NOT include well_plate_96_zoom.ts. Working-tree file contains 30 entries, adding:

```json
"src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts": 57
```

Freeze test logic (line 174 of tests/test_scenes_freeze_baseline.py) treats any src/scenes/ TS file absent from baseline as freeze violation with baseline=0, which exceeds 0 + DRIFT_ALLOWANCE_LINES (2) for 57-line file. Every run of `pytest tests/test_scenes_freeze_baseline.py` fails until resolved.

Is baseline update semantically appropriate? Conditionally. Mechanically correct (file exists, 57 lines). Semantically depends on whether spike file belongs in src/scenes/ at all. Freeze gate (from test comment lines 3-12): "src/scenes/ is legacy reference and emergency-compatibility only. No new behavior, no new dispatch branches, no new feature logic. Only allowed edits are mechanical renames, type-union updates, the legacy banner header, and small COMPAT SHIM blocks." A new spike adapter registering new scene ID and adding new emitter does NOT fit any of those exceptions.

USER DECISION NEEDED (Decision 3):
- Option A: Accept spike file in src/scenes/ and commit tests/data/scenes_freeze_baseline.json immediately. Current trajectory; unblocks CI but sets precedent for new non-emergency files entering freeze zone.
- Option B: Move src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts to experiments/ or tests/ until NEW1 spike promoted, and revert working-tree baseline modification.

Either way, do not leave working-tree modification uncommitted.

## Item 7: Force-added HTML/YAML files via .gitignore negations

Verdict: PRESERVE

Files force-added by new !-negations in commit 4e2c709:
- experiments/css_native_layout/spike_fixtures/*.yaml + *.md
- experiments/css_native_layout/spike_paths/*/*.md + *.json
- experiments/css_native_layout/stress_generators/*.py
- experiments/css_native_layout/stress_results/*.md
- experiments/css_native_layout/scene_class_manifest.yaml, LAYOUT_SCORECARD.md, VISUAL_TARGETS.md, PRECHECK_USAGE.md, DIAGNOSTICS_REFERENCE.md
- experiments/css_native_layout/run_precheck.sh, run_built_app_precheck.sh

All files under experiments/css_native_layout/ - not production source, tests, or configuration.

Were negations appropriate? Yes. Top-level rule experiments/css_native_layout/* ignores everything under that path; negation is only mechanism to track selected evidence and tooling. Negated files are documents, YAML fixtures, assessment JSON, Python generators. Negation pattern style matches patterns already present for scenes/ and templates/ subtrees.

Remaining risk: stress_generators/*.py scripts outside scope of tests/test_pyflakes_code_lint.py. Future modifications could introduce Python syntax errors without CI catching. Minor risk given experiment context.

Recommended next action: No immediate action. If stress generators grow substantially, add them to pyflakes scope.

## Cross-cutting concerns

### Spike scaffolding in production tree
3 TS files together form spike scaffolding in src/ (production tree). Deliberate: they import from src/scene_runtime/types and src/scenes/scene_registry, not available in experiments/. Safe only while all 3 conditions hold:
1. Feature flag default false - confirmed: CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE_DEFAULT = false in feature_flags.ts line 14.
2. Spike file NOT imported by src/init.ts - confirmed: no well_plate_96_zoom import found.
3. Freeze gate baseline includes new file - NOT met: baseline update uncommitted (Item 6 blocker).

### Feature flag enforcement gap
Flag check exists in exactly one place: adapter.ts line 48. No type-level barrier prevents calling compute_scene_layout_css_native directly from another caller. No ESLint rule restricts importing css_native_adapter.ts. Enforcement is by convention only. Future workstream adding second caller without flag check activates CSS-native adapter unconditionally for that scene.

### Contract amendment draft status confirmed
Manual check of docs/PRIMARY_CONTRACT.md confirms: original contract item 3 text present. Neither Version A nor Version B wording applied. Draft risk is prospective only.

## Summary table

| File | Verdict | Risk | User decision |
| --- | --- | --- | --- |
| src/scene_runtime/layout/css_native_adapter.ts | PRESERVE | Medium: hardcoded SVG shim; scaffold DOM leak on exception; no direct unit test | No |
| src/scene_runtime/layout/feature_flags.ts | PRESERVE | Low: mutable module state can pollute tests; no removal enforcement | No |
| src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts | PRESERVE with concern | Medium: freeze gate BLOCKER (Item 6); missing : SceneAdapter annotation; not imported from src/init.ts | No (gated by Item 6) |
| src/style.css | PRESERVE pending verification | High: overflow: hidden on .scene-mode--detail svg risks PRIMARY_DESIGN HARD FAIL crop violation | YES - Decision 1 |
| docs/active_plans/new1_primary_contract_item3_amendment_draft.md | PRESERVE as draft | Low: agent-skim risk treats draft as pre-approved | YES - Decision 2 |
| tests/data/scenes_freeze_baseline.json update | REVISE (commit or revert) | BLOCKER: uncommitted update causes freeze test failure on every CI run | YES - Decision 3 |
| Force-added HTML/YAML (gitignore negations) | PRESERVE | Low: stress generator Python outside pyflakes scope | No |

## Handoff

Status: DONE_WITH_CONCERNS
Files reviewed: 7
User-decision count: 3
- Decision 1: src/style.css overflow: hidden on .scene-mode--detail svg - remove or verify visually
- Decision 2: Contract amendment Version A / Version B / reject both
- Decision 3: tests/data/scenes_freeze_baseline.json - commit working-tree update (Option A) or move spike TS file and revert (Option B)
Recommended-action count: 6
Blocker: tests/data/scenes_freeze_baseline.json modified in working tree (" M" status, not staged). Freeze gate test (tests/test_scenes_freeze_baseline.py::test_scenes_freeze_baseline_holds) reports violation for src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts (57 lines, baseline=0, over_by=55) on every CI run until resolved. Resolve via Decision 3.
