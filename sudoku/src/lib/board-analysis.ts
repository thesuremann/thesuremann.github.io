import { requireIndex } from './indexed-access.js';
import { DIGITS, type CellValue, type Digit } from './sudoku.js';

export type Coordinate = readonly [row: number, col: number];
export type ReadonlyBoard = readonly (readonly CellValue[])[];


export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function readBoardCell(board: ReadonlyBoard, row: number, col: number): CellValue {
  const boardRow = requireIndex(board, row, 'board');
  return requireIndex(boardRow, col, 'board row');
}

export interface BoardDerivedState {
  givens: Set<string>;
  solutionDigitMap: Map<Digit, Coordinate[]>;
}

export function deriveBoardState(puzzle: ReadonlyBoard, solution: ReadonlyBoard): BoardDerivedState {
  const givens = new Set<string>();
  const solutionDigitMap = new Map<Digit, Coordinate[]>();

  for (const value of DIGITS) {
    solutionDigitMap.set(value, []);
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (readBoardCell(puzzle, row, col)) {
        givens.add(cellKey(row, col));
      }

      const solutionValue = readBoardCell(solution, row, col);
      if (solutionValue) {
        solutionDigitMap.get(solutionValue)?.push([row, col]);
      }
    }
  }

  return { givens, solutionDigitMap };
}

export function calculateConflicts(board: ReadonlyBoard): Set<string> {
  const conflicts = new Set<string>();

  for (let index = 0; index < 9; index += 1) {
    const rowMap = new Map<Digit, Coordinate[]>();
    const colMap = new Map<Digit, Coordinate[]>();

    for (let inner = 0; inner < 9; inner += 1) {
      const rowValue = readBoardCell(board, index, inner);
      const colValue = readBoardCell(board, inner, index);

      if (rowValue) {
        const positions = rowMap.get(rowValue) || [];
        positions.push([index, inner]);
        rowMap.set(rowValue, positions);
      }

      if (colValue) {
        const positions = colMap.get(colValue) || [];
        positions.push([inner, index]);
        colMap.set(colValue, positions);
      }
    }

    for (const positions of [...rowMap.values(), ...colMap.values()]) {
      if (positions.length > 1) {
        positions.forEach(([row, col]) => conflicts.add(cellKey(row, col)));
      }
    }
  }

  for (let blockRow = 0; blockRow < 3; blockRow += 1) {
    for (let blockCol = 0; blockCol < 3; blockCol += 1) {
      const blockMap = new Map<Digit, Coordinate[]>();

      for (let row = blockRow * 3; row < blockRow * 3 + 3; row += 1) {
        for (let col = blockCol * 3; col < blockCol * 3 + 3; col += 1) {
          const value = readBoardCell(board, row, col);
          if (!value) continue;

          const positions = blockMap.get(value) || [];
          positions.push([row, col]);
          blockMap.set(value, positions);
        }
      }

      for (const positions of blockMap.values()) {
        if (positions.length > 1) {
          positions.forEach(([row, col]) => conflicts.add(cellKey(row, col)));
        }
      }
    }
  }

  return conflicts;
}

export function calculateCompletedNumbers(
  current: ReadonlyBoard,
  solutionDigitMap: ReadonlyMap<Digit, readonly Coordinate[]>
): Set<Digit> {
  const completed = new Set<Digit>();

  for (const value of DIGITS) {
    const positions = solutionDigitMap.get(value) ?? [];
    if (positions.length === 9 && positions.every(([row, col]) => readBoardCell(current, row, col) === value)) {
      completed.add(value);
    }
  }

  return completed;
}

export function isSolved(current: ReadonlyBoard, solution: ReadonlyBoard): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (readBoardCell(current, row, col) !== readBoardCell(solution, row, col)) {
        return false;
      }
    }
  }

  return true;
}
