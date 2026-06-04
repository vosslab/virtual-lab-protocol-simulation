// src/shell/regions/GuidanceBar.tsx
//
// Current step guidance bar content component.
// Renders snapshot.current_prompt inside the teal guidance bar.
// The CSS rule adds the "Current Step Guidance: " prefix via ::before,
// so this component renders only the prompt text.
//
// Props:
//   snapshot -- Accessor<ShellViewSnapshot> for current_prompt
//
// Mounts into #guidance-text in protocol_host.tsx.

import type { Accessor, JSXElement } from "solid-js";
import type { ShellViewSnapshot } from "../adapter/types";

//============================================
// Component
//============================================

export interface GuidanceBarProps {
  snapshot: Accessor<ShellViewSnapshot>;
}

export function GuidanceBar(props: GuidanceBarProps): JSXElement {
  // Show current_prompt; fall back to empty string while loading.
  const prompt_text = (): string => props.snapshot().current_prompt ?? "";

  const guidance_element = <span>{prompt_text()}</span>;
  return guidance_element;
}
