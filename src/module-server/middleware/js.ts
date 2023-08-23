import { promises as fs } from 'node:fs';
import { dirname, posix, relative, resolve, sep } from 'node:path';

import type { DecodedSourceMap, RawSourceMap } from '@ampproject/remapping';
import MagicString from 'magic-string';
import type polka from 'polka';
import type {
  PartialResolvedId,
  ResolveIdResult,
  SourceDescription,
} from 'rollup';

import { rejectBuild } from '../build-status-tracker.js';
import { ErrorWithLocation } from '../error-with-location.js';
import { jsExts } from '../extensions-and-detection.js';
import type { Plugin } from '../plugin.js';
import { createPluginContainer } from '../rollup-plugin-container.js';
import { transformImports } from '../transform-imports.js';

interface JSMiddlewareOpts {
  root: string;
  plugins: Plugin[];
  requestCache: Map<string, SourceDescription>;
}

const getResolveCacheKey = (spec: string, from: string) =>
  `${spec}%%FROM%%${from}`;

// Minimal version of https://github.com/preactjs/wmr/blob/main/packages/wmr/src/wmr-middleware.js

export const jsMiddleware = async ({
  root,
  plugins,
  requestCache,
}: JSMiddlewareOpts): Promise<polka.Middleware> => {
  interface ResolveCacheEntry {
    buildId: number;
    resolved: PartialResolvedId;
  }
  /**
   * The resolve cache is used so that if something has already been resolved from a previous build,
   * the buildId from the previous build gets used rather than the current buildId.
   * That way, modules can get correctly deduped in the browser,
   * and syntax/transform errors will get thrown from the _first_ runJS/loadJS that they were imported from.
   */
  const resolveCache = new Map<string, ResolveCacheEntry>();

  const setInResolveCache = (
    spec: string,
    from: string,
    buildId: number,
    resolved: PartialResolvedId,
  ) => resolveCache.set(getResolveCacheKey(spec, from), { buildId, resolved });

  const getFromResolveCache = (spec: string, from: string) =>
    resolveCache.get(getResolveCacheKey(spec, from));

  const rollupPlugins = createPluginContainer(plugins);

  await rollupPlugins.options();
  await rollupPlugins.buildStart();

  return async (req, res, next) => {
    const buildId =
      req.query['build-id'] !== undefined && Number(req.query['build-id']);
    try {
      // Normalized path starting with slash
      const path = posix.normalize(req.path);
      const params = new URLSearchParams(req.query as Record<string, string>);
      let id: string;
      let file: string;
      if (path.startsWith('/@npm/')) {
        id = path.slice(1); // Remove leading slash
        file = params.get('resolvedPath') || '';
      } else {
        // Remove leading slash, and convert slashes to os-specific slashes
        const osPath = path.slice(1).split(posix.sep).join(sep);
        // Absolute file path
        file = resolve(root, osPath);
        // Rollup-style Unix-normalized path "id":
        id = file.split(sep).join(posix.sep);
      }

      params.delete('import');
      params.delete('inline-code');
      params.delete('build-id');

      // Remove trailing =
      // This is necessary for rollup-plugin-vue, which ads ?lang.ts at the end of the id,
      // so the file gets processed by other transformers
      const qs = params.toString().replace(/=$/, '');
      if (qs) id += `?${qs}`;

      res.setHeader('Content-Type', 'application/javascript;charset=utf-8');
      const resolved = await rollupPlugins.resolveId(id);
      const resolvedId = typeof resolved === 'object' ? resolved?.id : resolved;
      let code: string | false | void;
      let map: DecodedSourceMap | RawSourceMap | string | undefined;
      if (typeof req.query['inline-code'] === 'string') {
        code = req.query['inline-code'];
        const injectedArgsCode = `if (window._pleasantestArgs) {
          import.meta.pleasantestArgs = [...window._pleasantestArgs]
        }`;
        const fileSrc = await fs.readFile(file, 'utf8');
        const inlineStartIdx = fileSrc.indexOf(code);
        code = injectedArgsCode + code;
        if (inlineStartIdx !== -1) {
          const str = new MagicString(fileSrc);
          str.remove(0, inlineStartIdx);
          str.remove(inlineStartIdx + code.length, fileSrc.length);
          // Account for the injected import.meta.pleasantestArgs code in the source map
          str.prepend(injectedArgsCode);
          map = str.generateMap({
            hires: 'boundary',
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
        if (
          !jsExts.test(resolvedId || req.path) &&
          req.query.import === undefined
        ) {
          next();
          return;
        }

        code = await fs.readFile(file, 'utf8');
      }

      const transformResult = await rollupPlugins.transform(code, id, map);
      requestCache.set(id, transformResult as any);
      code = transformResult.code;

      // Normalize import paths
      // Resolve all the imports and replace them, and inline the resulting resolved paths
      // This makes different ways of importing the same path (e.g. extensionless imports, etc.)
      // all dedupe to the same module so it is only executed once
      code = await transformImports(code, id, map, {
        async resolveId(spec) {
          const addBuildId = (specifier: string) => {
            const delimiter = /\?/.test(specifier) ? '&' : '?';
            return `${specifier}${delimiter}build-id=${localBuildId}`;
          };

          // Default to the buildId corresponding to this module
          // But for any module which has previously been imported from another buildId,
          // Use the previous buildId (for module deduplication in the browser)
          let localBuildId = buildId;
          if (/^(data:|https?:|\/\/)/.test(spec)) return spec;

          const cached = getFromResolveCache(spec, file);
          let resolved: ResolveIdResult;
          if (cached) {
            resolved = cached.resolved;
            localBuildId = cached.buildId;
          } else {
            resolved = await rollupPlugins.resolveId(spec, file);
            if (resolved && buildId)
              setInResolveCache(
                spec,
                file,
                buildId,
                typeof resolved === 'object' ? resolved : { id: resolved },
              );
          }
          if (resolved) {
            spec = typeof resolved === 'object' ? resolved.id : resolved;
            if (spec.startsWith('@npm/')) return addBuildId(`/${spec}`);
            if (/^(\/|\\|[a-z]:\\)/i.test(spec)) {
              // Change FS-absolute paths to relative
              spec = relative(dirname(file), spec).split(sep).join(posix.sep);
              if (!/^\.?\.?\//.test(spec)) spec = `./${spec}`;
            }

            if (typeof resolved === 'object' && resolved.external) {
              if (/^(data|https?):/.test(spec)) return spec;

              spec = relative(root, spec).split(sep).join(posix.sep);
              if (!/^(\/|[\w-]+:)/.test(spec)) spec = `/${spec}`;
              return addBuildId(spec);
            }
          }

          // If it wasn't resolved, and doesn't have a js-like extension
          // add the ?import query param to make it clear
          // that the request needs to end up as JS that can be imported
          if (!jsExts.test(spec)) {
            // If there is already a query parameter, add &import
            const delimiter = /\?/.test(spec) ? '&' : '?';
            return addBuildId(`${spec}${delimiter}import`);
          }

          return addBuildId(spec);
        },
      });

      if (!code) {
        next();
        return;
      }

      res.writeHead(200, {
        'Content-Length': Buffer.byteLength(code, 'utf8'),
      });
      res.end(code);
    } catch (error) {
      if (buildId) {
        rejectBuild(
          Number(buildId),
          error instanceof ErrorWithLocation
            ? await error.toCodeFrame().catch(() => error)
            : error,
        );

        res.statusCode = 500;
        return res.end();
      }
      next(error);
    }
  };
};
