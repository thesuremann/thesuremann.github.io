import { spawn } from 'node:child_process';
import { cp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const testBuildDir = path.join(rootDir, '.build', 'tests');
const emittedTestsDir = path.join(testBuildDir, 'tests');
const tscPath = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

function run(command: string, args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(
        signal
          ? `${command} terminated by signal ${signal}.`
          : `${command} exited with code ${code}.`
      ));
    });
  });
}

await rm(testBuildDir, { recursive: true, force: true });
await run(process.execPath, [tscPath, '-p', 'config/tsconfig/tests.json']);
await cp(
  path.join(rootDir, 'tests', 'fixtures'),
  path.join(emittedTestsDir, 'fixtures'),
  { recursive: true }
);

async function findEmittedTestFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findEmittedTestFiles(absolutePath));
    } else if (entry.name.endsWith('.test.js')) {
      files.push(absolutePath);
    }
  }

  return files;
}

const emittedTestFiles = (await findEmittedTestFiles(emittedTestsDir)).sort();

if (emittedTestFiles.length === 0) {
  throw new Error('No emitted unit-test files were found.');
}

await run(process.execPath, ['--test', ...emittedTestFiles]);
