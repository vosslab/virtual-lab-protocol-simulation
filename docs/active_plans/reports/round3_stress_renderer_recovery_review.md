# Round 3 C2 stress renderer recovery review

## Context

This artifact records the Round 3 C2 review of the CSS-native stress renderer
recovery candidate. It captures the location, CLI surface, production-coupling
verdict, regeneration capability, and the full corpus regeneration command used
to reproduce the stress scene HTML outputs from authored YAML.

The renderer is an experiments-tier tool that converts authored stress scene
YAML files plus a footprint map into rendered HTML pages used for CSS-native
layout investigations. It is not part of the production runtime build or test
gates.

## Location

- `experiments/css_native_layout/render_stress_to_html.py`

Entry point: `main()` at lines 327-341 invokes `parse_args()`, loads the
footprint map, expands scene YAML paths (single file via `-i` or directory via
`-d`), and writes one HTML file per scene to the output directory.

## CLI interface

- Entry: `main()` guarded by `if __name__ == '__main__': main()` at line 344.
- `-i` / `--input` (`input_path`): render a single scene YAML file.
- `-d` / `--input-dir` (`input_dir`): render every scene YAML discovered under
  the given directory.
- `-o` / `--output-dir` (`output_dir`): destination directory for rendered HTML.
- `-f` / `--footprint-map` (`footprint_map_path`): path to the experiment-local
  `object_footprints.yaml` mapping consumed during rendering.

The `-i` and `-d` flags are mutually exclusive in practice; `-i` takes
precedence when both are present.

## Production-coupling verdict: ISOLATED

Evidence:

- `git ls-files src/ pipeline/ tests/ | xargs grep -l render_stress_to_html`
  returns an empty result.
- `check_codebase.sh` and `package.json` contain zero references to
  `render_stress_to_html` (grep count: 0).
- No production import path reaches this script; it lives under the
  `experiments/` tree, which is excluded from the codebase gate.

Production hooks count: 0.

## Regeneration-capability verdict: CAN-REGEN-WITH-FLAGS

Evidence:

- Gold corpus inventory: 11 entries under
  `experiments/css_native_layout/stress_scenes/gold/`.
- Generated corpus inventory: 101 entries under
  `experiments/css_native_layout/stress_scenes/generated/`.
- The prior dry-run regeneration produced byte-for-byte matching output against
  the existing rendered HTML when invoked with the documented flags below.

## Full corpus regeneration command

Two-step invocation (gold then generated):

```bash
source source_me.sh && python3 experiments/css_native_layout/render_stress_to_html.py \
    -d experiments/css_native_layout/stress_scenes/gold \
    -o experiments/css_native_layout/stress_scenes/gold \
    -f experiments/css_native_layout/object_footprints.yaml

source source_me.sh && python3 experiments/css_native_layout/render_stress_to_html.py \
    -d experiments/css_native_layout/stress_scenes/generated \
    -o experiments/css_native_layout/stress_scenes/generated \
    -f experiments/css_native_layout/object_footprints.yaml
```

## Verification checklist

- [x] Script path exists at
  `experiments/css_native_layout/render_stress_to_html.py`.
- [x] `main()` confirmed at lines 327-341 with `__main__` guard at line 344.
- [x] Argparse flags `-i`, `-d`, `-o`, `-f` verified in `parse_args()`.
- [x] Zero production imports from `src/`, `pipeline/`, or `tests/`.
- [x] Zero references in `check_codebase.sh` and `package.json`.
- [x] Gold corpus size: 11 scenes.
- [x] Generated corpus size: 101 scenes.
- [x] Dry-run regeneration reported byte-for-byte match against existing HTML.
- [x] ASCII-only artifact, verified by `tests/check_ascii_compliance.py`.
- [x] Markdown links verified by `pytest tests/test_markdown_links.py -q`.
