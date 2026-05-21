# NEW0: CSS Native Layout (Clean-Room Prototype)

## Status: EXPERIMENTAL - not contract-compliant

NEW0 is an experiment under `experiments/` (gitignored scratch). It is **not** a candidate for promotion to production at this time.

[docs/PRIMARY_CONTRACT.md](../../docs/PRIMARY_CONTRACT.md) item 3 vests scene-object layout in the layout engine. NEW0 proposes to replace that engine. The contract has not been amended. Promotion requires either (a) an approved contract amendment scoping the new layout system, or (b) explicit user decision to rescope NEW0.

Until then, every artifact under this folder is exploratory. Verdicts, screenshots, audits, and CSS variants are evidence for a future decision, not commitments.

See `docs/active_plans/new0_outside_review_handoff.md` for the outside-review concerns this status note responds to.

See plan: [../../docs/active_plans/new1_css_native_layout_integration_plan.md](../../docs/active_plans/new1_css_native_layout_integration_plan.md).

## Operational entry points

- [PRECHECK_USAGE.md](PRECHECK_USAGE.md) - one-command precheck run, troubleshooting, verdict ladder.
- [run_precheck.sh](run_precheck.sh) - thin wrapper script for the precheck runner.
- [spike_fixtures/](spike_fixtures/) - pinned DOM contract, manifest, expected precheck command, expected screenshot paths for the NEW1 well_plate_96_zoom integration spike.

## Overview

NEW0 is a clean-room rebuild of the scene layout system from first principles.

**Core principle:** Semantic regions own placement. CSS owns spacing within each region only.

## Architecture constraints

- **No imports from `src/`**: NEW0 is self-contained. The old layout manager (`src/scene_runtime/layout/layout_engine.ts`, 932 lines) is treated as a failed architecture and remains unmodified during NEW0 development.
- **Region semantics**: Clickable objects are placed into named semantic regions (e.g., `hood`, `benchtop`, `waste`). Each region's position and size on screen are fixed. Objects cannot migrate across regions.
- **CSS for spacing**: CSS owns all spacing, alignment, and stacking within a region. Pixel math lives in the region definition only, not scattered through object-placement code.
- **Overflow is a test failure**: If an object does not fit in its region, the protocol or scene definition is wrong, not the layout. Fix the region size, the object count, or the scene assignment.

## Historical reference

This folder is a fresh start. Earlier experiments (EXP1, EXP2, EXP3, row+slot rollout, sdspage plan, and archived layout plans) are historical evidence of what was tried. They are not imported, reused, or continued here.

See plan reference: `/Users/vosslab/.claude/plans/serene-stargazing-moore.md` for milestones M0 through M5.

## Development

All code must follow `docs/PYTHON_STYLE.md`, `docs/TYPESCRIPT_STYLE.md`, and `docs/REPO_STYLE.md`. No `src/` imports at any point.
