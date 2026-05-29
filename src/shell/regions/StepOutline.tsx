// src/shell/regions/StepOutline.tsx
//
// WP-CHROME-2: Read-only step outline component.
// Renders the ordered list of protocol steps as cards in the outline panel.
// Highlights the current step, greys previous steps, and shows upcoming steps.
// NO click navigation. Display only.
//
// Props:
//   steps    -- ordered list of ProtocolStep objects from config.steps
//   snapshot -- Accessor<ShellViewSnapshot> for current_step_name
//
// DOM output mounts into #outline-steps via render() in protocol_host.tsx.

import type { Accessor, JSXElement } from "solid-js";
import { For } from "solid-js";
import type { ProtocolStep, ShellViewSnapshot } from "../adapter/types";

//============================================
// Types
//============================================

export interface StepOutlineProps {
  steps: ReadonlyArray<ProtocolStep>;
  snapshot: Accessor<ShellViewSnapshot>;
}

// Step status relative to the current active step.
type StepStatus = "previous" | "current" | "upcoming";

//============================================
// Helpers
//============================================

// Compute the status of a step given the current step name.
// Steps before the current step in the ordered list are "previous";
// the matching step is "current"; later steps are "upcoming".
// When current_step_name is null (before the machine starts or after
// completion), all steps show as "upcoming".
function compute_step_status(
  step_name: string,
  current_step_name: string | null,
  ordered_step_names: ReadonlyArray<string>,
): StepStatus {
  if (current_step_name === null) {
    return "upcoming";
  }
  const current_idx = ordered_step_names.indexOf(current_step_name);
  const this_idx = ordered_step_names.indexOf(step_name);

  // Step not found in ordered list: treat as upcoming.
  if (this_idx === -1) {
    return "upcoming";
  }
  if (this_idx < current_idx) {
    return "previous";
  }
  if (this_idx === current_idx) {
    return "current";
  }
  return "upcoming";
}

// Trim a prompt string to a short label for the outline card.
// Shows up to 60 chars with an ellipsis if truncated.
function short_label(prompt: string): string {
  const MAX = 60;
  if (prompt.length <= MAX) {
    return prompt;
  }
  return prompt.slice(0, MAX - 1) + "...";
}

//============================================
// Component
//============================================

export function StepOutline(props: StepOutlineProps): JSXElement {
  // Derive ordered list of step names once (stable across renders).
  const ordered_names: ReadonlyArray<string> = props.steps.map((s) => s.step_name);

  const outline_element = (
    <For each={props.steps}>
      {(step) => {
        // Reactive: re-evaluates when snapshot changes (i.e. when current step changes).
        const status = (): StepStatus =>
          compute_step_status(step.step_name, props.snapshot().current_step_name, ordered_names);

        const card_element = (
          <div
            class="outline-step-card"
            data-step-name={step.step_name}
            data-step-status={status()}
            aria-current={status() === "current" ? "step" : undefined}
          >
            {short_label(step.prompt)}
          </div>
        );
        return card_element;
      }}
    </For>
  );

  return outline_element;
}
