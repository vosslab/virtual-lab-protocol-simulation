// Plate drug treatment fixture: real adapter test for steps 1-5.
// Step 1: open_plate_workspace (modal kind)
// Step 2: prep_carb_first_dilution (interactionSequence kind)
// Step 3: prep_carb_last_dilution (interactionSequence kind)
// Step 4: prep_metformin_dilution (interactionSequence kind)
// Step 5: add_media_cols_1_6 (interactionSequence kind with plateTargets)

export const plateDrugTreatmentFullProtocol = {
	protocolType: 'mini_protocol',
	id: 'plate_drug_treatment',
	title: 'Plate Drug Treatment - Real Adapter',
	description: 'Real adapter test: Steps 1-4 (modal + interactionSequence)',
	entry: {
		scene: 'well_plate_workspace',
		step: 'open_plate_workspace',
	},
	learning: {
		objectives: 'Students completing this mini-protocol will have achieved fluency with the OVCAR8 96-well plate map and the media-adjustment-before-drug ordering rule that keeps every well at a final 200 uL volume.',
		outcomes: 'Students completing this mini-protocol will be able to dose a 96-well assay plate Day-2 unsupervised using the 1-2-5 carboplatin dose series, fixed-dose metformin, and media-adjusted wells.',
		goals: 'Overall, this mini-protocol aims to accomplish the Day-2 plate dosing workflow, applying the dilution strategies and plate-loading discipline learned in the planning mini-protocol.',
	},
	steps: [
		// Step 1: Open plate workspace (modal kind)
		{
			id: 'open_plate_workspace',
			label: 'Open the 96-well plate workspace',
			action: 'Click the 96-well plate to enter the dedicated plate scene',
			why: 'Drug additions are easier to see when the plate is the whole scene, not a modal popup.',
			scene: 'well_plate_workspace',
			requiredItems: ['well_plate'],
			stepIndex: 1,
			completionPath: {
				kind: 'modal',
				openClick: 'well_plate',
				advanceClick: 'confirm-plate-intro',
				completionEvent: 'plate-workspace-opened',
			},
			nextId: 'prep_carb_first_dilution',
		},
		// Step 2: Prepare 4 uM carboplatin working solution (first dilution)
		{
			id: 'prep_carb_first_dilution',
			label: 'Prepare 4 uM carboplatin working solution (lowest dose)',
			action: 'Transfer stock carboplatin and media to dilution tube B',
			why: 'The lowest dose row needs the most heavily diluted working solution prepared first.',
			scene: 'well_plate_workspace',
			requiredItems: [
				'multichannel_pipette',
				'carboplatin_stock_solution',
				'media_bottle',
				'dilution_tube_carb_b',
			],
			stepIndex: 2,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'carboplatin_stock_solution',
						liquid: 'carboplatin',
						volumeMl: 0.010,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'dilution_tube_carb_b',
						liquid: 'carboplatin',
						volumeMl: 0.010,
					},
					{
						tool: 'multichannel_pipette',
						source: 'media_bottle',
						liquid: 'media',
						volumeMl: 0.990,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'dilution_tube_carb_b',
						liquid: 'media',
						volumeMl: 0.990,
					},
				],
				completionEvent: 'carb_first_dilution_done',
			},
		},
		// Step 3: Prepare 400 uM carboplatin working solution (last dilution)
		{
			id: 'prep_carb_last_dilution',
			label: 'Prepare 400 uM carboplatin working solution and load all intermediate dilutions',
			action: 'Transfer stock carboplatin and media to dilution tube H, then review pre-filled tubes C-G',
			why: 'The highest dose row needs a less diluted working solution. The middle rows follow the same dilution logic and are pre-filled for efficiency.',
			scene: 'well_plate_workspace',
			requiredItems: [
				'multichannel_pipette',
				'carboplatin_stock_solution',
				'media_bottle',
				'dilution_tube_carb_h',
				'dilution_tube_carb_c',
				'dilution_tube_carb_d',
				'dilution_tube_carb_e',
				'dilution_tube_carb_f',
				'dilution_tube_carb_g',
			],
			stepIndex: 3,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'carboplatin_stock_solution',
						liquid: 'carboplatin',
						volumeMl: 0.040,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'dilution_tube_carb_h',
						liquid: 'carboplatin',
						volumeMl: 0.040,
					},
					{
						tool: 'multichannel_pipette',
						source: 'media_bottle',
						liquid: 'media',
						volumeMl: 0.960,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'dilution_tube_carb_h',
						liquid: 'media',
						volumeMl: 0.960,
					},
				],
				completionEvent: 'carb_last_dilution_done',
			},
		},
		// Step 4: Prepare metformin working solution
		{
			id: 'prep_metformin_dilution',
			label: 'Prepare 200 mM metformin working solution',
			action: 'Transfer stock metformin and media to dilution tube',
			why: 'Metformin is the fixed modifier drug; the working solution is prepared the same way as carboplatin.',
			scene: 'well_plate_workspace',
			requiredItems: [
				'multichannel_pipette',
				'metformin_stock_solution',
				'media_bottle',
				'dilution_tube_metformin_working',
			],
			stepIndex: 4,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'metformin_stock_solution',
						liquid: 'metformin',
						volumeMl: 0.200,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'dilution_tube_metformin_working',
						liquid: 'metformin',
						volumeMl: 0.200,
					},
					{
						tool: 'multichannel_pipette',
						source: 'media_bottle',
						liquid: 'media',
						volumeMl: 0.800,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'dilution_tube_metformin_working',
						liquid: 'media',
						volumeMl: 0.800,
					},
				],
				completionEvent: 'metformin_dilution_done',
			},
		},
		// Step 5: Add media to columns 1-6
		{
			id: 'add_media_cols_1_6',
			label: 'Add 95 uL media to columns 1-6',
			action: 'Use the multichannel pipette to apply media to rows B-H, columns 1-6',
			why: 'Add media first so each well has the correct working volume before any drugs.',
			scene: 'well_plate_workspace',
			requiredItems: [
				'well_plate',
				'multichannel_pipette',
				'media_bottle',
			],
			stepIndex: 5,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'media_bottle',
						liquid: 'media',
						volumeMl: 0.095,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'well_plate',
						liquid: 'media',
						volumeMl: 0.095,
					},
				],
				plateTargets: [
					{
						rows: ['B', 'C', 'D', 'E', 'F', 'G', 'H'],
						cols: [1, 2, 3, 4, 5, 6],
						liquid: 'media',
						volumeMl: 0.095,
						label: '95 uL media to rows B-H, columns 1-6',
					},
				],
				completionEvent: 'media-cols-1-6-confirm',
			},
		},
	],
	parts: [],
	days: [],
};
