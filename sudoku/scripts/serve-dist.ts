import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const rootDir = process.cwd();
const distFile = path.join(rootDir, 'dist', 'Sudoku.html');
const port = Number(process.env.PORT || 4173);

async function readDistFile(): Promise<Buffer> {
  return fs.readFile(distFile);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  const pathname = requestUrl.pathname;

  if (pathname !== '/' && pathname !== '/Sudoku.html') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  try {
    const body = await readDistFile();
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Failed to read dist/Sudoku.html: ${message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving dist/Sudoku.html at http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
