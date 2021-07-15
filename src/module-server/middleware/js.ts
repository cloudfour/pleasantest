import { dirname, isAbsolute, posix, relative, resolve, sep } from 'path';
import type polka from 'polka';
import type { Plugin, SourceDescription } from 'rollup';
import { createPluginContainer } from '../rollup-plugin-container';
import { promises as fs } from 'fs';
import { transformImports } from '../transform-imports';
import type {
  DecodedSourceMap,
  RawSourceMap,
} from '@ampproject/remapping/dist/types/types';
import MagicString from 'magic-string';
import { jsExts } from '../extensions-and-detection';

interface JSMiddlewareOpts {
  root: string;
  plugins: Plugin[];
  requestCache: Map<string, SourceDescription>;
}

// Minimal version of https://github.com/preactjs/wmr/blob/main/packages/wmr/src/wmr-middleware.js

export const jsMiddleware = ({
  root,
  plugins,
  requestCache,
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
      let map: DecodedSourceMap | RawSourceMap | string | undefined;
      if (typeof req.query['inline-code'] === 'string') {
        code = req.query['inline-code'];
        const fileSrc = await fs.readFile(file, 'utf8');
        const inlineStartIdx = fileSrc.indexOf(code);
        if (inlineStartIdx !== -1) {
          const str = new MagicString(fileSrc);
          str.remove(0, inlineStartIdx);
          str.remove(inlineStartIdx + code.length, fileSrc.length);
          map = str.generateMap({
            hires: true,
            source: id,
            includeContent: true,
          }) as any;
        }
      } else {
        const result = resolvedId && (await rollupPlugins.load(resolvedId));
        if (typeof result === 'object' && result?.map) {
          map = result.map as any;
        }

        code = typeof result === 'object' ? result?.code : result;
      }

      if (!code && code !== '') {
        // If it doesn't have a js-like extension,
        // and none of the rollup plugins provided a load hook for it
        // and it doesn't have the ?import param (added for non-JS assets that can be imported into JS, like css)
        // Then treat it as a static asset
        if (!jsExts.test(resolvedId) && req.query.import === undefined)
          return next();

        // Always use the resolved id as the basis for our file
        let file = resolvedId;
        file = file.split(posix.sep).join(sep);
        if (!isAbsolute(file)) file = resolve(root, file);
        code = await fs.readFile(file, 'utf-8');
      }

      const transformResult = await rollupPlugins.transform(code, id, map);
      requestCache.set(id, transformResult as any);
      code = transformResult.code;

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

          // If it wasn't resovled, and doesn't have a js-like extension
          // add the ?import query param so it is clear
          // that the request needs to end up as JS that can be imported
          if (!jsExts.test(spec)) return `${spec}?import`;

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
