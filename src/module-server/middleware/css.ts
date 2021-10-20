import { posix, relative, resolve, sep } from 'path';
import type polka from 'polka';
import { promises as fs } from 'fs';
import { transformCSS } from '../plugins/css';
import { cssExts } from '../extensions-and-detection';

interface CSSMiddlewareOpts {
  root: string;
}

/**
 * This middleware handles _only_ css files that were _not imported from JS_
 * CSS files that were imported from JS have the ?import param and were handled by the JS middleware (transformed to JS)
 * This middleware does not transform CSS to JS that can be imported, it just returns CSS
 * Use cases: CSS included via <link> tags, CSS included via @import
 * TODO: consider using this for loadCSS
 */
export const cssMiddleware =
  ({ root }: CSSMiddlewareOpts): polka.Middleware =>
  async (req, res, next) => {
    try {
      // TODO: use passed in loaders/handlers to determine extensions
      if (!cssExts.test(req.path)) return next();
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

      res.setHeader('Content-Type', 'text/css;charset=utf-8');
      // TODO: handle errors here using buildId thing
      const { code } = await transformCSS(
        await fs.readFile(file, 'utf-8'),
        id,
        root,
      );

      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(code, 'utf-8'),
      });
      res.end(code);
    } catch (error) {
      next(error);
    }
  };
