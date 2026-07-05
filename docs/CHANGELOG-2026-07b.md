## 2026-07-03

### Additions and New Features

- Scene-layout tier-collapse pass: added `tools/rank_scene_layout.py`, a read-only developer
  inspection helper that ranks every scene by layout-quality metrics from
  `test-results/layout_metrics` plus content protocol data. It computes six
  geometric/pedagogy rankers (`collapsibility`, `coupling_loss`, `victim_fraction`,
  `crowd_bound_count`, `zone_spread`, `mean_scale`), plus a pedagogy axis
  `target_prominence` (lowest clicked-target `final_scale` divided by non-target median),
  flagging scenes where a clicked target renders smaller than a typical non-target. It
  produces a combined per-scene table and a priority roll-up, and also reports
  `label_dominant` and a derived `tier_collapsible` routing flag so label-dominant
  false-positives are visibly marked. `crowd_bound_count == 0` predicts a clean
  full-decouple; `crowd_bound_count > 0` or `label_dominant` predicts engine-only work.

### Fixes and Maintenance

- Tier-collapse wins: three sparse scenes collapsed from 2 tier-rows to 1, lifting the
  scene-wide uniform rescale factor to 1.000 (full-size art) with no object shrunk and no
  overlap/overflow regression:
  `content/protocols/cell_culture/drug_dilution_setup/scenes/bench_setup.yaml`
  (0.604 -> 1.000);
  `content/protocols/cell_culture/mtt_solubilization_readout/scenes/bench_workspace.yaml`
  (0.653 -> 1.000; also removed the non-target inherited `center_water_bath`, mirroring the
  `bench_setup` precedent, to clear a same-tier collision);
  `content/protocols/cell_culture/mtt_plate_reaction/scenes/incubator_workspace.yaml`
  (0.667 -> 1.000; incubator kept at full authored size). All clicked targets stayed placed
  and clickable.

### Decisions and Failures

- Engine-only finding: a measured base-scene tier-collapse of
  `content/base_scenes/electrophoresis_bench.yaml` (7 SDS-PAGE children plus extraction) was
  rejected and reverted net-zero. The base is label-dominant (its uniform factor 0.584 is set
  by label vertical overflow, not tier-row overhead), so a tier collapse yields zero factor
  gain and a full collapse even reopened unresolved `unresolved_label_overlap` errors. Routed
  to the architect as label-space / engine work. The rank tool's `collapsibility` metric
  flagged it as a false positive, which motivated the new `label_dominant` /
  `tier_collapsible` flags.
