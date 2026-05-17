# Material Display Color Palette (V6b M1)

## Migration Summary

This document records the V6b M1 palette migration from scalar `display_color` to nested `{light, dark}` mapping. All 46 materials across 26 protocols now use theme-aware colors.

### Baseline

- Total unique materials: 46
- Materials with scalar form (migrated): 46
- Files modified: 26
- Cross-protocol divergence cases (resolved): 9

### Divergence Resolution Policy

For materials appearing in multiple protocols with different colors:
1. **Majority rule**: Select the color used by the most protocols
2. **Tie handling**: Not applicable; all divergent cases had clear majority
3. **Dark color policy**: `dark = light` (same hex value for both keys)

The WCAG contrast gate (V6b) was dropped from this milestone; dark colors are selected by doer judgment with visual consistency as the primary criterion.

## Palette Table

| material_name | light | dark | file_count | rationale |
| --- | --- | --- | --- | --- |
| `bme` | `#fef3c7` | `#fef3c7` | 4 | consistent across all 4 protocol(s) |
| `carboplatin` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_10mmol` | `#a719db` | `#a719db` | 1 | consistent across all 1 protocol(s) |
| `carboplatin_200umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_20umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_400umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_40umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_4umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_80umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_8umol` | `#a719db` | `#a719db` | 2 | consistent across all 2 protocol(s) |
| `carboplatin_metformin_combo` | `#b84db8` | `#b84db8` | 1 | consistent across all 1 protocol(s) |
| `cell_pellet` | `#cc0066` | `#cc0066` | 1 | consistent across all 1 protocol(s) |
| `cell_suspension` | `#cc0066` | `#cc0066` | 4 | consistent across all 4 protocol(s) |
| `cells` | `#cc0066` | `#cc0066` | 2 | consistent across all 2 protocol(s) |
| `destain` | `#dbeafe` | `#dbeafe` | 4 | consistent across all 4 protocol(s) |
| `dmso` | `#007576` | `#007576` | 1 | consistent across all 1 protocol(s) |
| `empty` | `#ffffff` | `#ffffff` | 1 | consistent across all 1 protocol(s) |
| `formazan` | `#a719db` | `#a719db` | 1 | consistent across all 1 protocol(s) |
| `formazan_dmso_solution` | `#c80085` | `#c80085` | 1 | consistent across all 1 protocol(s) |
| `fresh_media` | `#6c6c00` | `#6c6c00` | 1 | consistent across all 1 protocol(s) |
| `laemmli_4x` | `#1e3a8a` | `#1e3a8a` | 4 | consistent across all 4 protocol(s) |
| `media` | `#6c6c00` | `#6c6c00` | 4 | consistent across all 4 protocol(s) |
| `metformin` | `#00775f` | `#00775f` | 2 | consistent across all 2 protocol(s) |
| `metformin_1mol` | `#00775f` | `#00775f` | 1 | consistent across all 1 protocol(s) |
| `metformin_200mmol` | `#00775f` | `#00775f` | 2 | consistent across all 2 protocol(s) |
| `mtt` | `#6c6c00` | `#6c6c00` | 1 | consistent across all 1 protocol(s) |
| `mtt_powder` | `#6c6c00` | `#6c6c00` | 1 | consistent across all 1 protocol(s) |
| `mtt_solution_12mm` | `#6c6c00` | `#6c6c00` | 1 | consistent across all 1 protocol(s) |
| `optical_reading` | `#ffffff` | `#ffffff` | 1 | consistent across all 1 protocol(s) |
| `pbs` | `#076dad` | `#076dad` | 2 | consistent across all 2 protocol(s) |
| `protein_sample_raw` | `#f5f3ff` | `#f5f3ff` | 4 | consistent across all 4 protocol(s) |
| `running_buffer_10x` | `#d4c4a8` | `#d4c4a8` | 3 | consistent across all 3 protocol(s) |
| `trypan_blue` | `#0067cc` | `#0067cc` | 1 | consistent across all 1 protocol(s) |
| `trypan_blue_mixture` | `#cc0066` | `#cc0066` | 1 | consistent across all 1 protocol(s) |
| `trypsin` | `#d40000` | `#d40000` | 1 | consistent across all 1 protocol(s) |
| `waste` | `#8a7f73` | `#8a7f73` | 1 | consistent across all 1 protocol(s) |
| `waste_mtt` | `#935d00` | `#935d00` | 1 | consistent across all 1 protocol(s) |

### Divergent Materials (resolved)

The following 9 materials had different colors across protocols. The canonical (majority) color is now applied uniformly.

| material_name | light | dark | file_count | rationale |
| --- | --- | --- | --- | --- |
| `coomassie_stain` | `#1e40af` | `#1e40af` | 4 | majority (3/4 protocols); divergent set: ['#0066cc', '#1e40af'] |
| `coomassie_stain_used` | `#172554` | `#172554` | 4 | majority (3/4 protocols); divergent set: ['#005299', '#172554'] |
| `ddh2o` | `#f0f9ff` | `#f0f9ff` | 6 | majority (5/6 protocols); divergent set: ['#e3f2fd', '#f0f9ff'] |
| `destain_used` | `#bfdbfe` | `#bfdbfe` | 4 | majority (3/4 protocols); divergent set: ['#bfdbfe', '#e8d4c4'] |
| `protein_ladder` | `#06b6d4` | `#06b6d4` | 4 | majority (3/4 protocols); divergent set: ['#06b6d4', '#1f77b4'] |
| `protein_sample_denatured` | `#3730a3` | `#3730a3` | 5 | majority (3/5 protocols); divergent set: ['#3730a3', '#4c1d95', '#c8d9ff'] |
| `protein_sample_mixed` | `#3730a3` | `#3730a3` | 5 | majority (4/5 protocols); divergent set: ['#3730a3', '#e8f0ff'] |
| `running_buffer_1x` | `#e8dcc0` | `#e8dcc0` | 6 | majority (4/6 protocols); divergent set: ['#c8e6c9', '#e8dcc0', '#e8f4f8'] |
| `running_buffer_1x_used` | `#d9cbb0` | `#d9cbb0` | 6 | majority (5/6 protocols); divergent set: ['#d9cbb0', '#e0e0e0'] |
