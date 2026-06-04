// src/shell/regions/StepCounter.tsx
//
// Step counter component.
// Renders "completed / total" from snapshot.progress inside the green
// step-counter box. No score -- step count only per the plan (no scoring
// system exists in spec or runtime).
//
// Props:
//   snapshot -- Accessor<ShellViewSnapshot> for progress
//
// Mounts into #step-counter-text in protocol_host.tsx.

import type { Accessor, JSXElement } from "solid-js";
import type { ShellViewSnapshot } from "../adapter/types";

//============================================
// Component
//============================================

export interface StepCounterProps {
  snapshot: Accessor<ShellViewSnapshot>;
}

export function StepCounter(props: StepCounterProps): JSXElement {
  // Render "completed / total" step count.
  const counter_text = (): string => {
    const p = props.snapshot().progress;
    return `${p.completed_step_count} / ${p.total_step_count}`;
  };

  const counter_element = <span>{counter_text()}</span>;
  return counter_element;
}
