import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { applyGeneratedPuzzleState, applyRestoredGameState, createInitialGameState } from '../src/lib/game-state.js';
import { requireIndex } from '../src/lib/indexed-access.js';
import { parseSaveText } from '../src/lib/persistence.js';
import type { Board, CellValue } from '../src/lib/sudoku.js';

test('initial game state preserves the established application defaults', () => {
  const state = createInitialGameState();

  assert.deepEqual(state.puzzle, []);
  assert.deepEqual(state.solution, []);
  assert.deepEqual(state.current, []);
  assert.equal(state.notes.length, 9);
  assert.equal(state.givens.size, 0);
  assert.equal(state.selectedCell, null);
  assert.equal(state.noteMode, false);
  assert.equal(state.highlightNoteMode, false);
  assert.deepEqual(state.history, []);
  assert.deepEqual(state.future, []);
  assert.equal(state.solutionDigitMap.size, 0);
  assert.equal(state.hintCount, 0);
  assert.equal(state.solutionRevealed, false);
  assert.equal(state.selectedClueCount, 32);
  assert.equal(state.selectedSeedRaw, '');
  assert.equal(state.selectedSeedWasRandom, true);
  assert.equal(state.currentLang, 'ja');
});

test('initial game state instances do not share mutable containers', () => {
  const first = createInitialGameState();
  const second = createInitialGameState();

  assert.notEqual(first.notes, second.notes);
  assert.notEqual(
    requireIndex(requireIndex(first.notes, 0, 'first notes'), 0, 'first notes row'),
    requireIndex(requireIndex(second.notes, 0, 'second notes'), 0, 'second notes row')
  );
  assert.notEqual(first.givens, second.givens);
  assert.notEqual(first.history, second.history);
  assert.notEqual(first.future, second.future);
  assert.notEqual(first.solutionDigitMap, second.solutionDigitMap);
  assert.notEqual(first.timer, second.timer);
});

function createBoard(fill: CellValue = 0): Board {
  return Array.from({ length: 9 }, () => Array<CellValue>(9).fill(fill));
}

test('generated-puzzle state application resets puzzle-scoped data while preserving UI-adjacent state', () => {
  const state = createInitialGameState();
  state.currentLang = 'en';
  state.selectedCell = { row: 5, col: 5 };
  state.noteMode = true;
  state.highlightNoteMode = true;
  state.history.push({
    current: createBoard(),
    notes: state.notes,
    hintCount: 1,
    solutionRevealed: true,
    noteMode: true,
    highlightNoteMode: true,
    selectedCell: { row: 1, col: 1 },
    timer: { elapsedMs: 10, running: false }
  });
  state.hintCount = 3;
  state.solutionRevealed = true;
  const timerBefore = state.timer;

  const solution = createBoard(1);
  const puzzle = createBoard();
  requireIndex(puzzle, 0, 'puzzle')[0] = 1;
  applyGeneratedPuzzleState(state, {
    puzzle,
    solution,
    actualClueCount: 1,
    seedValue: '123',
    seedWasRandom: false
  });

  assert.equal(state.puzzle, puzzle);
  assert.equal(state.solution, solution);
  assert.notEqual(state.current, puzzle);
  assert.deepEqual(state.current, puzzle);
  assert.deepEqual([...state.givens], ['0-0']);
  assert.equal(state.solutionDigitMap.get(1)?.length, 81);
  assert.deepEqual(state.history, []);
  assert.deepEqual(state.future, []);
  assert.equal(state.hintCount, 0);
  assert.equal(state.solutionRevealed, false);
  assert.equal(state.selectedClueCount, 1);
  assert.equal(state.selectedSeedRaw, '123');
  assert.equal(state.selectedSeedWasRandom, false);
  assert.equal(state.currentLang, 'en');
  assert.deepEqual(state.selectedCell, { row: 5, col: 5 });
  assert.equal(state.noteMode, true);
  assert.equal(state.highlightNoteMode, true);
  assert.equal(state.timer, timerBefore);
});

test('restored-game state application rebuilds derived state and restores snapshot data', async () => {
  const text = await readFile(new URL('./fixtures/v1.7.1-save.json', import.meta.url), 'utf8');
  const restored = parseSaveText(text);
  const state = createInitialGameState();
  state.currentLang = 'en';
  const now = 123456789;

  applyRestoredGameState(state, restored.game, now);

  assert.equal(state.puzzle, restored.game.puzzle);
  assert.equal(state.solution, restored.game.solution);
  assert.notEqual(state.current, restored.game.current);
  assert.notEqual(state.notes, restored.game.notes);
  assert.equal(state.history, restored.game.history);
  assert.equal(state.future, restored.game.future);
  assert.equal(state.currentLang, 'en');
  assert.equal(state.givens.size, state.selectedClueCount);
  for (const positions of state.solutionDigitMap.values()) {
    assert.equal(positions.length, 9);
  }
  assert.equal(state.timer.elapsedMs, restored.game.timer.elapsedMs);
  assert.equal(state.timer.running, restored.game.timer.running);
  assert.equal(state.timer.startedAt, restored.game.timer.running ? now : null);
});
