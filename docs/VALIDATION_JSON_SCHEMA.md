# Validation JSON schema

The validation tools (YAML schema validator, stepper, SVG pipeline) emit findings in JSON
and newline-delimited JSON format. This document specifies the output shape and field
definitions.

## JSON format

Invoke any validation tool with `--json` to emit a single JSON document:

```bash
source source_me.sh && python3 validation/yaml/content_lint.py --json
source source_me.sh && python3 validation/stepper/step_check.py --json
source source_me.sh && python3 validation/svg/pipeline_check.py --json
source source_me.sh && python3 validation/svg/asset_audit.py --json
```

Output shape:

```json
{
  "findings": [
    {
      "severity": "ERROR",
      "tool": "validator",
      "code": "invalid_field",
      "message": "Field 'x' is required.",
      "path": "content/protocols/example/protocol.yaml",
      "line": 42,
      "protocol": "example",
      "scene": "hood",
      "step": "step_one",
      "target": "pipette_1",
      "extras": {}
    },
    ...
  ]
}
```

## NDJSON format

Invoke with `--ndjson` to emit newline-delimited JSON (one finding per line):

```bash
source source_me.sh && python3 validation/yaml/content_lint.py --ndjson
```

Each line is a single JSON object (a `<finding>`, same shape as above). The last line is a
summary record (see below).

## Finding schema

Every `<finding>` object has this structure:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `severity` | string | yes | One of `ERROR`, `WARNING`, or `INFO`. |
| `tool` | string | yes | Name of the validation tool: `validator`, `stepper`, `svg_check`, `svg_audit`, etc. |
| `code` | string | yes | Stable short identifier for this error class (e.g., `invalid_field`, `unknown_material`, `state_type_mismatch`). |
| `message` | string | yes | Human-readable description of the finding. |
| `path` | string | optional | Repo-relative path to the offending file (e.g., `content/protocols/example/protocol.yaml`). |
| `line` | integer | optional | 1-based line number in the file where the issue occurs. |
| `protocol` | string | optional | Protocol name when the finding belongs to a specific protocol. |
| `scene` | string | optional | Scene name when the finding belongs to a specific scene. |
| `step` | string | optional | Step name when the finding belongs to a specific step. |
| `target` | string | optional | Target object or control name when the finding refers to a specific interaction target. |
| `extras` | object | optional | Tool-specific metadata that does not fit the flat schema. Structure varies by tool. |

## Severity values

| Value | Meaning |
| --- | --- |
| `ERROR` | A structural or correctness violation that prevents the protocol from running. |
| `WARNING` | A potential issue or deviation from best practice that the author should review. |
| `INFO` | Informational message, audit trail, or low-priority note. |

## Code identifiers

Code values are stable across tool versions and can be used for filtering, reporting, and
integration. Examples from the YAML validator:

- `invalid_field`: A required field is missing or has an invalid value.
- `unknown_material`: A step references a material not declared in `materials.yaml`.
- `state_type_mismatch`: A setter primitive writes a value whose type does not match the declared field type.
- `flow_cycle`: A `next_step` chain forms a loop with no terminal step.
- `broken_next_step`: A `next_step` names a `step_name` that does not exist.
- `runner_of_runner`: A `sequence_runner` lists another `sequence_runner` (only mini-protocols allowed).

Examples from the protocol stepper (`tool: "stepper"`):

- `s-state-jump`: A state field increased with no matching decrement in the same interaction.
- `s-cycle`: A `next_step` chain re-enters a previously visited step.
- `s-unreachable`: An authored `step_name` is never reached from `entry_step`.
- `s-unregistered`: A `material_name` or `held_material_name` is neither declared in `materials.yaml` nor in the sentinel allowlist.
- `s-unused`: A material declared in `materials.yaml` is never referenced by any step.

Examples from the manual-renderer lint pass (`tool: "manual"`):

- `l-aspirate`: "Aspirate" is used outside its reserved vacuum-removal-to-waste meaning.

Refer to individual tool documentation for the complete list of codes.

## Composite SVG stage

The aggregate `validation/validate.py --only svg` runs both `pipeline_check.py` and `asset_audit.py` and merges their findings into the unified schema. The `pipeline_check.py` tool emits a pass/fail gate (reproducible codegen); `asset_audit.py` reports per-asset file metadata and issues. When invoked standalone, `pipeline_check.py --json` emits a summary object with `checks_passed` and `source_svgs` counts rather than a findings array.

## NDJSON summary record

The final line in NDJSON output is a summary record (not a finding):

```json
{
  "summary": true,
  "tool": "validator",
  "errors": 3,
  "warnings": 1,
  "files_checked": 168,
  "elapsed_seconds": 2.4,
  "exit_code": 1
}
```

| Field | Type | Description |
| --- | --- | --- |
| `summary` | boolean | Always `true`. Presence of this field distinguishes summary records from findings. |
| `tool` | string | Name of the validation tool that generated the summary. |
| `errors` | integer | Total count of ERROR-level findings. |
| `warnings` | integer | Total count of WARNING-level findings. |
| `files_checked` | integer | Number of files inspected. |
| `elapsed_seconds` | float | Wall-clock time (seconds) taken by the tool. |
| `exit_code` | integer | Exit code (0 on success, 1 on any errors). |

## Filter and parse examples

Extract errors only (JSON):

```bash
source source_me.sh && python3 validation/yaml/validate.py --json | \
  python3 -c "import sys, json; d=json.load(sys.stdin); \
  [print(f.get('message')) for f in d['findings'] if f['severity'] == 'ERROR']"
```

Extract paths and line numbers (NDJSON):

```bash
source source_me.sh && python3 validation/yaml/validate.py --ndjson | \
  python3 -c "import sys, json; \
  [print(f'{json.loads(line)[\"path\"]}:{json.loads(line)[\"line\"]}') \
  for line in sys.stdin if not json.loads(line).get('summary')]"
```

Parse summary from NDJSON (Python):

```python
import json
import subprocess

result = subprocess.run(
    ['python3', 'validation/yaml/validate.py', '--ndjson'],
    capture_output=True,
    text=True
)

lines = result.stdout.strip().split('\n')
summary = json.loads(lines[-1]) if lines and json.loads(lines[-1]).get('summary') else None
if summary:
    print(f"Errors: {summary['errors']}, Warnings: {summary['warnings']}")
```
