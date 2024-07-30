import { createReadStream, promises as fs } from 'node:fs';
import { posix, resolve } from 'node:path';

// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import mime from 'mime/lite';
import type polka from 'polka';

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
