import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseSaveText } from '../src/lib/persistence.js';
import { generatePuzzle, type Board } from '../src/lib/sudoku.js';

const fixtureUrl = (name: string): URL => new URL(`./fixtures/${name}`, import.meta.url);
const boardString = (board: Board): string => board.flat().join('');

test('v1.7.1 deterministic puzzle golden fixtures remain exact', async () => {
  const fixture = JSON.parse(await readFile(fixtureUrl('v1.7.1-seed-golden.json'), 'utf8'));

  assert.equal(fixture.baselineVersion, '1.7.1');
  assert.equal(fixture.baselineCommit, 'a95e63c7435e028aca4002fc9b4a803ae0d37cc5');
  assert.ok(fixture.cases.length >= 20);

  for (const expected of fixture.cases) {
    const actual = generatePuzzle(expected.clues, expected.seed);
    assert.equal(actual.actualClueCount, expected.actualClueCount, `${expected.clues}/${expected.seed}: clue count`);
    assert.equal(boardString(actual.puzzleBoard), expected.puzzle, `${expected.clues}/${expected.seed}: puzzle`);
    assert.equal(boardString(actual.solutionBoard), expected.solution, `${expected.clues}/${expected.seed}: solution`);
  }
});

test('v1.7.1 save fixture remains readable with notes, timer, undo, and redo state', async () => {
  const text = await readFile(fixtureUrl('v1.7.1-save.json'), 'utf8');
  const restored = parseSaveText(text);

  assert.equal(restored.format, 'sudoku-html-save');
  assert.equal(restored.version, 1);
  assert.equal(restored.game.selectedClueCount, 24);
  assert.equal(restored.game.selectedSeedRaw, 'v1.7.1-save-fixture');
  assert.equal(restored.game.selectedSeedWasRandom, false);
  assert.equal(restored.game.timer.elapsedMs, 1750);
  assert.equal(restored.game.timer.running, true);
  assert.equal(restored.game.history.length, 1);
  assert.equal(restored.game.future.length, 1);
  assert.equal(restored.game.hintCount, 2);
  assert.equal(restored.game.noteMode, true);
  assert.equal(restored.game.highlightNoteMode, true);

  const noteEntries = restored.game.notes.flatMap((row) => (
    row.flatMap((noteMap) => Array.from(noteMap.entries()))
  ));
  assert.ok(noteEntries.some(([value, entry]) => value === 3 && entry.highlighted === false));
  assert.ok(noteEntries.some(([value, entry]) => value === 7 && entry.highlighted === true));
});
