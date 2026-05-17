/**
 * chrome/prompt_panel.ts
 *
 * Renders step prompt verbatim into the prompt panel.
 * Uses textContent (NOT innerHTML) to prevent XSS and automatically escape user content.
 */

import type { Step } from '../types';

/**
 * Render the current step's prompt into the prompt panel.
 * Clears and re-populates the panel with the step's prompt verbatim.
 * Uses textContent to automatically escape user content.
 *
 * @param panel The HTMLElement to render into (typically from mountSceneFrame).
 * @param step The Step object containing the prompt, or null to clear the panel.
 */
export function renderPromptPanel(panel: HTMLElement, step: Step | null): void {
	// Clear existing content
	panel.innerHTML = '';

	// If no step, leave panel empty
	if (!step) {
		return;
	}

	// Create a prompt text container and set content via textContent to prevent XSS
	const promptText = document.createElement('div');
	promptText.className = 'prompt-text';
	promptText.setAttribute('data-testid', 'prompt-panel-text');
	promptText.textContent = step.prompt;

	// Append to panel
	panel.appendChild(promptText);
}
