/**
 * chrome/next_button.ts
 *
 * Renders a next button that advances the protocol. Button visibility is controlled
 * by the visible flag; click handler is wired via the onClick callback.
 */

interface NextButtonOptions {
  visible: boolean;
  onClick: () => void;
}

/**
 * Render or update the next button state.
 * Shows/hides the button based on the visible flag; wires click handler.
 *
 * @param button The HTMLElement to render into (typically from mountSceneFrame).
 * @param options Configuration: visible flag and onClick handler.
 */
export function renderNextButton(
  button: HTMLElement,
  options: NextButtonOptions,
): void {
  // Clear existing content
  button.innerHTML = "";

  // If not visible, hide the container and return
  if (!options.visible) {
    button.style.display = "none";
    return;
  }

  // Show the container
  button.style.display = "flex";

  // Create the button element
  const nextBtn = document.createElement("button");
  nextBtn.className = "next-button";
  nextBtn.setAttribute("data-testid", "next-button");
  nextBtn.textContent = "Next";
  nextBtn.style.display = "block"; // Override the CSS default of display: none

  // Attach click handler
  nextBtn.addEventListener("click", options.onClick);

  // Append button to container
  button.appendChild(nextBtn);
}
