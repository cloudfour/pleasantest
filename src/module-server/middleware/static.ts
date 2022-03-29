import { posix, resolve } from 'path';
import type polka from 'polka';
import { promises as fs, createReadStream } from 'fs';
import mime from 'mime/lite';

interface StaticMiddlewareOpts {
  root: string;
}

/**
 * This middleware handles static assets that are requested
 */
export const staticMiddleware =
  ({ root }: StaticMiddlewareOpts): polka.Middleware =>
  async (req, res, next) => {
    try {
      const absPath = resolve(root, ...req.path.split(posix.sep));
      if (!absPath.startsWith(root)) {
        next();
        return;
      }

      const stats = await fs.stat(absPath).catch((() => {}) as () => undefined);
      if (!stats?.isFile()) {
        next();
        return;
      }

      const headers = {
        'Content-Type': (mime as any).getType(absPath) || '',
      };

      res.writeHead(200, headers);
      createReadStream(absPath).pipe(res);
    } catch (error) {
      next(error);
    }
  };
