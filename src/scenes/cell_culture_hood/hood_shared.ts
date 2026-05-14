// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// hood_shared.ts - Shared hood utilities and setup
// Event listener setup used by both render.ts and cell_culture_hood.ts
//============================================

import { gameState, showNotification, renderGame } from "../../game_state";

//============================================
// setupHoodEventListeners(): void
//
// Wire click, drag-drop, and keyboard handlers for hood items
// Extracted to hood_shared.ts to avoid circular import between
// render.ts and cell_culture_hood.ts
//============================================
export function setupHoodEventListeners(onItemClick: (itemId: string) => void): void {
	const items = document.querySelectorAll('.hood-item');
	items.forEach((item) => {
		const el = item as HTMLElement;
		const itemId = el.getAttribute('data-item-id');
		if (!itemId) return;

		el.addEventListener('click', () => {
			onItemClick(itemId);
		});

		el.addEventListener('mouseenter', () => {
			el.style.filter = 'brightness(1.1)';
			el.style.transform = 'scale(1.05)';
		});
		el.addEventListener('mouseleave', () => {
			el.style.filter = '';
			el.style.transform = '';
		});

		el.addEventListener('dragstart', (e) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', itemId);
				e.dataTransfer.effectAllowed = 'move';
			}
			el.style.opacity = '0.5';
		});
		el.addEventListener('dragend', () => {
			el.style.opacity = '';
		});

		el.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
			el.classList.add('drag-hover');
		});
		el.addEventListener('dragleave', () => {
			el.classList.remove('drag-hover');
		});
		el.addEventListener('drop', (e) => {
			e.preventDefault();
			el.classList.remove('drag-hover');
			const draggedToolId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
			if (draggedToolId && draggedToolId !== itemId) {
				gameState.selectedTool = draggedToolId;
				onItemClick(itemId);
			}
		});
	});

	const putDownBtn = document.getElementById('put-down-btn');
	if (putDownBtn) {
		putDownBtn.addEventListener('click', () => {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Tool deselected.');
			renderGame();
		});
	}

	const hoodScene = document.getElementById('hood-scene');
	if (hoodScene) {
		hoodScene.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			if (gameState.selectedTool) {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				showNotification('Tool deselected.');
				renderGame();
			}
		});
	}

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && gameState.selectedTool) {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Tool deselected.');
			renderGame();
		}
	});
}
