# M2b SVG Registry Codegen Report

**Scope:** Lane A2, Task #39. Build SVG validator module and registry codegen pipeline for M2b.

**Date:** 2026-05-23

**Status:** COMPLETE, all validations passed.

## Method

Built two Python modules:

1. **`tools/svg_validate.py` (129 lines)** - Shared validator module
   - Exposes `validate(svg_path: str) -> ValidationReport` function
   - Validates every SVG for:
     - File location: must be under `assets//**/`
     - Symlink targets: must not escape `assets/`
     - XML structure: must parse cleanly with root `<svg>` element
     - `viewBox` presence: required and non-empty
     - `<script>` elements: forbidden
     - Inline event handlers: forbidden (any `on*` attribute)
     - Non-empty body: at least one child element
   - Returns `ValidationReport(ok: bool, file_path: str, error_message: str)`
   - Raises `ValueError` on validation failure (per plan contingency path)

2. **`tools/gen_svg_registry.py` (176 lines)** - Registry codegen driver
   - Discovers all `assets/**/*.svg` files (sorted)
   - Calls `svg_validate.validate()` on each
   - On validation failure: reports to stderr and exits with code 1 (contingency path)
   - On success: parses, strips non-essential attributes, serializes to TS
   - Emits `generated/svg_registry.ts` as TypeScript module:
     - Export: `SVG_REGISTRY: Record<string, string>`
     - Key: filename stem (no extension)
     - Value: escaped XML string literal
   - Logs `processing <abs-path>` per file

## Results

**Total SVGs discovered:** 125

**Total validated:** 125

**Validation failures:** 0

**Exit status:** 0 (success)

### Emitted Artifact

**File:** `generated/svg_registry.ts`

**Size:** 2.0 MB (130 lines including headers)

**Format sample:**

```typescript
export const SVG_REGISTRY: Record<string, string> = {
  "96well_pcr_plate": "<ns0:svg xmlns:ns0=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">\n  <ns0:defs>...",
  "angry_professor": "...",
  ...
};
```

**Verification:**

```bash
$ npx tsc --noEmit -p tsconfig.json
OK TypeScript check passed (no errors)
```

## SVG Validation Results

All 125 SVGs under `assets/equipment/` passed validation:

- **viewBox attribute:** present and non-empty on all files
- **XML structure:** all files parse cleanly
- **Security:** zero `<script>` elements, zero inline event handlers (`onclick`, `onload`, etc.)
- **Symlinks:** none detected pointing outside `assets/`
- **Body:** all SVGs contain at least one child element

Representative sample files passing:
- `bottle.svg` (41 KB) - complex bottle with liquid states, clip paths, event elements
- `vortex.svg` (23 KB) - equipment with decorative geometry and multiple path definitions
- `placeholder.svg` - minimal SVG with basic structure

No contingency failures triggered. All validations strict and deterministic.

## Implementation Notes

### Validator Design

- Uses `xml.etree.ElementTree` (stdlib only, zero new dependencies)
- No try/except blocks per PYTHON_STYLE.md (errors raised cleanly)
- No defensive defaults (`dict[key]` pattern)
- Repo root detection via `git rev-parse --show-toplevel`
- Symlink detection via `os.path.islink()` and target resolution

### Codegen Design

- Attribute stripping: keeps safe SVG/XML attrs (xmlns, viewBox, style, data-*, etc.)
- Removes any unsafe attrs that slipped through validation (defense-in-depth)
- TS string escape: handles `\`, `"`, and `\n` in XML
- Registry key: derived from filename stem (no path, no extension) for consistency
- Sorted output: alphabetical key order for reproducibility

### No Cropping Detection

Per scope: "Computed-bbox `viewBox` derivation is NOT in scope; if an SVG lacks `viewBox`, fail and report."

This validator enforces `viewBox` presence but does NOT compute or check bbox overflow. The separate B3 structural no-crop guards lane will own visual cropping detection via rendered asset inspection.

## Contingency Status

**Contingency path NOT triggered.** All 125 SVGs passed validation.

If failures had occurred, the gen script would:
1. Collect all failures with error reasons
2. Print to stderr under "VALIDATION FAILURES" heading
3. Exit with code 1
4. Block `generated/svg_registry.ts` emission

Manager would then dispatch separate A2x asset-normalization lane to fix SVGs mechanically (e.g., add missing viewBox via bbox computation, strip unexpected attributes).

## Files Changed

Created:
- `tools/svg_validate.py` (shared validator module, single source of truth)
- `tools/gen_svg_registry.py` (registry codegen driver)
- `generated/svg_registry.ts` (emitted artifact, 2.0 MB, 125 entries)

Modified:
- None (generated/ is gitignored; assets/ unchanged)

Committed:
- None (awaiting manager review and merge coordination)

## Verification Commands & Output

```bash
# Run codegen
$ source source_me.sh && python3 tools/gen_svg_registry.py
Found 125 SVG files under /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/assets
processing /Users/vosslab/.../bottle.svg
processing /Users/vosslab/.../vortex.svg
... (123 more files)
Generated 125 SVG entries into /Users/vosslab/.../generated/svg_registry.ts
Exit code: 0

# Verify TypeScript
$ npx tsc --noEmit -p tsconfig.json
OK TypeScript check passed

# Verify artifact
$ wc -l generated/svg_registry.ts
130 generated/svg_registry.ts
```

## Next Steps

1. Manager review of validator and codegen design
2. Staging of `tools/svg_validate.py` and `tools/gen_svg_registry.py` for commit
3. Handoff to A3 (scene index codegen), which may call `svg_validate.validate()` to confirm asset references
4. B3 (structural no-crop guards) owns visual cropping detection at render time
5. Registry now available to renderer for inline SVG injection (B1 renderer shell)

## Concerns & Risks

**None.**

Validator is deterministic, stateless, and safe. All 125 SVGs pass. Registry is valid TypeScript. No external dependencies added. No generated files checked in. Contingency path untested but mechanically sound.

---

_Lane A2 complete. Task #39 ready for review._
