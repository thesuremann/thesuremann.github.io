import { deriveBoardState, type Coordinate } from './board-analysis.js';
import { cloneBoard, createNotesBoard, restoreSnapshot, type CellPosition, type HistorySnapshot, type NotesBoard } from './history.js';
import type { Language } from './i18n.js';
import type { RestoredSaveFileV1 } from './persistence.js';
import type { Board, Digit } from './sudoku.js';
import { createTimerState, type TimerState } from './timer.js';

export interface GameState {
  puzzle: Board;
  solution: Board;
  current: Board;
  notes: NotesBoard;
  givens: Set<string>;
  selectedCell: CellPosition | null;
  noteMode: boolean;
  highlightNoteMode: boolean;
  history: HistorySnapshot[];
  future: HistorySnapshot[];
  solutionDigitMap: Map<Digit, Coordinate[]>;
  timer: TimerState;
  hintCount: number;
  solutionRevealed: boolean;
  selectedClueCount: number;
  selectedSeedRaw: string;
  selectedSeedWasRandom: boolean;
  currentLang: Language;
}

export function createInitialGameState(): GameState {
  return {
    puzzle: [],
    solution: [],
    current: [],
    notes: createNotesBoard(),
    givens: new Set<string>(),
    selectedCell: null,
    noteMode: false,
    highlightNoteMode: false,
    history: [],
    future: [],
    solutionDigitMap: new Map<Digit, Coordinate[]>(),
    timer: createTimerState(),
    hintCount: 0,
    solutionRevealed: false,
    selectedClueCount: 32,
    selectedSeedRaw: '',
    selectedSeedWasRandom: true,
    currentLang: 'ja'
  };
}

export interface GeneratedPuzzleStateInput {
  puzzle: Board;
  solution: Board;
  actualClueCount: number;
  seedValue: string;
  seedWasRandom: boolean;
}

export function applyGeneratedPuzzleState(
  state: GameState,
  input: Readonly<GeneratedPuzzleStateInput>
): void {
  state.puzzle = input.puzzle;
  state.solution = input.solution;
  state.current = cloneBoard(input.puzzle);
  state.notes = createNotesBoard();

  const derived = deriveBoardState(input.puzzle, input.solution);
  state.givens = derived.givens;
  state.solutionDigitMap = derived.solutionDigitMap;

  state.history = [];
  state.future = [];
  state.hintCount = 0;
  state.solutionRevealed = false;
  state.selectedClueCount = input.actualClueCount;
  state.selectedSeedRaw = input.seedValue;
  state.selectedSeedWasRandom = input.seedWasRandom;
}

export function applyRestoredGameState(
  state: GameState,
  game: Readonly<RestoredSaveFileV1['game']>,
  now = Date.now()
): void {
  state.puzzle = game.puzzle;
  state.solution = game.solution;
  state.current = game.current;
  state.notes = game.notes;
  state.history = game.history;
  state.future = game.future;
  state.hintCount = game.hintCount;
  state.solutionRevealed = game.solutionRevealed;
  state.noteMode = game.noteMode;
  state.highlightNoteMode = game.highlightNoteMode;
  state.selectedCell = game.selectedCell;
  state.selectedClueCount = game.selectedClueCount;
  state.selectedSeedRaw = game.selectedSeedRaw;
  state.selectedSeedWasRandom = game.selectedSeedWasRandom;

  const derived = deriveBoardState(game.puzzle, game.solution);
  state.givens = derived.givens;
  state.solutionDigitMap = derived.solutionDigitMap;

  restoreSnapshot(state, {
    current: state.current,
    notes: state.notes,
    hintCount: state.hintCount,
    solutionRevealed: state.solutionRevealed,
    noteMode: state.noteMode,
    highlightNoteMode: state.highlightNoteMode,
    selectedCell: state.selectedCell,
    timer: game.timer
  }, now);
}
