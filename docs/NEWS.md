# News

Curated highlights for the virtual lab protocol games. For the full change log see
[CHANGELOG.md](CHANGELOG.md).

## 2026-06

- Compile-time layout engine. Scene layout now runs at build time and ships as
  precomputed positions (`generated/precomputed_layout.ts`) rendered inside an exact 16:9
  letterbox; the browser no longer recomputes layout per viewport. A pure 2D geometry core,
  declarative layout config, modular placement strategies with an overflow packer, a phase
  registry, and severity-graded diagnostics replace the old per-scene fixes. The three
  long-standing drift scenes (electrophoresis_bench, heat_block_bench,
  passage_hood_detachment_microscope_view) now converge clean with zero Error diagnostics,
  and layout quality is judged by a layered review (typed diagnostics, rendered bbox stats,
  an AI visual-polish reviewer, and human appeals) rather than a single score.
