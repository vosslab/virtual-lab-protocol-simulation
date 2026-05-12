// ============================================
// multiple_choice_prompt.ts - Render multiple-choice quiz UI
// ============================================

import type { ProtocolStep, CompletionPathMultipleChoice } from "../../constants";

//============================================

export function renderMultipleChoicePrompt(step: ProtocolStep): string {
	const cp = step.completionPath;
	if (!cp || cp.kind !== 'multipleChoice') {
		return '';
	}

	const question = cp.question;
	const choices = cp.choices;
	const stepId = step.id;

	// Build the choices HTML
	const choicesHtml = choices.map((choice) => {
		return `<button class="mc-choice-button" data-item-id="${choice.id}">${choice.text}</button>`;
	}).join('');

	const html = `
		<div class="multiple-choice-prompt">
			<div class="mc-question">
				<h2>${question}</h2>
			</div>
			<div class="mc-choice-grid">
				${choicesHtml}
			</div>
			<div class="mc-feedback" id="mc-feedback-${stepId}"></div>
		</div>
	`;

	return html;
}
