// SVG Picker: static three-pane review queue
// Loads candidates.json, missing_targets.json, suggestions.json
// Exports decisions.json with assigned/defer/ignore_intentional states

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
	targets: [],
	candidatesById: {},
	suggestionsByTarget: {},
	decisions: new Map(),
	selectedTargetIndex: 0,
	selectedCandidateIndex: 0,
	search: '',
	filters: {
		unassigned: false,
		needsAttribution: false,
		variantLooking: false,
	},
	multiSelect: new Set(),
	theme: 'light',
};

// ============================================
// INITIALIZATION
// ============================================

async function initPicker() {
	try {
		const [candidatesRes, targetsRes, suggestionsRes] = await Promise.all([
			fetch('candidates.json'),
			fetch('missing_targets.json'),
			fetch('suggestions.json'),
		]);

		if (!candidatesRes.ok || !targetsRes.ok || !suggestionsRes.ok) {
			showErrorBanner();
			return;
		}

		// candidates.json is a list[{id, ...}]; index by id for O(1) lookup.
		const candidatesList = await candidatesRes.json();
		state.candidatesById = {};
		for (const c of candidatesList) {
			state.candidatesById[c.id] = c;
		}

		// missing_targets.json is a flat list[target]; sort by state_family for grouping.
		state.targets = await targetsRes.json();
		state.targets.sort((a, b) => a.state_family.localeCompare(b.state_family));

		// suggestions.json is a list[{target_asset_name, ranked, ...}]; index by target name for O(1) lookup.
		const suggestionsList = await suggestionsRes.json();
		state.suggestionsByTarget = {};
		for (const s of suggestionsList) {
			state.suggestionsByTarget[s.target_asset_name] = s;
		}

		// Load localStorage session if present
		loadSessionOrPrompt();

		// Initialize UI
		restoreTheme();
		registerEventListeners();
		renderAll();
	} catch (err) {
		console.error('Failed to initialize picker:', err);
		showErrorBanner();
	}
}


function showErrorBanner() {
	const banner = document.getElementById('error-banner');
	banner.classList.add('show');
}

// ============================================
// LOAD SESSION OR PROMPT
// ============================================

function loadSessionOrPrompt() {
	const stored = localStorage.getItem('svg_picker.session.v1');
	if (stored) {
		const modal = document.getElementById('session-modal');
		modal.classList.add('show');

		document.getElementById('session-resume').addEventListener('click', () => {
			loadSession(stored);
			modal.classList.remove('show');
			renderAll();
		});

		document.getElementById('session-fresh').addEventListener('click', () => {
			localStorage.removeItem('svg_picker.session.v1');
			modal.classList.remove('show');
			renderAll();
		});
	}
}

function loadSession(json) {
	try {
		const data = JSON.parse(json);
		state.decisions = new Map(data.decisions);
		state.filters = data.filters;
		state.theme = data.theme;
		state.selectedTargetIndex = data.selectedTargetIndex || 0;
	} catch (err) {
		console.error('Failed to load session:', err);
	}
}

// ============================================
// AUTO-SAVE TO LOCALSTORAGE
// ============================================

function autoSaveSession() {
	const data = {
		decisions: Array.from(state.decisions.entries()),
		filters: state.filters,
		theme: state.theme,
		selectedTargetIndex: state.selectedTargetIndex,
	};
	localStorage.setItem('svg_picker.session.v1', JSON.stringify(data));
}

// ============================================
// THEME PERSISTENCE
// ============================================

function restoreTheme() {
	const stored = localStorage.getItem('svg_picker.theme');
	if (stored) {
		state.theme = stored;
	}
	applyTheme(state.theme);
}

function applyTheme(theme) {
	state.theme = theme;
	document.body.setAttribute('data-theme', theme);
	const toggle = document.getElementById('theme-toggle');
	toggle.textContent = theme === 'light' ? '\u2600' : '\u{1F319}';
	localStorage.setItem('svg_picker.theme', theme);
}

// ============================================
// EVENT LISTENERS
// ============================================

function registerEventListeners() {
	// Theme toggle
	document.getElementById('theme-toggle').addEventListener('click', () => {
		const newTheme = state.theme === 'light' ? 'dark' : 'light';
		applyTheme(newTheme);
		renderAll();
	});

	// Filter chips
	document.querySelectorAll('.chip').forEach(chip => {
		chip.addEventListener('click', () => {
			const filter = chip.dataset.filter;
			state.filters[filter] = !state.filters[filter];
			autoSaveSession();
			renderAll();
		});
	});

	// Export button
	document.getElementById('export-btn').addEventListener('click', exportDecisions);

	// Keyboard help
	document.getElementById('keyboard-help-btn').addEventListener('click', () => {
		document.getElementById('help-modal').classList.add('show');
	});

	document.getElementById('help-close').addEventListener('click', () => {
		document.getElementById('help-modal').classList.remove('show');
	});

	// Global keyboard handler
	document.addEventListener('keydown', handleGlobalKeydown);
}

function handleGlobalKeydown(ev) {
	// Ignore if search box is focused (except Escape)
	const search = document.getElementById('search-box');
	if (search && document.activeElement === search && ev.key !== 'Escape') {
		return;
	}

	const target = getSelectedTarget();
	if (!target) return;

	switch (ev.key) {
		case 'Enter':
			if (state.selectedCandidateIndex >= 0) {
				assignCurrentCandidate();
			}
			ev.preventDefault();
			break;

		case 'ArrowDown':
			navigateCandidate(1);
			ev.preventDefault();
			break;

		case 'ArrowUp':
			navigateCandidate(-1);
			ev.preventDefault();
			break;

		case '/':
			search?.focus();
			ev.preventDefault();
			break;

		case 'n':
			jumpToNextUnassigned();
			ev.preventDefault();
			break;

		case 'b':
			selectTarget(state.selectedTargetIndex - 1);
			ev.preventDefault();
			break;

		case '[':
			selectTarget(state.selectedTargetIndex - 1);
			ev.preventDefault();
			break;

		case ']':
			selectTarget(state.selectedTargetIndex + 1);
			ev.preventDefault();
			break;

		case 'd':
			deferTarget();
			ev.preventDefault();
			break;

		case 'i':
			promptIgnoreIntentional();
			ev.preventDefault();
			break;

		case 'x':
			hideCandidate();
			ev.preventDefault();
			break;

		case 'X':
			hideCandidateForFamily();
			ev.preventDefault();
			break;

		case 'Escape':
			if (search) {
				search.blur();
			}
			break;

		default:
			break;
	}
}

// ============================================
// RENDERING
// ============================================

function renderAll() {
	renderLeftPane();
	renderMiddlePane();
	renderRightPane();
}

function renderLeftPane() {
	const pane = document.getElementById('left-pane');
	pane.innerHTML = '';

	const filteredTargets = getFilteredTargets();
	const grouped = groupTargetsByFamily(filteredTargets);

	for (const family in grouped) {
		const group = grouped[family];
		const groupDiv = document.createElement('div');
		groupDiv.className = 'target-group';

		const headerDiv = document.createElement('div');
		headerDiv.className = 'group-header';

		const progress = getGroupProgress(group);
		headerDiv.innerHTML = `
			${family}
			<span class="group-progress">${progress.assigned}/${progress.total}</span>
		`;

		headerDiv.addEventListener('click', () => {
			// Select whole group for batch operations
			selectTargetGroup(group);
		});

		groupDiv.appendChild(headerDiv);

		for (const t of group) {
			const decision = state.decisions.get(t.asset_name);
			const itemDiv = document.createElement('div');
			itemDiv.className = 'target-item';

			if (state.selectedTargetIndex === state.targets.indexOf(t)) {
				itemDiv.classList.add('selected');
			}
			if (state.multiSelect.has(t.asset_name)) {
				itemDiv.classList.add('multi-selected');
			}

			const status = decision ? `[${decision.state.toUpperCase().substring(0, 1)}]` : '[ ]';
			itemDiv.innerHTML = `
				<div>${t.asset_name}</div>
				<div class="target-status">${status}</div>
			`;

			itemDiv.addEventListener('click', (ev) => {
				if (ev.shiftKey) {
					toggleMultiSelect(t.asset_name);
				} else {
					selectTarget(state.targets.indexOf(t));
				}
			});

			groupDiv.appendChild(itemDiv);
		}

		pane.appendChild(groupDiv);
	}

	updateProgressCounters();
	updateFilterChips();
}

function renderMiddlePane() {
	const pane = document.getElementById('middle-pane');
	pane.innerHTML = '';

	const target = getSelectedTarget();
	if (!target) {
		pane.innerHTML = '<div style="padding: 20px; color: var(--color-gray);">No targets to review.</div>';
		return;
	}

	const decision = state.decisions.get(target.asset_name);

	// Target context section
	const contextDiv = document.createElement('div');
	contextDiv.className = 'target-context';

	contextDiv.innerHTML = `
		<div class="asset-name">${target.asset_name}</div>
		<div class="context-item">
			<strong>Referenced by</strong>
			${target.referenced_by.map(p => `<code style="font-size: 11px;">${p}</code>`).join('<br>')}
		</div>
		<div class="context-item">
			<strong>Kind / Object</strong>
			${target.kind} / ${target.object_label}
		</div>
		<div class="context-item">
			<strong>Visual States</strong>
			<div class="visual-states">${target.visual_states || '(none)'}</div>
		</div>
		${target.variant_looking ? '<div class="variant-flag">Variant-looking</div>' : ''}
	`;

	if (decision && decision.state === 'ignore_intentional') {
		const reasonDiv = document.createElement('div');
		reasonDiv.className = 'context-item';
		reasonDiv.innerHTML = `
			<strong>Ignored reason</strong>
			${decision.reason || '(no reason given)'}
		`;
		contextDiv.appendChild(reasonDiv);
	}

	pane.appendChild(contextDiv);

	// Preview panel for currently highlighted candidate
	const previewDiv = document.createElement('div');
	previewDiv.className = 'preview-panel';

	const candidates = getVisibleCandidates(target);
	if (candidates.length > 0 && state.selectedCandidateIndex >= 0 && state.selectedCandidateIndex < candidates.length) {
		const cand = candidates[state.selectedCandidateIndex];
		const candData = state.candidatesById[cand.candidate_id];
		if (candData && candData.rel_path) {
			const img = document.createElement('img');
			img.className = 'preview-img';
			img.src = `file://${candData.rel_path}`;
			img.onerror = () => {
				previewDiv.innerHTML = '<div style="color: var(--color-gray); font-size: 12px;">Preview not available</div>';
			};
			previewDiv.appendChild(img);
		}
	}

	pane.appendChild(previewDiv);

	// Action bar for batch operations
	if (state.multiSelect.size > 0) {
		const actionDiv = document.createElement('div');
		actionDiv.className = 'action-bar';

		const btn1 = document.createElement('button');
		btn1.textContent = `Defer all ${state.multiSelect.size} selected`;
		btn1.addEventListener('click', () => {
			for (const assetName of state.multiSelect) {
				const t = state.targets.find(x => x.asset_name === assetName);
				if (t) {
					state.decisions.set(assetName, { asset_name: assetName, state: 'defer' });
				}
			}
			state.multiSelect.clear();
			autoSaveSession();
			renderAll();
		});
		actionDiv.appendChild(btn1);

		const btn2 = document.createElement('button');
		btn2.textContent = `Assign same candidate to all ${state.multiSelect.size}`;
		btn2.addEventListener('click', () => {
			const candidates = getVisibleCandidates(target);
			if (candidates.length > 0 && state.selectedCandidateIndex >= 0 && state.selectedCandidateIndex < candidates.length) {
				const cand = candidates[state.selectedCandidateIndex];
				for (const assetName of state.multiSelect) {
					const candData = state.candidatesById[cand.candidate_id];
					state.decisions.set(assetName, {
						asset_name: assetName,
						state: 'assigned',
						candidate_id: cand.candidate_id,
						source_repo: candData.source_repo,
						source_path: candData.rel_path,
						license_tag: candData.license_tag,
						license_confidence: candData.license_confidence,
					});
				}
				state.multiSelect.clear();
				autoSaveSession();
				renderAll();
			}
		});
		actionDiv.appendChild(btn2);

		const btn3 = document.createElement('button');
		btn3.textContent = `Ignore all ${state.multiSelect.size} (shared reason)`;
		btn3.addEventListener('click', () => {
			const reason = window.prompt('Enter reason for ignoring all selected targets:');
			if (reason && reason.trim()) {
				for (const assetName of state.multiSelect) {
					state.decisions.set(assetName, {
						asset_name: assetName,
						state: 'ignore_intentional',
						reason: reason.trim(),
					});
				}
				state.multiSelect.clear();
				autoSaveSession();
				renderAll();
			}
		});
		actionDiv.appendChild(btn3);

		pane.appendChild(actionDiv);
	}
}

function renderRightPane() {
	const pane = document.getElementById('right-pane');
	pane.innerHTML = '';

	const target = getSelectedTarget();
	if (!target) {
		return;
	}

	// Search box
	const searchDiv = document.createElement('div');
	const searchBox = document.createElement('input');
	searchBox.id = 'search-box';
	searchBox.className = 'search-box';
	searchBox.type = 'text';
	searchBox.placeholder = 'Search candidates...';
	searchBox.value = state.search;

	searchBox.addEventListener('input', (ev) => {
		state.search = ev.target.value;
		state.selectedCandidateIndex = 0;
		renderRightPane();
	});

	searchDiv.appendChild(searchBox);
	pane.appendChild(searchDiv);

	// Candidate grid
	const candidates = getVisibleCandidates(target);
	const gridDiv = document.createElement('div');
	gridDiv.className = 'candidate-grid';

	candidates.forEach((cand, idx) => {
		const candData = state.candidatesById[cand.candidate_id];
		if (!candData) return;

		const tile = document.createElement('div');
		tile.className = 'candidate-tile';

		if (idx === state.selectedCandidateIndex) {
			tile.classList.add('highlighted');
		}

		const decision = state.decisions.get(target.asset_name);
		if (decision && decision.state === 'assigned' && decision.candidate_id === cand.candidate_id) {
			tile.classList.add('selected');
		}

		// Match label
		const label = computeMatchLabel(cand);
		const labelDiv = document.createElement('div');
		labelDiv.className = `match-label ${label.class}`;
		labelDiv.textContent = label.text;
		labelDiv.title = `Score: ${(cand.score * 100).toFixed(0)}%`;

		// Image container
		const imgContainer = document.createElement('div');
		imgContainer.className = 'tile-image-container';

		const img = document.createElement('img');
		img.className = 'tile-image';
		img.src = candData.rel_path;
		img.onerror = () => {
			imgContainer.style.background = 'var(--color-gray)';
			imgContainer.innerHTML = '<span style="color: white; font-size: 10px;">Not found</span>';
		};

		imgContainer.appendChild(img);

		// Filename
		const filenameDiv = document.createElement('div');
		filenameDiv.className = 'tile-filename';
		filenameDiv.textContent = candData.filename;

		tile.appendChild(labelDiv);
		tile.appendChild(imgContainer);
		tile.appendChild(filenameDiv);

		tile.addEventListener('click', () => {
			state.selectedCandidateIndex = idx;
			assignCurrentCandidate();
			renderAll();
		});

		gridDiv.appendChild(tile);
	});

	pane.appendChild(gridDiv);
}

// ============================================
// FILTERING & NAVIGATION
// ============================================

function getFilteredTargets() {
	let filtered = state.targets.slice();

	if (state.filters.unassigned) {
		filtered = filtered.filter(t => {
			const d = state.decisions.get(t.asset_name);
			return !d || d.state === 'defer' || d.state === 'ignore_intentional';
		});
	}

	if (state.filters.variantLooking) {
		filtered = filtered.filter(t => t.variant_looking);
	}

	if (state.filters.needsAttribution) {
		filtered = filtered.filter(t => {
			const sugg = state.suggestionsByTarget[t.asset_name];
			if (!sugg || !sugg.ranked || sugg.ranked.length === 0) return false;
			const topCand = state.candidatesById[sugg.ranked[0].candidate_id];
			return topCand && topCand.attribution_required;
		});
	}

	return filtered;
}

function groupTargetsByFamily(targets) {
	const groups = {};
	for (const t of targets) {
		if (!groups[t.state_family]) {
			groups[t.state_family] = [];
		}
		groups[t.state_family].push(t);
	}
	return groups;
}

function getGroupProgress(group) {
	let assigned = 0;
	for (const t of group) {
		const d = state.decisions.get(t.asset_name);
		if (d && d.state === 'assigned') {
			assigned += 1;
		}
	}
	return { assigned, total: group.length };
}

function selectTarget(index) {
	const filtered = getFilteredTargets();
	if (index < 0) index = 0;
	if (index >= filtered.length) index = filtered.length - 1;
	if (index < 0) return;

	state.selectedTargetIndex = state.targets.indexOf(filtered[index]);
	state.selectedCandidateIndex = 0;
	state.search = '';
	renderAll();
}

function selectTargetGroup(group) {
	state.multiSelect.clear();
	for (const t of group) {
		state.multiSelect.add(t.asset_name);
	}
	renderAll();
}

function toggleMultiSelect(assetName) {
	if (state.multiSelect.has(assetName)) {
		state.multiSelect.delete(assetName);
	} else {
		state.multiSelect.add(assetName);
	}
	renderAll();
}

function jumpToNextUnassigned() {
	const filtered = getFilteredTargets();
	for (let i = 0; i < filtered.length; i++) {
		const t = filtered[i];
		const d = state.decisions.get(t.asset_name);
		if (!d || d.state !== 'assigned') {
			selectTarget(i);
			return;
		}
	}
}

function getSelectedTarget() {
	return state.targets[state.selectedTargetIndex] || null;
}

function getVisibleCandidates(target) {
	const sugg = state.suggestionsByTarget[target.asset_name];
	if (!sugg || !sugg.ranked) {
		return [];
	}

	let candidates = sugg.ranked.slice();

	// Filter out hidden candidates
	const decision = state.decisions.get(target.asset_name);
	if (decision && decision.hidden_candidates) {
		const hidden = new Set(decision.hidden_candidates);
		candidates = candidates.filter(c => !hidden.has(c.candidate_id));
	}

	// Apply search filter
	if (state.search.trim()) {
		const query = state.search.toLowerCase();
		candidates = candidates.filter(c => {
			const candData = state.candidatesById[c.candidate_id];
			if (!candData) return false;
			const filename = candData.filename.toLowerCase();
			const tokens = (candData.search_tokens || []).map(t => t.toLowerCase());
			return filename.includes(query) || tokens.some(t => t.includes(query));
		});
	}

	return candidates.slice(0, 100);
}

function navigateCandidate(delta) {
	const target = getSelectedTarget();
	if (!target) return;

	const candidates = getVisibleCandidates(target);
	state.selectedCandidateIndex += delta;

	if (state.selectedCandidateIndex < 0) state.selectedCandidateIndex = 0;
	if (state.selectedCandidateIndex >= candidates.length) {
		state.selectedCandidateIndex = candidates.length - 1;
	}

	renderRightPane();
}

// ============================================
// DECISION ACTIONS
// ============================================

function assignCurrentCandidate() {
	const target = getSelectedTarget();
	if (!target) return;

	const candidates = getVisibleCandidates(target);
	if (state.selectedCandidateIndex < 0 || state.selectedCandidateIndex >= candidates.length) {
		return;
	}

	const cand = candidates[state.selectedCandidateIndex];
	const candData = state.candidatesById[cand.candidate_id];

	state.decisions.set(target.asset_name, {
		asset_name: target.asset_name,
		state: 'assigned',
		candidate_id: cand.candidate_id,
		source_repo: candData.source_repo,
		source_path: candData.rel_path,
		license_tag: candData.license_tag,
		license_confidence: candData.license_confidence,
	});

	autoSaveSession();
	jumpToNextUnassigned();
	renderAll();
}

function deferTarget() {
	const target = getSelectedTarget();
	if (!target) return;

	state.decisions.set(target.asset_name, {
		asset_name: target.asset_name,
		state: 'defer',
	});

	autoSaveSession();
	jumpToNextUnassigned();
	renderAll();
}

function promptIgnoreIntentional() {
	const target = getSelectedTarget();
	if (!target) return;

	const reason = window.prompt('Why is this target intentionally ignored?');
	if (reason && reason.trim()) {
		state.decisions.set(target.asset_name, {
			asset_name: target.asset_name,
			state: 'ignore_intentional',
			reason: reason.trim(),
		});

		autoSaveSession();
		jumpToNextUnassigned();
		renderAll();
	}
}

function hideCandidate() {
	const target = getSelectedTarget();
	if (!target) return;

	const candidates = getVisibleCandidates(target);
	if (state.selectedCandidateIndex < 0 || state.selectedCandidateIndex >= candidates.length) {
		return;
	}

	const cand = candidates[state.selectedCandidateIndex];
	const decision = state.decisions.get(target.asset_name) || {
		asset_name: target.asset_name,
		state: 'defer',
	};

	if (!decision.hidden_candidates) {
		decision.hidden_candidates = [];
	}

	if (!decision.hidden_candidates.includes(cand.candidate_id)) {
		decision.hidden_candidates.push(cand.candidate_id);
	}

	state.decisions.set(target.asset_name, decision);
	autoSaveSession();
	state.selectedCandidateIndex = 0;
	renderRightPane();
}

function hideCandidateForFamily() {
	const target = getSelectedTarget();
	if (!target) return;

	const candidates = getVisibleCandidates(target);
	if (state.selectedCandidateIndex < 0 || state.selectedCandidateIndex >= candidates.length) {
		return;
	}

	const cand = candidates[state.selectedCandidateIndex];
	const familyTargets = state.targets.filter(t => t.state_family === target.state_family);

	for (const t of familyTargets) {
		const decision = state.decisions.get(t.asset_name) || {
			asset_name: t.asset_name,
			state: 'defer',
		};

		if (!decision.hidden_candidates) {
			decision.hidden_candidates = [];
		}

		if (!decision.hidden_candidates.includes(cand.candidate_id)) {
			decision.hidden_candidates.push(cand.candidate_id);
		}

		state.decisions.set(t.asset_name, decision);
	}

	autoSaveSession();
	state.selectedCandidateIndex = 0;
	renderAll();
}

// ============================================
// MATCH LABEL COMPUTATION
// ============================================

function computeMatchLabel(cand) {
	const sig = cand.signals || {};
	const overlap = sig.filename_token_overlap || 0;
	const parentOverlap = sig.parent_folder_overlap || 0;
	const trustBoost = sig.source_trust_boost || 0;

	if (overlap >= 0.7) {
		return { text: 'Strong name match', class: 'strong' };
	}
	if (overlap >= 0.3) {
		return { text: 'Partial name match', class: 'partial' };
	}
	if (parentOverlap > 0) {
		return { text: 'Same parent folder', class: 'parent' };
	}
	if (trustBoost === 0.2) {
		return { text: 'Trusted existing asset', class: 'trusted' };
	}
	return { text: 'Weak match', class: 'weak' };
}

// ============================================
// PROGRESS COUNTERS
// ============================================

function updateProgressCounters() {
	let assigned = 0;
	let deferred = 0;
	let ignored = 0;

	for (const [, decision] of state.decisions) {
		if (decision.state === 'assigned') assigned += 1;
		else if (decision.state === 'defer') deferred += 1;
		else if (decision.state === 'ignore_intentional') ignored += 1;
	}

	const remaining = state.targets.length - assigned - deferred - ignored;

	document.getElementById('counter-assigned').textContent = assigned;
	document.getElementById('counter-deferred').textContent = deferred;
	document.getElementById('counter-ignored').textContent = ignored;
	document.getElementById('counter-remaining').textContent = Math.max(0, remaining);
}

function updateFilterChips() {
	document.querySelectorAll('.chip').forEach(chip => {
		const filter = chip.dataset.filter;
		if (state.filters[filter]) {
			chip.classList.add('active');
		} else {
			chip.classList.remove('active');
		}
	});
}

// ============================================
// EXPORT
// ============================================

function exportDecisions() {
	const decisions = Array.from(state.decisions.values());

	const blob = new Blob([JSON.stringify(decisions, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'decisions.json';
	link.click();
	URL.revokeObjectURL(url);
}

// ============================================
// STARTUP
// ============================================

window.addEventListener('DOMContentLoaded', initPicker);
