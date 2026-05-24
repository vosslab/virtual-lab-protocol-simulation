# External blockers

Table of dependencies that block scene-lint or scene-design work package progress. Mark resolved blockers as CLOSED.

| opened_date | ticket_id | blocker_title | owner | status | notes |
| --- | --- | --- | --- | --- | --- |
| 2026-05-23 | TBD | pytest sessionstart bootstrap fix | Neil Voss (repo maintainer) | CLOSED 2026-05-23 | Verified resolved: `pytest tests/test_scene_loaders.py` runs and reports `19 passed in 0.03s`. Plan blocker assumption stale; acceptance gates now unblocked. |
| 2026-05-23 | TBD | `validation/yaml/` shadows pyyaml on sys.path | unassigned | CLOSED 2026-05-23 | Renamed validation/yaml/ -> validation/yaml_schema/; reverted yaml_io.py comment + run_scene_design.py sys.path mutation. |
