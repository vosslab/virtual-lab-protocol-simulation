/* global React, jsyaml */
// Strategy: scene YAML → 2D visual space.
// Each stage of the layout pipeline is one section. The same scene flows
// through every stage so you can watch the data shape and the visual state
// evolve together.

const { useState, useMemo, useRef, useEffect } = React;

// ── The worked example (heat_block_bench.yaml from your attachment) ──
const STARTER_YAML = `# Worked example: a protein-prep bench scene.
# Edit anything here and the entire pipeline below recomputes live.

scene_name: heat_block_bench
workspace: bench

scene_bounds:
  left: 1
  right: 99
  top: 5
  bottom: 95

background:
  asset: bench_workspace_bg

zones:
  - id: rear_left
    bounds: { left: 5,  right: 30, top: 10, bottom: 35 }
    baseline: 32
    align: center
    label: Rear left
  - id: rear_center
    bounds: { left: 35, right: 65, top: 10, bottom: 35 }
    baseline: 32
    align: center
    label: Rear center
  - id: rear_right
    bounds: { left: 70, right: 95, top: 10, bottom: 35 }
    baseline: 32
    align: center
    label: Rear right
  - id: center
    bounds: { left: 20, right: 80, top: 45, bottom: 75 }
    baseline: 72
    align: center
    label: Bench work surface
  - id: right_tool_area
    bounds: { left: 80, right: 95, top: 55, bottom: 80 }
    baseline: 78
    align: center
    label: Right tool rack

placements:
  - placement_name: center_heat_block
    object_name: heat_block
    zone: center
    depth_tier: 1
  - placement_name: rear_left_eppendorf_rack
    object_name: microtube_rack_24
    zone: rear_left
    depth_tier: 1
  - placement_name: rear_right_protein_ladder
    object_name: protein_ladder_tube
    zone: rear_right
    depth_tier: 1

layout_rules:
  zone_gap: 2
  label_offset_y: 3
  label_font_size: 11

wrong_order_message:
  template: "Try using the {expected_label}."
  toast_duration_ms: 2000
`;

// ── The same scene in Schema B (row+slot) — coordinate-free authoring ──
const STARTER_YAML_ROW_SLOT = `# Same bench scene, authored as rows + slots.
# No coordinates anywhere. Row names come from a workspace-scoped library
# (see Stage 02 below). Slot order implies left→center→right ordering.

scene_name: heat_block_bench_row_slot
workspace: bench
capabilities:
  - item_workspace

background:
  asset: bench_workspace_bg

rows:
  - row_name: rear_supplies
    slots:
      - placement_name: rear_left_eppendorf_rack
        object_name: microtube_rack_24
      - placement_name: rear_right_protein_ladder
        object_name: protein_ladder_tube
  - row_name: work_surface
    slots:
      - placement_name: center_heat_block
        object_name: heat_block
`;

// ── A small worked example that exercises inheritance ──────────────
// Real protocol scene: drug_dilution_setup_bench_setup extends bench_basic
// to stage all the bottles, tubes, and tools needed for a 1:7 dilution series.
const INHERITANCE_DEMO = {
  base: {
    scene_name: "bench_basic",
    placements: [
      { placement_name: "rear_left_waste",   object_name: "waste_container", zone: "rear_left",  depth_tier: 1 },
      { placement_name: "rear_right_vortex", object_name: "vortex",          zone: "rear_right", depth_tier: 1 },
    ],
  },
  extender: {
    scene_name: "drug_dilution_setup_bench_setup",
    extends: "bench_basic",
    add_placements: [
      { placement_name: "rear_left_carboplatin_stock",   object_name: "carboplatin_stock_bottle",   zone: "rear_left",        depth_tier: 2 },
      { placement_name: "rear_center_metformin_stock",   object_name: "metformin_stock_bottle",     zone: "rear_center",      depth_tier: 2 },
      { placement_name: "rear_right_sterile_water",      object_name: "sterile_water_bottle",       zone: "rear_right",       depth_tier: 2 },
      { placement_name: "center_microtube_intermediate", object_name: "microtube_15ml_intermediate", zone: "center",          depth_tier: 1 },
      { placement_name: "center_dilution_tube_rack",     object_name: "dilution_tube_rack_8",       zone: "center",           depth_tier: 3 },
      { placement_name: "right_tool_micropipette",       object_name: "micropipette",               zone: "right_tool_area",  depth_tier: 1 },
      { placement_name: "right_tool_tip_box",            object_name: "micropipette_tip_box",       zone: "right_tool_area",  depth_tier: 2 },
    ],
    // The four operations are equally available; this real scene only uses add_placements.
    // For pedagogy, the rendered demo also illustrates remove + deactivate + reposition.
    remove_placements:     [{ placement_name: "_demo_old_buffer" }], // not in base; will report "removed 0"
    deactivate_placements: [{ placement_name: "rear_right_vortex" }],
    reposition_placements: [{ placement_name: "rear_left_waste", zone: "rear_center", depth_tier: 4 }],
  },
};

// ─────────────────────────────────────────────────────────────────
// SCENE CANVAS — the central visualization element.
// Renders a scene viewport at 1920×1080 logical size, scaled to fit its
// container. Layers are togglable so each stage can show the right thing.
function SceneCanvas({
  scene, items = [],
  showBg = true,
  showSceneBounds = true,
  showZones = false,
  showBaselines = false,
  showFootprints = false,
  showAnchors = false,
  showLabels = false,
  showArt = false,
  highlightNew = null,        // placement_name being introduced this stage
  height = 360,
  zoneColorFn,
}) {
  const VW = 1920, VH = 1080;
  // Map percent → pixel inside the SVG viewBox
  const pX = (pct) => (pct / 100) * VW;
  const pY = (pct) => (pct / 100) * VH;

  return (
    <div className="scene-canvas" style={{ height }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {/* viewport */}
        <rect x="0" y="0" width={VW} height={VH} fill={showBg ? "var(--sc-bg)" : "transparent"} />
        {/* scene_bounds */}
        {showSceneBounds && scene?.scene_bounds && (() => {
          const sb = scene.scene_bounds;
          return (
            <g>
              <rect x={pX(sb.left)} y={pY(sb.top)}
                    width={pX(sb.right - sb.left)} height={pY(sb.bottom - sb.top)}
                    fill="none" stroke="var(--sc-bounds)" strokeWidth="2" strokeDasharray="6 4"/>
              <text x={pX(sb.left) + 8} y={pY(sb.top) + 18}
                    fontFamily="JetBrains Mono" fontSize="14"
                    fill="var(--sc-bounds)">scene_bounds</text>
            </g>
          );
        })()}
        {/* zones */}
        {showZones && (scene?.zones || []).map((z, i) => {
          const b = z.bounds;
          const fill = (zoneColorFn ? zoneColorFn(z, i) : `hsla(${(i * 67) % 360}, 50%, 60%, 0.08)`);
          const stroke = (zoneColorFn ? zoneColorFn(z, i, 'stroke') : `hsla(${(i * 67) % 360}, 50%, 40%, 0.55)`);
          return (
            <g key={z.id}>
              <rect x={pX(b.left)} y={pY(b.top)}
                    width={pX(b.right - b.left)} height={pY(b.bottom - b.top)}
                    fill={fill} stroke={stroke} strokeWidth="1.6" strokeDasharray="4 4"/>
              <g transform={`translate(${pX(b.left) + 10}, ${pY(b.top) + 22})`}>
                <rect x="-6" y="-16" width={z.id.length * 9 + 14} height="22" rx="3" fill="var(--paper)" stroke={stroke} strokeWidth="1"/>
                <text fontFamily="JetBrains Mono" fontSize="13" fill="var(--ink)">{z.id}</text>
              </g>
              {/* baseline */}
              {showBaselines && z.baseline !== undefined && (
                <g>
                  <line x1={pX(b.left)} x2={pX(b.right)} y1={pY(z.baseline)} y2={pY(z.baseline)}
                        stroke={stroke} strokeWidth="1.4" strokeDasharray="2 6"/>
                  <text x={pX(b.right) - 4} y={pY(z.baseline) - 4} fontFamily="JetBrains Mono" fontSize="11"
                        textAnchor="end" fill={stroke}>baseline {z.baseline}%</text>
                </g>
              )}
            </g>
          );
        })}
        {/* footprints (light boxes) */}
        {showFootprints && items.map((it, i) => (
          <g key={`fp-${i}`}>
            <rect x={pX(it._x - it._footprint / 2)} y={pY(it._y - 1)}
                  width={pX(it._footprint)} height="4"
                  fill="var(--sc-footprint)" opacity="0.45"/>
          </g>
        ))}
        {/* anchor markers */}
        {showAnchors && items.map((it, i) => (
          <g key={`an-${i}`}>
            <circle cx={pX(it._x)} cy={pY(it._y)} r="6" fill="var(--accent)" stroke="var(--paper)" strokeWidth="2"/>
            <text x={pX(it._x) + 10} y={pY(it._y) + 5} fontFamily="JetBrains Mono" fontSize="11" fill="var(--accent-deep)">{it.placement_name}</text>
          </g>
        ))}
        {/* art placeholders (after vertical layout) */}
        {showArt && items.map((it, i) => {
          const x = pX(it._x - it._visualWidth / 2);
          const y = pY(it._top);
          const w = pX(it._visualWidth);
          const h = pY(it._height);
          const flag = highlightNew && it.placement_name === highlightNew;
          return (
            <g key={`art-${i}`}>
              <ItemArt item={it} x={x} y={y} w={w} h={h}/>
              {flag && (
                <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12}
                      fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="6 5" rx="6"/>
              )}
            </g>
          );
        })}
        {/* labels */}
        {showLabels && items.map((it, i) => (
          <g key={`lbl-${i}`}>
            <text x={pX(it._labelX)} y={pY(it._labelY) + 12}
                  fontFamily="Inter" fontSize="15"
                  textAnchor="middle" fill="var(--ink)">{it.label}</text>
            <text x={pX(it._labelX)} y={pY(it._labelY) + 28}
                  fontFamily="JetBrains Mono" fontSize="10.5"
                  textAnchor="middle" fill="var(--ink-faint)">{it.placement_name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── ItemArt: simplified SVG placeholders matching the demo objects ──
function ItemArt({ item, x, y, w, h }) {
  const k = item.asset;
  const ink = "var(--glass-stroke)";
  // shared anchor: bottom of bbox
  if (k === "heat_block") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x="0" y={h * 0.18} width={w} height={h * 0.82} rx={w * 0.04}
              fill="#E1DCC6" stroke={ink} strokeWidth="3"/>
        <rect x={w * 0.06} y="0" width={w * 0.88} height={h * 0.2} rx={w * 0.02}
              fill="#3D4046" stroke={ink} strokeWidth="3"/>
        {/* tube holes */}
        <g fill="#1B1D22">
          {Array.from({ length: 5 }).map((_, c) =>
            Array.from({ length: 4 }).map((_, r) => (
              <circle key={`${c}${r}`} cx={w * (0.18 + c * 0.16)} cy={h * (0.34 + r * 0.16)} r={w * 0.04}/>
            ))
          )}
        </g>
        {/* display */}
        <rect x={w * 0.62} y={h * 0.78} width={w * 0.32} height={h * 0.14} fill="#1B1D22"/>
        <text x={w * 0.78} y={h * 0.89} fontFamily="JetBrains Mono"
              fontSize={Math.max(8, w * 0.07)} fill="#FF8B5C" textAnchor="middle">95.0</text>
      </g>
    );
  }
  if (k === "microtube_rack") {
    const cols = 6, rows = 4;
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x="0" y={h * 0.22} width={w} height={h * 0.78} rx={w * 0.03}
              fill="#9CA0A6" stroke={ink} strokeWidth="3"/>
        {/* tube caps */}
        <g>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const colors = ["#D33B33", "#F6C84B", "#1F7A7E", "#7CFFB2", "#D33B33", "#3464B0"];
              const idx = r * cols + c;
              return <circle key={`${r}${c}`}
                cx={w * (0.10 + c * 0.16)} cy={h * (0.10 + r * 0.07)} r={w * 0.04}
                fill={colors[idx % colors.length]} stroke={ink} strokeWidth="1.5"/>;
            })
          )}
        </g>
      </g>
    );
  }
  if (k === "eppendorf_tube") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <ellipse cx={w / 2} cy={h * 0.08} rx={w * 0.5} ry={h * 0.05} fill="#D33B33" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.05} y={h * 0.08} width={w * 0.9} height={h * 0.4} fill="var(--glass-fill)" stroke={ink} strokeWidth="2"/>
        <path d={`M ${w * 0.05} ${h * 0.48} L ${w * 0.95} ${h * 0.48} L ${w / 2} ${h * 0.97} Z`}
              fill="var(--glass-fill)" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.18} y={h * 0.25} width={w * 0.64} height={h * 0.18} fill="rgba(255,255,255,0.55)" stroke={ink} strokeWidth="0.8"/>
        <text x={w / 2} y={h * 0.38} fontFamily="Inter" fontSize={Math.max(7, w * 0.16)}
              textAnchor="middle" fontWeight="600">LADDER</text>
      </g>
    );
  }
  if (k === "t75_flask") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <path d={`M 0 ${h * 0.20} L 0 ${h * 0.95} Q 0 ${h} ${w * 0.05} ${h}
                  L ${w * 0.78} ${h} Q ${w * 0.83} ${h} ${w * 0.83} ${h * 0.95}
                  L ${w * 0.83} ${h * 0.55} L ${w} ${h * 0.45} L ${w} ${h * 0.18}
                  L ${w * 0.83} ${h * 0.10} L ${w * 0.83} ${h * 0.04}
                  Q ${w * 0.83} 0 ${w * 0.78} 0 L ${w * 0.05} 0 Q 0 0 0 ${h * 0.04} Z`}
              fill="var(--glass-fill)" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.93} y={h * 0.15} width={w * 0.07} height={h * 0.20} fill="#D33B33" stroke={ink} strokeWidth="1.5"/>
        <rect x="0" y={h * 0.55} width={w * 0.83} height={h * 0.45} fill="var(--media)" opacity="0.7"/>
        <rect x={w * 0.18} y={h * 0.22} width={w * 0.50} height={h * 0.25} fill="rgba(255,255,255,0.65)" stroke={ink} strokeWidth="0.5"/>
        <text x={w * 0.43} y={h * 0.40} fontFamily="Inter" fontSize={Math.max(8, w * 0.10)} fontWeight="600" textAnchor="middle">T75</text>
      </g>
    );
  }
  if (k === "media_bottle") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x={w * 0.30} y="0" width={w * 0.40} height={h * 0.15} fill="#3D4046" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.35} y={h * 0.15} width={w * 0.30} height={h * 0.08} fill="var(--card)" stroke={ink} strokeWidth="2"/>
        <path d={`M ${w * 0.05} ${h * 0.34} Q ${w * 0.05} ${h * 0.23} ${w * 0.2} ${h * 0.23}
                  L ${w * 0.80} ${h * 0.23} Q ${w * 0.95} ${h * 0.23} ${w * 0.95} ${h * 0.34}
                  L ${w * 0.95} ${h * 0.95} Q ${w * 0.95} ${h} ${w * 0.85} ${h}
                  L ${w * 0.15} ${h} Q ${w * 0.05} ${h} ${w * 0.05} ${h * 0.95} Z`}
              fill="var(--glass-fill)" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.10} y={h * 0.55} width={w * 0.80} height={h * 0.40} fill="var(--media)" opacity="0.8"/>
        <rect x={w * 0.18} y={h * 0.40} width={w * 0.64} height={h * 0.30} fill="rgba(255,255,255,0.7)" stroke={ink} strokeWidth="0.6"/>
        <text x={w / 2} y={h * 0.58} fontFamily="Inter" fontSize={Math.max(8, w * 0.16)} fontWeight="600" textAnchor="middle">DMEM</text>
      </g>
    );
  }
  if (k === "waste_jar") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x={w * 0.15} y="0" width={w * 0.70} height={h * 0.13} fill="#D33B33" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.08} y={h * 0.13} width={w * 0.84} height={h * 0.85} fill="var(--glass-fill)" stroke={ink} strokeWidth="2"/>
        <rect x={w * 0.12} y={h * 0.45} width={w * 0.76} height={h * 0.50} fill="var(--waste)" opacity="0.75"/>
      </g>
    );
  }
  if (k === "pipette") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect x={w * 0.2} y="0" width={w * 0.6} height={h * 0.25} fill="#3D4046" stroke={ink} strokeWidth="1.5"/>
        <rect x={w * 0.4} y={h * 0.25} width={w * 0.2} height={h * 0.65} fill="var(--glass-fill)" stroke={ink} strokeWidth="1.5"/>
        <path d={`M ${w * 0.4} ${h * 0.9} L ${w * 0.6} ${h * 0.9} L ${w / 2} ${h} Z`}
              fill="var(--glass-fill)" stroke={ink} strokeWidth="1.5"/>
      </g>
    );
  }
  // unknown asset — placeholder box
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={w} height={h} fill="#E0DDD2" stroke={ink} strokeWidth="2" strokeDasharray="5 4"/>
      <text x={w / 2} y={h / 2} fontFamily="Inter" fontSize="12" fill="var(--ink-soft)" textAnchor="middle">?</text>
    </g>
  );
}

// ── Compact stage scaffolding ────────────────────────────────────
function Stage({ n, title, kicker, children }) {
  return (
    <section className="stage-row">
      <div className="stage-num"><span className="serif">{n}</span></div>
      <div className="stage-head">
        <div className="kicker">{kicker}</div>
        <h2 className="serif">{title}</h2>
      </div>
      <div className="stage-body">{children}</div>
    </section>
  );
}

function StageGrid({ children }) {
  return <div className="stage-grid">{children}</div>;
}

function StageText({ children }) {
  return <div className="stage-text">{children}</div>;
}

function StageViz({ children, title }) {
  return (
    <div className="stage-viz">
      {title && <div className="stage-viz-title">{title}</div>}
      {children}
    </div>
  );
}

function CodeCard({ children, title }) {
  return (
    <div className="code-card">
      {title && <div className="code-card-title">{title}</div>}
      <pre className="mono">{children}</pre>
    </div>
  );
}

function DataTable({ headers, rows, dense = false }) {
  return (
    <div className={`dt-wrap ${dense ? 'dense' : ''}`}>
      <table className="dt">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tiny pill
function Pill({ children, kind }) {
  return <span className={`pill ${kind || ''}`}>{children}</span>;
}

Object.assign(window, {
  SceneCanvas, ItemArt, Stage, StageGrid, StageText, StageViz,
  CodeCard, DataTable, Pill,
  STARTER_YAML, STARTER_YAML_ROW_SLOT, INHERITANCE_DEMO,
});
