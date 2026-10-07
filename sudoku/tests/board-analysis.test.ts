import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateCompletedNumbers,
  calculateConflicts,
  deriveBoardState,
  isSolved
} from '../src/lib/board-analysis.js';
import { requireIndex } from '../src/lib/indexed-access.js';
import type { Board, CellValue } from '../src/lib/sudoku.js';

const SOLUTION = '718629543362548791945317268159836427827954136634172985281793654476285319593461872';

function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array<CellValue>(9).fill(0));
}

function boardRow(board: Board, row: number): CellValue[] {
  return requireIndex(board, row, 'test board');
}

function boardCell(board: Board, row: number, col: number): CellValue {
  return requireIndex(boardRow(board, row), col, 'test board row');
}

function parseBoard(serialized: string): Board {
  assert.equal(serialized.length, 81);
  return Array.from({ length: 9 }, (_, row) => (
    Array.from({ length: 9 }, (_, col) => {
      const value = Number(serialized[row * 9 + col]);
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 9);
      return value as CellValue;
    })
  ));
}


test('board conflict analysis reports duplicate row, column, and block cells', () => {
  const board = createEmptyBoard();
  boardRow(board, 0)[0] = 1;
  boardRow(board, 0)[8] = 1;
  boardRow(board, 0)[1] = 2;
  boardRow(board, 8)[1] = 2;
  boardRow(board, 1)[1] = 3;
  boardRow(board, 2)[2] = 3;

  assert.deepEqual(
    [...calculateConflicts(board)].sort(),
    ['0-0', '0-1', '0-8', '1-1', '2-2', '8-1']
  );
});

test('completed-number analysis identifies only digits fully placed at solution positions', () => {
  const solution = parseBoard(SOLUTION);
  const { solutionDigitMap } = deriveBoardState(createEmptyBoard(), solution);

  assert.deepEqual(
    [...calculateCompletedNumbers(solution, solutionDigitMap)].sort(),
    [1, 2, 3, 4, 5, 6, 7, 8, 9]
  );

  const incomplete = solution.map((row) => [...row]);
  boardRow(incomplete, 0)[0] = 0;
  assert.deepEqual(
    [...calculateCompletedNumbers(incomplete, solutionDigitMap)].sort(),
    [1, 2, 3, 4, 5, 6, 8, 9]
  );
});

test('solved-state analysis compares the current board with the solution exactly', () => {
  const solution = parseBoard(SOLUTION);
  const current = solution.map((row) => [...row]);

  assert.equal(isSolved(current, solution), true);
  boardRow(current, 8)[8] = 0;
  assert.equal(isSolved(current, solution), false);
});

test('board analysis leaves board inputs unchanged', () => {
  const solution = parseBoard(SOLUTION);
  const current = solution.map((row) => [...row]);
  boardRow(current, 0)[0] = 0;
  const { solutionDigitMap } = deriveBoardState(createEmptyBoard(), solution);
  const currentBefore = current.map((row) => [...row]);
  const solutionBefore = solution.map((row) => [...row]);

  calculateConflicts(current);
  calculateCompletedNumbers(current, solutionDigitMap);
  isSolved(current, solution);

  assert.deepEqual(current, currentBefore);
  assert.deepEqual(solution, solutionBefore);
});


test('derived board state records fixed clues and all solution coordinates', () => {
  const solution = parseBoard(SOLUTION);
  const puzzle = createEmptyBoard();
  boardRow(puzzle, 0)[0] = boardCell(solution, 0, 0);
  boardRow(puzzle, 4)[4] = boardCell(solution, 4, 4);

  const { givens, solutionDigitMap } = deriveBoardState(puzzle, solution);

  assert.deepEqual([...givens].sort(), ['0-0', '4-4']);
  for (const value of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
    assert.equal(solutionDigitMap.get(value)?.length, 9);
  }
});

test('derived board state leaves puzzle and solution inputs unchanged', () => {
  const solution = parseBoard(SOLUTION);
  const puzzle = createEmptyBoard();
  boardRow(puzzle, 0)[0] = boardCell(solution, 0, 0);
  const puzzleBefore = puzzle.map((row) => [...row]);
  const solutionBefore = solution.map((row) => [...row]);

  deriveBoardState(puzzle, solution);

  assert.deepEqual(puzzle, puzzleBefore);
  assert.deepEqual(solution, solutionBefore);
});
