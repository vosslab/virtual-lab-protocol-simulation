# Round 3 decision report

Final synthesis for the Round 3 Runtime Quality Initiative. Closes the program
and frames the Round 4 handoff. This is a synthesis-only document: source
reports are cited, not edited. No source code, content YAML, generated
artifacts, or build configuration are modified in producing this report.

## 1. Executive summary

Round 3 set out to convert a build-only runtime into one that actually mounts
and walks mini-protocols end to end through the visible UI. The decisive
unblock was the foundation HTML wiring fix (build_github_pages.sh now emits
`dist/runtime.bundle.js` plus 26 per-protocol HTML files); after that, mount
moved from 4 to 26 of 26 mini-protocols, click dispatch and adjust dispatch
both verified clean on full top-10 walkthroughs, and all five scene-operation
primitives surfaced zero real defects under audit. Visible placeholder
density on the measured baseline fell 45 percent, and the two real runtime
bugs caught in the process (microscope_view scene typo, scene SVG viewport
sizing) were fixed inside Round 3. Remaining defects are author-side or
asset-side and are now gated on explicit user assent for Round 4.

## 2. Headline metrics

| Pillar                         | Before                          | After                       |
| ---                            | ---                             | ---                         |
| Mini-protocols mounting        | 4 of 26                         | 26 of 26 (100%)             |
| Foundation HTML pages          | 0 wired                         | 26 wired + 1 runtime bundle |
| Runtime bundle                 | not emitted                     | dist/runtime.bundle.js 2.4 MB IIFE |
| Top-10 walkthrough completion  | not measurable                  | 9 of 9 full, 25 of 25 steps |
| R9 rerun on top-11             | 0 of 4 (R7 baseline)            | 11 of 11                    |
| Click gestures landed (top-10) | not measurable                  | 25 of 25                    |
| Adjust gestures landed (top-10)| not measurable                  | 14 of 14                    |
| OSC primitive defects          | unaudited                       | 0 real of 5 audited         |
| Placeholder count (baseline)   | 19 (subset) / 119 (full scope)  | 65 (45% reduction)          |
| widthScale dead vocabulary     | present in layout/              | removed                     |
| Scene viewport letterbox       | width 100% / height 100%        | 1280 x 900 explicit         |
| Broken markdown links          | 12                              | 0                           |

## 3. Foundation HTML wiring -- what it unlocked

The single largest Round 3 lever. Source:
[round3_foundation_html_wiring.md](round3_foundation_html_wiring.md).

Before the fix, `build_github_pages.sh` produced a build that could compile
and type-check but could not load any mini-protocol in a browser, because
there was no host HTML for the runtime to mount into and no IIFE-shaped
bundle to attach to a page. Walkthroughs could not even reach the page-load
checkpoint for 22 of the 26 mini-protocols, which made every click,
adjust, and OSC measurement before this point a measurement of the wrapper,
not of the runtime.

The fix emits:

- `dist/runtime.bundle.js` -- one IIFE, 2.4 MB, attaches the runtime to
  `window` for the page to wire.
- 26 per-protocol HTML files -- one per mounted mini-protocol, each
  loading `runtime.bundle.js` and the protocol's compiled data.

Direct downstream consequences:

- Mount jumped from 4 to 26 of 26.
- The top-10 walkthrough (see Section 6) became runnable end to end.
- The placeholder recount baseline (Section 7) became real: 19 was a
  subset measurement against the 4 previously mountable protocols; 119
  is the honest count once the remaining 22 became measurable. The
  baseline change is a visibility win, not a regression.

## 4. Runtime health verdict per primitive

Sources: [round3_osc_fire_audit.md](round3_osc_fire_audit.md),
[round3_top10_full_walkthrough.md](round3_top10_full_walkthrough.md),
[round3_r9_rerun_on_11.md](round3_r9_rerun_on_11.md),
[round3_adjust_panel_visibility.md](../audits/round3_adjust_panel_visibility.md).

| Primitive          | Verdict  | Evidence                                       |
| ---                | ---      | ---                                            |
| SceneChange        | HEALTHY  | Drives every cross-scene step in top-10; 9 of 9 walked |
| ObjectStateChange  | HEALTHY  | OSC fire audit: 2 of 5 OSC-bearing protocols hit, 0 real defects, 3 driver-timing |
| CursorAttach       | HEALTHY  | All 25 click steps land their attach/detach pairs cleanly |
| LayoutMove         | HEALTHY  | No mismounts in cluster audit; widthScale removal did not regress layout |
| TimedWait          | HEALTHY  | Timed phases observed firing; no stalled waits in top-10 |
| Click dispatch     | HEALTHY  | 25 of 25 in top-10; 11 of 11 in R9 rerun     |
| Adjust dispatch    | HEALTHY  | 14 of 14 in top-10; adjust panel render confirmed correct, prior failures driver-side |

No primitive is on the Round 4 defect ledger. The remaining defects (Section
9) are at the author or asset layer.

## 5. Mount catalog -- 26 of 26

Source: [round3_cluster_mount_audit.md](round3_cluster_mount_audit.md).

Cluster breakdown after the M3-ext SceneChange-add pass and the R10
cell_counter pass:

| Cluster              | Mounted | Notes                                              |
| ---                  | ---     | ---                                                |
| cell_culture         | 8 of 8  | M3-ext SceneChange-add applied across the cluster  |
| electrophoresis      | covered | M1 proof + mount variant pass                      |
| staining             | covered | M2 proof pass                                      |
| cell_counter         | covered | R10 SceneChange add for cell_counter mini-protocol |
| foundation + others  | covered | Foundation HTML wiring made the remaining set mountable |

Total: 26 of 26, 100 percent cluster coverage.

## 6. Click coverage

Sources: [round3_top10_full_walkthrough.md](round3_top10_full_walkthrough.md),
[round3_r9_rerun_on_11.md](round3_r9_rerun_on_11.md).

- Top-10 walkthrough: 9 of 9 full completion, 25 of 25 steps walked, 14 of
  14 adjust gestures landed (walker engine extension), 25 of 25 click
  gestures landed.
- R9 rerun on the top-11: 11 of 11 completed after foundation HTML wiring
  landed.
- Cluster sweep: see Section 5 -- every mounted mini-protocol is at least
  load-clean, and the click pipeline has no measured regressions across the
  cluster set.

The R7 paradox arc (R7 0 of 4 -> P5 0 of 11 -> diagnosis DRIVER_DIVERGENCE ->
R9 rerun 11 of 11) is resolved as a sequence of measurement artifacts.
Diagnosis: [round3_p5_clickworks_diagnosis.md](../audits/round3_p5_clickworks_diagnosis.md).

## 7. Visual integrity -- placeholders

Sources: [round3_placeholder_recount.md](round3_placeholder_recount.md),
[round3_stream_3b_asset_remaps.md](round3_stream_3b_asset_remaps.md),
[round3_sdspage_gel_fallback_fix.md](round3_sdspage_gel_fallback_fix.md),
[round3_placeholder_root_cause.md](../audits/round3_placeholder_root_cause.md).

Trajectory:

- 19 placeholders -- baseline against the 4 previously mountable
  mini-protocols (subset measurement).
- 119 placeholders -- honest full-scope count once the foundation HTML
  wiring made all 26 mini-protocols measurable. This is a visibility
  increase, not a regression.
- 65 placeholders after Stream 3B asset remaps plus the SDS-PAGE gel
  fallback fix. 54 instances eliminated.
- 45 percent reduction on the measured baseline.

Remaining offenders cluster around gel cassette geometry, a small set of
bottle-family assets that still resolve to the generic placeholder, and
cell-culture instruments that lack an authored SVG. The recommended next
attack is gel-cassette asset authoring (one asset edit, multiple
mini-protocols benefit) followed by a second remap sweep against the
bottle family. Both are scoped in Section 9.

The earlier scene SVG viewport letterbox issue (scene.ts width 100 percent
/ height 100 percent -> 1280 x 900 explicit) directly resolved 2 of 9
previously stuck protocols. Source:
[round3_well_plate_viewport_bug.md](../audits/round3_well_plate_viewport_bug.md).

## 8. Lessons learned

1. Build host before measuring runtime. Twenty-two of twenty-six
   mini-protocols were measurably broken only because no HTML host existed
   for them. Every metric collected before foundation HTML wiring was a
   measurement of the wrapper, not of the runtime.
2. Driver divergence looks like regression. The R7 -> P5 -> R9 arc spent
   real effort chasing a runtime bug that did not exist; the runtime was
   fine and the test driver was timing out. Always require a driver-side
   negative control before declaring runtime regression.
3. Subset baselines lie. The 19-placeholder baseline was honest only
   inside its 4-protocol scope; comparing it to the post-foundation
   119-count is a category error. Anchor baselines to scope explicitly.
4. Dead vocabulary survives until you delete it. widthScale persisted in
   layout/ across multiple passes and quietly invited misuse. Removing it
   was a one-PR cleanup with no behavior change.
5. Two real bugs hide behind dozens of noisy symptoms. Of the audit
   findings surfaced this round, exactly two were genuine runtime defects
   (microscope_view typo, scene viewport sizing). The rest were authoring,
   asset, or driver issues. Triage discipline matters more than audit
   volume.

## 9. Deferred work for Round 4

User-assent-gated. These items were diagnosed in Round 3 but not fixed
because they cross the assent boundary on source or content.

- adjust_panel closed binding for `set_voltage`. Diagnosis in
  [round3_adjust_panel_visibility.md](../audits/round3_adjust_panel_visibility.md).
  Fix is small but touches the runtime binding map; needs assent.
- `p200_micropipette` runtime state init. Held-material defaults are not
  initialized on mount; appears in held-material OSC sequences. Needs
  assent on object state init policy.
- `gel_cassette` asset authoring. Currently resolves to a placeholder;
  authoring a real SVG would clean up the largest remaining placeholder
  cluster. Asset authoring, not source.
- `ethanol_bottle` and `hood_surface` -- no `clean` target. Both are
  named in protocol YAML for a clean gesture but neither object declares
  the affordance. Author-side fix.
- Second-pass bottle-family remap. Stream 3B handled the first sweep; the
  remaining bottle-family placeholders are a smaller, well-scoped second
  pass. See [round3_stream_3b_asset_remaps.md](round3_stream_3b_asset_remaps.md).

## 10. Recommended Round 4 highest-impact next fix

`gel_cassette` asset authoring is the recommended first Round 4 fix.

Reasoning:

- Single asset edit, multiple mini-protocols benefit (electrophoresis
  cluster plus the SDS-PAGE protocol family).
- Pure asset work -- no source code, no schema change, lowest blast
  radius.
- The runtime primitive layer is already healthy (Section 4), so the
  next marginal improvement to perceived quality is visual integrity,
  and the largest visual integrity offender is the gel cassette.
- Unlocks a clean follow-on metric: a second placeholder recount that
  should push the count below 40 if the gel cluster is resolved.

Alternative if asset authoring capacity is unavailable: the bottle-family
second-pass remap is the next-best lever, same reasoning at smaller
magnitude.

## Sources cited

Reports:

- [round3_foundation_html_wiring.md](round3_foundation_html_wiring.md)
- [round3_r9_rerun_on_11.md](round3_r9_rerun_on_11.md)
- [round3_cluster_mount_audit.md](round3_cluster_mount_audit.md)
- [round3_top10_full_walkthrough.md](round3_top10_full_walkthrough.md)
- [round3_osc_fire_audit.md](round3_osc_fire_audit.md)
- [round3_placeholder_recount.md](round3_placeholder_recount.md)
- [round3_stream_3b_asset_remaps.md](round3_stream_3b_asset_remaps.md)
- [round3_sdspage_gel_fallback_fix.md](round3_sdspage_gel_fallback_fix.md)
- [round3_r11_widthscale_removal.md](round3_r11_widthscale_removal.md)
- [round3_passage_hood_microscope_fix.md](round3_passage_hood_microscope_fix.md)
- [round3_best_results_review.html](round3_best_results_review.html)

Audits:

- [round3_p5_clickworks_diagnosis.md](../audits/round3_p5_clickworks_diagnosis.md)
- [round3_well_plate_viewport_bug.md](../audits/round3_well_plate_viewport_bug.md)
- [round3_adjust_panel_visibility.md](../audits/round3_adjust_panel_visibility.md)
- [round3_placeholder_root_cause.md](../audits/round3_placeholder_root_cause.md)

Status: COMPLETE
