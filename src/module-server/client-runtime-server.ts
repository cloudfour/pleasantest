import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Middleware, Polka } from 'polka';

import { createServer } from './server.js';

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
    if (!req.path.startsWith('/@pleasantest')) {
      next();
      return;
    }
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
          : req.path === '/@pleasantest/accessibility'
            ? 'accessibility.js'
            : 'pptr-testing-library-client.js',
    );
    const text = await fs.readFile(filePath, 'utf8');
    res.end(text);
    cache.set(req.path, text);
  };

let cachedServerPromise:
  | Promise<{ port: number; server: Polka; close: () => Promise<void> }>
  | undefined;

/**
 * The Client Runtime server serves up the bundles for testing library, jest-dom, and user-event
 * The instance is reused (there should only ever be once instance per node process)
 */
export const createClientRuntimeServer = async (rootDir?: string) => {
  if (cachedServerPromise) return cachedServerPromise;
  return (cachedServerPromise = createServer({
    middleware: [clientRuntimeMiddleware(rootDir)],
  }));
};

export const cleanupClientRuntimeServer = async () => {
  const cachedServer = await cachedServerPromise;
  await cachedServer?.close();
};
