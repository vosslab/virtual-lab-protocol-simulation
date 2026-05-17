/**
 * chrome/feedback_area.ts
 *
 * Renders feedback messages in a dismissable area. Uses textContent (NOT innerHTML)
 * to prevent XSS. Feedback is shown when message is non-null; hidden when null.
 * The area is dismissable via a close button or by clicking the area itself.
 */

/**
 * Render feedback message into the feedback area.
 * When message is null, hides the area. When non-null, shows the area with
 * the message content and a dismiss button.
 *
 * @param area The HTMLElement to render into (typically from mountSceneFrame).
 * @param message The feedback message text, or null to hide the area.
 */
export function renderFeedback(area: HTMLElement, message: string | null): void {
	// Clear existing content
	area.innerHTML = '';

	// If no message, hide the area
	if (message === null) {
		area.style.display = 'none';
		return;
	}

	// Show the area
	area.style.display = 'block';

	// Create the feedback message text container and set content via textContent
	const feedbackText = document.createElement('div');
	feedbackText.className = 'feedback-text';
	feedbackText.textContent = message;

	// Create the dismiss button
	const dismissButton = document.createElement('button');
	dismissButton.className = 'feedback-dismiss-button';
	dismissButton.setAttribute('data-testid', 'feedback-dismiss');
	dismissButton.textContent = 'Dismiss';

	// Handler to dismiss the feedback
	const handleDismiss = (): void => {
		renderFeedback(area, null);
	};

	// Attach click handler to dismiss button
	dismissButton.addEventListener('click', handleDismiss);

	// Also allow clicking the area itself to dismiss (but not the button)
	area.addEventListener('click', (event: MouseEvent) => {
		// Only dismiss if the click is on the area itself, not on the dismiss button
		if (event.target === area) {
			handleDismiss();
		}
	});

	// Append text and button to area
	area.appendChild(feedbackText);
	area.appendChild(dismissButton);
}
