// Interactions array fixture protocol configuration.
// Vertical proof: step 1 only (simple_interaction, interactionSequence kind with array form).

export const interactionsArrayProtocol = {
	protocolType: 'dev_smoke',
	id: 'interactions_array',
	title: 'Interactions Array Test',
	description: 'Vertical proof: interactions array form with tool, source, destination.',
	entry: {
		scene: 'well_plate_workspace',
		step: 'simple_interaction',
	},
	learning: {
		objectives: 'Students completing this mini-protocol will have achieved familiarity with the interactions array schema.',
		outcomes: 'Students completing this mini-protocol will be able to verify array-based interaction sequences.',
		goals: 'Overall, this mini-protocol aims to test the walker engine with array-form completionPath.',
	},
	steps: [
		{
			id: 'simple_interaction',
			label: 'Test interactions array form',
			action: 'Click through a sequence of interactions defined as an array',
			why: 'Ensures the walker engine correctly handles array-form interactions.',
			scene: 'well_plate_workspace',
			stepIndex: 1,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'media_bottle',
					},
					{
						tool: 'multichannel_pipette',
						destination: 'well_plate',
					},
				],
				completionEvent: 'interactions-array-done',
			},
		},
	],
};
