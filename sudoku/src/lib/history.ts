import type { Board, Digit } from './sudoku.js';
import {
  captureTimerSnapshot,
  restoreTimerFromSnapshot,
  type TimerSnapshot,
  type TimerState
} from './timer.js';

export interface CellPosition {
  row: number;
  col: number;
}

export interface NoteEntry {
  highlighted: boolean;
}

export type NoteMap = Map<Digit, NoteEntry>;
export type NotesBoard = NoteMap[][];

export interface SnapshotState {
  current: Board;
  notes: NotesBoard;
  hintCount: number;
  solutionRevealed: boolean;
  noteMode: boolean;
  highlightNoteMode: boolean;
  selectedCell: CellPosition | null;
  timer: TimerState;
}

export interface HistorySnapshot {
  current: Board;
  notes: NotesBoard;
  hintCount: number;
  solutionRevealed: boolean;
  noteMode: boolean;
  highlightNoteMode: boolean;
  selectedCell: CellPosition | null;
  timer: TimerSnapshot;
}

export function createNotesBoard(): NotesBoard {
  return Array.from(
    { length: 9 },
    () => Array.from({ length: 9 }, () => new Map<Digit, NoteEntry>())
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function cloneNotes(notesBoard: NotesBoard): NotesBoard {
  return notesBoard.map((row) => row.map((noteMap) => new Map(noteMap)));
}

export function captureSnapshot(state: SnapshotState, now = Date.now()): HistorySnapshot {
  return {
    current: cloneBoard(state.current),
    notes: cloneNotes(state.notes),
    hintCount: state.hintCount,
    solutionRevealed: state.solutionRevealed,
    noteMode: state.noteMode,
    highlightNoteMode: state.highlightNoteMode,
    selectedCell: state.selectedCell ? { ...state.selectedCell } : null,
    timer: captureTimerSnapshot(state.timer, now)
  };
}

export function restoreSnapshot(
  state: SnapshotState,
  snapshot: HistorySnapshot,
  now = Date.now()
): void {
  state.current = cloneBoard(snapshot.current);
  state.notes = cloneNotes(snapshot.notes);
  state.hintCount = snapshot.hintCount;
  state.solutionRevealed = snapshot.solutionRevealed;
  state.noteMode = snapshot.noteMode;
  state.highlightNoteMode = snapshot.highlightNoteMode ?? false;
  state.selectedCell = snapshot.selectedCell ? { ...snapshot.selectedCell } : null;
  restoreTimerFromSnapshot(state.timer, snapshot.timer, now);
}
