/**
 * chrome/scene_frame.ts
 *
 * Minimal chrome scene frame: mounts a scene viewport and prompt panel
 * side-by-side or stacked. Exports a single mounting function that
 * builds DOM structure and returns element references for runtime use.
 *
 * Note: style.css is loaded separately by the HTML host or bundler.
 */

/**
 * Mount the scene frame chrome into a root element.
 * Returns references to the scene viewport, prompt panel, feedback area, and next button
 * for rendering and interaction.
 *
 * @param rootElement The HTMLElement to mount into.
 * @returns An object with sceneViewport, promptPanel, feedbackArea, and nextButton element references.
 */
export function mountSceneFrame(rootElement: HTMLElement): {
	sceneViewport: HTMLElement;
	promptPanel: HTMLElement;
	feedbackArea: HTMLElement;
	nextButton: HTMLElement;
} {
	// Clear any existing content
	rootElement.innerHTML = '';

	// Create the main chrome container
	const chrome = document.createElement('div');
	chrome.className = 'scene-chrome';

	// Create the scene viewport container
	const sceneViewport = document.createElement('div');
	sceneViewport.setAttribute('data-testid', 'scene-viewport');
	sceneViewport.className = 'scene-viewport';
	// Set pointer-events: none inline so the SVG scene (children) receives clicks, not the viewport.
	sceneViewport.style.pointerEvents = 'none';

	// Create the prompt panel container
	const promptPanel = document.createElement('div');
	promptPanel.setAttribute('data-testid', 'prompt-panel');
	promptPanel.className = 'prompt-panel';

	// Create the feedback area container
	const feedbackArea = document.createElement('div');
	feedbackArea.setAttribute('data-testid', 'feedback-area');
	feedbackArea.className = 'feedback-area';

	// Create the next button container
	const nextButton = document.createElement('div');
	nextButton.className = 'next-button-container';

	// Add viewport, prompt panel, feedback area, and next button to chrome
	chrome.appendChild(sceneViewport);
	chrome.appendChild(promptPanel);
	chrome.appendChild(feedbackArea);
	chrome.appendChild(nextButton);

	// Mount chrome to root
	rootElement.appendChild(chrome);

	return {
		sceneViewport,
		promptPanel,
		feedbackArea,
		nextButton,
	};
}
