import test from 'node:test';
import assert from 'node:assert/strict';

import { captureSnapshot, cloneBoard, createNotesBoard, type CellPosition } from '../src/lib/history.js';
import { requireIndex } from '../src/lib/indexed-access.js';
import { createSaveData, parseSaveText, SAVE_FILE_FORMAT, SAVE_FILE_VERSION, type SaveState } from '../src/lib/persistence.js';
import { generatePuzzle, type Board } from '../src/lib/sudoku.js';
import { createTimerState, startTimer } from '../src/lib/timer.js';

function findEmptyCells(board: Board, count: number): CellPosition[] {
  const cells: CellPosition[] = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const boardRow = requireIndex(board, row, 'board');
      if (requireIndex(boardRow, col, 'board row') === 0) {
        cells.push({ row, col });
      }
    }
  }

  return cells.slice(0, count);
}

test('save files round-trip the board, notes, timer, and history state', () => {
  const { puzzleBoard, solutionBoard, actualClueCount } = generatePuzzle(24, 'save-roundtrip');
  const emptyCells = findEmptyCells(puzzleBoard, 2);
  const valueCell = requireIndex(emptyCells, 0, 'empty cells');
  const noteCell = requireIndex(emptyCells, 1, 'empty cells');

  const state: SaveState = {
    puzzle: cloneBoard(puzzleBoard),
    solution: cloneBoard(solutionBoard),
    current: cloneBoard(puzzleBoard),
    notes: createNotesBoard(),
    history: [],
    future: [],
    timer: createTimerState(),
    hintCount: 0,
    solutionRevealed: false,
    noteMode: false,
    highlightNoteMode: false,
    selectedCell: { ...valueCell },
    selectedClueCount: actualClueCount,
    selectedSeedRaw: 'save-roundtrip',
    selectedSeedWasRandom: false
  };

  startTimer(state.timer, 1000);
  state.history.push(captureSnapshot(state, 1300));

  const currentRow = requireIndex(state.current, valueCell.row, 'current board');
  const solutionRow = requireIndex(solutionBoard, valueCell.row, 'solution board');
  currentRow[valueCell.col] = requireIndex(solutionRow, valueCell.col, 'solution board row');
  const noteRow = requireIndex(state.notes, noteCell.row, 'notes board');
  requireIndex(noteRow, noteCell.col, 'notes board row').set(4, { highlighted: true });
  state.hintCount = 2;
  state.noteMode = true;
  state.highlightNoteMode = true;
  state.selectedCell = { ...noteCell };
  state.future.push(captureSnapshot(state, 1600));

  const saveData = createSaveData(state, 1900);
  const restored = parseSaveText(JSON.stringify(saveData));

  assert.equal(restored.format, SAVE_FILE_FORMAT);
  assert.equal(restored.version, SAVE_FILE_VERSION);
  assert.deepEqual(restored.game.puzzle, state.puzzle);
  assert.deepEqual(restored.game.solution, state.solution);
  assert.deepEqual(restored.game.current, state.current);
  assert.equal(
    requireIndex(requireIndex(restored.game.notes, noteCell.row, 'restored notes'), noteCell.col, 'restored notes row').get(4)?.highlighted,
    true
  );
  assert.equal(restored.game.hintCount, 2);
  assert.equal(restored.game.noteMode, true);
  assert.equal(restored.game.highlightNoteMode, true);
  assert.deepEqual(restored.game.selectedCell, noteCell);
  assert.equal(restored.game.selectedClueCount, actualClueCount);
  assert.equal(restored.game.selectedSeedRaw, 'save-roundtrip');
  assert.equal(restored.game.selectedSeedWasRandom, false);
  assert.equal(restored.game.timer.elapsedMs, 900);
  assert.equal(restored.game.timer.running, true);
  assert.equal(restored.game.history.length, 1);
  assert.equal(requireIndex(restored.game.history, 0, 'restored history').timer.elapsedMs, 300);
  assert.equal(restored.game.future.length, 1);
  assert.equal(
    requireIndex(
      requireIndex(requireIndex(restored.game.future, 0, 'restored future').notes, noteCell.row, 'future notes'),
      noteCell.col,
      'future notes row'
    ).get(4)?.highlighted,
    true
  );
});

test('save files reject invalid fixed clue values', () => {
  const { puzzleBoard, solutionBoard, actualClueCount } = generatePuzzle(24, 'invalid-save');

  const state: SaveState = {
    puzzle: cloneBoard(puzzleBoard),
    solution: cloneBoard(solutionBoard),
    current: cloneBoard(puzzleBoard),
    notes: createNotesBoard(),
    history: [],
    future: [],
    timer: createTimerState(),
    hintCount: 0,
    solutionRevealed: false,
    noteMode: false,
    highlightNoteMode: false,
    selectedCell: null,
    selectedClueCount: actualClueCount,
    selectedSeedRaw: 'invalid-save',
    selectedSeedWasRandom: false
  };

  const invalidSave = createSaveData(state, 2000);

  outer:
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const puzzleRow = requireIndex(invalidSave.game.puzzle, row, 'invalid puzzle');
      if (requireIndex(puzzleRow, col, 'invalid puzzle row') !== 0) {
        requireIndex(invalidSave.game.current, row, 'invalid current')[col] = 0;
        break outer;
      }
    }
  }

  assert.throws(
    () => parseSaveText(JSON.stringify(invalidSave)),
    /fixed clue value/
  );
});
