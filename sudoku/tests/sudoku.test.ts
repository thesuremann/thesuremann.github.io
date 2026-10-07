import test from 'node:test';
import assert from 'node:assert/strict';

import { requireIndex } from '../src/lib/indexed-access.js';
import { captureSnapshot, createNotesBoard, restoreSnapshot } from '../src/lib/history.js';
import { isButtonActivationTarget, isTypingTarget } from '../src/lib/input.js';
import { PUZZLE_TEMPLATES } from '../src/lib/puzzle-templates.js';
import { countSolutions, createRng, generatePuzzle, type Board, type CellValue } from '../src/lib/sudoku.js';
import { createTimerState, getElapsedMs, startTimer } from '../src/lib/timer.js';

function toCellValue(character: string): CellValue {
  const value = Number(character);
  switch (value) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return value;
    default:
      throw new Error(`Invalid test board value: ${character}`);
  }
}

function createBoard(value: CellValue): Board {
  return Array.from({ length: 9 }, () => Array<CellValue>(9).fill(value));
}

test('createRng is deterministic for composite string seeds', () => {
  const rngA = createRng('123:attempt:0');
  const rngB = createRng('123:attempt:0');
  const rngC = createRng('123:attempt:1');

  const valuesA = Array.from({ length: 5 }, () => rngA());
  const valuesB = Array.from({ length: 5 }, () => rngB());
  const valuesC = Array.from({ length: 5 }, () => rngC());

  assert.deepEqual(valuesA, valuesB);
  assert.notDeepEqual(valuesA, valuesC);
});

test('generatePuzzle stays reproducible and unique for low clue seeds', () => {
  const first = generatePuzzle(17, '0');
  const second = generatePuzzle(17, '0');

  assert.deepEqual(first.puzzleBoard, second.puzzleBoard);
  assert.deepEqual(first.solutionBoard, second.solutionBoard);
  assert.ok(first.actualClueCount >= 17);
  assert.equal(countSolutions(first.puzzleBoard.map((row) => [...row]), 3), 1);
});

test('generatePuzzle returns exact requested clue counts across supported options', () => {
  for (const clues of [17, 18, 20, 22, 24, 26, 28, 32, 48]) {
    const result = generatePuzzle(clues, '7');
    assert.equal(result.actualClueCount, clues);
    assert.equal(countSolutions(result.puzzleBoard.map((row) => [...row]), 3), 1);
  }
});

test('puzzle templates provide multiple unique 17-clue starting points', () => {
  assert.ok(PUZZLE_TEMPLATES.length >= 16);

  for (const template of PUZZLE_TEMPLATES) {
    const clueCount = Array.from(template.puzzle).filter((value) => value !== '0').length;
    const board = Array.from({ length: 9 }, (_, row) => (
      template.puzzle.slice(row * 9, row * 9 + 9).split('').map(toCellValue)
    ));

    assert.equal(clueCount, 17);
    assert.equal(countSolutions(board, 3), 1);
    assert.equal(template.solution.includes('0'), false);
  }
});

test('typing targets block game shortcuts while buttons remain available for non-activation keys', () => {
  assert.equal(isTypingTarget({ tagName: 'input' }), true);
  assert.equal(isTypingTarget({ tagName: 'SELECT' }), true);
  assert.equal(isTypingTarget({ tagName: 'div', isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: 'button' }), false);
  assert.equal(isTypingTarget({ tagName: 'div', isContentEditable: false }), false);

  const button = { tagName: 'button' };
  assert.equal(isButtonActivationTarget(button, 'Enter'), true);
  assert.equal(isButtonActivationTarget(button, ' '), true);
  assert.equal(isButtonActivationTarget(button, 'Spacebar'), true);
  assert.equal(isButtonActivationTarget(button, '2'), false);
  assert.equal(isButtonActivationTarget({ tagName: 'input' }, 'Enter'), false);
});

test('history snapshots preserve meta state and resume timers correctly', () => {
  const originalState = {
    current: createBoard(0),
    notes: createNotesBoard(),
    hintCount: 2,
    solutionRevealed: true,
    noteMode: true,
    highlightNoteMode: true,
    selectedCell: { row: 4, col: 5 },
    timer: createTimerState()
  };

  requireIndex(originalState.current, 1, 'current board')[2] = 7;
  requireIndex(requireIndex(originalState.notes, 0, 'notes'), 0, 'notes row').set(3, { highlighted: true });
  startTimer(originalState.timer, 1000);

  const snapshot = captureSnapshot(originalState, 1600);

  const restoredState = {
    current: createBoard(9),
    notes: createNotesBoard(),
    hintCount: 0,
    solutionRevealed: false,
    noteMode: false,
    highlightNoteMode: false,
    selectedCell: null,
    timer: createTimerState()
  };

  restoreSnapshot(restoredState, snapshot, 5000);

  assert.deepEqual(restoredState.current, originalState.current);
  assert.equal(requireIndex(requireIndex(restoredState.notes, 0, 'restored notes'), 0, 'restored notes row').get(3)?.highlighted, true);
  assert.equal(restoredState.hintCount, 2);
  assert.equal(restoredState.solutionRevealed, true);
  assert.equal(restoredState.noteMode, true);
  assert.equal(restoredState.highlightNoteMode, true);
  assert.deepEqual(restoredState.selectedCell, { row: 4, col: 5 });
  assert.equal(getElapsedMs(restoredState.timer, 5300), 900);
});
