// src/shell/hud/ProtocolHud.tsx
//
// Protocol HUD: wires all six-region shell components into the framed
// interface (WP-CHROME-1 through WP-CHROME-3, M2).
//
// This component is mounted into #shell-root (a sibling of #scene-root,
// never an ancestor -- asset-crop rule). It does NOT render visible content
// itself; instead it mounts the four framed-interface region components
// into their respective DOM target elements using Solid's render():
//
//   #tips-text        <- TipsBubble (current_tip or fallback)
//   #step-counter-text <- StepCounter (completed / total)
//   #outline-steps    <- StepOutline (read-only ordered step cards)
//   #guidance-text    <- GuidanceBar (current_prompt)
//
// The data-hud-* attributes on the inner container are retained for
// backward compatibility with Playwright tests that query them.
//
// Props:
//   snapshot -- Accessor<ShellViewSnapshot> providing live protocol state
//   steps    -- ordered list of ProtocolStep from config.steps (for outline)

import type { Accessor, JSXElement } from "solid-js";
import { onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import type { ProtocolStep, ShellViewSnapshot } from "../adapter/types";
import { TipsBubble } from "../regions/TipsBubble.js";
import { StepCounter } from "../regions/StepCounter.js";
import { StepOutline } from "../regions/StepOutline.js";
import { GuidanceBar } from "../regions/GuidanceBar.js";

//============================================
// Component props
//============================================

export interface ProtocolHudProps {
  snapshot: Accessor<ShellViewSnapshot>;
  // Ordered step list from config.steps for the read-only outline.
  // When absent (e.g. sequence_runner with no steps list), outline is empty.
  steps?: ReadonlyArray<ProtocolStep>;
}

//============================================
// Helpers
//============================================

// Mount a Solid component into a DOM element by ID.
// Returns a cleanup function (unmounts when called).
// Logs a warning if the target element is not found so the failure is
// visible but does not throw and crash the whole protocol host.
function mount_into(element_id: string, component: () => JSXElement): (() => void) | null {
  const el = document.getElementById(element_id);
  if (!(el instanceof HTMLElement)) {
    // eslint-disable-next-line no-console
    console.warn(`ProtocolHud: target element #${element_id} not found; region skipped`);
    return null;
  }
  // Clear any static placeholder text before mounting the Solid component.
  // Solid's render() REPLACES the target's contents (not append); clearing first
  // is a defensive guard against stale static HTML that might survive a remount
  // (e.g. "Loading..." from a server-side render or template placeholder).
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const cleanup = render(component, el);
  return cleanup;
}

//============================================
// Component implementation
//============================================

export function ProtocolHud(props: ProtocolHudProps): JSXElement {
  // Track cleanup functions for all mounted sub-components.
  const cleanups: Array<() => void> = [];

  onMount(() => {
    // TipsBubble -> #tips-text
    const tips_cleanup = mount_into("tips-text", () => <TipsBubble snapshot={props.snapshot} />);
    if (tips_cleanup) cleanups.push(tips_cleanup);

    // StepCounter -> #step-counter-text
    const counter_cleanup = mount_into("step-counter-text", () => (
      <StepCounter snapshot={props.snapshot} />
    ));
    if (counter_cleanup) cleanups.push(counter_cleanup);

    // StepOutline -> #outline-steps
    const outline_steps = props.steps ?? [];
    const outline_cleanup = mount_into("outline-steps", () => (
      <StepOutline steps={outline_steps} snapshot={props.snapshot} />
    ));
    if (outline_cleanup) cleanups.push(outline_cleanup);

    // GuidanceBar -> #guidance-text
    const guidance_cleanup = mount_into("guidance-text", () => (
      <GuidanceBar snapshot={props.snapshot} />
    ));
    if (guidance_cleanup) cleanups.push(guidance_cleanup);
  });

  // Unmount all sub-components when this HUD is disposed.
  onCleanup(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  });

  // Invisible container in #shell-root. Preserves data-hud-* attributes for
  // backward-compat with Playwright selectors that query these.
  const hud_element = (
    <div class="protocol-hud" aria-hidden="true">
      <span data-hud-step>{props.snapshot().current_step_name ?? ""}</span>
      <span data-hud-prompt>{props.snapshot().current_prompt ?? ""}</span>
      <span data-hud-progress>
        {props.snapshot().progress.completed_step_count}
        {"/"}
        {props.snapshot().progress.total_step_count}
      </span>
    </div>
  );

  return hud_element;
}
