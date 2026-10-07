import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const extensionDir = path.join(distDir, 'extension');

interface GeneratedPuzzleLike {
  actualClueCount: number;
  puzzleBoard: number[][];
  solutionBoard: number[][];
}

interface SudokuRuntimeModule {
  generatePuzzle(clues: number, seed: string): GeneratedPuzzleLike;
}

interface RestoredSaveLike {
  version: number;
  game: {
    history: unknown[];
    future: unknown[];
  };
}

interface PersistenceRuntimeModule {
  parseSaveText(text: string): RestoredSaveLike;
}

async function assertFile(relativePath: string): Promise<string> {
  const absolutePath = path.join(rootDir, relativePath);
  await access(absolutePath);
  return absolutePath;
}

async function listFilesRecursive(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }
  return files;
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertClassicScriptSyntax(source: string, label: string): void {
  try {
    // Parse only. Artifact verification must not execute browser code in Node.
    new Function(source);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid classic script in ${label}: ${message}`, { cause: error });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeErrorWithCode(value: unknown): value is Error & { code: string } {
  return value instanceof Error
    && 'code' in value
    && typeof (value as { code?: unknown }).code === 'string';
}

async function assertAbsent(relativePath: string): Promise<void> {
  try {
    await access(path.join(rootDir, relativePath));
  } catch (error: unknown) {
    if (isNodeErrorWithCode(error) && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  throw new Error(`Legacy JavaScript config must not remain: ${relativePath}`);
}

function isSudokuRuntimeModule(value: unknown): value is SudokuRuntimeModule {
  return isRecord(value) && typeof value.generatePuzzle === 'function';
}

function isPersistenceRuntimeModule(value: unknown): value is PersistenceRuntimeModule {
  return isRecord(value) && typeof value.parseSaveText === 'function';
}

const typedDomContract: Readonly<Record<string, string>> = {
  board: 'div',
  pad: 'div',
  status: 'div',
  stats: 'div',
  timer: 'div',
  undo: 'button',
  redo: 'button',
  help: 'button',
  helpOverlay: 'div',
  helpTitle: 'h2',
  helpContent: 'div',
  helpClose: 'button',
  clueCount: 'select',
  seed: 'input',
  seedField: 'div',
  lang: 'select',
  theme: 'select',
  persistPreferences: 'input',
  preferenceSaveToggle: 'label',
  preferenceSaveLabel: 'span',
  saveGame: 'button',
  loadGame: 'button',
  loadFile: 'input',
  title: 'h1',
  clueCountLabel: 'label',
  seedLabel: 'label',
  langLabel: 'label',
  newGame: 'button',
  reset: 'button',
  hint: 'button',
  solve: 'button',
  padTitle: 'h2',
  hintText: 'p'
};

function verifyTypedDomContract(html: string): void {
  for (const [id, tag] of Object.entries(typedDomContract)) {
    const pattern = new RegExp(`<${tag}\\b[^>]*\\bid=[\"']${id}[\"']`, 'i');
    assertCondition(pattern.test(html), `Typed DOM contract mismatch: expected #${id} to be <${tag}>.`);
  }
}

function boardString(board: readonly (readonly number[])[]): string {
  return board.flat().join('');
}

async function verifyEmittedCompatibility(): Promise<void> {
  const fixtureValue: unknown = JSON.parse(
    await readFile(path.join(rootDir, 'tests/fixtures/v1.7.1-seed-golden.json'), 'utf8')
  );
  assertCondition(isRecord(fixtureValue) && Array.isArray(fixtureValue.cases), 'Seed fixture must contain a cases array.');

  const sudokuValue: unknown = await import(pathToFileURL(path.join(rootDir, '.build/browser/lib/sudoku.js')).href);
  assertCondition(isSudokuRuntimeModule(sudokuValue), 'Emitted Sudoku module has an unexpected shape.');

  for (const expected of fixtureValue.cases) {
    assertCondition(isRecord(expected), 'Seed fixture case must be an object.');
    const { clues, seed, actualClueCount, puzzle, solution } = expected;
    assertCondition(typeof clues === 'number', 'Seed fixture clues must be a number.');
    assertCondition(typeof seed === 'string', 'Seed fixture seed must be a string.');
    assertCondition(typeof actualClueCount === 'number', 'Seed fixture actualClueCount must be a number.');
    assertCondition(typeof puzzle === 'string', 'Seed fixture puzzle must be a string.');
    assertCondition(typeof solution === 'string', 'Seed fixture solution must be a string.');

    const actual = sudokuValue.generatePuzzle(clues, seed);
    assertCondition(
      actual.actualClueCount === actualClueCount,
      `Emitted Sudoku clue-count drift for ${clues}/${seed}.`
    );
    assertCondition(
      boardString(actual.puzzleBoard) === puzzle,
      `Emitted Sudoku puzzle drift for ${clues}/${seed}.`
    );
    assertCondition(
      boardString(actual.solutionBoard) === solution,
      `Emitted Sudoku solution drift for ${clues}/${seed}.`
    );
  }

  const persistenceValue: unknown = await import(
    pathToFileURL(path.join(rootDir, '.build/browser/lib/persistence.js')).href
  );
  assertCondition(isPersistenceRuntimeModule(persistenceValue), 'Emitted persistence module has an unexpected shape.');

  const saveText = await readFile(path.join(rootDir, 'tests/fixtures/v1.7.1-save.json'), 'utf8');
  const restored = persistenceValue.parseSaveText(saveText);
  assertCondition(restored.version === 1, 'Emitted persistence code must read save version 1.');
  assertCondition(restored.game.history.length === 1, 'Emitted persistence code must restore Undo history.');
  assertCondition(restored.game.future.length === 1, 'Emitted persistence code must restore Redo history.');
}

const sourceHtml = await readFile(path.join(rootDir, 'src/index.html'), 'utf8');
verifyTypedDomContract(sourceHtml);

const governedSourceDirectories = ['src', 'src-extension', 'scripts', 'tests', 'e2e'];
const governedSourceFiles = (await Promise.all(
  governedSourceDirectories.map((directory) => listFilesRecursive(path.join(rootDir, directory)))
)).flat();
const governedJavaScriptSources = governedSourceFiles.filter((file) => /\.(?:js|mjs|cjs|jsx)$/i.test(file));
assertCondition(
  governedJavaScriptSources.length === 0,
  `First-party executable source must be TypeScript-only (no JS/MJS/CJS/JSX): ${governedJavaScriptSources.join(', ')}`
);

for (const legacyRootConfig of ['playwright.config.js', 'playwright.config.mjs']) {
  await assertAbsent(legacyRootConfig);
}

const singleFilePath = await assertFile('dist/Sudoku.html');
const singleFileHtml = await readFile(singleFilePath, 'utf8');
assertCondition(singleFileHtml.includes('<style>'), 'dist/Sudoku.html must inline CSS.');
assertCondition(!singleFileHtml.includes('src="./main.js"'), 'dist/Sudoku.html must inline main JavaScript.');
assertCondition(!singleFileHtml.includes('src="./theme.js"'), 'dist/Sudoku.html must inline theme JavaScript.');
assertCondition(!singleFileHtml.includes('src="./theme-init.js"'), 'dist/Sudoku.html must inline theme-init JavaScript.');
assertCondition(!singleFileHtml.includes('href="./styles.css"'), 'dist/Sudoku.html must inline styles.');
const firstInlineScriptIndex = singleFileHtml.indexOf('<script>');
const inlineStyleIndex = singleFileHtml.indexOf('<style>');
assertCondition(firstInlineScriptIndex >= 0 && inlineStyleIndex >= 0 && firstInlineScriptIndex < inlineStyleIndex, 'Early theme-init script must remain before inlined CSS.');

const inlineScripts = [...singleFileHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assertCondition(inlineScripts.length >= 3, 'dist/Sudoku.html must contain the expected inline scripts.');
for (const [index, match] of inlineScripts.entries()) {
  const source = match[1];
  assertCondition(source !== undefined, `dist/Sudoku.html inline script ${index + 1} must have source text.`);
  assertClassicScriptSyntax(source, `dist/Sudoku.html inline script ${index + 1}`);
}

const emittedThemeInit = await readFile(path.join(rootDir, '.build/browser/theme-init.js'), 'utf8');
assertCondition(!/^\s*(?:import|export)\s/m.test(emittedThemeInit), 'theme-init must remain a standalone classic script without imports/exports.');

const requiredExtensionFiles = [
  'dist/extension/manifest.json',
  'dist/extension/index.html',
  'dist/extension/styles.css',
  'dist/extension/theme-init.js',
  'dist/extension/theme.js',
  'dist/extension/main.js',
  'dist/extension/background.js',
  'dist/extension/lib/board-analysis.js',
  'dist/extension/lib/dom.js',
  'dist/extension/lib/game-state.js',
  'dist/extension/lib/history.js',
  'dist/extension/lib/i18n.js',
  'dist/extension/lib/input.js',
  'dist/extension/lib/indexed-access.js',
  'dist/extension/lib/persistence.js',
  'dist/extension/lib/preferences.js',
  'dist/extension/lib/puzzle-templates.js',
  'dist/extension/lib/sudoku.js',
  'dist/extension/lib/timer.js',
  'dist/extension/lib/ui-elements.js'
];
await Promise.all(requiredExtensionFiles.map(assertFile));

const manifestValue: unknown = JSON.parse(await readFile(path.join(extensionDir, 'manifest.json'), 'utf8'));
assertCondition(isRecord(manifestValue), 'Extension manifest must be an object.');
assertCondition(manifestValue.manifest_version === 3, 'Extension manifest must remain Manifest V3.');
assertCondition(isRecord(manifestValue.background) && manifestValue.background.service_worker === 'background.js', 'Extension service worker must be background.js.');

const extensionHtml = await readFile(path.join(extensionDir, 'index.html'), 'utf8');
const extensionThemeInitIndex = extensionHtml.indexOf('<script src="./theme-init.js"></script>');
const extensionStyleIndex = extensionHtml.indexOf('<link rel="stylesheet" href="./styles.css" />');
assertCondition(extensionThemeInitIndex >= 0 && extensionStyleIndex >= 0 && extensionThemeInitIndex < extensionStyleIndex, 'Extension theme-init must remain before CSS.');

for (const reference of ['./theme-init.js', './main.js', './theme.js']) {
  assertCondition(extensionHtml.includes(reference), `Extension HTML must reference ${reference}.`);
}

const extensionFiles = await listFilesRecursive(extensionDir);
const forbidden = extensionFiles.filter((file) => /\.(?:ts|tsx|map)$/i.test(file));
assertCondition(forbidden.length === 0, `Extension artifact contains forbidden source files: ${forbidden.join(', ')}`);

await verifyEmittedCompatibility();

console.log(`Artifact contract OK: Sudoku.html + ${extensionFiles.length} extension files + emitted compatibility.`);
