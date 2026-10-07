import { requireIndex } from './indexed-access.js';
import { PUZZLE_TEMPLATES } from './puzzle-templates.js';

export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CellValue = 0 | Digit;
export type Board = CellValue[][];
export type RandomSource = () => number;

type Coordinate = [row: number, col: number];

export interface SolverBudget {
  calls: number;
  maxCalls: number;
}

export interface GeneratedPuzzle {
  puzzleBoard: Board;
  solutionBoard: Board;
  actualClueCount: number;
}

export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function isCellValue(value: number): value is CellValue {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

function parseCellValue(character: string): CellValue {
  const value = Number(character);
  if (!isCellValue(value)) {
    throw new Error(`Invalid puzzle template cell: ${character}`);
  }
  return value;
}

function parseBoard(rows: string[]): Board {
  return rows.map((row) => Array.from(row, parseCellValue));
}

const TEMPLATE_BOARDS = PUZZLE_TEMPLATES.map(({ puzzle, solution }) => ({
  puzzleBoard: parseBoard(Array.from({ length: 9 }, (_, index) => puzzle.slice(index * 9, index * 9 + 9))),
  solutionBoard: parseBoard(Array.from({ length: 9 }, (_, index) => solution.slice(index * 9, index * 9 + 9)))
}));

function hashSeed(seedInput: unknown): number {
  const seed = String(seedInput);
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) || 1;
}

export function createRng(seedInput: unknown): RandomSource {
  if (seedInput === '' || seedInput === null || seedInput === undefined) {
    return Math.random;
  }

  let state = hashSeed(seedInput);
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    return (state >>> 0) / 0x100000000;
  };
}

export function shuffle<T>(array: T[], rand: RandomSource): void {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    const currentValue = requireIndex(array, index, 'shuffle array');
    const swapValue = requireIndex(array, swapIndex, 'shuffle array');
    array[index] = swapValue;
    array[swapIndex] = currentValue;
  }
}

function isSafe(board: Board, row: number, col: number, value: Digit): boolean {
  const targetRow = requireIndex(board, row, 'board');
  for (let index = 0; index < 9; index += 1) {
    const columnRow = requireIndex(board, index, 'board');
    if (
      requireIndex(targetRow, index, 'board row') === value
      || requireIndex(columnRow, col, 'board row') === value
    ) {
      return false;
    }
  }

  const startRow = 3 * Math.floor(row / 3);
  const startCol = 3 * Math.floor(col / 3);
  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      const boardRow = requireIndex(board, currentRow, 'board');
      if (requireIndex(boardRow, currentCol, 'board row') === value) {
        return false;
      }
    }
  }

  return true;
}

export function countSolutions(board: Board, limit = 2, budget: SolverBudget | null = null): number {
  const rowMask: number[] = Array(9).fill(0);
  const colMask: number[] = Array(9).fill(0);
  const boxMask: number[] = Array(9).fill(0);
  const empties: Coordinate[] = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const boardRow = requireIndex(board, row, 'board');
      const value = requireIndex(boardRow, col, 'board row');
      if (value === 0) {
        empties.push([row, col]);
        continue;
      }

      const bit = 1 << value;
      const box = 3 * Math.floor(row / 3) + Math.floor(col / 3);
      rowMask[row] = requireIndex(rowMask, row, 'rowMask') | bit;
      colMask[col] = requireIndex(colMask, col, 'colMask') | bit;
      boxMask[box] = requireIndex(boxMask, box, 'boxMask') | bit;
    }
  }

  function popcount(number: number): number {
    let count = 0;
    let remaining = number;

    while (remaining) {
      remaining &= remaining - 1;
      count += 1;
    }

    return count;
  }

  function solve(index = 0): number {
    if (budget) {
      budget.calls += 1;
      if (budget.calls > budget.maxCalls) return 0;
    }

    let bestIndex = -1;
    let bestCandidates = 0;
    let bestCount = 10;

    for (let searchIndex = index; searchIndex < empties.length; searchIndex += 1) {
      const [row, col] = requireIndex(empties, searchIndex, 'empty cells');
      const boardRow = requireIndex(board, row, 'board');
      if (requireIndex(boardRow, col, 'board row') !== 0) continue;

      const box = 3 * Math.floor(row / 3) + Math.floor(col / 3);
      const used = requireIndex(rowMask, row, 'rowMask')
        | requireIndex(colMask, col, 'colMask')
        | requireIndex(boxMask, box, 'boxMask');
      const candidates = (~used) & 0x3FE;
      const count = popcount(candidates);

      if (count === 0) return 0;
      if (count < bestCount) {
        bestCount = count;
        bestCandidates = candidates;
        bestIndex = searchIndex;
        if (count === 1) break;
      }
    }

    if (bestIndex === -1) return 1;

    const currentEmpty = requireIndex(empties, index, 'empty cells');
    const bestEmpty = requireIndex(empties, bestIndex, 'empty cells');
    empties[index] = bestEmpty;
    empties[bestIndex] = currentEmpty;
    const [row, col] = requireIndex(empties, index, 'empty cells');
    const box = 3 * Math.floor(row / 3) + Math.floor(col / 3);

    let solutions = 0;
    for (const value of DIGITS) {
      const bit = 1 << value;
      if ((bestCandidates & bit) === 0) continue;

      const boardRow = requireIndex(board, row, 'board');
      boardRow[col] = value;
      rowMask[row] = requireIndex(rowMask, row, 'rowMask') | bit;
      colMask[col] = requireIndex(colMask, col, 'colMask') | bit;
      boxMask[box] = requireIndex(boxMask, box, 'boxMask') | bit;

      solutions += solve(index + 1);

      rowMask[row] = requireIndex(rowMask, row, 'rowMask') & ~bit;
      colMask[col] = requireIndex(colMask, col, 'colMask') & ~bit;
      boxMask[box] = requireIndex(boxMask, box, 'boxMask') & ~bit;
      boardRow[col] = 0;

      if (solutions >= limit) break;
      if (budget && budget.calls > budget.maxCalls) break;
    }

    const solvedEmpty = requireIndex(empties, index, 'empty cells');
    const originalEmpty = requireIndex(empties, bestIndex, 'empty cells');
    empties[index] = originalEmpty;
    empties[bestIndex] = solvedEmpty;
    return solutions;
  }

  return solve(0);
}

export function generateFullBoard(rand: RandomSource): Board {
  const board: Board = Array.from({ length: 9 }, () => Array<CellValue>(9).fill(0));
  const numbers: Digit[] = [...DIGITS];

  function backtrack(cell = 0): boolean {
    if (cell === 81) return true;

    const row = Math.floor(cell / 9);
    const col = cell % 9;
    const shuffled = [...numbers];

    shuffle(shuffled, rand);
    for (const value of shuffled) {
      if (!isSafe(board, row, col, value)) continue;

      const boardRow = requireIndex(board, row, 'board');
      boardRow[col] = value;
      if (backtrack(cell + 1)) return true;
      boardRow[col] = 0;
    }

    return false;
  }

  backtrack();
  return board;
}

export function clampClues(value: number): number {
  return Math.max(17, Math.min(81, value));
}

function createDigitMap(rand: RandomSource): CellValue[] {
  const digits: Digit[] = [...DIGITS];
  shuffle(digits, rand);

  const digitMap: CellValue[] = [0];
  for (const digit of digits) {
    digitMap.push(digit);
  }

  return digitMap;
}

function createAxisOrder(rand: RandomSource): number[] {
  const groups = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8]
  ].map((group) => [...group]);

  shuffle(groups, rand);

  return groups.flatMap((group) => {
    shuffle(group, rand);
    return group;
  });
}

function transposeBoard(board: Board): Board {
  const firstRow = requireIndex(board, 0, 'board');
  return firstRow.map((_, col) => board.map((row) => (
    requireIndex(row, col, 'board row')
  )));
}

function transformBoard(
  board: Board,
  digitMap: CellValue[],
  rowOrder: number[],
  colOrder: number[],
  shouldTranspose = false
): Board {
  const sourceBoard = shouldTranspose ? transposeBoard(board) : board;

  return rowOrder.map((row) => {
    const sourceRow = requireIndex(sourceBoard, row, 'source board');
    return colOrder.map((col) => {
      const value = requireIndex(sourceRow, col, 'source board row');
      return value === 0 ? 0 : requireIndex(digitMap, value, 'digit map');
    });
  });
}

function countClues(board: Board): number {
  let clueCount = 0;

  for (const row of board) {
    for (const value of row) {
      if (value !== 0) {
        clueCount += 1;
      }
    }
  }

  return clueCount;
}

function addCluesToMatch(
  puzzleBoard: Board,
  solutionBoard: Board,
  clueCount: number,
  rand: RandomSource
): number {
  const filledCells: Coordinate[] = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const puzzleRow = requireIndex(puzzleBoard, row, 'puzzle board');
      if (requireIndex(puzzleRow, col, 'puzzle board row') === 0) {
        filledCells.push([row, col]);
      }
    }
  }

  shuffle(filledCells, rand);

  let actualClueCount = countClues(puzzleBoard);
  for (const [row, col] of filledCells) {
    if (actualClueCount >= clueCount) break;
    const puzzleRow = requireIndex(puzzleBoard, row, 'puzzle board');
    const solutionRow = requireIndex(solutionBoard, row, 'solution board');
    puzzleRow[col] = requireIndex(solutionRow, col, 'solution board row');
    actualClueCount += 1;
  }

  return actualClueCount;
}

export function generatePuzzle(clues: number, seedValue: unknown): GeneratedPuzzle {
  const clueCount = clampClues(clues);
  const templateRand = createRng(`${seedValue}:template`);
  const templateIndex = Math.floor(templateRand() * TEMPLATE_BOARDS.length);
  const shouldTranspose = templateRand() < 0.5;
  const template = requireIndex(TEMPLATE_BOARDS, templateIndex, 'puzzle templates');
  const transformRand = createRng(`${seedValue}:transform:${templateIndex}:${shouldTranspose ? 't' : 'n'}`);
  const fillRand = createRng(`${seedValue}:fill:${clueCount}`);
  const digitMap = createDigitMap(transformRand);
  const rowOrder = createAxisOrder(transformRand);
  const colOrder = createAxisOrder(transformRand);

  const solutionBoard = transformBoard(template.solutionBoard, digitMap, rowOrder, colOrder, shouldTranspose);
  const puzzleBoard = transformBoard(template.puzzleBoard, digitMap, rowOrder, colOrder, shouldTranspose);
  const actualClueCount = addCluesToMatch(puzzleBoard, solutionBoard, clueCount, fillRand);

  return {
    puzzleBoard,
    solutionBoard,
    actualClueCount
  };
}
