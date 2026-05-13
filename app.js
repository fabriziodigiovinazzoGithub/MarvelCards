const app = document.getElementById('app');
const storageKey = 'marvelCards:persistence:v1';

const moduleCatalogSeed = [
	{ id: 'heroes', name: 'Hero Squad', defaultCount: 12, color: '#2c7da0', description: 'Balanced cards for early turns.' },
	{ id: 'villains', name: 'Villain Strike', defaultCount: 10, color: '#c44536', description: 'Pressure module with steady burn.' },
	{ id: 'tech', name: 'Tech Arsenal', defaultCount: 8, color: '#f0a202', description: 'Fast utility and tactical draw.' },
	{ id: 'mystic', name: 'Mystic Relics', defaultCount: 6, color: '#3c6e71', description: 'Small but high-impact set.' },
	{ id: 'cosmic', name: 'Cosmic Tide', defaultCount: 14, color: '#6c5ce7', description: 'Large module for long games.' },
];

const state = loadState();

function createDefaultState() {
	return {
		gameActive: true,
		catalog: moduleCatalogSeed.map((module) => ({ ...module })),
		decks: [createDeckState(1)],
		playDeckId: null,
		sectionOpen: {
			modules: false,
			decks: false,
			play: false,
		},
		openDeckIds: [],
		editingModuleId: null,
		log: [],
	};
}

function loadState() {
	const defaults = createDefaultState();

	if (typeof localStorage === 'undefined') {
		return defaults;
	}

	try {
		const serialized = localStorage.getItem(storageKey);

		if (!serialized) {
			return defaults;
		}

		const parsed = JSON.parse(serialized);
		const parsedDecks = Array.isArray(parsed?.decks) && parsed.decks.length > 0 ? parsed.decks.map(normalizeDeck) : defaults.decks;
		const validDeckIds = new Set(parsedDecks.map((deck) => deck.id));
		const parsedSectionOpen = parsed?.sectionOpen;
		const sectionOpen = {
			modules: Boolean(parsedSectionOpen?.modules),
			decks: Boolean(parsedSectionOpen?.decks),
			play: Boolean(parsedSectionOpen?.play),
		};
		const openDeckIds = Array.isArray(parsed?.openDeckIds)
			? parsed.openDeckIds.map(String).filter((deckId) => validDeckIds.has(deckId))
			: [];

		return {
			gameActive: true,
			catalog: Array.isArray(parsed?.catalog) && parsed.catalog.length > 0 ? parsed.catalog.map(normalizeCatalogModule) : defaults.catalog,
			decks: parsedDecks,
			playDeckId: typeof parsed?.playDeckId === 'string' && validDeckIds.has(String(parsed.playDeckId)) ? String(parsed.playDeckId) : null,
			sectionOpen,
			openDeckIds,
			editingModuleId: null,
			log: Array.isArray(parsed?.log) ? parsed.log.slice(0, 8).map(normalizeLogItem) : [],
		};
	} catch {
		return defaults;
	}
}

function saveState() {
	if (typeof localStorage === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(storageKey, JSON.stringify({
			gameActive: state.gameActive,
			catalog: state.catalog,
			decks: state.decks,
			playDeckId: state.playDeckId,
			sectionOpen: state.sectionOpen,
			openDeckIds: state.openDeckIds,
			log: state.log,
		}));
	} catch {
		// Ignore storage quota and privacy-mode failures.
	}
}

function normalizeCatalogModule(module) {
	const fallback = moduleCatalogSeed.find((entry) => entry.id === module?.id);

	return {
		id: String(module?.id ?? createId('module')),
		name: String(module?.name ?? fallback?.name ?? 'Module'),
		defaultCount: Number.isFinite(Number(module?.defaultCount)) ? Number(module.defaultCount) : (fallback?.defaultCount ?? 1),
		color: sanitizeColor(String(module?.color ?? fallback?.color ?? '#2c7da0'), fallback?.color ?? '#2c7da0'),
		description: String(module?.description ?? fallback?.description ?? 'Custom module created by the player.'),
	};
}

function normalizeModuleEntry(entry) {
	const originalCount = Number.isFinite(Number(entry?.originalCount)) ? Number(entry.originalCount) : 0;
	const remainingCount = Number.isFinite(Number(entry?.remainingCount)) ? Number(entry.remainingCount) : originalCount;

	return {
		id: String(entry?.id ?? createId('entry')),
		moduleId: String(entry?.moduleId ?? 'unknown-module'),
		name: String(entry?.name ?? 'Module'),
		color: sanitizeColor(String(entry?.color ?? '#2c7da0'), '#2c7da0'),
		originalCount,
		remainingCount: Math.max(0, Math.min(originalCount, remainingCount)),
	};
}

function normalizeDeck(deck, index) {
	const drawHistory = Array.isArray(deck?.drawHistory)
		? deck.drawHistory
			.map((item) => {
				const entryId = typeof item === 'string' ? item : item?.entryId;
				return entryId ? { entryId: String(entryId) } : null;
			})
			.filter(Boolean)
		: [];

	return {
		id: String(deck?.id ?? createId('deck')),
		name: String(deck?.name ?? `Deck ${index + 1}`),
		entries: Array.isArray(deck?.entries) ? deck.entries.map(normalizeModuleEntry) : [],
		lastDrawEntryId: deck?.lastDrawEntryId ? String(deck.lastDrawEntryId) : null,
		drawZoneHue: Number.isFinite(Number(deck?.drawZoneHue)) ? Number(deck.drawZoneHue) : Math.floor(Math.random() * 360),
		drawHistory,
	};
}

function normalizeLogItem(item) {
	return {
		id: String(item?.id ?? createId('log')),
		message: String(item?.message ?? ''),
		time: String(item?.time ?? ''),
	};
}

function createId(prefix) {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `${prefix}-${crypto.randomUUID()}`;
	}

	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDeckState(index) {
	return {
		id: createId('deck'),
		name: `Deck ${index}`,
		entries: [],
		lastDrawEntryId: null,
		drawZoneHue: Math.floor(Math.random() * 360),
		drawHistory: [],
	};
}

function getDrawZoneAccent(deck) {
	const hue = Number.isFinite(deck?.drawZoneHue) ? deck.drawZoneHue : 200;
	return `hsla(${hue} 82% 58% / 0.34)`;
}

function createModuleInstance(module, count) {
	return {
		id: createId('entry'),
		moduleId: module.id,
		name: module.name,
		color: module.color,
		originalCount: count,
		remainingCount: count,
	};
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function sanitizeColor(value, fallback) {
	return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function shuffle(list) {
	const next = [...list];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
	}

	return next;
}

function getDeckRemaining(deck) {
	return deck.entries.reduce((sum, entry) => sum + entry.remainingCount, 0);
}

function getDeckOriginal(deck) {
	return deck.entries.reduce((sum, entry) => sum + entry.originalCount, 0);
}

function getDeckEmpty(deck) {
	return deck.entries.length > 0 && deck.entries.every((entry) => entry.remainingCount === 0);
}

function getRandomDrawEntry(deck) {
	const availableEntries = deck.entries.filter((entry) => entry.remainingCount > 0);

	if (availableEntries.length === 0) {
		return null;
	}

	const randomIndex = Math.floor(Math.random() * availableEntries.length);
	return availableEntries[randomIndex];
}

function getLastDrawEntry(deck) {
	if (!deck.lastDrawEntryId) {
		return null;
	}

	return deck.entries.find((entry) => entry.id === deck.lastDrawEntryId) ?? null;
}

function addLog(message) {
	state.log.unshift({
		id: createId('log'),
		message,
		time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
	});

	state.log = state.log.slice(0, 8);
}

function createDeck(name) {
	const deckName = String(name ?? '').trim() || `Deck ${state.decks.length + 1}`;
	const nextDeck = createDeckState(state.decks.length + 1);
	nextDeck.name = deckName;
	state.decks.push(nextDeck);
	addLog(`${nextDeck.name} added.`);
	render();
}

function isSectionOpen(sectionName) {
	return Boolean(state.sectionOpen?.[sectionName]);
}

function toggleSection(sectionName) {
	if (!state.sectionOpen || !(sectionName in state.sectionOpen)) {
		return;
	}

	state.sectionOpen[sectionName] = !state.sectionOpen[sectionName];
	render();
}

function isDeckOpen(deckId) {
	return Array.isArray(state.openDeckIds) && state.openDeckIds.includes(deckId);
}

function toggleDeck(deckId) {
	if (!Array.isArray(state.openDeckIds)) {
		state.openDeckIds = [];
	}

	if (state.openDeckIds.includes(deckId)) {
		state.openDeckIds = state.openDeckIds.filter((id) => id !== deckId);
	} else {
		state.openDeckIds = [...state.openDeckIds, deckId];
	}

	render();
}

function getPlayDeck() {
	return state.decks.find((deck) => deck.id === state.playDeckId) ?? null;
}

function setPlayDeck(deckId) {
	const selectedDeck = state.decks.find((deck) => deck.id === deckId) ?? null;
	state.playDeckId = selectedDeck ? selectedDeck.id : null;

	if (selectedDeck && !isDeckOpen(selectedDeck.id)) {
		state.openDeckIds = [...state.openDeckIds, selectedDeck.id];
	}

	addLog(selectedDeck ? `${selectedDeck.name} moved to the play area.` : 'Play area cleared.');
	render();
}

function clearPlayDeck(deckId) {
	if (state.playDeckId !== deckId) {
		return;
	}

	state.playDeckId = null;
	const deck = state.decks.find((entry) => entry.id === deckId);
	addLog(deck ? `${deck.name} removed from the play area.` : 'Play area cleared.');
	render();
}

function renderCollapsibleSection(sectionName, eyebrow, title, content) {
	const isOpen = isSectionOpen(sectionName);

	return `
		<section class="collapsible panel ${isOpen ? 'is-open' : ''}" data-section="${sectionName}">
			<div class="collapsible__summary">
				<div>
					<p class="eyebrow">${escapeHtml(eyebrow)}</p>
					<h2>${escapeHtml(title)}</h2>
				</div>
				<button type="button" class="collapsible__toggle" data-action="toggle-section" data-section="${sectionName}" aria-label="Toggle ${escapeHtml(title)} section">
					<span class="collapsible__chevron" aria-hidden="true"></span>
				</button>
			</div>
			<div class="collapsible__content ${isOpen ? '' : 'is-collapsed'}">
				${content}
			</div>
		</section>
	`;
}

function addModulePresetToCatalog(module) {
	state.catalog.push(module);
	state.editingModuleId = null;
	addLog(`${module.name} added to the module library.`);
	render();
}

function startEditingModule(moduleId) {
	const module = state.catalog.find((entry) => entry.id === moduleId);

	if (!module) {
		return;
	}

	state.editingModuleId = moduleId;
	render();
}

function cancelEditingModule() {
	state.editingModuleId = null;
	render();
}

function updateModulePreset(moduleId, update) {
	const module = state.catalog.find((entry) => entry.id === moduleId);

	if (!module) {
		addLog('Could not update that module preset.');
		render();
		return;
	}

	module.name = update.name;
	module.defaultCount = update.defaultCount;
	module.color = update.color;

	for (const deck of state.decks) {
		for (const entry of deck.entries) {
			if (entry.moduleId === moduleId) {
				entry.name = update.name;
				entry.color = update.color;
			}
		}
	}

	state.editingModuleId = null;
	addLog(`${module.name} preset updated.`);
	render();
}

function deleteModulePreset(moduleId) {
	const moduleIndex = state.catalog.findIndex((entry) => entry.id === moduleId);

	if (moduleIndex === -1) {
		return;
	}

	const [removed] = state.catalog.splice(moduleIndex, 1);
	state.editingModuleId = null;

	if (state.catalog.length === 0) {
		addLog(`${removed.name} deleted. Create a new preset to add modules to decks.`);
	} else {
		addLog(`${removed.name} deleted from the module library.`);
	}

	render();
}

function addModuleToDeck(deckId, moduleId, count) {
	const deck = state.decks.find((entry) => entry.id === deckId);
	const module = state.catalog.find((entry) => entry.id === moduleId);

	if (!deck || !module || count < 1) {
		addLog('Could not add the module to that deck.');
		render();
		return;
	}

	deck.entries.push(createModuleInstance(module, count));
	addLog(`${module.name} added to ${deck.name} (${count} cards).`);
	render();
}

function removeModuleFromDeck(deckId, entryId) {
	const deck = state.decks.find((entry) => entry.id === deckId);

	if (!deck) {
		return;
	}

	const moduleIndex = deck.entries.findIndex((entry) => entry.id === entryId);

	if (moduleIndex === -1) {
		addLog('Could not remove that module from the deck.');
		render();
		return;
	}

	const [removedEntry] = deck.entries.splice(moduleIndex, 1);

	deck.drawHistory = deck.drawHistory.filter((item) => item.entryId !== removedEntry.id);
	const lastHistoryItem = deck.drawHistory[deck.drawHistory.length - 1];
	deck.lastDrawEntryId = lastHistoryItem ? lastHistoryItem.entryId : null;

	addLog(`${removedEntry.name} removed from ${deck.name}.`);
	render();
}

function drawFromDeck(deckId) {
	const deck = state.decks.find((entry) => entry.id === deckId);

	if (!deck) {
		return;
	}

	if (!state.gameActive || state.playDeckId !== deckId) {
		addLog('Move a deck into the play area before drawing from it.');
		render();
		return;
	}

	if (deck.entries.length === 0) {
		addLog(`${deck.name} does not have any modules yet.`);
		render();
		return;
	}

	const drawEntry = getRandomDrawEntry(deck);

	if (!drawEntry) {
		addLog(`${deck.name} is empty. Reshuffle to restore its modules.`);
		render();
		return;
	}

	applyDraw(deck, drawEntry);
}

function drawFromModule(deckId, entryId) {
	const deck = state.decks.find((entry) => entry.id === deckId);

	if (!deck) {
		return;
	}

	if (!state.gameActive || state.playDeckId !== deckId) {
		addLog('Move a deck into the play area before drawing from it.');
		render();
		return;
	}

	const drawEntry = deck.entries.find((entry) => entry.id === entryId);

	if (!drawEntry) {
		return;
	}

	if (drawEntry.remainingCount <= 0) {
		addLog(`${drawEntry.name} is empty in ${deck.name}.`);
		render();
		return;
	}

	applyDraw(deck, drawEntry);
}

function applyDraw(deck, drawEntry) {

	drawEntry.remainingCount -= 1;
	deck.lastDrawEntryId = drawEntry.id;
	deck.drawZoneHue = (Number.isFinite(deck.drawZoneHue) ? deck.drawZoneHue : 200) + 67;
	deck.drawZoneHue %= 360;
	deck.drawHistory.push({ entryId: drawEntry.id });

	const remainingInDeck = getDeckRemaining(deck);
	addLog(`${deck.name} drew from ${drawEntry.name}. ${remainingInDeck} cards remain.`);

	if (remainingInDeck === 0) {
		addLog(`${deck.name} is fully empty. Reshuffle is now available.`);
	}

	render();
}

function undoDeckDraw(deckId) {
	const deck = state.decks.find((entry) => entry.id === deckId);

	if (!deck) {
		return;
	}

	if (!Array.isArray(deck.drawHistory) || deck.drawHistory.length === 0) {
		addLog(`No draw to undo in ${deck.name}.`);
		render();
		return;
	}

	const lastDraw = deck.drawHistory.pop();
	const drawEntry = deck.entries.find((entry) => entry.id === lastDraw.entryId);

	if (!drawEntry) {
		const previousDraw = deck.drawHistory[deck.drawHistory.length - 1];
		deck.lastDrawEntryId = previousDraw ? previousDraw.entryId : null;
		addLog(`Could not restore the last draw in ${deck.name}.`);
		render();
		return;
	}

	drawEntry.remainingCount = Math.min(drawEntry.originalCount, drawEntry.remainingCount + 1);

	const previousDraw = deck.drawHistory[deck.drawHistory.length - 1];
	deck.lastDrawEntryId = previousDraw ? previousDraw.entryId : null;

	const remainingInDeck = getDeckRemaining(deck);
	addLog(`${deck.name} undid a draw from ${drawEntry.name}. ${remainingInDeck} cards remain.`);
	render();
}

function reshuffleDeck(deckId) {
	const deck = state.decks.find((entry) => entry.id === deckId);

	if (!deck) {
		return;
	}

	deck.entries = shuffle(
		deck.entries.map((entry) => ({
			...entry,
			remainingCount: entry.originalCount,
		})),
	);
	deck.lastDrawEntryId = null;
	deck.drawHistory = [];

	addLog(`${deck.name} has been reshuffled back to its original module counts.`);
	render();
}

function removeDeck(deckId) {
	if (state.decks.length === 1) {
		addLog('Keep at least one deck in play.');
		render();
		return;
	}

	const deckIndex = state.decks.findIndex((entry) => entry.id === deckId);

	if (deckIndex === -1) {
		return;
	}

	const [removedDeck] = state.decks.splice(deckIndex, 1);
	state.openDeckIds = state.openDeckIds.filter((id) => id !== removedDeck.id);

	if (state.playDeckId === removedDeck.id) {
		state.playDeckId = null;
	}

	addLog(`${removedDeck.name} removed from the table.`);
	render();
}

function getDeckStatus(deck) {
	if (deck.id === state.playDeckId) {
		if (getDeckEmpty(deck)) {
			return 'Empty';
		}

		if (getDeckRemaining(deck) === 0) {
			return 'Ready to reshuffle';
		}

		return 'In play';
	}

	if (deck.entries.length === 0 || getDeckEmpty(deck)) {
		return 'Empty';
	}

	if (getDeckRemaining(deck) === 0) {
		return 'Ready to reshuffle';
	}

	return 'Built';
}

function renderModuleCatalogCard(module) {
	if (state.editingModuleId === module.id) {
		return `
			<form class="module-card module-edit-form" data-action="edit-module-form" data-module-id="${module.id}" style="--accent:${module.color};">
				<label>
					<span>Module name</span>
					<input name="name" type="text" minlength="2" maxlength="40" value="${escapeHtml(module.name)}" required />
				</label>
				<label>
					<span>Default cards</span>
					<input name="cards" type="number" min="1" max="99" value="${module.defaultCount}" required />
				</label>
				<label>
					<span>Accent color</span>
					<input name="color" type="color" value="${module.color}" />
				</label>
				<div class="module-edit-form__actions">
					<button type="submit" class="button button--primary button--small">Save</button>
					<button type="button" class="button button--ghost button--small" data-action="cancel-edit-module" data-module-id="${module.id}">Cancel</button>
					<button type="button" class="button button--danger button--small" data-action="delete-module" data-module-id="${module.id}">Delete</button>
				</div>
			</form>
		`;
	}

	return `
		<article class="module-card" style="--accent:${module.color};">
			<div class="module-card__top">
				<span class="module-swatch" aria-hidden="true"></span>
				<div class="module-card__actions">
					<button type="button" class="button button--ghost button--small" data-action="edit-module" data-module-id="${module.id}">Edit</button>
					<button type="button" class="button button--danger button--small" data-action="delete-module" data-module-id="${module.id}">Delete</button>
				</div>
			</div>
			<div>
				<h3>${escapeHtml(module.name)}</h3>
				<p>${module.defaultCount} cards by default</p>
			</div>
			<small>${escapeHtml(module.description)}</small>
		</article>
	`;
}

function renderModuleEntry(deck, entry) {
	const isLiveDraw = deck.lastDrawEntryId === entry.id && entry.remainingCount >= 0;
	const emptyClass = entry.remainingCount === 0 ? 'is-empty' : '';
	const clickableClass = state.gameActive && entry.remainingCount > 0 ? 'is-clickable' : '';

	return `
		<div class="module-entry ${emptyClass} ${clickableClass} ${isLiveDraw ? 'is-target' : ''}" style="--accent:${entry.color};" data-action="draw-module" data-deck-id="${deck.id}" data-entry-id="${entry.id}" role="button" aria-disabled="${state.gameActive && entry.remainingCount > 0 ? 'false' : 'true'}">
			<div class="module-entry__row">
				<div class="module-entry__title">
					<strong>${escapeHtml(entry.name)}</strong>
					<span>${entry.remainingCount}/${entry.originalCount}</span>
				</div>
				<button type="button" class="button button--danger button--small" data-action="remove-module-from-deck" data-deck-id="${deck.id}" data-entry-id="${entry.id}">Remove</button>
			</div>
			<div class="module-entry__meter" aria-hidden="true">
				<span style="width:${entry.originalCount === 0 ? 0 : (entry.remainingCount / entry.originalCount) * 100}%"></span>
			</div>
		</div>
	`;
}

function renderDeckCard(deck, index, options = {}) {
	const { isPlayable = false } = options;
	const isOpen = isDeckOpen(deck.id);
	const totalRemaining = getDeckRemaining(deck);
	const totalOriginal = getDeckOriginal(deck);
	const canReshuffle = getDeckEmpty(deck);
	const canUndo = Array.isArray(deck.drawHistory) && deck.drawHistory.length > 0;
	const lastDrawEntry = getLastDrawEntry(deck);
	const status = getDeckStatus(deck);
	const hasCatalogModules = state.catalog.length > 0;
	const selectOptions = hasCatalogModules
		? state.catalog.map((module) => `<option value="${module.id}">${escapeHtml(module.name)} (${module.defaultCount})</option>`).join('')
		: '<option value="">No module presets available</option>';
	const drawHint = totalRemaining === 0
		? 'No cards left in this deck'
		: (lastDrawEntry ? `Last drawn from: ${escapeHtml(lastDrawEntry.name)}` : 'No draw suggestion yet');
	const playAction = isPlayable ? 'remove-from-play-area' : 'add-to-play-area';
	const playActionLabel = isPlayable ? 'Remove from play area' : 'Add in play area';

	return `
		<article class="deck-panel ${canReshuffle ? 'is-exhausted' : ''} ${isOpen ? 'is-open' : ''}" data-deck-id="${deck.id}">
			<div class="deck-panel__header">
				<div class="deck-panel__header-copy">
					<h3>${escapeHtml(deck.name)}</h3>
					<span class="pill ${canReshuffle ? 'pill--warning' : 'pill--success'}">${status}</span>
				</div>
				<div class="deck-panel__header-actions">
					<button type="button" class="button button--primary button--small" data-action="${playAction}" data-deck-id="${deck.id}">${playActionLabel}</button>
					<button type="button" class="deck-panel__toggle" data-action="toggle-deck" data-deck-id="${deck.id}" aria-label="Toggle ${escapeHtml(deck.name)} deck">
						<span class="deck-panel__chevron" aria-hidden="true"></span>
					</button>
				</div>
			</div>

			<div class="deck-panel__content ${isOpen ? '' : 'is-collapsed'}">
				${isPlayable ? `
					<button type="button" class="deck-draw-zone" data-action="draw" data-deck-id="${deck.id}" style="--draw-zone-accent:${getDrawZoneAccent(deck)};">
						<span class="deck-draw-zone__label">Tap to draw</span>
						<strong>${drawHint}</strong>
						<span>${totalRemaining} cards remaining from ${deck.entries.length} module${deck.entries.length === 1 ? '' : 's'}</span>
					</button>
				` : `<p class="deck-note deck-note--compact">Move this deck into the play area to draw from it.</p>`}

				<div class="deck-stats">
					<div>
						<span>Cards</span>
						<strong>${totalRemaining}</strong>
					</div>
					<div>
						<span>Original total</span>
						<strong>${totalOriginal}</strong>
					</div>
					<div>
						<span>Modules</span>
						<strong>${deck.entries.length}</strong>
					</div>
				</div>

				<div class="deck-modules">
					${deck.entries.length > 0 ? deck.entries.map((entry) => renderModuleEntry(deck, entry)).join('') : '<p class="empty-state">Add a module to this deck to begin building it.</p>'}
				</div>

				<form class="deck-form" data-action="add-module" data-deck-id="${deck.id}">
					<label>
						<span>Module</span>
						<select name="moduleId" class="deck-module-select" ${hasCatalogModules ? 'required' : 'disabled'}>
							${selectOptions}
						</select>
					</label>
					<label>
						<span>Cards</span>
						<input name="count" class="deck-module-count" type="number" min="1" value="${state.catalog[0]?.defaultCount ?? 1}" ${hasCatalogModules ? 'required' : 'disabled'} />
					</label>
					<button type="submit" class="button button--primary" ${hasCatalogModules ? '' : 'disabled'}>Add module</button>
				</form>
				${hasCatalogModules ? '' : '<p class="deck-form__hint">Create a module preset to enable deck composition.</p>'}

				<div class="deck-actions">
					${isPlayable && canUndo ? `<button type="button" class="button button--primary" data-action="undo-draw" data-deck-id="${deck.id}">Undo draw</button>` : ''}
					${isPlayable ? '<button type="button" class="button button--primary" data-action="reshuffle" data-deck-id="' + deck.id + '">Reshuffle deck</button>' : ''}
					${isPlayable ? '' : `<button type="button" class="button button--primary" data-action="remove-deck" data-deck-id="${deck.id}">Remove deck</button>`}
				</div>
			</div>
		</article>
	`;
}

function renderLogItem(item) {
	return `
		<li>
			<span>${escapeHtml(item.time)}</span>
			<p>${escapeHtml(item.message)}</p>
		</li>
	`;
}

function render() {
	const totalCards = state.decks.reduce((sum, deck) => sum + getDeckRemaining(deck), 0);
	const emptyDecks = state.decks.filter((deck) => getDeckEmpty(deck)).length;
	const playDeck = getPlayDeck();
	const deckCards = state.decks.filter((deck) => deck.id !== state.playDeckId);
	const latestMessage = state.log[0]?.message ?? 'Create a deck, move it into the play area, and add modules.';

	app.innerHTML = `
		<div class="shell">
			<header class="hero panel">
				<div class="hero__copy">
					<p class="eyebrow">Modular deck manager</p>
					<h1>Build decks from reusable modules and draw by deck tap.</h1>
					<p class="lede">
						Compose one or more decks from modular sets, tap a deck during play to reveal the next module to draw from,
						keep per-module counts in sync, and reshuffle only when a deck is completely empty.
					</p>
				</div>

				<div class="hero__stats" aria-label="Current game summary">
					<div class="stat-card">
						<span>Decks</span>
						<strong>${state.decks.length}</strong>
					</div>
					<div class="stat-card">
						<span>In play</span>
						<strong>${playDeck ? 1 : 0}</strong>
					</div>
					<div class="stat-card">
						<span>Cards remaining</span>
						<strong>${totalCards}</strong>
					</div>
					<div class="stat-card">
						<span>Empty decks</span>
						<strong>${emptyDecks}</strong>
					</div>
				</div>

				<p class="hero__message">${escapeHtml(latestMessage)}</p>
			</header>

			<section class="workspace">
				${renderCollapsibleSection(
					'modules',
					'Module library',
					'Modules',
					`
						<form class="module-form" data-action="create-module">
							<label>
								<span>Module name</span>
								<input name="name" type="text" minlength="2" maxlength="40" placeholder="Shield Protocol" required />
							</label>
							<label>
								<span>Default cards</span>
								<input name="cards" type="number" min="1" max="99" value="10" required />
							</label>
							<label>
								<span>Accent color</span>
								<input name="color" type="color" value="#2c7da0" />
							</label>
							<button type="submit" class="button button--primary">Create preset</button>
						</form>

						<div class="module-grid">
							${state.catalog.length > 0 ? state.catalog.map((module) => renderModuleCatalogCard(module)).join('') : '<p class="empty-state">No module presets yet. Create one to start composing decks.</p>'}
						</div>
					`
				)}

				${renderCollapsibleSection(
					'decks',
					'Deck table',
					'Decks',
					`
						<form class="deck-create-form" data-action="create-deck">
							<label>
								<span>Deck name</span>
								<input name="name" type="text" minlength="2" maxlength="40" placeholder="My first deck" required />
							</label>
							<button type="submit" class="button button--primary">Create deck</button>
						</form>

						<div class="deck-grid">
							${deckCards.length > 0 ? deckCards.map((deck) => renderDeckCard(deck, state.decks.findIndex((entry) => entry.id === deck.id), { isPlayable: false })).join('') : '<p class="empty-state">No decks in the deck area yet. Create one above.</p>'}
						</div>
					`
				)}

				${renderCollapsibleSection(
					'play',
					'Playable deck',
					'Play Area',
					playDeck
						? `<div class="play-area__deck">${renderDeckCard(playDeck, state.decks.findIndex((entry) => entry.id === playDeck.id), { isPlayable: true })}</div>`
						: '<p class="empty-state">Choose a deck from the Decks section to move it into the play area.</p>'
				)}
			</section>

			<section class="panel log-panel">
				<div class="panel-header">
					<div>
						<p class="eyebrow">Game log</p>
						<h2>Recent actions</h2>
					</div>
				</div>
					<ul class="log-list">
						${state.log.length > 0 ? state.log.map((item) => renderLogItem(item)).join('') : '<li><span>Ready</span><p>Add modules and create a deck.</p></li>'}
					</ul>
			</section>
		</div>
	`;

		saveState();
}

app.addEventListener('click', (event) => {
	const button = event.target.closest('[data-action]');
	const deckCard = event.target.closest('.deck-panel');

	if (button) {
		const { action, deckId, moduleId, entryId, section } = button.dataset;

		if (action === 'toggle-section' && section) {
			toggleSection(section);
			return;
		}

		if (action === 'toggle-deck' && deckId) {
			toggleDeck(deckId);
			return;
		}

		if (action === 'add-to-play-area' && deckId) {
			setPlayDeck(deckId);
			return;
		}

		if (action === 'remove-from-play-area' && deckId) {
			clearPlayDeck(deckId);
			return;
		}

		if (action === 'draw' && deckId) {
			drawFromDeck(deckId);
			return;
		}

		if (action === 'draw-module' && deckId && entryId) {
			drawFromModule(deckId, entryId);
			return;
		}

		if (action === 'remove-module-from-deck' && deckId && entryId) {
			const approved = typeof window.confirm !== 'function' ? true : window.confirm('Are you sure you want to remove this module from the deck?');

			if (approved) {
				removeModuleFromDeck(deckId, entryId);
			}
			return;
		}

		if (action === 'undo-draw' && deckId) {
			undoDeckDraw(deckId);
			return;
		}

		if (action === 'reshuffle' && deckId) {
			const approved = typeof window.confirm !== 'function' ? true : window.confirm('Are you sure you want to reshuffle this deck?');

			if (approved) {
				reshuffleDeck(deckId);
			}
			return;
		}

		if (action === 'remove-deck' && deckId) {
			removeDeck(deckId);
			return;
		}

		if (action === 'edit-module' && moduleId) {
			startEditingModule(moduleId);
			return;
		}

		if (action === 'cancel-edit-module') {
			cancelEditingModule();
			return;
		}

		if (action === 'delete-module' && moduleId) {
			const approved = typeof window.confirm !== 'function' ? true : window.confirm('Delete this module preset from the library? Existing deck entries will stay unchanged.');

			if (approved) {
				deleteModulePreset(moduleId);
			}

			return;
		}

		return;
	}

	if (deckCard && state.gameActive && deckCard.dataset.deckId === state.playDeckId) {
		const interactiveTarget = event.target.closest('button, input, select, textarea, label, option');

		if (!interactiveTarget) {
			const deckId = deckCard.dataset.deckId;
			if (deckId) {
				drawFromDeck(deckId);
			}
		}
	}
});

app.addEventListener('submit', (event) => {
	const form = event.target;

	if (!(form instanceof HTMLFormElement)) {
		return;
	}

	event.preventDefault();

	if (form.matches('[data-action="edit-module-form"]')) {
		const moduleId = form.dataset.moduleId;
		const formData = new FormData(form);
		const name = String(formData.get('name') ?? '').trim();
		const cards = Number.parseInt(String(formData.get('cards') ?? '0'), 10);
		const color = sanitizeColor(String(formData.get('color') ?? ''), '#2c7da0');

		if (!moduleId || !name || Number.isNaN(cards) || cards < 1) {
			addLog('Module presets need a name and at least one card.');
			render();
			return;
		}

		updateModulePreset(moduleId, {
			name,
			defaultCount: cards,
			color,
		});
		return;
	}

	if (form.matches('[data-action="create-module"]')) {
		const formData = new FormData(form);
		const name = String(formData.get('name') ?? '').trim();
		const cards = Number.parseInt(String(formData.get('cards') ?? '0'), 10);
		const color = sanitizeColor(String(formData.get('color') ?? ''), '#2c7da0');

		if (!name || Number.isNaN(cards) || cards < 1) {
			addLog('Module presets need a name and at least one card.');
			render();
			return;
		}

		addModulePresetToCatalog({
			id: createId('module'),
			name,
			defaultCount: cards,
			color,
			description: 'Custom module created by the player.',
		});

		form.reset();
		const colorField = form.querySelector('input[type="color"]');
		if (colorField instanceof HTMLInputElement) {
			colorField.value = '#2c7da0';
		}

		return;
	}

	if (form.matches('[data-action="add-module"]')) {
		const deckId = form.dataset.deckId;
		const formData = new FormData(form);
		const moduleId = String(formData.get('moduleId') ?? '');
		const count = Number.parseInt(String(formData.get('count') ?? '0'), 10);

		if (!deckId) {
			return;
		}

		if (state.catalog.length === 0) {
			addLog('Create at least one module preset before adding modules to decks.');
			render();
			return;
		}

		addModuleToDeck(deckId, moduleId, count);
		form.reset();
		const defaultModule = state.catalog[0];
		const countField = form.querySelector('input[name="count"]');
		if (countField instanceof HTMLInputElement && defaultModule) {
			countField.value = String(defaultModule.defaultCount);
		}
		return;
	}

	if (form.matches('[data-action="create-deck"]')) {
		const formData = new FormData(form);
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			addLog('Decks need a name before they can be created.');
			render();
			return;
		}

		createDeck(name);
		form.reset();
	}
});

app.addEventListener('change', (event) => {
	const select = event.target;

	if (!(select instanceof HTMLSelectElement)) {
		return;
	}

	if (select.matches('.deck-module-select')) {
		const form = select.closest('form');
		if (!(form instanceof HTMLFormElement)) {
			return;
		}

		const countField = form.querySelector('.deck-module-count');
		const selectedOption = select.selectedOptions[0];

		if (!selectedOption) {
			return;
		}

		const moduleId = selectedOption?.value;
		const module = state.catalog.find((entry) => entry.id === moduleId);

		if (countField instanceof HTMLInputElement && module) {
			countField.value = String(module.defaultCount);
		}
	}
});

addLog('Create one or more decks, then add modules to build them out.');
render();
