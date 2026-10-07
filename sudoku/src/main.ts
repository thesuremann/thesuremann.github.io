import {
  captureSnapshot,
  cloneBoard,
  createNotesBoard,
  restoreSnapshot,
  type HistorySnapshot
} from './lib/history.js';
import {
  I18N,
  isLanguage,
  translate,
  type TranslationKey,
  type TranslationVariables
} from './lib/i18n.js';
import { calculateCompletedNumbers, calculateConflicts, cellKey, isSolved } from './lib/board-analysis.js';
import { applyGeneratedPuzzleState, applyRestoredGameState, createInitialGameState } from './lib/game-state.js';
import { requireUiElements } from './lib/ui-elements.js';
import { requireIndex } from './lib/indexed-access.js';
import { isButtonActivationTarget, isTypingTarget } from './lib/input.js';
import { LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY, isPreferencePersistenceEnabled, normalizePreferenceStorage, readPreferenceValue, readStoredClueCount, readStoredSeed, setPreferencePersistenceEnabled, storeClueCount, storePreferenceValue, storeSeed } from './lib/preferences.js';
import {
  createSaveData,
  createSaveFilename,
  parseSaveText,
  type RestoredSaveFileV1
} from './lib/persistence.js';
import { DIGITS, generatePuzzle, type CellValue, type Digit } from './lib/sudoku.js';
import { getElapsedMs, pauseTimer, startTimer } from './lib/timer.js';

interface ApplyValueOptions {
  highlightNote?: boolean;
}


const {
  boardEl,
  padEl,
  statusEl,
  statsEl,
  timerEl,
  undoEl,
  redoEl,
  helpButtonEl,
  helpOverlayEl,
  helpTitleEl,
  helpContentEl,
  helpCloseEl,
  clueCountEl,
  seedInputEl,
  seedFieldEl,
  langSelectEl,
  themeSelectEl,
  persistPreferencesEl,
  preferenceSaveToggleEl,
  preferenceSaveLabelEl,
  saveButtonEl,
  loadButtonEl,
  loadFileEl,
  titleEl,
  clueCountLabelEl,
  seedLabelEl,
  langLabelEl,
  newGameEl,
  resetEl,
  hintEl,
  solveEl,
  padTitleEl,
  hintTextEl
} = requireUiElements();

const state = createInitialGameState();

let noteToggleEl: HTMLButtonElement | null = null;
let highlightNoteToggleEl: HTMLButtonElement | null = null;
let clearPadButtonEl: HTMLButtonElement | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let statusResetTimeout: ReturnType<typeof setTimeout> | null = null;

function t(key: TranslationKey, vars: TranslationVariables = {}): string {
  return translate(state.currentLang, key, vars);
}

function formatSeedDisplay(seedValue: string, isRandom: boolean): string {
  return isRandom ? t('randomSeed', { seed: seedValue }) : seedValue;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function hasClueOption(clueCount: number): boolean {
  return Array.from(clueCountEl.options).some((option) => (
    Number(option.value) === clueCount
  ));
}

function parseDigit(value: string): Digit | null {
  switch (value) {
    case '1': return 1;
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    default: return null;
  }
}

function updateSeedFieldAppearance() {
  seedFieldEl.classList.toggle('seed-specified', seedInputEl.value.trim() !== '');
}

function updatePreferencePersistenceControl() {
  const enabled = isPreferencePersistenceEnabled();
  persistPreferencesEl.checked = enabled;
  preferenceSaveToggleEl.classList.toggle('is-enabled', enabled);
  preferenceSaveLabelEl.textContent = t('preferenceSaveLabel');
  preferenceSaveToggleEl.title = t('preferenceSaveTitle');
  persistPreferencesEl.setAttribute('aria-label', t('preferenceSaveTitle'));
}

function storeCurrentPreferences() {
  return [
    storeClueCount(clueCountEl.value),
    storeSeed(seedInputEl.value),
    storePreferenceValue(LANGUAGE_STORAGE_KEY, state.currentLang),
    storePreferenceValue(THEME_STORAGE_KEY, themeSelectEl.value)
  ].every(Boolean);
}

function initPreferencePersistence() {
  normalizePreferenceStorage();
  updatePreferencePersistenceControl();

  persistPreferencesEl.addEventListener('change', () => {
    if (persistPreferencesEl.checked) {
      const enabled = setPreferencePersistenceEnabled(true);
      const saved = enabled && storeCurrentPreferences();

      if (!saved) {
        setPreferencePersistenceEnabled(false);
      }
    } else {
      setPreferencePersistenceEnabled(false);
    }

    updatePreferencePersistenceControl();
  });
}

function initPuzzlePreferences() {
  const savedClueCount = readStoredClueCount();
  if (savedClueCount !== null && hasClueOption(savedClueCount)) {
    clueCountEl.value = String(savedClueCount);
  }

  seedInputEl.value = readStoredSeed();
  updateSeedFieldAppearance();

  clueCountEl.addEventListener('change', () => {
    storeClueCount(clueCountEl.value);
  });

  seedInputEl.addEventListener('input', () => {
    storeSeed(seedInputEl.value);
    updateSeedFieldAppearance();
  });
}


function syncPuzzleInputs() {
  if (hasClueOption(state.selectedClueCount)) {
    clueCountEl.value = String(state.selectedClueCount);
  }

  seedInputEl.value = state.selectedSeedWasRandom ? '' : String(state.selectedSeedRaw ?? '');
  updateSeedFieldAppearance();
}

function syncTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (state.timer.running) {
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }
}

function updateTimerDisplay() {
  if (!state.current.length) {
    timerEl.textContent = '--:--';
    return;
  }

  timerEl.textContent = formatTime(getElapsedMs(state.timer));
}

function resetAndStartTimer() {
  startTimer(state.timer);
  syncTimerInterval();
  updateTimerDisplay();
}

function freezeTimer() {
  pauseTimer(state.timer);
  syncTimerInterval();
  updateTimerDisplay();
}

function getSelectedElement() {
  if (!state.selectedCell) return null;
  const index = state.selectedCell.row * 9 + state.selectedCell.col;
  return boardEl.children[index] || null;
}

function syncPadModeButtons() {
  if (noteToggleEl) {
    noteToggleEl.classList.toggle('active', state.noteMode);
    noteToggleEl.textContent = t('noteButton');
  }

  if (highlightNoteToggleEl) {
    highlightNoteToggleEl.classList.toggle('active', state.noteMode && state.highlightNoteMode);
    highlightNoteToggleEl.classList.toggle('disabled', !state.noteMode);
    highlightNoteToggleEl.disabled = !state.noteMode;
    highlightNoteToggleEl.textContent = t('redNoteButton');
  }

  if (clearPadButtonEl) {
    clearPadButtonEl.textContent = t('clearButton');
  }
}

function toggleNoteMode(force?: boolean): void {
  state.noteMode = typeof force === 'boolean' ? force : !state.noteMode;
  if (!state.noteMode) {
    state.highlightNoteMode = false;
  }
  syncPadModeButtons();
}

function toggleHighlightNoteMode(force?: boolean): void {
  if (!state.noteMode) {
    state.noteMode = true;
  }

  state.highlightNoteMode = typeof force === 'boolean' ? force : !state.highlightNoteMode;
  syncPadModeButtons();
}

function recordStateForUndo() {
  state.history.push(captureSnapshot(state));
  if (state.history.length > 200) {
    state.history.shift();
  }
  state.future = [];
}

function restoreState(snapshot: HistorySnapshot): void {
  restoreSnapshot(state, snapshot);
  syncPadModeButtons();
  syncTimerInterval();
  updateTimerDisplay();
  renderBoard();
  updateStats();
  updateStatus();
}

function updateClueOptionLabels() {
  const localized = I18N[state.currentLang].clueOptionLabels;

  for (const option of clueCountEl.options) {
    const value = Number(option.value);
    let label: string | undefined;
    switch (value) {
      case 17: label = localized[17]; break;
      case 24: label = localized[24]; break;
      case 28: label = localized[28]; break;
      case 32: label = localized[32]; break;
      case 38: label = localized[38]; break;
      case 44: label = localized[44]; break;
      default: label = undefined;
    }
    option.textContent = label || String(value);
  }
}

function updateStats() {
  const hintText = t('statsHintUsed', { count: state.hintCount });
  const solutionText = t('statsSolutionShown', { state: state.solutionRevealed ? t('yes') : t('no') });
  const clueText = t('statsClues', { count: state.selectedClueCount });
  const seedText = t('statsSeed', { seed: formatSeedDisplay(state.selectedSeedRaw, state.selectedSeedWasRandom) });
  statsEl.textContent = `${hintText} / ${solutionText} / ${clueText} / ${seedText}`;
}

function setStatus(message: string, type = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function clearStatusFlash() {
  if (statusResetTimeout) {
    clearTimeout(statusResetTimeout);
    statusResetTimeout = null;
  }
}

function flashStatus(message: string, type = '', duration = 2200): void {
  clearStatusFlash();
  setStatus(message, type);
  statusResetTimeout = setTimeout(() => {
    statusResetTimeout = null;
    updateStatus();
  }, duration);
}

function renderHelp() {
  const locale = I18N[state.currentLang];
  const helpSections = locale.helpSections;

  helpButtonEl.textContent = t('helpButton');
  helpTitleEl.textContent = t('helpTitle');
  helpCloseEl.textContent = t('helpClose');
  helpContentEl.innerHTML = '';

  for (const section of helpSections) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'help-section';

    if ('title' in section && section.title) {
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      sectionEl.appendChild(heading);
    }

    const list = document.createElement('ul');
    list.className = 'help-list';

    for (const item of section.items) {
      const entry = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = `${item.label}: `;
      entry.append(label);

      const itemText = 'text' in item ? item.text : undefined;
      if (itemText) {
        entry.append(document.createTextNode(itemText));
      }

      if ('href' in item && item.href) {
        if (itemText) {
          entry.append(document.createTextNode(' '));
        }

        const link = document.createElement('a');
        link.href = item.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = ('linkText' in item && item.linkText) || item.href;
        entry.append(link);
      }

      if ('note' in item && item.note) {
        entry.append(document.createTextNode(` ${item.note}`));
      }

      list.appendChild(entry);
    }

    sectionEl.appendChild(list);
    helpContentEl.appendChild(sectionEl);
  }
}

function setHelpOpen(open: boolean): void {
  helpOverlayEl.hidden = !open;
  helpButtonEl.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('help-open', open);

  if (open) {
    helpCloseEl.focus();
  } else {
    helpButtonEl.focus();
  }
}

function applyLanguage(lang: string): void {
  state.currentLang = isLanguage(lang) ? lang : 'ja';
  document.documentElement.lang = state.currentLang;
  document.title = t('title');

  if (langSelectEl.value !== state.currentLang) {
    langSelectEl.value = state.currentLang;
  }

  titleEl.textContent = t('title');
  clueCountLabelEl.textContent = t('clueLabel');
  seedLabelEl.textContent = t('seedLabel');
  langLabelEl.textContent = t('langLabel');
  seedInputEl.placeholder = t('seedPlaceholder');
  updatePreferencePersistenceControl();
  newGameEl.textContent = t('newGame');
  resetEl.textContent = t('reset');
  hintEl.textContent = t('hint');
  solveEl.textContent = t('solve');
  saveButtonEl.textContent = t('saveGame');
  loadButtonEl.textContent = t('loadGame');
  padTitleEl.textContent = t('padTitle');
  hintTextEl.textContent = t('hintText');
  boardEl.setAttribute('aria-label', t('boardAriaLabel'));
  undoEl.textContent = t('undo');
  redoEl.textContent = t('redo');

  updateClueOptionLabels();
  syncPadModeButtons();

  renderHelp();
  updateStats();
  updateStatus();
}

function initLanguage() {
  const savedLang = readPreferenceValue(LANGUAGE_STORAGE_KEY);
  const browserLang = (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
  const preferred = savedLang && isLanguage(savedLang) ? savedLang : browserLang;

  applyLanguage(preferred);

  langSelectEl.addEventListener('change', () => {
    applyLanguage(langSelectEl.value);
    storePreferenceValue(LANGUAGE_STORAGE_KEY, state.currentLang);
  });
}

function buildBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.addEventListener('click', () => selectCell(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function buildPad() {
  padEl.innerHTML = '';

  for (const value of DIGITS) {
    const button = document.createElement('button');
    button.textContent = String(value);
    button.className = 'num';
    button.addEventListener('click', () => applyValue(value));
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      applyValue(value, { highlightNote: true });
    });
    padEl.appendChild(button);
  }

  noteToggleEl = document.createElement('button');
  noteToggleEl.className = 'pad-action';
  noteToggleEl.addEventListener('click', () => toggleNoteMode());
  padEl.appendChild(noteToggleEl);

  highlightNoteToggleEl = document.createElement('button');
  highlightNoteToggleEl.className = 'pad-action red-note';
  highlightNoteToggleEl.addEventListener('click', () => toggleHighlightNoteMode());
  padEl.appendChild(highlightNoteToggleEl);

  clearPadButtonEl = document.createElement('button');
  clearPadButtonEl.classList.add('secondary');
  clearPadButtonEl.addEventListener('click', clearSelectedCell);
  padEl.appendChild(clearPadButtonEl);

  syncPadModeButtons();
}

function selectCell(row: number, col: number): void {
  const previous = getSelectedElement();
  if (previous) {
    previous.classList.remove('selected');
  }

  state.selectedCell = { row, col };

  const current = getSelectedElement();
  if (current) {
    current.classList.add('selected');
  }
}

function ensureSelection() {
  if (!state.selectedCell) {
    selectCell(0, 0);
  }
}

function moveSelection(rowDelta: number, colDelta: number): void {
  ensureSelection();
  const selectedCell = state.selectedCell;
  if (!selectedCell) return;

  const nextRow = (selectedCell.row + rowDelta + 9) % 9;
  const nextCol = (selectedCell.col + colDelta + 9) % 9;
  selectCell(nextRow, nextCol);
}

function clearSelectedCell() {
  if (!state.selectedCell) return;

  const { row, col } = state.selectedCell;
  if (state.givens.has(cellKey(row, col))) return;

  const currentRow = requireIndex(state.current, row, 'current board');
  const notesRow = requireIndex(state.notes, row, 'notes board');
  const noteMap = requireIndex(notesRow, col, 'notes board row');
  const hasValue = requireIndex(currentRow, col, 'current board row') !== 0;
  const hasNotes = noteMap.size > 0;
  if (!hasValue && !hasNotes) return;

  recordStateForUndo();
  currentRow[col] = 0;
  noteMap.clear();
  renderBoard();
  updateStatus();
}

function applyValue(value: CellValue, options: ApplyValueOptions = {}): void {
  const { highlightNote = false } = options;
  if (!state.selectedCell) return;

  const { row, col } = state.selectedCell;
  if (state.givens.has(cellKey(row, col))) return;

  if (highlightNote && !state.noteMode) {
    return applyValue(value, { highlightNote: false });
  }

  const currentRow = requireIndex(state.current, row, 'current board');
  const notesRow = requireIndex(state.notes, row, 'notes board');
  const noteMap = requireIndex(notesRow, col, 'notes board row');

  if (state.noteMode) {
    const useHighlightedNote = highlightNote || state.highlightNoteMode;

    if (value === 0) {
      if (!noteMap.size) return;
      recordStateForUndo();
      noteMap.clear();
    } else if (useHighlightedNote) {
      const existing = noteMap.get(value);
      if (existing && existing.highlighted) return;
      recordStateForUndo();
      noteMap.set(value, { highlighted: true });
    } else {
      const existing = noteMap.get(value);
      recordStateForUndo();
      if (existing) {
        noteMap.delete(value);
      } else {
        noteMap.set(value, { highlighted: false });
      }
    }
  } else {
    const currentValue = requireIndex(currentRow, col, 'current board row');
    const nextValue = value === currentValue ? 0 : value;
    if (nextValue === currentValue) return;

    recordStateForUndo();
    currentRow[col] = nextValue;
    noteMap.clear();
  }

  renderBoard();
  updateStatus();
}

function renderCell(row: number, col: number, conflicts: ReadonlySet<string>, completedNumbers: ReadonlySet<Digit>): void {
  const currentRow = requireIndex(state.current, row, 'current board');
  const solutionRow = requireIndex(state.solution, row, 'solution board');
  const notesRow = requireIndex(state.notes, row, 'notes board');
  const value = requireIndex(currentRow, col, 'current board row');
  const solutionValue = requireIndex(solutionRow, col, 'solution board row');
  const cell = requireIndex(boardEl.children, row * 9 + col, 'board cells');
  const isSelected = state.selectedCell
    && state.selectedCell.row === row
    && state.selectedCell.col === col;

  cell.classList.toggle('selected', Boolean(isSelected));
  cell.classList.toggle('given', state.givens.has(cellKey(row, col)));
  cell.classList.toggle('completed-number', Boolean(value && completedNumbers.has(value) && value === solutionValue));
  cell.classList.toggle('conflict', conflicts.has(cellKey(row, col)));

  cell.innerHTML = '';
  if (value) {
    cell.textContent = String(value);
    return;
  }

  const noteMap = requireIndex(notesRow, col, 'notes board row');
  if (!noteMap.size) return;

  const notesGrid = document.createElement('div');
  notesGrid.className = 'notes';

  for (const noteValue of DIGITS) {
    const span = document.createElement('span');
    const entry = noteMap.get(noteValue);
    if (entry) {
      span.textContent = String(noteValue);
      if (entry.highlighted) {
        span.classList.add('highlighted');
      }
    }
    notesGrid.appendChild(span);
  }

  cell.appendChild(notesGrid);
}

function renderBoard() {
  const conflicts = calculateConflicts(state.current);
  const completedNumbers = calculateCompletedNumbers(state.current, state.solutionDigitMap);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      renderCell(row, col, conflicts, completedNumbers);
    }
  }
}

function updateStatus() {
  clearStatusFlash();

  if (!state.current.length || !state.solution.length) {
    setStatus(t('statusLoading'));
    return;
  }

  let filled = true;
  for (let row = 0; row < 9; row += 1) {
    const currentRow = requireIndex(state.current, row, 'current board');
    for (let col = 0; col < 9; col += 1) {
      if (requireIndex(currentRow, col, 'current board row') === 0) {
        filled = false;
      }
    }
  }

  if (filled && isSolved(state.current, state.solution)) {
    freezeTimer();
    if (state.solutionRevealed) {
      setStatus(t('statusSolutionShown'), 'success');
    } else {
      setStatus(t('statusSolved', { time: formatTime(getElapsedMs(state.timer)) }), 'success');
    }
    return;
  }

  setStatus(t('statusInputPrompt'));
}

function resetBoard(pushHistory = true, restartTimer = false) {
  if (pushHistory) {
    recordStateForUndo();
  }

  state.current = cloneBoard(state.puzzle);
  state.notes = createNotesBoard();
  state.hintCount = 0;
  state.solutionRevealed = false;
  toggleNoteMode(false);
  ensureSelection();

  if (restartTimer) {
    resetAndStartTimer();
  } else {
    updateTimerDisplay();
  }

  renderBoard();
  updateStats();
  updateStatus();
}

function loadNewPuzzle() {
  const clues = Number(clueCountEl.value);
  const seedValueRaw = seedInputEl.value.trim();
  storeClueCount(clues);
  storeSeed(seedValueRaw);

  const seedWasRandom = seedValueRaw === '';
  const seedValue = seedWasRandom
    ? Math.floor(Math.random() * 1_000_000_000).toString()
    : seedValueRaw;

  setStatus(t('statusGenerating'));

  const { puzzleBoard, solutionBoard, actualClueCount } = generatePuzzle(clues, seedValue);

  applyGeneratedPuzzleState(state, {
    puzzle: puzzleBoard,
    solution: solutionBoard,
    actualClueCount,
    seedValue,
    seedWasRandom
  });
  storeClueCount(state.selectedClueCount);
  syncPuzzleInputs();

  toggleNoteMode(false);
  state.selectedCell = { row: 0, col: 0 };
  renderBoard();
  updateStats();
  resetAndStartTimer();
  updateStatus();
}

function applyLoadedGame(saveData: RestoredSaveFileV1): void {
  const { game } = saveData;

  applyRestoredGameState(state, game);
  syncPuzzleInputs();
  syncPadModeButtons();
  syncTimerInterval();
  updateTimerDisplay();
  renderBoard();
  updateStats();
  flashStatus(t('statusLoadSuccess'), 'success');
}

function saveGameToFile() {
  if (!state.current.length || !state.solution.length) {
    flashStatus(t('statusSaveUnavailable'), 'warning');
    return;
  }

  try {
    const saveData = createSaveData(state);
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = createSaveFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    flashStatus(t('statusSaveSuccess'), 'success');
  } catch (error) {
    console.error(error);
    flashStatus(t('statusSaveError'), 'warning');
  }
}

async function loadGameFromFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    const saveData = parseSaveText(text);
    applyLoadedGame(saveData);
  } catch (error) {
    console.error(error);
    flashStatus(t('statusLoadError'), 'warning');
  } finally {
    loadFileEl.value = '';
  }
}

function revealHint() {
  for (let row = 0; row < 9; row += 1) {
    const currentRow = requireIndex(state.current, row, 'current board');
    const solutionRow = requireIndex(state.solution, row, 'solution board');
    const notesRow = requireIndex(state.notes, row, 'notes board');
    for (let col = 0; col < 9; col += 1) {
      if (requireIndex(currentRow, col, 'current board row') !== 0) continue;

      recordStateForUndo();
      currentRow[col] = requireIndex(solutionRow, col, 'solution board row');
      requireIndex(notesRow, col, 'notes board row').clear();
      state.hintCount += 1;

      renderBoard();
      updateStats();
      updateStatus();
      return;
    }
  }

  setStatus(t('statusNoHint'), 'warning');
}

function showSolution() {
  recordStateForUndo();
  state.current = cloneBoard(state.solution);
  state.notes = createNotesBoard();
  state.solutionRevealed = true;

  renderBoard();
  updateStats();
  updateStatus();
}

function undoAction() {
  if (!state.history.length) return;

  state.future.push(captureSnapshot(state));
  const previous = state.history.pop();
  if (previous) {
    restoreState(previous);
  }
}

function redoAction() {
  if (!state.future.length) return;

  state.history.push(captureSnapshot(state));
  const next = state.future.pop();
  if (next) {
    restoreState(next);
  }
}

function handleKey(event: KeyboardEvent): void {
  if (!helpOverlayEl.hidden) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setHelpOpen(false);
    }
    return;
  }

  if (isTypingTarget(event.target) || isButtonActivationTarget(event.target, event.key)) {
    return;
  }

  if (event.key === 'ArrowUp') {
    moveSelection(-1, 0);
    event.preventDefault();
    return;
  }

  if (event.key === 'ArrowDown') {
    moveSelection(1, 0);
    event.preventDefault();
    return;
  }

  if (event.key === 'ArrowLeft') {
    moveSelection(0, -1);
    event.preventDefault();
    return;
  }

  if (event.key === 'ArrowRight') {
    moveSelection(0, 1);
    event.preventDefault();
    return;
  }

  if (event.key === 'Enter') {
    toggleNoteMode();
    return;
  }

  const shortcutKey = event.key.toLowerCase();

  if (event.ctrlKey && (shortcutKey === 'y' || (event.shiftKey && shortcutKey === 'z'))) {
    event.preventDefault();
    redoAction();
    return;
  }

  if (event.ctrlKey && !event.shiftKey && shortcutKey === 'z') {
    event.preventDefault();
    undoAction();
    return;
  }

  ensureSelection();

  const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
  if (digitMatch) {
    const value = parseDigit(requireIndex(digitMatch, 1, 'digit key match'));
    if (value !== null) {
      applyValue(value, { highlightNote: state.noteMode && event.shiftKey });
    }
    event.preventDefault();
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    clearSelectedCell();
    event.preventDefault();
  }
}

newGameEl.addEventListener('click', loadNewPuzzle);
resetEl.addEventListener('click', () => resetBoard(true, true));
hintEl.addEventListener('click', revealHint);
solveEl.addEventListener('click', showSolution);
saveButtonEl.addEventListener('click', saveGameToFile);
loadButtonEl.addEventListener('click', () => loadFileEl.click());
loadFileEl.addEventListener('change', () => {
  const [file] = loadFileEl.files || [];
  if (file) {
    loadGameFromFile(file);
  }
});
helpButtonEl.addEventListener('click', () => setHelpOpen(true));
helpCloseEl.addEventListener('click', () => setHelpOpen(false));
helpOverlayEl.addEventListener('click', (event) => {
  if (event.target === helpOverlayEl) {
    setHelpOpen(false);
  }
});
undoEl.addEventListener('click', undoAction);
redoEl.addEventListener('click', redoAction);
document.addEventListener('keydown', handleKey);

buildBoard();
buildPad();
initPreferencePersistence();
initLanguage();
initPuzzlePreferences();
setStatus(t('statusLoading'));
updateTimerDisplay();
loadNewPuzzle();
