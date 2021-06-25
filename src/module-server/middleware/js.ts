import { dirname, isAbsolute, posix, relative, resolve, sep } from 'path';
import type polka from 'polka';
import type { Plugin } from 'rollup';
import { createPluginContainer } from '../rollup-plugin-container';
import { promises as fs } from 'fs';
import { transformImports } from '../transform-imports';

interface JSMiddlewareOpts {
  root: string;
  plugins: Plugin[];
}

// Minimal version of https://github.com/preactjs/wmr/blob/main/packages/wmr/src/wmr-middleware.js

export const jsMiddleware = ({
  root,
  plugins,
}: JSMiddlewareOpts): polka.Middleware => {
  const rollupPlugins = createPluginContainer(plugins);

  rollupPlugins.buildStart();

  return async (req, res, next) => {
    try {
      // Normalized path starting with slash
      const path = posix.normalize(req.path);
      let id: string;
      let file: string;
      if (path.startsWith('/@npm/')) {
        id = path.slice(1);
        file = ''; // This should never be read
      } else {
        // Remove leading slash, and convert slashes to os-specific slashes
        const osPath = path.slice(1).split(posix.sep).join(sep);
        // Absolute file path
        file = resolve(root, osPath);
        // Rollup-style CWD-relative Unix-normalized path "id":
        id = `./${relative(root, file)
          .replace(/^\.\//, '')
          .replace(/^\0/, '')
          .split(sep)
          .join(posix.sep)}`;
      }

      res.setHeader('Content-Type', 'application/javascript;charset=utf-8');
      const resolved = await rollupPlugins.resolveId(id);
      const resolvedId = (
        typeof resolved === 'object' ? resolved?.id : resolved
      ) as string;
      let code: string | undefined;
      if (typeof req.query['inline-code'] === 'string') {
        code = req.query['inline-code'];
      } else {
        const result = resolvedId && (await rollupPlugins.load(resolvedId));
        code = typeof result === 'object' ? result?.code : result;
      }

      if (!code && code !== '') {
        // Always use the resolved id as the basis for our file
        let file = resolvedId;
        file = file.split(posix.sep).join(sep);
        if (!isAbsolute(file)) file = resolve(root, file);
        code = await fs.readFile(file, 'utf-8');
      }

      code = await rollupPlugins.transform(code, id);

      // Normalize import paths
      // Resolve all the imports and replace them, and inline the resulting resolved paths
      // This makes different ways of importing the same path (e.g. extensionless imports, etc.)
      // all dedupe to the same module so it is only executed once
      code = await transformImports(code, id, {
        async resolveId(spec) {
          if (/^(data:|https?:|\/\/)/.test(spec)) return spec;

          const resolved = await rollupPlugins.resolveId(spec, file);
          if (resolved) {
            spec = typeof resolved === 'object' ? resolved.id : resolved;
            if (spec.startsWith('@npm/')) return `/${spec}`;
            if (/^(\/|\\|[a-z]:\\)/i.test(spec)) {
              spec = relative(dirname(file), spec).split(sep).join(posix.sep);
              if (!/^\.?\.?\//.test(spec)) spec = `./${spec}`;
            }

            if (typeof resolved === 'object' && resolved.external) {
              if (/^(data|https?):/.test(spec)) return spec;

              spec = relative(root, spec).split(sep).join(posix.sep);
              if (!/^(\/|[\w-]+:)/.test(spec)) spec = `/${spec}`;
              return spec;
            }
          }

          return spec;
        },
      });

      if (!code) return next();

      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(code, 'utf-8'),
      });
      res.end(code);
    } catch (error) {
      next(error);
    }
  };
};
