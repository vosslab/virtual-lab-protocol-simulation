// Stage 3: Resolve inheritance.
// If scene.extends is set, look up the base in baseSceneMap, then apply the
// four operations in fixed order: remove -> deactivate -> reposition -> add.

import type { InheritanceOp, InheritanceResolution, PlacementAuthored, SceneA } from "./types.js";

function placementName(entry: { placement_name: string } | string): string {
  return typeof entry === "string" ? entry : entry.placement_name;
}

export function resolveInheritance(
  scene: SceneA,
  baseSceneMap: Record<string, SceneA> = {},
): InheritanceResolution {
  if (!scene.extends) {
    const placements = (scene.placements ?? []).map((p): PlacementAuthored => ({
      ...p,
      active: true,
      _from: "own",
    }));
    return {
      placements,
      provenance: placements.map((p) => ({
        name: p.placement_name,
        from: "own",
      })),
      operations: [],
    };
  }

  const base = baseSceneMap[scene.extends];
  if (!base) {
    const placements = (scene.placements ?? []).map((p): PlacementAuthored => ({
      ...p,
      active: true,
      _from: "own",
    }));
    return {
      placements,
      provenance: placements.map((p) => ({
        name: p.placement_name,
        from: "own",
      })),
      operations: [
        {
          op: "extends",
          target: scene.extends,
          status: "missing base scene",
        },
      ],
    };
  }

  const operations: InheritanceOp[] = [];
  let placements: PlacementAuthored[] = (base.placements ?? []).map((p) => ({
    ...p,
    active: true,
    _from: "base",
  }));
  operations.push({
    op: "extends",
    target: scene.extends,
    count: placements.length,
  });

  for (const r of scene.remove_placements ?? []) {
    const name = placementName(r);
    const before = placements.length;
    placements = placements.filter((p) => p.placement_name !== name);
    operations.push({
      op: "remove",
      target: name,
      removed: before - placements.length,
    });
  }

  for (const d of scene.deactivate_placements ?? []) {
    const name = d.placement_name;
    placements = placements.map((p) => (p.placement_name === name ? { ...p, active: false } : p));
    operations.push({ op: "deactivate", target: name });
  }

  for (const r of scene.reposition_placements ?? []) {
    const name = r.placement_name;
    placements = placements.map((p) => (p.placement_name === name ? { ...p, ...r } : p));
    const op: InheritanceOp = { op: "reposition", target: name };
    if (r.zone !== undefined) op.to_zone = r.zone;
    operations.push(op);
  }

  for (const a of scene.add_placements ?? []) {
    placements.push({ ...a, active: true, _from: "own" });
    operations.push({ op: "add", target: a.placement_name });
  }

  return {
    placements,
    provenance: placements.map((p) => ({
      name: p.placement_name,
      from: p._from ?? "own",
    })),
    operations,
  };
}
