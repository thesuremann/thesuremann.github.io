import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const extensionSrcDir = path.join(rootDir, 'src-extension');
const buildDir = path.join(rootDir, '.build');
const browserBuildDir = path.join(buildDir, 'browser');
const extensionBuildDir = path.join(buildDir, 'extension');
const distDir = path.join(rootDir, 'dist');
const extensionDistDir = path.join(distDir, 'extension');
const tscPath = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

const importPattern = /^\s*import\s+([^'\"]+?)\s+from\s+['\"](.+)['\"];\s*$/gm;
const unsupportedExportPattern = /^\s*export\s+(?:default\b|\{|\*)/m;
const remainingImportPattern = /^\s*import\b/m;

function normalizeLineEndings(source: string): string {
  return source.replace(/\r\n/g, '\n');
}

function escapeInlineScript(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script');
}

function escapeInlineStyle(source: string): string {
  return source.replace(/<\/style/gi, '<\\/style');
}

function sourceLabel(absolutePath: string): string {
  const relativeToBrowserBuild = path.relative(browserBuildDir, absolutePath);
  if (!relativeToBrowserBuild.startsWith('..') && !path.isAbsolute(relativeToBrowserBuild)) {
    return `src/${relativeToBrowserBuild}`.replace(/\\/g, '/');
  }
  return path.relative(rootDir, absolutePath).replace(/\\/g, '/');
}

function assertClassicScriptSyntax(source: string, label: string): void {
  try {
    // Parse only. The generated browser script is not executed in the Node build process.
    new Function(source);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Generated classic script is invalid for ${label}: ${message}`, { cause: error });
  }
}

async function runTypeScriptCompiler(configFile: string): Promise<void> {
  await execFileAsync(process.execPath, [tscPath, '-p', configFile], {
    cwd: rootDir
  });
}

async function compileRuntimeJavaScript(): Promise<void> {
  await rm(browserBuildDir, { recursive: true, force: true });
  await rm(extensionBuildDir, { recursive: true, force: true });
  await mkdir(buildDir, { recursive: true });
  await runTypeScriptCompiler('tsconfig.json');
  await runTypeScriptCompiler('config/tsconfig/extension.json');
}

async function bundleJavaScript(entryFile: string): Promise<string> {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visitStack: string[] = [];
  const chunks: string[] = [];

  async function visit(modulePath: string): Promise<void> {
    const absolutePath = path.resolve(modulePath);
    if (visited.has(absolutePath)) {
      return;
    }
    if (visiting.has(absolutePath)) {
      const cycleStart = visitStack.indexOf(absolutePath);
      const cycle = [...visitStack.slice(cycleStart), absolutePath]
        .map(sourceLabel)
        .join(' -> ');
      throw new Error(`Circular imports are unsupported by the single-file bundler: ${cycle}`);
    }

    visiting.add(absolutePath);
    visitStack.push(absolutePath);

    const source = normalizeLineEndings(await readFile(absolutePath, 'utf8'));
    const imports = [...source.matchAll(importPattern)].map((match) => {
      const clause = match[1];
      const dependency = match[2];
      if (clause === undefined || dependency === undefined) {
        throw new Error(`Unexpected import-parser match in ${sourceLabel(absolutePath)}.`);
      }
      return { clause: clause.trim(), dependency };
    });

    for (const { clause, dependency } of imports) {
      const isPlainNamedImport = /^\{\s*[A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*\s*,?\s*\}$/.test(clause);
      if (!isPlainNamedImport) {
        throw new Error(
          `Unsupported import binding in ${sourceLabel(absolutePath)}: ${clause}. `
          + 'Only unaliased named imports are supported by the single-file bundler.'
        );
      }
      if (!dependency.startsWith('.')) {
        throw new Error(`Only relative imports are supported in the build script: ${dependency}`);
      }
      await visit(path.resolve(path.dirname(absolutePath), dependency));
    }

    const withoutImports = source.replace(importPattern, '');
    if (remainingImportPattern.test(withoutImports)) {
      throw new Error(`Unsupported import syntax in ${sourceLabel(absolutePath)}.`);
    }
    if (unsupportedExportPattern.test(withoutImports)) {
      throw new Error(`Unsupported export syntax in ${sourceLabel(absolutePath)}.`);
    }

    const withoutExports = withoutImports.replace(/^\s*export\s+/gm, '');
    chunks.push(`// ${sourceLabel(absolutePath)}\n${withoutExports.trim()}\n`);

    visitStack.pop();
    visiting.delete(absolutePath);
    visited.add(absolutePath);
  }

  await visit(entryFile);

  const bundledSource = [
    '(() => {',
    '\'use strict\';',
    '',
    ...chunks,
    '})();',
    ''
  ].join('\n');

  assertClassicScriptSyntax(bundledSource, sourceLabel(entryFile));
  return bundledSource;
}

async function buildSingleFileHtml(): Promise<void> {
  const htmlTemplate = normalizeLineEndings(await readFile(path.join(srcDir, 'index.html'), 'utf8'));
  const themeInitSource = normalizeLineEndings(await readFile(path.join(browserBuildDir, 'theme-init.js'), 'utf8'));
  const cssSource = normalizeLineEndings(await readFile(path.join(srcDir, 'styles.css'), 'utf8'));
  const jsSource = await bundleJavaScript(path.join(browserBuildDir, 'main.js'));
  const themeJsSource = await bundleJavaScript(path.join(browserBuildDir, 'theme.js'));

  const output = htmlTemplate
    .replace('<script src="./theme-init.js"></script>', `<script>\n${escapeInlineScript(themeInitSource)}\n</script>`)
    .replace('<link rel="stylesheet" href="./styles.css" />', `<style>\n${escapeInlineStyle(cssSource)}\n</style>`)
    .replace('<script type="module" src="./main.js"></script>', `<script>\n${escapeInlineScript(jsSource)}\n</script>`)
    .replace('<script type="module" src="./theme.js"></script>', `<script>\n${escapeInlineScript(themeJsSource)}\n</script>`);

  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, 'Sudoku.html'), output, 'utf8');
}

async function copyExtensionStaticFiles(): Promise<void> {
  await cp(path.join(srcDir, 'index.html'), path.join(extensionDistDir, 'index.html'));
  await cp(path.join(srcDir, 'styles.css'), path.join(extensionDistDir, 'styles.css'));
  await cp(path.join(extensionSrcDir, 'manifest.json'), path.join(extensionDistDir, 'manifest.json'));
  await cp(path.join(extensionSrcDir, '_locales'), path.join(extensionDistDir, '_locales'), { recursive: true });
  await cp(path.join(extensionSrcDir, 'icons'), path.join(extensionDistDir, 'icons'), { recursive: true });
}

async function buildExtension(): Promise<void> {
  await mkdir(extensionDistDir, { recursive: true });
  await cp(browserBuildDir, extensionDistDir, { recursive: true });
  await copyExtensionStaticFiles();
  await cp(
    path.join(extensionBuildDir, 'background.js'),
    path.join(extensionDistDir, 'background.js')
  );
}

await rm(distDir, { recursive: true, force: true });
await compileRuntimeJavaScript();
await buildSingleFileHtml();
await buildExtension();
