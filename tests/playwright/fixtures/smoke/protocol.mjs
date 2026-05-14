// Smoke fixture protocol configuration.
// Exercises one completionPath.kind per step.
// dev_smoke type is exempt from curriculum gates.

export const smokeProtocol = {
	protocolType: 'dev_smoke',
	id: 'smoke',
	title: 'Smoke Test Protocol',
	description: 'Synthetic protocol exercising all completionPath.kind types.',
	entry: {
		scene: 'smoke_scene',
		step: 'smoke_interaction_step',
	},
	learning: {
		objectives: 'Students completing this smoke fixture will have achieved basic walker engine validation.',
		outcomes: 'Students completing this smoke fixture will be able to run end-to-end smoke tests.',
		goals: 'Overall, this smoke fixture aims to accomplish walker validation across all step types.',
	},
	steps: [
		{
			id: 'smoke_interaction_step',
			label: 'Interaction Sequence Step',
			action: 'Click tool, source, destination in order.',
			why: 'Tests interactionSequence completionPath.kind.',
			scene: 'smoke_scene',
			completionPath: {
				kind: 'interactionSequence',
				completionEvent: 'smoke_interaction_complete',
				tool: 'smoke_tool',
				source: 'smoke_source',
				destination: 'smoke_dest',
			},
			nextId: 'smoke_direct_step',
		},
		{
			id: 'smoke_direct_step',
			label: 'Direct Tool Step',
			action: 'Click tool directly.',
			why: 'Tests directTool completionPath.kind.',
			scene: 'smoke_scene',
			completionPath: {
				kind: 'directTool',
				completionEvent: 'smoke_direct_complete',
				tool: 'smoke_direct_tool',
			},
			nextId: 'smoke_modal_step',
		},
		{
			id: 'smoke_modal_step',
			label: 'Modal Step',
			action: 'Click modal opener, then advance.',
			why: 'Tests modal completionPath.kind.',
			scene: 'smoke_scene',
			completionPath: {
				kind: 'modal',
				completionEvent: 'smoke_modal_complete',
				openClick: 'smoke_modal_opener',
				advanceClick: 'smoke_modal_advance',
			},
			nextId: 'smoke_choice_step',
		},
		{
			id: 'smoke_choice_step',
			label: 'Multiple Choice Step',
			action: 'Select the correct answer.',
			why: 'Tests multipleChoice completionPath.kind.',
			scene: 'smoke_scene',
			completionPath: {
				kind: 'multipleChoice',
				completionEvent: 'smoke_choice_complete',
				question: 'Which is correct?',
				choices: [
					{ id: 'smoke_choice_a', text: 'Wrong A', correct: false },
					{ id: 'smoke_choice_b', text: 'Correct', correct: true },
					{ id: 'smoke_choice_c', text: 'Wrong C', correct: false },
				],
			},
		},
	],
};
