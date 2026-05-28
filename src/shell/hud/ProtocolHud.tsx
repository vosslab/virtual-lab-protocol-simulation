// src/shell/hud/ProtocolHud.tsx
//
// Renders the protocol HUD: step name, prompt, and progress indicator.
// Pure presentation. No emitter access. No subscriptions inside the
// component (caller passes Accessor). No DOM imperative work.
//
// Props:
//   snapshot -- Accessor<ShellViewSnapshot> providing live protocol state
//
// Layout (semantic, no inline styles; CSS in src/style.css):
//   - Outer container with class `protocol-hud`
//   - Three regions with stable data-* selectors:
//     * data-hud-step: current step name
//     * data-hud-prompt: current prompt text
//     * data-hud-progress: completed/total steps

import type { Accessor, JSXElement } from "solid-js";
import type { ShellViewSnapshot } from "../adapter/types";

//============================================
// Component props
//============================================

export interface ProtocolHudProps {
  snapshot: Accessor<ShellViewSnapshot>;
}

//============================================
// Component implementation
//============================================

export function ProtocolHud(props: ProtocolHudProps): JSXElement {
  // Render the HUD with three semantic regions.
  // Each region carries stable data-hud-* selectors for testing.
  const hud_element = (
    <div class="protocol-hud">
      <section data-hud-step>{props.snapshot().current_step_name ?? ""}</section>
      <section data-hud-prompt>{props.snapshot().current_prompt ?? ""}</section>
      <section data-hud-progress>
        {props.snapshot().progress.completed_step_count}
        {"/"}
        {props.snapshot().progress.total_step_count}
      </section>
    </div>
  );

  return hud_element;
}
