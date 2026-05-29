// src/shell/regions/TipsBubble.tsx
//
// WP-CHROME-3: Professor-tip bubble content component.
// Renders the tip text from the snapshot inside the .tips-bubble region.
// When current_tip is null (no tip authored for this step), shows the
// generic fallback "Follow the current step guidance." per the task spec.
// Does NOT duplicate the guidance bar's prompt text.
//
// Props:
//   snapshot -- Accessor<ShellViewSnapshot> for current_tip
//
// Mounts into #tips-text in protocol_host.tsx.

import type { Accessor, JSXElement } from "solid-js";
import type { ShellViewSnapshot } from "../adapter/types";

//============================================
// Constants
//============================================

// Generic fallback shown when no tip is authored for the current step.
const TIPS_FALLBACK = "Follow the current step guidance.";

//============================================
// Component
//============================================

export interface TipsBubbleProps {
  snapshot: Accessor<ShellViewSnapshot>;
}

export function TipsBubble(props: TipsBubbleProps): JSXElement {
  // Show current_tip if non-null and non-empty, else show the generic fallback.
  // This is intentionally NOT the prompt text (that lives in the guidance bar).
  const tip_text = (): string => {
    const tip = props.snapshot().current_tip;
    if (tip !== null && tip.trim() !== "") {
      return tip;
    }
    return TIPS_FALLBACK;
  };

  const bubble_content = <span>{tip_text()}</span>;
  return bubble_content;
}
