// Plate drug treatment fixture: full protocol with all 9 steps.
// Generated from content/plate_drug_treatment/protocol.yaml

export const plateDrugTreatmentFullProtocol = {
	protocolType: 'mini_protocol',
	id: 'plate_drug_treatment',
	title: 'Plate Drug Treatment',
	description: 'Full protocol: all 9 steps from content/plate_drug_treatment/protocol.yaml',
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
						consumesVolumeMl: 0.010,
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
						consumesVolumeMl: 0.990,
						completionEvent: 'carb_first_dilution_done',
					},
				],
				tubeTargets: [
					{
						source: 'carboplatin_stock_solution',
						diluent: 'media',
						destination: 'dilution_tube_carb_b',
						soluteVolumeMl: 0.010,
						diluentVolumeMl: 0.990,
						resultLiquid: 'carboplatin',
						resultLabel: '4 uM carboplatin working solution',
					},
				],
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
						consumesVolumeMl: 0.040,
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
						consumesVolumeMl: 0.960,
						completionEvent: 'carb_last_dilution_done',
					},
				],
				tubeTargets: [
					{
						source: 'carboplatin_stock_solution',
						diluent: 'media',
						destination: 'dilution_tube_carb_h',
						soluteVolumeMl: 0.040,
						diluentVolumeMl: 0.960,
						resultLiquid: 'carboplatin',
						resultLabel: '400 uM carboplatin working solution',
					},
				],
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
						consumesVolumeMl: 0.200,
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
						consumesVolumeMl: 0.800,
						completionEvent: 'metformin_dilution_done',
					},
				],
				tubeTargets: [
					{
						source: 'metformin_stock_solution',
						diluent: 'media',
						destination: 'dilution_tube_metformin_working',
						soluteVolumeMl: 0.200,
						diluentVolumeMl: 0.800,
						resultLiquid: 'metformin',
						resultLabel: '200 mM metformin working solution',
					},
				],
			},
		},

		// Step 5: Add media to columns 1-6
		{
			id: 'add_media_cols_1_6',
			label: 'Add 95 uL media to columns 1-6',
			action: 'Use the multichannel pipette to apply media to rows B-H, columns 1-6',
			why: 'Add media first so each well has the correct working volume before any drugs.',
			scene: 'well_plate_workspace',
			requiredItems: ['well_plate', 'multichannel_pipette', 'media_bottle'],
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
						consumesVolumeMl: 0.095,
						completionEvent: 'media-cols-1-6-confirm',
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
			},
		},

		// Step 6: Add media to columns 7-12
		{
			id: 'add_media_cols_7_12',
			label: 'Add 90 uL media to columns 7-12',
			action: 'Use the multichannel pipette to apply media to rows B-H, columns 7-12',
			why: 'These wells will also receive metformin, so they get less media to stay at 200 uL total.',
			scene: 'well_plate_workspace',
			requiredItems: ['well_plate', 'multichannel_pipette', 'media_bottle'],
			stepIndex: 6,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'media_bottle',
						liquid: 'media',
						volumeMl: 0.090,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'well_plate',
						liquid: 'media',
						consumesVolumeMl: 0.090,
						completionEvent: 'media-cols-7-12-confirm',
					},
				],
				plateTargets: [
					{
						rows: ['B', 'C', 'D', 'E', 'F', 'G', 'H'],
						cols: [7, 8, 9, 10, 11, 12],
						liquid: 'media',
						volumeMl: 0.090,
						label: '90 uL media to rows B-H, columns 7-12',
					},
				],
			},
		},

		// Step 7: Add carboplatin 1-2-5 dose series
		{
			id: 'add_carboplatin',
			label: 'Add carboplatin 1-2-5 dose series (rows B-H)',
			action: 'Add 5 uL carboplatin working solution per well, one row at a time',
			why: 'The 1-2-5 dose series (0.1, 0.2, 0.5, 1, 2, 5, 10 uM final) gives clean log-spaced doses for graphing.',
			scene: 'well_plate_workspace',
			requiredItems: [
				'well_plate',
				'multichannel_pipette',
				'dilution_tube_carb_b',
				'dilution_tube_carb_c',
				'dilution_tube_carb_d',
				'dilution_tube_carb_e',
				'dilution_tube_carb_f',
				'dilution_tube_carb_g',
				'dilution_tube_carb_h',
			],
			stepIndex: 7,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					// Row B: 0.1 uM final (4 uM working stock)
					{
						tool: 'multichannel_pipette',
						source: 'dilution_tube_carb_b',
						liquid: 'carboplatin',
						volumeMl: 0.005,
					},
					{ tool: 'multichannel_pipette', destination: 'well_plate', liquid: 'carboplatin', consumesVolumeMl: 0.005 },
					// Row C: 0.2 uM final (8 uM working stock)
					{ tool: 'multichannel_pipette', source: 'dilution_tube_carb_c', liquid: 'carboplatin', volumeMl: 0.005 },
					{ tool: 'multichannel_pipette', destination: 'well_plate', liquid: 'carboplatin', consumesVolumeMl: 0.005 },
					// Row D: 0.5 uM final (20 uM working stock)
					{ tool: 'multichannel_pipette', source: 'dilution_tube_carb_d', liquid: 'carboplatin', volumeMl: 0.005 },
					{ tool: 'multichannel_pipette', destination: 'well_plate', liquid: 'carboplatin', consumesVolumeMl: 0.005 },
					// Row E: 1 uM final (40 uM working stock)
					{ tool: 'multichannel_pipette', source: 'dilution_tube_carb_e', liquid: 'carboplatin', volumeMl: 0.005 },
					{ tool: 'multichannel_pipette', destination: 'well_plate', liquid: 'carboplatin', consumesVolumeMl: 0.005 },
					// Row F: 2 uM final (80 uM working stock)
					{ tool: 'multichannel_pipette', source: 'dilution_tube_carb_f', liquid: 'carboplatin', volumeMl: 0.005 },
					{ tool: 'multichannel_pipette', destination: 'well_plate', liquid: 'carboplatin', consumesVolumeMl: 0.005 },
					// Row G: 5 uM final (200 uM working stock)
					{ tool: 'multichannel_pipette', source: 'dilution_tube_carb_g', liquid: 'carboplatin', volumeMl: 0.005 },
					{ tool: 'multichannel_pipette', destination: 'well_plate', liquid: 'carboplatin', consumesVolumeMl: 0.005 },
					// Row H: 10 uM final (400 uM working stock)
					{ tool: 'multichannel_pipette', source: 'dilution_tube_carb_h', liquid: 'carboplatin', volumeMl: 0.005 },
					{
						tool: 'multichannel_pipette',
						destination: 'well_plate',
						liquid: 'carboplatin',
						consumesVolumeMl: 0.005,
						completionEvent: 'carb-add-confirm',
					},
				],
				plateTargets: [
					{ rows: ['B'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '0.1 uM carboplatin working solution to row B' },
					{ rows: ['C'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '0.2 uM carboplatin working solution to row C' },
					{ rows: ['D'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '0.5 uM carboplatin working solution to row D' },
					{ rows: ['E'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '1 uM carboplatin working solution to row E' },
					{ rows: ['F'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '2 uM carboplatin working solution to row F' },
					{ rows: ['G'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '5 uM carboplatin working solution to row G' },
					{ rows: ['H'], cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liquid: 'carboplatin', volumeMl: 0.005, label: '10 uM carboplatin working solution to row H' },
				],
			},
		},

		// Step 8: Add metformin
		{
			id: 'add_metformin',
			label: 'Add 5 mM metformin to columns 7-12',
			action: 'Use the multichannel pipette to apply metformin working solution to rows B-H, columns 7-12',
			why: 'Metformin is the fixed modifier drug, applied only to the combination-treatment columns.',
			scene: 'well_plate_workspace',
			requiredItems: ['well_plate', 'multichannel_pipette', 'dilution_tube_metformin_working'],
			stepIndex: 8,
			completionPath: {
				kind: 'interactionSequence',
				interactions: [
					{
						tool: 'multichannel_pipette',
						source: 'dilution_tube_metformin_working',
						liquid: 'metformin',
						volumeMl: 0.005,
					},
					{
						tool: 'multichannel_pipette',
						destination: 'well_plate',
						liquid: 'metformin',
						consumesVolumeMl: 0.005,
						completionEvent: 'metformin-add-confirm',
					},
				],
				plateTargets: [
					{
						rows: ['B', 'C', 'D', 'E', 'F', 'G', 'H'],
						cols: [7, 8, 9, 10, 11, 12],
						liquid: 'metformin',
						volumeMl: 0.005,
						label: '5 mM metformin from 200 mM working solution to rows B-H, columns 7-12',
					},
				],
			},
		},

		// Step 9: Review loaded plate
		{
			id: 'review_loaded_plate',
			label: 'Review the loaded plate',
			action: 'Review the completed plate summary',
			why: 'Confirm that all wells are properly loaded and ready for incubation.',
			scene: 'well_plate_workspace',
			requiredItems: ['well_plate'],
			stepIndex: 9,
			completionPath: {
				kind: 'modal',
				openClick: 'well_plate',
				advanceClick: 'confirm-loaded-plate',
				completionEvent: 'review-loaded-plate',
			},
		},
	],
};
