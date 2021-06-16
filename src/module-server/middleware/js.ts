import { posix, relative, resolve, sep } from 'path';
import type polka from 'polka';

interface JSMiddlewareOpts {
  root: string;
}

// Minimal version of https://github.com/preactjs/wmr/blob/main/packages/wmr/src/wmr-middleware.js

export const jsMiddleware =
  ({ root }: JSMiddlewareOpts): polka.Middleware =>
  async (req, res, next) => {
    // Normalized path starting with slash
    const path = posix.normalize(req.path);
    // Remove leading slash, and convert slashes to os-specific slashes
    const osPath = path.slice(1).split(posix.sep).join(sep);
    // Absolute file path
    const file = resolve(root, osPath);
    // Rollup-style CWD-relative Unix-normalized path "id":
    const id = `./${relative(root, file)
      .replace(/^\.\//, '')
      .replace(/^\0/, '')
      .split(sep)
      .join(posix.sep)}`;

    res.setHeader('Content-Type', 'application/javascript;charset=utf-8');

    next();
  };
