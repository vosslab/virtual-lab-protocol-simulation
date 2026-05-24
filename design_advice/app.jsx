/* global React, jsyaml, runPipeline, OBJECT_LIBRARY, ASSET_SPECS, WORKSPACE_ROW_LIBRARY,
   SceneCanvas, ItemArt, Stage, StageGrid, StageText, StageViz,
   CodeCard, DataTable, Pill, STARTER_YAML, STARTER_YAML_ROW_SLOT, INHERITANCE_DEMO,
   resolveInheritance, bindObjects, groupByZone, normalizeSchema */

const { useState, useMemo, useRef, useEffect } = React;

// ─────────────────────────────────────────────────────────────
// App — strategy document with live worked example.
function App() {
  const [schema, setSchema] = useState("zone_bounds"); // or "row_slot"
  const [yamlByMode, setYamlByMode] = useState({
    zone_bounds: STARTER_YAML,
    row_slot: STARTER_YAML_ROW_SLOT,
  });
  const yamlText = yamlByMode[schema];
  const setYamlText = (v) => setYamlByMode(prev => ({ ...prev, [schema]: v }));

  const [showOverlay, setShowOverlay] = useState({ zones: true, baselines: true, footprints: false, anchors: false, labels: true });

  const { scene, parseError } = useMemo(() => {
    try {
      const s = jsyaml.load(yamlText);
      return { scene: s, parseError: null };
    } catch (e) {
      return { scene: null, parseError: e.message };
    }
  }, [yamlText]);

  const run = useMemo(() => {
    if (!scene) return null;
    try { return runPipeline(scene); }
    catch (e) { return { _error: e.message }; }
  }, [scene]);

  // The stage data
  const stageBound      = run?.stages.bound      || [];
  const stageGrouped    = run?.stages.grouped    || { groups: new Map(), orphans: [] };
  const stageHorizontal = run?.stages.horizontal || new Map();
  const stageVertical   = run?.stages.vertical   || new Map();
  const stageLabelled   = run?.stages.labelled   || new Map();
  const stageClamped    = run?.stages.clamped    || new Map();
  const finalItems      = run?.final || [];

  // flatten helpers
  const flattenMap = (m) => {
    const out = [];
    for (const arr of m.values()) for (const it of arr) out.push(it);
    return out;
  };

  return (
    <div className="page">
      <HeroBlock/>
      <PipelineDiagram/>

      <SectionDivider title="Worked example" subtitle="One scene, two authoring shapes, traced through every stage." num="00"/>
      <SchemaPicker schema={schema} onChange={setSchema}/>
      <div className="yaml-block">
        <div className="yaml-col">
          <div className="yaml-toolbar">
            <span className="mono">{schema === "row_slot" ? "scene_row_slot.yaml" : "scene.yaml"}</span>
            <div className="yaml-actions">
              <button onClick={() => setYamlText(schema === "row_slot" ? STARTER_YAML_ROW_SLOT : STARTER_YAML)} className="ghost-btn">Reset</button>
              {parseError
                ? <span className="status err">YAML error</span>
                : <span className="status ok">parsed · {(run?.scene?.zones?.length) || 0} zones · {(run?.scene?.placements?.length) || 0} placements</span>}
            </div>
          </div>
          <textarea
            className="yaml-edit mono"
            value={yamlText}
            spellCheck={false}
            onChange={(e) => setYamlText(e.target.value)}
          />
          {parseError && <div className="yaml-err mono">{parseError}</div>}
        </div>
        <div className="preview-col">
          <div className="preview-title">Live preview · viewport 1920×1080</div>
          <SceneCanvas
            scene={scene}
            items={finalItems}
            showSceneBounds
            showZones={showOverlay.zones}
            showBaselines={showOverlay.baselines}
            showFootprints={showOverlay.footprints}
            showAnchors={showOverlay.anchors}
            showLabels={showOverlay.labels}
            showArt
            height={460}
          />
          <div className="overlay-toggles">
            {Object.keys(showOverlay).map(k => (
              <label key={k} className="ot">
                <input type="checkbox" checked={showOverlay[k]}
                       onChange={() => setShowOverlay(s => ({ ...s, [k]: !s[k] }))}/>
                <span>{k}</span>
              </label>
            ))}
          </div>
          <DiagnosticsPanel diagnostics={run?.diagnostics || []}/>
        </div>
      </div>

      <Stage n="01" kicker="Stage 1 · Inputs"
             title="Three closed sources of truth feed the pipeline.">
        <StageGrid>
          <StageText>
            <p>Before any positioning happens, the engine has gathered three things:</p>
            <ul>
              <li><b className="mono">scene.yaml</b> — the only thing an author writes today. Declares <Pill>scene_bounds</Pill>, <Pill>zones</Pill>, <Pill>placements</Pill>, <Pill>layout_rules</Pill>. Geometry-free at the placement level: references each object by name only.</li>
              <li><b className="mono">content/objects/*</b> — the canonical object library. Each object owns its <Pill>kind</Pill>, <Pill>label</Pill>, <Pill>layout</Pill> defaults (default_width, label_width, anchor_y), and a state→visual map.</li>
              <li><b className="mono">ASSET_SPECS</b> — SVG-side metrics (default_width, label_width, aspect ratio). The aspect ratio is the only way height enters the layout calculation; YAML never specifies height.</li>
            </ul>
            <p className="sub">Plus the runtime viewport size — usually <Pill>1920×1080</Pill>. The pipeline is pure: same inputs → same pixels.</p>
          </StageText>
          <StageViz>
            <div className="three-cards">
              <CodeCard title="scene.yaml (excerpt)">
                {`scene_bounds:
  left: 1
  right: 99
  top: 5
  bottom: 95

zones:
  - id: center
    bounds: { left: 20, right: 80,
              top: 45, bottom: 75 }
    baseline: 72
    align: center

placements:
  - placement_name: center_heat_block
    object_name: heat_block
    zone: center
    depth_tier: 1`}
              </CodeCard>
              <CodeCard title="objects/equipment/heat_block.yaml">
                {`object_name: heat_block
kind: equipment
label: Heat block

capabilities:
  - clickable
  - instrument_with_setpoint

layout:
  default_width: 18
  label_width: 12
  anchor_y: bottom`}
              </CodeCard>
              <CodeCard title="ASSET_SPECS (TypeScript)">
                {`heat_block: {
  default_width: 18,
  label_width:   12,
  aspect:        1.35,
},
microtube_rack: {
  default_width: 13,
  label_width:   10,
  aspect:        1.55,
},`}
              </CodeCard>
            </div>
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="02" kicker="Stage 2 · Schema normalize"
             title="Two authoring shapes converge on one zone schema before layout runs.">
        <StageGrid>
          <StageText>
            <p>Authors pick between two shapes for the same scene:</p>
            <ul>
              <li><b>Schema A · zone+bounds.</b> Author writes <Pill>zones[]</Pill> with explicit <Pill>bounds</Pill> percentages, <Pill>align</Pill>, and <Pill>baseline</Pill>. Maximum flexibility, but every author repeats the same geometry for the same workspace.</li>
              <li><b>Schema B · row+slot.</b> Author writes <Pill>rows[]</Pill> with a <Pill>row_name</Pill> from the workspace's closed row library, plus an ordered <Pill>slots[]</Pill>. Zero coordinate authoring; row identity supplies geometry.</li>
            </ul>
            <p>The normalize stage detects which shape was authored. For Schema B, it looks up each <Pill>row_name</Pill> in <Pill className="mono">WORKSPACE_ROW_LIBRARY[workspace]</Pill>, builds a zone for each row, and assigns <Pill>depth_tier</Pill> from slot index. The output is always Schema A — every stage below is identical regardless of input shape.</p>
            <p className="sub">An unknown <Pill>row_name</Pill> for the scene's workspace is an authoring error: the row is dropped and recorded in the trace. New rows require an edit to the row library, not a YAML field.</p>
          </StageText>
          <StageViz title={`Detected source · ${run?.stages?.normalized?.source || "n/a"}`}>
            <SchemaNormalizeViz
              source={run?.stages?.normalized?.source}
              trace={run?.stages?.normalized?.trace || []}
              workspace={run?.sourceScene?.workspace}
              rowLibrary={WORKSPACE_ROW_LIBRARY}
              normalScene={scene}
            />
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="03" kicker="Stage 3 · Resolve inheritance"
             title="Walk the extends chain, then apply four operations in fixed order.">
        <StageGrid>
          <StageText>
            <p>A protocol-scoped scene starts from a base via <Pill>extends</Pill>, then mutates the inherited placement list. The four mutation keys run in <b>this exact order</b> so the result is deterministic regardless of YAML field order:</p>
            <ol>
              <li><b className="mono">remove_placements</b> — drop from the inherited set entirely.</li>
              <li><b className="mono">deactivate_placements</b> — keep but mark inactive (not laid out, but still part of the scene registry).</li>
              <li><b className="mono">reposition_placements</b> — override <Pill>zone</Pill> / <Pill>depth_tier</Pill> / <Pill>align_stop</Pill> / <Pill>layout</Pill> on an inherited placement.</li>
              <li><b className="mono">add_placements</b> — append protocol-specific objects.</li>
            </ol>
            <p>Output: one flat list of resolved placements, each tagged with provenance (<Pill>from: base</Pill> or <Pill>from: own</Pill>). Inheritance runs on the normalized scene — both authoring shapes support extends identically.</p>
          </StageText>
          <StageViz>
            <InheritanceVisualizer/>
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="04" kicker="Stage 4 · Bind objects"
             title="Look up each placement's object and merge layout hints.">
        <StageGrid>
          <StageText>
            <p>Each placement names an object by <Pill>object_name</Pill>. The library resolves identity (kind, label, capabilities), the SVG asset, and the layout-hint defaults — including <Pill>display_width_cm</Pill>, which Stage 5 will consume. Per-placement <Pill>layout</Pill> overrides win over object defaults; identity and capabilities are <b>locked</b> at the object layer and cannot be overridden.</p>
            <p>The asset lookup pulls the natural aspect ratio — the only way height enters the math.</p>
            <p className="sub">An unresolved <Pill>object_name</Pill> is a build error; the validator must reject before this stage runs. In runtime mode, a missing object emits an <Pill kind="kind">unknown_object</Pill> diagnostic and the placement is dropped from layout.</p>
          </StageText>
          <StageViz title="Bound placements after stage 4">
            <BindingTable bound={stageBound}/>
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="05" kicker="Stage 5 · Scale to real-world dimensions"
             title="Apply the cm × px_per_cm sizing model, per SCALING_MODEL.md.">
        <StageGrid>
          <StageText>
            <p>Authors don't write <Pill>width_scale</Pill>. They write <Pill>display_width_cm</Pill> on each object — the <i>exaggerated</i> real-world width (a vortex is 15 cm in life but ~22 cm on screen). Each <Pill>workspace</Pill> carries its own <Pill>px_per_cm</Pill> in a constants module:</p>
            <pre className="mono small">{`bench:        3.2 px/cm   // dense 7-item row at 1280
hood:         8.0 px/cm
microscope:   8.0 px/cm
incubator:    6.0 px/cm
plate_reader: 8.0 px/cm`}</pre>
            <p>The engine computes <Pill>_width_scale</Pill> for every placement:</p>
            <pre className="mono small">{`width_scale = (display_width_cm × px_per_cm)
              ÷ (default_width × 11.52)

// 11.52 is the empirical px_per_scene_percent
// at 1280 viewport, 90% usable area`}</pre>
            <p>This is the dial that makes hood scenes feel spacious and bench scenes dense at the same viewport. Per-object <Pill>fudge</Pill> multiplies the final scale for one-off visual fixes. Objects without <Pill>display_width_cm</Pill> fall back to a hardcoded <Pill>layout.width_scale</Pill> — that's the migration escape hatch.</p>
          </StageText>
          <StageViz title={`Computed _width_scale · workspace ${run?.scene?.workspace || "—"} · px_per_cm ${WORKSPACE_PX_PER_CM[run?.scene?.workspace] ?? "n/a"}`}>
            <ScaleTable scaled={run?.stages?.scaled || []}/>
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="06" kicker="Stage 6 · Group + sort"
             title="Place each item in its zone bucket, sorted by depth_tier.">
        <StageGrid>
          <StageText>
            <p>Sort by <Pill>depth_tier</Pill> ascending, then by <Pill>placement_name</Pill> for stability. An unknown <Pill>zone</Pill> is an authoring error — the item lands in the <b>orphans</b> bucket and is never rendered.</p>
            <p>This is the last fully order-preserving stage. From here, alignment and overflow rules can change x positions, but the bucket membership is frozen.</p>
          </StageText>
          <StageViz title="Zone buckets">
            <ZoneBuckets scene={scene} groups={stageGrouped.groups} orphans={stageGrouped.orphans}/>
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="07" kicker="Stage 7 · Horizontal layout"
             title="Per zone, distribute items horizontally by alignment rule.">
        <StageGrid>
          <StageText>
            <p>Inside each zone, the engine computes a <b>footprint</b> per item:</p>
            <pre className="mono small">{`footprint = max(
  visual_width × width_scale × depth_scale,
  label_width capped at footprint × 2.5
)`}</pre>
            <p>Then applies one of five alignment modes:</p>
            <ul>
              <li><Pill>left</Pill> — first visual edge flush left.</li>
              <li><Pill>right</Pill> — last visual edge flush right.</li>
              <li><Pill>center</Pill> — cluster midpoint on zone midline.</li>
              <li><Pill>justify</Pill> — first and last edges flush; gaps expand.</li>
              <li><Pill>tab-stops</Pill> — partition by <Pill>align_stop</Pill> (left / center / right) and run three sub-layouts in one row.</li>
            </ul>
            <p>If items don't fit, gaps shrink first, then footprints scale toward <Pill>MIN_SCALE = 0.55</Pill>. Past that floor, gaps go negative — visible overlap is the intentional signal that the zone is overloaded.</p>
          </StageText>
          <StageViz title="Footprints + x-positions">
            <SceneCanvas
              scene={scene}
              items={flattenMap(stageHorizontal)}
              showSceneBounds showZones showFootprints showAnchors
              height={360}
            />
            <div className="legend">
              <span className="lg-dot" style={{ background: 'var(--sc-footprint)' }}/> footprint span
              <span className="lg-dot" style={{ background: 'var(--accent)' }}/> placement anchor (x = center, y = baseline)
            </div>
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="08" kicker="Stage 8 · Vertical layout"
             title="Resolve baseline + anchor → top, derive height from aspect.">
        <StageGrid>
          <StageText>
            <p>Each zone declares a <Pill>baseline</Pill>. The engine applies depth offset (<Pill>back -4</Pill> / <Pill>mid 0</Pill> / <Pill>front +4</Pill>), then a per-placement <Pill>baseline_override</Pill> if present.</p>
            <p>Height comes from the asset's aspect ratio times the current visual width, scaled by the viewport aspect (so a square asset at 16:9 viewport renders with the right pixel proportions). YAML never names a height.</p>
            <p>The anchor determines what touches the baseline:</p>
            <ul>
              <li><Pill>bottom</Pill> — object's bottom edge on baseline. The default for benchtop containers.</li>
              <li><Pill>tip</Pill> — object's tip touches baseline, adjusted by <Pill>anchor_y_offset</Pill>. Used for pipettes, transfer tools.</li>
              <li><Pill>top</Pill> — centered around baseline (fallback).</li>
            </ul>
          </StageText>
          <StageViz title="Baselines + computed boxes">
            <SceneCanvas
              scene={scene}
              items={flattenMap(stageVertical)}
              showSceneBounds showZones showBaselines showArt
              height={420}
            />
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="09" kicker="Stage 9 · Label layout"
             title="Place labels under items; wrap at center-nearest space; nudge collisions.">
        <StageGrid>
          <StageText>
            <p>Each label centers below its item at <Pill>label_offset_y</Pill> below the baseline. A small three-pass collision routine — within one zone only — nudges overlapping neighbors symmetrically, then clamps everything inside the padded zone bounds.</p>
            <p>Labels never cross zone boundaries. If a zone is too crowded to fit all labels at min font size, the renderer is allowed to suppress secondary labels — that's a render-layer policy, not an engine one.</p>
            <p className="sub">Visual targets: every label ≥ 11 px after layout. Zero clipped or overflowed label boxes is a hard requirement for label_readability ≥ 75.</p>
          </StageText>
          <StageViz title="Labels positioned after collision nudge">
            <SceneCanvas
              scene={scene}
              items={flattenMap(stageLabelled)}
              showSceneBounds showZones showBaselines showArt showLabels
              height={460}
            />
          </StageViz>
        </StageGrid>
      </Stage>

      <Stage n="10" kicker="Stage 10 · Scene-bounds clamp + render"
             title="Translate any escaping zone group back inside scene_bounds, then paint.">
        <StageGrid>
          <StageText>
            <p>A final group-level translation pass. If any zone's items collectively escape <Pill>scene_bounds</Pill>, the engine shifts the whole zone by a single (dx, dy) to bring it back in — preserving alignment semantics across the group rather than independently clamping each item.</p>
            <p>If a group is too wide to fit even after translation, the engine logs a warning and prefers the edge that matches the zone's alignment (right-aligned groups honor the right edge first).</p>
            <p>Then for each computed item: emit absolutely-positioned DOM with <Pill>left/top/width/height</Pill> in percent, attach the resolved SVG (preserving aspect via <Pill>preserveAspectRatio="xMidYMid meet"</Pill> and <Pill>object-fit: contain</Pill>), wire <Pill>data-item-id</Pill> for click dispatch.</p>
          </StageText>
          <StageViz title="Final rendered scene">
            <SceneCanvas
              scene={scene}
              items={finalItems}
              showSceneBounds showArt showLabels
              height={520}
            />
            <div className="legend">
              <span className="lg-dot" style={{ background: '#FCFAF1', border: '1px solid #C9C3B5' }}/> viewport (1920×1080)
              <span className="lg-dot" style={{ background: 'transparent', border: '2px dashed var(--sc-bounds)' }}/> scene_bounds
            </div>
          </StageViz>
        </StageGrid>
      </Stage>

      <ClosingBlock/>

      <footer className="footer">
        <span className="mono">scene-layout strategy · live worked example · {finalItems.length} placements rendered</span>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components used by stages.

function HeroBlock() {
  return (
    <header className="hero">
      <div className="hero-kicker mono">SCENE-LAYOUT PIPELINE · STRATEGY DOC</div>
      <h1 className="serif">From scene.yaml<br/><span className="hero-accent">to a positioned 2D space.</span></h1>
      <p className="hero-sub">
        Eight pure stages turn an author-written YAML configuration into a rendered scene at 1920×1080.
        Each stage has one job, a closed set of inputs, and a verifiable output. The same scene flows
        through all of them so you can watch the data shape evolve alongside the visual state.
      </p>
    </header>
  );
}

function PipelineDiagram() {
  const stages = [
    { n: "01", t: "Inputs", d: "scene + objects + assets" },
    { n: "02", t: "Schema normalize", d: "row_slot → zone+bounds" },
    { n: "03", t: "Inheritance", d: "extends → resolved list" },
    { n: "04", t: "Bind objects", d: "placement ⇆ object" },
    { n: "05", t: "Scale", d: "cm × px_per_cm → width_scale" },
    { n: "06", t: "Group + sort", d: "items per zone, by depth" },
    { n: "07", t: "Horizontal", d: "alignment, footprint, overflow" },
    { n: "08", t: "Vertical", d: "baseline + anchor → height" },
    { n: "09", t: "Labels", d: "wrap + collision nudge" },
    { n: "10", t: "Clamp + render", d: "scene_bounds → DOM" },
  ];
  return (
    <div className="pipe-diagram">
      {stages.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="pipe-step">
            <div className="pipe-num mono">{s.n}</div>
            <div className="pipe-t serif">{s.t}</div>
            <div className="pipe-d">{s.d}</div>
          </div>
          {i < stages.length - 1 && <div className="pipe-arrow">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
}

function SectionDivider({ title, subtitle, num }) {
  return (
    <div className="section-divider">
      <div className="sd-num mono">{num}</div>
      <div>
        <div className="sd-title serif">{title}</div>
        {subtitle && <div className="sd-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

// Inheritance demo: shows base + extending scene side by side, then resolved.
function InheritanceVisualizer() {
  const { base, extender } = INHERITANCE_DEMO;
  // Build a minimal pretend pipeline: resolveInheritance with base in the map
  const baseMap = { [base.scene_name]: base };
  const result = resolveInheritance(extender, baseMap);

  return (
    <div className="inh-viz">
      <div className="inh-cols">
        <CodeCard title="base · bench_basic">
{`placements:
  - rear_left_waste
  - rear_right_vortex`}
        </CodeCard>
        <CodeCard title="extender · drug_dilution_setup_bench_setup">
{`extends: bench_basic

# real protocol scene uses only add_placements;
# remove/deactivate/reposition shown for pedagogy.

remove_placements:
  - placement_name: _demo_old_buffer
deactivate_placements:
  - placement_name: rear_right_vortex
reposition_placements:
  - placement_name: rear_left_waste
    zone: rear_center
    depth_tier: 4
add_placements:
  - rear_left_carboplatin_stock
  - rear_center_metformin_stock
  - rear_right_sterile_water
  - center_microtube_intermediate
  - center_dilution_tube_rack
  - right_tool_micropipette
  - right_tool_tip_box`}
        </CodeCard>
      </div>
      <div className="inh-ops">
        {result.operations.map((op, i) => (
          <div key={i} className={`inh-op op-${op.op}`}>
            <span className="op-name mono">{op.op}</span>
            <span className="op-target mono">{op.target || ""}</span>
            {op.removed !== undefined && <span className="op-meta">(removed {op.removed})</span>}
            {op.count !== undefined && <span className="op-meta">(inherited {op.count})</span>}
            {op.to_zone && <span className="op-meta">→ {op.to_zone}</span>}
          </div>
        ))}
      </div>
      <div className="inh-result">
        <div className="inh-r-title mono">resolved placements ({result.placements.filter(p => p.active).length} active)</div>
        <div className="inh-chips">
          {result.placements.map((p, i) => (
            <div key={i} className={`inh-chip ${p.active ? '' : 'inactive'} from-${p._from || 'own'}`}>
              <span className="mono">{p.placement_name}</span>
              <span className="mini">{p._from || 'own'}{!p.active && ' · deactivated'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bind-objects table
function BindingTable({ bound }) {
  if (!bound.length) return <div className="empty">no placements parsed</div>;
  return (
    <DataTable
      headers={["placement_name", "→ object", "kind", "label", "asset", "width", "aspect", "anchor"]}
      rows={bound.map(p => [
        <span className="mono">{p.placement_name}</span>,
        <span className="mono">{p.object_name}</span>,
        <Pill kind="kind">{p.kind}</Pill>,
        <span>{p.label}</span>,
        <span className="mono small">{p.asset}</span>,
        <span className="mono small">{p.layout?.default_width}</span>,
        <span className="mono small">{p.aspect?.toFixed?.(2)}</span>,
        <span className="mono small">{p.layout?.anchor_y}</span>,
      ])}
      dense
    />
  );
}

// Zone buckets visual
function ZoneBuckets({ scene, groups, orphans }) {
  if (!scene) return null;
  return (
    <div className="zone-buckets">
      {scene.zones.map((z, i) => {
        const arr = groups.get(z.id) || [];
        return (
          <div key={z.id} className="zb">
            <div className="zb-head">
              <div className="zb-id mono">{z.id}</div>
              <div className="zb-align"><Pill kind="kind">align: {z.align || "left"}</Pill></div>
            </div>
            <div className="zb-items">
              {arr.length === 0 && <div className="zb-empty">— empty —</div>}
              {arr.map((it, j) => (
                <div key={j} className="zb-item">
                  <span className="zb-rank mono">tier {it.depth_tier ?? 0}</span>
                  <span className="mono">{it.placement_name}</span>
                  <span className="zb-obj mono small">{it.object_name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {orphans.length > 0 && (
        <div className="zb orphan">
          <div className="zb-head">
            <div className="zb-id mono">orphans · unresolved zone</div>
          </div>
          <div className="zb-items">
            {orphans.map((it, j) => (
              <div key={j} className="zb-item err">
                <span className="mono">{it.placement_name}</span>
                <span className="zb-obj mono small">→ zone: {it.zone}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClosingBlock() {
  return (
    <section className="closing">
      <div className="closing-kicker mono">PIPELINE INVARIANTS</div>
      <h2 className="serif">Ten stages, one law each.</h2>
      <ul className="closing-list">
        <li><b>Each stage is pure.</b> Same inputs → same outputs. No global state, no DOM dependencies, no side effects. The whole pipeline is a single composition of functions.</li>
        <li><b>The two authoring shapes converge by stage 2.</b> Schema A (zone+bounds) is the canonical form; Schema B (row+slot) normalizes into it. Every stage past 02 sees only Schema A.</li>
        <li><b>Vocabularies are layered, never crossed.</b> Protocol writes intent. Object owns identity. Scene owns geometry. Layout owns position. None of them name an SVG asset path or pixel coordinate that belongs to another layer.</li>
        <li><b>YAML never names a height.</b> Height is derived from asset aspect ratio. This is the single rule that prevents authors from accidentally cropping glassware.</li>
        <li><b>Size is authored in centimeters, not pixels.</b> Each object declares <span className="mono">display_width_cm</span>; the scene's <span className="mono">px_per_cm</span> (3.2 bench / 8 hood / 8 scope / 6 incubator) converts to width_scale. The per-workspace dial is how content density is tuned at the same viewport.</li>
        <li><b>Diagnostics are first-class output.</b> Every stage pushes structured diagnostics onto a shared array; the runtime emits, the validator throws. No silent drops.</li>
        <li><b>Overflow is visible, not hidden.</b> When a zone is overloaded, items overlap rather than disappear or clamp silently. The visible overlap is the diagnostic.</li>
        <li><b>scene_bounds is a final-pass safety net.</b> Not a layout tool. If a zone only fits because the bounds shift it, the zone geometry is wrong — fix it there.</li>
        <li><b>The row library is a closed surface.</b> Adding a new row_name requires a code edit, not a YAML edit. This is what keeps row-slot scenes from drifting into ad-hoc geometry.</li>
        <li><b>The walker is the contract.</b> Every clickable target the protocol names must resolve to a visible DOM element with <span className="mono">data-item-id</span>. If it doesn't, the YAML, the scene, or the runtime is incomplete — never the walker.</li>
      </ul>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Schema picker — toggle between zone+bounds and row+slot starters.
function SchemaPicker({ schema, onChange }) {
  return (
    <div className="schema-picker">
      <div className="sp-label mono">authoring shape</div>
      <div className="sp-options">
        <button
          className={`sp-opt ${schema === "zone_bounds" ? "active" : ""}`}
          onClick={() => onChange("zone_bounds")}
        >
          <div className="sp-opt-h serif">Schema A · zone + bounds</div>
          <div className="sp-opt-d">explicit coordinates · max flexibility</div>
        </button>
        <button
          className={`sp-opt ${schema === "row_slot" ? "active" : ""}`}
          onClick={() => onChange("row_slot")}
        >
          <div className="sp-opt-h serif">Schema B · row + slot</div>
          <div className="sp-opt-d">coordinate-free · closed row vocabulary</div>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stage 02 viz — shows what the normalize step did.
function SchemaNormalizeViz({ source, trace = [], workspace, rowLibrary, normalScene }) {
  const lib = rowLibrary?.[workspace] || [];
  return (
    <div className="sn-viz">
      <div className="sn-row">
        <div className="sn-detected">
          <div className="sn-kicker mono">DETECTED INPUT</div>
          <div className={`sn-badge ${source === "row_slot" ? "rs" : "zb"}`}>
            {source === "row_slot" ? "row + slot · Schema B" : "zone + bounds · Schema A"}
          </div>
        </div>
        <div className="sn-arrow">→</div>
        <div className="sn-detected">
          <div className="sn-kicker mono">PIPELINE PROCEEDS WITH</div>
          <div className="sn-badge zb">zone + bounds (canonical)</div>
        </div>
      </div>

      <div className="sn-section">
        <div className="sn-section-h mono">workspace row library · <b>{workspace || "—"}</b></div>
        <div className="sn-rows">
          {lib.length === 0 && <div className="empty">no workspace library entries</div>}
          {lib.map((r, i) => {
            const used = source === "row_slot" && trace.some(t => t.op === "row→zone" && t.row === r.row_name);
            return (
              <div key={i} className={`sn-row-card ${used ? "used" : ""}`}>
                <div className="sn-row-name mono">{r.row_name}</div>
                <div className="sn-row-bounds mono">
                  L{r.bounds.left} R{r.bounds.right} · T{r.bounds.top} B{r.bounds.bottom}
                </div>
                <div className="sn-row-meta mono small">
                  align: {r.align} · baseline {r.baseline}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {source === "row_slot" && (
        <div className="sn-section">
          <div className="sn-section-h mono">resolved zones</div>
          <div className="sn-resolved">
            {(normalScene?.zones || []).map((z, i) => (
              <div key={i} className="sn-resolved-card">
                <span className="mono">{z.id}</span>
                <span className="sn-arrow-mini">→</span>
                <span className="mono small">
                  {z.bounds.left},{z.bounds.top} · {z.bounds.right - z.bounds.left}×{z.bounds.bottom - z.bounds.top}
                </span>
                <span className="sn-resolved-cnt mono small">
                  {(normalScene.placements || []).filter(p => p.zone === z.id).length} placements
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {trace.length > 0 && (
        <div className="sn-section">
          <div className="sn-section-h mono">normalize trace</div>
          <div className="sn-trace">
            {trace.map((t, i) => (
              <div key={i} className={`sn-trace-line ${t.op === "row_missing" ? "err" : ""}`}>
                <span className="op-name mono">{t.op}</span>
                {t.value && <span className="mono">{t.value}</span>}
                {t.row && <span className="mono">{t.row}</span>}
                {t.slots !== undefined && <span className="op-meta">({t.slots} slots)</span>}
                {t.workspace && <span className="op-meta">workspace: {t.workspace}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Scale table — for each placement, show display_width_cm × px_per_cm /
// (default_width × 11.52) → _width_scale. Highlights the cm-model rows.
function ScaleTable({ scaled }) {
  if (!scaled.length) return <div className="empty">no placements parsed</div>;
  return (
    <DataTable
      headers={["placement_name", "display_cm", "× px/cm", "÷ default × 11.52", "= _width_scale", "source"]}
      rows={scaled.map(p => {
        const cm = p.layout?.display_width_cm;
        const pxPerCm = p._px_per_cm;
        const def = p.layout?.default_width;
        const scaleStr = (p._width_scale ?? 1).toFixed(3);
        const numer = cm != null && pxPerCm != null ? (cm * pxPerCm).toFixed(1) : "—";
        const denom = def != null ? (def * 11.52).toFixed(1) : "—";
        return [
          <span className="mono">{p.placement_name}</span>,
          <span className="mono small">{cm ?? "—"} cm</span>,
          <span className="mono small">{pxPerCm ?? "—"}</span>,
          <span className="mono small">{numer} ÷ {denom}</span>,
          <span className="mono"><b>{scaleStr}</b></span>,
          <Pill kind={p._scale_source === "cm_model" ? "kind" : ""}>{p._scale_source}</Pill>,
        ];
      })}
      dense
    />
  );
}

// Diagnostics sidebar — appears under the live preview if any present.
function DiagnosticsPanel({ diagnostics }) {
  if (!diagnostics || diagnostics.length === 0) {
    return (
      <div className="diag-panel diag-clean">
        <span className="mono">no diagnostics · layout clean</span>
      </div>
    );
  }
  const by = {};
  for (const d of diagnostics) {
    by[d.severity] = (by[d.severity] || 0) + 1;
  }
  return (
    <div className="diag-panel">
      <div className="diag-head mono">
        diagnostics ·{" "}
        {by.error ? <span className="diag-err">{by.error} error</span> : null}
        {by.error && by.warn ? " · " : ""}
        {by.warn ? <span className="diag-warn">{by.warn} warn</span> : null}
      </div>
      <ul className="diag-list">
        {diagnostics.map((d, i) => (
          <li key={i} className={`diag-row diag-${d.severity}`}>
            <span className="diag-stage mono">{d.stage}</span>
            <span className="diag-kind mono">{d.kind}</span>
            {d.placement_name && <span className="mono small">{d.placement_name}</span>}
            {d.row && <span className="mono small">row: {d.row}</span>}
            {d.zone && <span className="mono small">zone: {d.zone}</span>}
            {d.object_name && <span className="mono small">obj: {d.object_name}</span>}
            {d.overflow_pct != null && <span className="mono small">+{d.overflow_pct}%</span>}
            {d.dx != null && <span className="mono small">dx {d.dx}</span>}
            {d.dy != null && <span className="mono small">dy {d.dy}</span>}
            {d.between && <span className="mono small">{d.between.join(" ↔ ")}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
