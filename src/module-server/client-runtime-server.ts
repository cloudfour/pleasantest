import path from 'path';
import type { Middleware, Polka } from 'polka';
import { fileURLToPath } from 'url';
import { createServer } from './server';
import { promises as fs } from 'fs';

let currentDir: string;
try {
  currentDir = path.dirname(fileURLToPath(import.meta.url));
} catch {
  currentDir = __dirname;
}

const cache = new Map<string, string>();

const clientRuntimeMiddleware =
  (root = path.resolve(currentDir, '..')): Middleware =>
  async (req, res, next) => {
    if (!req.path.startsWith('/@pleasantest')) return next();
    res.setHeader('Content-Type', 'application/javascript;charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const cached = cache.get(req.path);
    if (cached) {
      res.end(cached);
      return;
    }

    const filePath = path.join(
      root,
      req.path === '/@pleasantest/jest-dom'
        ? 'jest-dom.js'
        : req.path === '/@pleasantest/user-util'
        ? 'user-util.js'
        : 'pptr-testing-library-client.js',
    );
    const text = await fs.readFile(filePath, 'utf8');
    res.end(text);
    cache.set(req.path, text);
  };

let cachedServer:
  | Promise<{ port: number; server: Polka; close: () => Promise<void> }>
  | undefined;

/**
 * The Client Runtime server serves up the bundles for testing library, jest-dom, and user-event
 * The instance is reused (there should only ever be once instance per node process)
 */
export const createClientRuntimeServer = async (rootDir?: string) => {
  if (cachedServer) return cachedServer;
  return (cachedServer = createServer({
    middleware: [clientRuntimeMiddleware(rootDir)],
  }));
};

export const cleanupClientRuntimeServer = async () => {
  await (await cachedServer)?.close();
};
