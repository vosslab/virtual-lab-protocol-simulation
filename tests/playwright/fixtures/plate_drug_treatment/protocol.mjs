// Plate drug treatment fixture protocol configuration.
// Vertical proof: step 1 only (open_plate_workspace, modal kind).

export const plateDrugTreatmentProtocol = {
	protocolType: 'mini_protocol',
	id: 'plate_drug_treatment',
	title: 'Plate Drug Treatment',
	description: 'Vertical proof: open_plate_workspace step via well_plate adapter.',
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
	],
};
