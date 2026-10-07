import {
  cloneBoard,
  createNotesBoard,
  type CellPosition,
  type HistorySnapshot,
  type NotesBoard
} from './history.js';
import { requireIndex } from './indexed-access.js';
import type { Board, Digit } from './sudoku.js';
import { captureTimerSnapshot, type TimerSnapshot, type TimerState } from './timer.js';

export const SAVE_FILE_FORMAT = 'sudoku-html-save';
export const SAVE_FILE_VERSION = 1;

interface SerializedNoteEntry {
  value: number;
  highlighted: boolean;
}

type SerializedNotesBoard = SerializedNoteEntry[][][];

interface SerializedSnapshot {
  current: Board;
  notes: SerializedNotesBoard;
  hintCount: number;
  solutionRevealed: boolean;
  noteMode: boolean;
  highlightNoteMode: boolean;
  selectedCell: CellPosition | null;
  timer: TimerSnapshot;
}

export interface SaveState {
  puzzle: Board;
  solution: Board;
  current: Board;
  notes: NotesBoard;
  hintCount: number;
  solutionRevealed: boolean;
  noteMode: boolean;
  highlightNoteMode: boolean;
  selectedCell: CellPosition | null;
  timer: TimerState;
  selectedClueCount: number;
  selectedSeedRaw: string;
  selectedSeedWasRandom: boolean;
  history: HistorySnapshot[];
  future: HistorySnapshot[];
}

export interface SaveFileV1 {
  format: typeof SAVE_FILE_FORMAT;
  version: typeof SAVE_FILE_VERSION;
  savedAt: string;
  game: {
    puzzle: Board;
    solution: Board;
    current: Board;
    notes: SerializedNotesBoard;
    hintCount: number;
    solutionRevealed: boolean;
    noteMode: boolean;
    highlightNoteMode: boolean;
    selectedCell: CellPosition | null;
    timer: TimerSnapshot;
    selectedClueCount: number;
    selectedSeedRaw: string;
    selectedSeedWasRandom: boolean;
    history: SerializedSnapshot[];
    future: SerializedSnapshot[];
  };
}

export interface RestoredSaveFileV1 {
  format: typeof SAVE_FILE_FORMAT;
  version: typeof SAVE_FILE_VERSION;
  savedAt: string;
  game: Omit<SaveState, 'timer'> & {
    timer: TimerSnapshot;
  };
}

function assertValid(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  assertValid(isRecord(value), message);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isDigit(value: number): value is Digit {
  return isIntegerInRange(value, 1, 9);
}

function toBoardValue(value: number): Board[number][number] {
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
      throw new Error(`Unexpected board value after validation: ${value}`);
  }
}

function normalizeBoard(board: unknown, name: string, minValue: number, maxValue: number): Board {
  assertValid(isUnknownArray(board) && board.length === 9, `${name} must contain 9 rows.`);

  return board.map((row, rowIndex) => {
    assertValid(isUnknownArray(row) && row.length === 9, `${name}[${rowIndex}] must contain 9 cells.`);

    return row.map((value, colIndex) => {
      const numericValue = Number(value);
      assertValid(
        isIntegerInRange(numericValue, minValue, maxValue),
        `${name}[${rowIndex}][${colIndex}] must be an integer between ${minValue} and ${maxValue}.`
      );
      return toBoardValue(numericValue);
    });
  });
}

function serializeNotes(notesBoard: NotesBoard): SerializedNotesBoard {
  return notesBoard.map((row) => row.map((noteMap) => (
    Array.from(noteMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([value, entry]) => ({
        value: Number(value),
        highlighted: Boolean(entry?.highlighted)
      }))
  )));
}

function deserializeNotes(notesBoard: unknown, name: string): NotesBoard {
  assertValid(isUnknownArray(notesBoard) && notesBoard.length === 9, `${name} must contain 9 rows.`);

  const restored = createNotesBoard();

  for (let row = 0; row < 9; row += 1) {
    const rowData = notesBoard[row];
    assertValid(isUnknownArray(rowData) && rowData.length === 9, `${name}[${row}] must contain 9 cells.`);

    for (let col = 0; col < 9; col += 1) {
      const cellData = rowData[col];
      assertValid(isUnknownArray(cellData), `${name}[${row}][${col}] must be an array.`);

      const noteMap = new Map<Digit, { highlighted: boolean }>();
      for (const [index, entry] of cellData.entries()) {
        assertRecord(entry, `${name}[${row}][${col}][${index}] must be an object.`);
        const value = Number(entry.value);
        assertValid(
          isDigit(value),
          `${name}[${row}][${col}][${index}].value must be an integer between 1 and 9.`
        );
        assertValid(!noteMap.has(value), `${name}[${row}][${col}] contains duplicate note values.`);
        noteMap.set(value, { highlighted: Boolean(entry.highlighted) });
      }

      const restoredRow = requireIndex(restored, row, 'restored notes');
      restoredRow[col] = noteMap;
    }
  }

  return restored;
}

function normalizeSelectedCell(selectedCell: unknown, name: string): CellPosition | null {
  if (selectedCell == null) {
    return null;
  }

  assertRecord(selectedCell, `${name} must be null or an object.`);

  const row = Number(selectedCell.row);
  const col = Number(selectedCell.col);
  assertValid(isIntegerInRange(row, 0, 8), `${name}.row must be an integer between 0 and 8.`);
  assertValid(isIntegerInRange(col, 0, 8), `${name}.col must be an integer between 0 and 8.`);

  return { row, col };
}

function normalizeTimer(timerSnapshot: unknown, name: string): TimerSnapshot {
  assertRecord(timerSnapshot, `${name} must be an object.`);

  const elapsedMs = Number(timerSnapshot.elapsedMs);
  assertValid(Number.isFinite(elapsedMs) && elapsedMs >= 0, `${name}.elapsedMs must be a non-negative number.`);

  return {
    elapsedMs,
    running: Boolean(timerSnapshot.running)
  };
}

function normalizeNonNegativeInteger(value: unknown, name: string): number {
  const numericValue = Number(value);
  assertValid(Number.isInteger(numericValue) && numericValue >= 0, `${name} must be a non-negative integer.`);
  return numericValue;
}

function normalizeSnapshot(snapshot: unknown, name: string): HistorySnapshot {
  assertRecord(snapshot, `${name} must be an object.`);

  return {
    current: normalizeBoard(snapshot.current, `${name}.current`, 0, 9),
    notes: deserializeNotes(snapshot.notes, `${name}.notes`),
    hintCount: normalizeNonNegativeInteger(snapshot.hintCount, `${name}.hintCount`),
    solutionRevealed: Boolean(snapshot.solutionRevealed),
    noteMode: Boolean(snapshot.noteMode),
    highlightNoteMode: Boolean(snapshot.highlightNoteMode),
    selectedCell: normalizeSelectedCell(snapshot.selectedCell, `${name}.selectedCell`),
    timer: normalizeTimer(snapshot.timer, `${name}.timer`)
  };
}

function serializeSnapshot(snapshot: HistorySnapshot): SerializedSnapshot {
  return {
    current: cloneBoard(snapshot.current),
    notes: serializeNotes(snapshot.notes),
    hintCount: snapshot.hintCount,
    solutionRevealed: Boolean(snapshot.solutionRevealed),
    noteMode: Boolean(snapshot.noteMode),
    highlightNoteMode: Boolean(snapshot.highlightNoteMode),
    selectedCell: snapshot.selectedCell ? { ...snapshot.selectedCell } : null,
    timer: {
      elapsedMs: Number(snapshot.timer.elapsedMs),
      running: Boolean(snapshot.timer.running)
    }
  };
}

function validatePuzzleAgainstSolution(puzzle: Board, solution: Board, name: string): void {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const puzzleRow = requireIndex(puzzle, row, `${name}.puzzle`);
      const solutionRow = requireIndex(solution, row, `${name}.solution`);
      const puzzleValue = requireIndex(puzzleRow, col, `${name}.puzzle[${row}]`);
      if (puzzleValue !== 0) {
        assertValid(
          puzzleValue === requireIndex(solutionRow, col, `${name}.solution[${row}]`),
          `${name}.puzzle[${row}][${col}] must match the solution when it is not empty.`
        );
      }
    }
  }
}

function validateCurrentAgainstPuzzle(current: Board, puzzle: Board, name: string): void {
  for (let row = 0; row < 9; row += 1) {
    const currentRow = requireIndex(current, row, `${name}.current`);
    const puzzleRow = requireIndex(puzzle, row, `${name}.puzzle`);
    for (let col = 0; col < 9; col += 1) {
      const puzzleValue = requireIndex(puzzleRow, col, `${name}.puzzle[${row}]`);
      if (puzzleValue !== 0) {
        assertValid(
          requireIndex(currentRow, col, `${name}.current[${row}]`) === puzzleValue,
          `${name}.current[${row}][${col}] must match the fixed clue value.`
        );
      }
    }
  }
}

export function createSaveData(state: SaveState, now = Date.now()): SaveFileV1 {
  return {
    format: SAVE_FILE_FORMAT,
    version: SAVE_FILE_VERSION,
    savedAt: new Date(now).toISOString(),
    game: {
      puzzle: cloneBoard(state.puzzle),
      solution: cloneBoard(state.solution),
      current: cloneBoard(state.current),
      notes: serializeNotes(state.notes),
      hintCount: state.hintCount,
      solutionRevealed: Boolean(state.solutionRevealed),
      noteMode: Boolean(state.noteMode),
      highlightNoteMode: Boolean(state.highlightNoteMode),
      selectedCell: state.selectedCell ? { ...state.selectedCell } : null,
      timer: captureTimerSnapshot(state.timer, now),
      selectedClueCount: state.selectedClueCount,
      selectedSeedRaw: String(state.selectedSeedRaw ?? ''),
      selectedSeedWasRandom: Boolean(state.selectedSeedWasRandom),
      history: state.history.map(serializeSnapshot),
      future: state.future.map(serializeSnapshot)
    }
  };
}

export function parseSaveText(text: string): RestoredSaveFileV1 {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('The save file is not valid JSON.', { cause: error });
  }

  assertRecord(parsed, 'The save file must contain an object.');
  assertValid(parsed.format === SAVE_FILE_FORMAT, 'The save file format is not supported.');
  assertValid(parsed.version === SAVE_FILE_VERSION, 'The save file version is not supported.');

  const game = parsed.game;
  assertRecord(game, 'The save file must contain a game object.');

  const puzzle = normalizeBoard(game.puzzle, 'game.puzzle', 0, 9);
  const solution = normalizeBoard(game.solution, 'game.solution', 1, 9);
  validatePuzzleAgainstSolution(puzzle, solution, 'game');
  const current = normalizeBoard(game.current, 'game.current', 0, 9);
  validateCurrentAgainstPuzzle(current, puzzle, 'game');

  return {
    format: SAVE_FILE_FORMAT,
    version: SAVE_FILE_VERSION,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    game: {
      puzzle,
      solution,
      current,
      notes: deserializeNotes(game.notes, 'game.notes'),
      hintCount: normalizeNonNegativeInteger(game.hintCount, 'game.hintCount'),
      solutionRevealed: Boolean(game.solutionRevealed),
      noteMode: Boolean(game.noteMode),
      highlightNoteMode: Boolean(game.highlightNoteMode),
      selectedCell: normalizeSelectedCell(game.selectedCell, 'game.selectedCell'),
      timer: normalizeTimer(game.timer, 'game.timer'),
      selectedClueCount: normalizeNonNegativeInteger(game.selectedClueCount, 'game.selectedClueCount'),
      selectedSeedRaw: String(game.selectedSeedRaw ?? ''),
      selectedSeedWasRandom: Boolean(game.selectedSeedWasRandom),
      history: isUnknownArray(game.history)
        ? game.history.map((snapshot, index) => normalizeSnapshot(snapshot, `game.history[${index}]`))
        : [],
      future: isUnknownArray(game.future)
        ? game.future.map((snapshot, index) => normalizeSnapshot(snapshot, `game.future[${index}]`))
        : []
    }
  };
}

export function createSaveFilename(now = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');

  return `sudoku-save-${timestamp}.json`;
}
