import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium, expect, test, type Page } from '@playwright/test';

interface PuzzleOptions {
  clueCount: number;
  seed: number;
}

interface CellCoordinates {
  row: string;
  col: string;
}

interface RawCellCoordinates {
  row: string | null;
  col: string | null;
}

function requireCellCoordinates(
  coordinates: RawCellCoordinates | null,
  description: string
): CellCoordinates {
  if (!coordinates || coordinates.row === null || coordinates.col === null) {
    throw new Error(`${description} is missing row/column metadata.`);
  }

  return {
    row: coordinates.row,
    col: coordinates.col
  };
}

async function openEnglishPage(page: Page): Promise<void> {
  await page.goto('/');
  await page.selectOption('#lang', 'en');
  await expect(page.locator('#help')).toHaveText('How to Play');
}

async function generatePuzzle(page: Page, { clueCount, seed }: PuzzleOptions): Promise<void> {
  await page.selectOption('#clueCount', String(clueCount));
  await page.locator('#seed').fill(String(seed));
  await page.locator('#newGame').click();
}

async function readBoard(page: Page): Promise<string[]> {
  return page.locator('#board .cell').evaluateAll((cells) => (
    cells.map((cell) => (cell.textContent ?? '').trim())
  ));
}

async function getFirstEmptyCell(page: Page): Promise<CellCoordinates> {
  const emptyCell = await page.locator('#board .cell').evaluateAll((cells): RawCellCoordinates | null => {
    const target = cells.find((cell) => (cell.textContent ?? '').trim() === '');
    return target ? {
      row: target.getAttribute('data-row'),
      col: target.getAttribute('data-col')
    } : null;
  });

  if (!emptyCell) {
    throw new Error('No empty cell was found.');
  }

  return requireCellCoordinates(emptyCell, 'Empty cell');
}

async function getFirstEmptyCells(page: Page, count: number): Promise<CellCoordinates[]> {
  const cells = await page.locator('#board .cell').evaluateAll((allCells, amount): RawCellCoordinates[] => (
    allCells
      .filter((cell) => (cell.textContent ?? '').trim() === '')
      .slice(0, amount)
      .map((cell) => ({
        row: cell.getAttribute('data-row'),
        col: cell.getAttribute('data-col')
      }))
  ), count);

  if (cells.length < count) {
    throw new Error(`Only found ${cells.length} empty cells.`);
  }

  return cells.map((cell, index) => requireCellCoordinates(cell, `Empty cell ${index}`));
}

async function getVisibleNotes(page: Page, row: string, col: string): Promise<string> {
  return page.locator(`#board .cell[data-row="${row}"][data-col="${col}"]`).evaluate((cell) => (
    Array.from(cell.querySelectorAll('.notes span'))
      .map((span) => span.textContent ?? '')
      .join('')
  ));
}

test('help dialog exposes the built-in guide and repository link', async ({ page }) => {
  await openEnglishPage(page);

  await page.locator('#help').click();
  await expect(page.locator('#helpDialog')).toBeVisible();
  await expect(page.locator('#helpTitle')).toHaveText('How to Play');
  await expect(page.locator('#helpContent')).toContainText('Seed');
  await expect(page.locator('#helpContent')).toContainText('Internet connection required.');
  await expect(page.locator('#helpContent a[href="https://github.com/piccoripico/sudoku-html"]')).toBeVisible();

  await page.locator('#helpClose').click();
  await expect(page.locator('#helpOverlay')).toBeHidden();
});

test('the same seed and clue count reproduce the same puzzle', async ({ page }) => {
  await openEnglishPage(page);

  await generatePuzzle(page, { clueCount: 24, seed: 123456 });
  const firstBoard = await readBoard(page);

  await generatePuzzle(page, { clueCount: 24, seed: 123456 });
  const secondBoard = await readBoard(page);

  expect(secondBoard).toEqual(firstBoard);
});

test('Ctrl+Shift+Z redoes an undone entry', async ({ page }) => {
  await openEnglishPage(page);
  await generatePuzzle(page, { clueCount: 24, seed: 314159 });

  const target = await getFirstEmptyCell(page);
  const cell = page.locator(`#board .cell[data-row="${target.row}"][data-col="${target.col}"]`);
  await cell.click();

  await page.keyboard.press('1');
  await expect(cell).toHaveText('1');

  await page.keyboard.press('Control+Z');
  await expect(cell).toHaveText('');

  await page.keyboard.press('Control+Shift+Z');
  await expect(cell).toHaveText('1');
});

test('game keyboard shortcuts keep working after a pad button receives focus', async ({ page }) => {
  await openEnglishPage(page);
  await generatePuzzle(page, { clueCount: 24, seed: 271828 });

  const target = await getFirstEmptyCell(page);
  const cell = page.locator(`#board .cell[data-row="${target.row}"][data-col="${target.col}"]`);
  await cell.click();

  const oneButton = page.locator('#pad button.num').filter({ hasText: /^1$/ });
  await oneButton.click();
  await expect(cell).toHaveText('1');
  await expect(oneButton).toBeFocused();

  await page.keyboard.press('2');
  await expect(cell).toHaveText('2');

  await page.keyboard.press('Enter');
  await expect(cell).toHaveText('1');
  await expect(page.locator('#pad .pad-action:not(.red-note)')).not.toHaveClass(/active/);
});

test('preference saving is opt-in and persists all four settings only when enabled', async ({ page }) => {
  await openEnglishPage(page);

  const persistenceToggle = page.locator('#persistPreferences');
  const seedField = page.locator('#seedField');
  const seedInput = page.locator('#seed');

  await expect(page.locator('#seedLabel')).toHaveText('Seed (blank for random)');
  await expect(seedInput).toHaveAttribute('placeholder', 'Optional (blank for random)');
  await expect(page.locator('#preferenceSaveLabel')).toHaveText('Save settings');
  await expect(persistenceToggle).not.toBeChecked();

  await page.selectOption('#clueCount', '28');
  await seedInput.fill('424242');
  await page.selectOption('#theme', 'dark');
  await expect(seedField).toHaveClass(/seed-specified/);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  await page.reload();
  await expect(persistenceToggle).not.toBeChecked();
  await expect(page.locator('#clueCount')).toHaveValue('32');
  await expect(seedInput).toHaveValue('');
  await expect(page.locator('#theme')).toHaveValue('system');
  await expect(seedField).not.toHaveClass(/seed-specified/);

  await page.selectOption('#lang', 'en');
  await page.selectOption('#clueCount', '28');
  await seedInput.fill('424242');
  await page.selectOption('#theme', 'dark');
  await persistenceToggle.check();
  await expect(persistenceToggle).toBeChecked();

  const savedPreferences = await page.evaluate(() => ({
    enabled: localStorage.getItem('sudoku_preferences_enabled'),
    clues: localStorage.getItem('sudoku_clue_count'),
    seed: localStorage.getItem('sudoku_seed'),
    language: localStorage.getItem('sudoku_lang'),
    theme: localStorage.getItem('sudoku_theme')
  }));
  expect(savedPreferences).toEqual({
    enabled: 'true',
    clues: '28',
    seed: '424242',
    language: 'en',
    theme: 'dark'
  });

  await page.reload();
  await expect(persistenceToggle).toBeChecked();
  await expect(page.locator('#clueCount')).toHaveValue('28');
  await expect(seedInput).toHaveValue('424242');
  await expect(page.locator('#lang')).toHaveValue('en');
  await expect(page.locator('#theme')).toHaveValue('dark');
  await expect(seedField).toHaveClass(/seed-specified/);

  await persistenceToggle.uncheck();
  await expect(persistenceToggle).not.toBeChecked();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  await page.reload();
  await expect(persistenceToggle).not.toBeChecked();
  await expect(page.locator('#clueCount')).toHaveValue('32');
  await expect(seedInput).toHaveValue('');
  await expect(page.locator('#theme')).toHaveValue('system');
});

test('clear removes values and notes even while note mode is active', async ({ page }) => {
  await openEnglishPage(page);
  await generatePuzzle(page, { clueCount: 24, seed: 246810 });
  const noteButton = page.locator('#pad .pad-action:not(.red-note)');

  const target = await getFirstEmptyCell(page);
  const cell = page.locator(`#board .cell[data-row="${target.row}"][data-col="${target.col}"]`);
  await cell.click();

  await page.keyboard.press('1');
  await expect(cell).toHaveText('1');

  await page.keyboard.press('Enter');
  await expect(noteButton).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(cell).toHaveText('');

  await cell.click();
  await page.keyboard.press('2');
  await expect.poll(() => getVisibleNotes(page, target.row, target.col)).toBe('2');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect.poll(() => getVisibleNotes(page, target.row, target.col)).toBe('');
});

test('mobile viewport keeps the board and pad actions usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEnglishPage(page);

  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#pad')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Red Note' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
});

test('save and load restore progress, notes, and undo history', async ({ page }) => {
  await openEnglishPage(page);
  await generatePuzzle(page, { clueCount: 24, seed: 13579 });

  const targets = await getFirstEmptyCells(page, 2);
  const valueTarget = targets[0];
  const noteTarget = targets[1];
  if (valueTarget === undefined || noteTarget === undefined) {
    throw new Error('Expected at least two empty cells for save/load coverage.');
  }
  const noteButton = page.locator('#pad .pad-action:not(.red-note)');
  const valueCell = page.locator(`#board .cell[data-row="${valueTarget.row}"][data-col="${valueTarget.col}"]`);
  const noteCell = page.locator(`#board .cell[data-row="${noteTarget.row}"][data-col="${noteTarget.col}"]`);

  await valueCell.click();
  await page.keyboard.press('1');
  await expect(valueCell).toHaveText('1');

  await noteCell.click();
  await page.keyboard.press('Enter');
  await expect(noteButton).toHaveClass(/active/);
  await page.keyboard.press('2');
  await expect.poll(() => getVisibleNotes(page, noteTarget.row, noteTarget.col)).toBe('2');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (downloadPath === null) {
    throw new Error('Playwright did not provide a download path.');
  }
  const saveText = await readFile(downloadPath, 'utf8');
  const savedJson: unknown = JSON.parse(saveText);

  expect(savedJson).toMatchObject({
    format: 'sudoku-html-save',
    version: 1
  });

  await generatePuzzle(page, { clueCount: 32, seed: 24680 });

  await page.locator('#loadFile').setInputFiles({
    name: 'saved-game.json',
    mimeType: 'application/json',
    buffer: Buffer.from(saveText, 'utf8')
  });

  await expect(page.locator('#status')).toHaveText('The saved state has been loaded.');
  await expect(valueCell).toHaveText('1');
  await expect.poll(() => getVisibleNotes(page, noteTarget.row, noteTarget.col)).toBe('2');
  await expect(page.locator('#stats')).toContainText('Actual clues: 24');
  await expect(page.locator('#stats')).toContainText('Seed: 13579');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => getVisibleNotes(page, noteTarget.row, noteTarget.col)).toBe('');
});


test('built single-file distribution runs directly from file://', async ({ page }) => {
  const singleFileUrl = pathToFileURL(path.resolve('dist', 'Sudoku.html')).href;
  await page.goto(singleFileUrl);

  await expect(page.locator('#board .cell')).toHaveCount(81);
  await page.selectOption('#lang', 'en');
  await expect(page.locator('#help')).toHaveText('How to Play');

  await generatePuzzle(page, { clueCount: 24, seed: 424242 });
  await expect(page.locator('#stats')).toContainText('Seed: 424242');
  const target = await getFirstEmptyCell(page);
  const cell = page.locator(`#board .cell[data-row="${target.row}"][data-col="${target.col}"]`);
  await cell.click();
  await page.keyboard.press('1');
  await expect(cell).toHaveText('1');
});

test('built unpacked extension registers its worker and initializes the Sudoku page', async () => {
  const extensionPath = path.resolve('dist', 'extension');
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'sudoku-extension-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    expect(extensionId).not.toBe('');

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html`);
    await expect(page.locator('#board .cell')).toHaveCount(81);
    await page.selectOption('#lang', 'en');
    await expect(page.locator('#help')).toHaveText('How to Play');
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
