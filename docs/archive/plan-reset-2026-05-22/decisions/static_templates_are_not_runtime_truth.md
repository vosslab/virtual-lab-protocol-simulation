# Static templates are not runtime truth

Round 3 pivot decision note. Demotes static-template precheck signals from
production-quality evidence to visual-experiment status.

## Decision

- Static-template no-crop failures are not production runtime failures unless reproduced in runtime.
- Static templates can be used for visual experiments only.
- Runtime screenshots are authoritative for production quality.
- Static templates need regeneration or retirement if they keep diverging.

## Context

- A1 runtime truth audit recorded 0 runtime crops across the audited surface
  (see [round3_runtime_truth_audit.md](../reports/round3_runtime_truth_audit.md)).
- C1 static-template audit found static templates hardcode CSS classes that
  bypass the runtime sizing path (see
  [round3_static_template_hardcoding_audit.md](../reports/round3_static_template_hardcoding_audit.md)).
- C3 render-path matrix rates runtime as HIGH trust and static as MEDIUM
  trust (see [round3_render_path_matrix.md](../reports/round3_render_path_matrix.md)).
- A3 baseline reframing already established that layout-manager parity is a
  runtime question (see [layout_manager_baseline_reframing.md](layout_manager_baseline_reframing.md)).

Static templates and the runtime renderer share assets but not sizing logic.
Static templates therefore drift independently from runtime and cannot stand
in for runtime evidence.

## Consequences

- Future no-crop claims must show runtime screenshots, not precheck JSON only.
- Precheck JSON usable for static-template regression but cannot be cited as runtime evidence.
- Batch D candidates derived from static precheck are NOT measurable against runtime until A2 (held) shows correlation, if any.
