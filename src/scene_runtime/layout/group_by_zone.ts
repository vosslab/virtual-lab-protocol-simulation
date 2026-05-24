// Stage 6: Group + sort.
// Groups placements by zone, sorts each group by (depth_tier ASC, placement_name).
// Inactive placements are dropped. Error-marked placements go to orphans.
// Items whose zone is unknown go to orphans with an unknown_zone diagnostic.

import type {
  Diagnostics,
  GroupedPlacements,
  ScaledPlacement,
  Zone,
} from "./types.js";

export function groupByZone(
  scaled: ScaledPlacement[],
  zones: Zone[],
  diagnostics: Diagnostics = [],
): GroupedPlacements {
  const zoneIndex = new Map(zones.map((z) => [z.id, z]));
  const groups = new Map<string, ScaledPlacement[]>();
  for (const z of zones) groups.set(z.id, []);
  const orphans: ScaledPlacement[] = [];

  for (const p of scaled) {
    if (p.active === false) continue;
    if (p._error !== undefined) {
      orphans.push(p);
      continue;
    }
    const target = groups.get(p.zone);
    if (target === undefined) {
      diagnostics.push({
        stage: "group",
        severity: "error",
        kind: "unknown_zone",
        placement_name: p.placement_name,
        zone: p.zone,
      });
      orphans.push(p);
      continue;
    }
    target.push(p);
  }

  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const ta = a.depth_tier ?? 0;
      const tb = b.depth_tier ?? 0;
      if (ta !== tb) return ta - tb;
      return a.placement_name.localeCompare(b.placement_name);
    });
  }

  void zoneIndex;
  return { groups, orphans };
}
