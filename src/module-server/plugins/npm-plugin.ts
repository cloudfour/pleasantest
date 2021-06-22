import { join, normalize, posix } from 'path';
import type { Plugin, RollupCache } from 'rollup';
import { rollup } from 'rollup';
import { existsSync, promises as fs } from 'fs';
import { resolve, legacy as resolveLegacy } from 'resolve.exports';
import commonjs from '@rollup/plugin-commonjs';
import { processGlobalPlugin } from './process-global-plugin';
import * as esbuild from 'esbuild';

const npmTranspileCache = new Map<string, string>();
const setInCache = (id: string, code: string) => {
  npmTranspileCache.set(id, code);
};

const getFromCache = (id: string) => {
  return npmTranspileCache.get(id);
};

const isBareImport = (id: string) =>
  !(
    id === '.' ||
    id.startsWith('\0') ||
    id.startsWith('./') ||
    id.startsWith('../') ||
    id.startsWith('/') ||
    id.startsWith(prefix)
  );

const prefix = '@npm/';
export const npmPlugin = ({ root }: { root: string }): Plugin => {
  return {
    name: 'npm',
    // Rewrite bare imports to have @npm/ prefix
    resolveId(id) {
      if (isBareImport(id)) return prefix + id;
    },
    async load(id) {
      if (!id.startsWith(prefix)) return null;
      id = id.slice(prefix.length);
      const cached = getFromCache(id);
      if (cached) return cached;
      const resolved = await nodeResolve(id, root);
      const result = await bundleNpmModule(resolved, false);
      // Queue up a second-pass optimized/minified build
      bundleNpmModule(resolved, true).then((optimizedResult) => {
        setInCache(id, optimizedResult);
      });
      setInCache(id, result);
      return result;
    },
  };
};

const nodeResolve = async (id: string, root: string) => {
  const pathChunks = id.split(posix.sep);
  const isNpmNamespace = id[0] === '@';
  // If it is an npm namespace, then get the first two folders, otherwise just one
  const pkgDir = join(
    root,
    'node_modules',
    ...pathChunks.slice(0, isNpmNamespace ? 2 : 1),
  );
  // Path within imported module
  const subPath = join(...pathChunks.slice(isNpmNamespace ? 2 : 1));
  const pkgJsonPath = join(pkgDir, 'package.json');
  let pkgJson;
  try {
    pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
  } catch {
    throw new Error(`Could not read or parse package.json at ${pkgJsonPath}`);
  }

  let result = resolve(pkgJson, subPath, {
    browser: true,
    conditions: ['development', 'esmodules', 'module'],
  });

  if (!result && subPath === '.')
    result = resolveLegacy(pkgJson, {
      browser: false,
      fields: ['esmodules', 'modern', 'module', 'jsnext:main'],
    });

  if (!result)
    result = (
      resolveLegacy(pkgJson, {
        browser: true,
        fields: [],
      }) as Record<string, string> | undefined
    )?.[subPath];

  if (!result && subPath === '.')
    result = resolveLegacy(pkgJson, { browser: false, fields: ['main'] });

  if (!result) {
    const extensions = ['.js', '/index.js', '.cjs', '/index.cjs'];
    for (const extension of extensions) {
      const path = normalize(join(pkgDir, subPath) + extension);
      if (existsSync(path)) return path;
    }

    throw new Error(`Could not resolve ${id}`);
  }

  return join(pkgDir, result);
};

const pluginNodeResolve = (): Plugin => {
  return {
    name: 'node-resolve',
    resolveId(id) {
      if (isBareImport(id)) return { id: prefix + id, external: true };
      if (id.startsWith(prefix)) {
        return {
          // Remove the leading slash, otherwise rollup turns it into a relative path up to disk root
          id,
          external: true,
        };
      }
    },
  };
};

let npmCache: RollupCache | undefined;

/**
 * Bundle am npm module entry path into a single file
 * @param mod The module to bundle, including subpackage/path
 * @param optimize Whether the bundle should be a minified/optimized bundle, or the default quick non-optimized bundle
 */
const bundleNpmModule = async (mod: string, optimize: boolean) => {
  const bundle = await rollup({
    input: mod,
    cache: npmCache,
    shimMissingExports: true,
    treeshake: true,
    preserveEntrySignatures: 'allow-extension',
    plugins: [
      pluginNodeResolve(),
      processGlobalPlugin({ NODE_ENV: 'development' }),
      commonjs({
        extensions: ['.js', '.cjs', ''],
        sourceMap: false,
        transformMixedEsModules: true,
      }),
      (optimize && {
        name: 'esbuild-minify',
        renderChunk: async (code) => {
          const output = await esbuild.transform(code, {
            minify: true,
            legalComments: 'none',
          });
          return { code: output.code };
        },
      }) as Plugin,
    ].filter(Boolean),
  });
  npmCache = bundle.cache;
  const { output } = await bundle.generate({
    format: 'es',
    indent: false,
  });

  return output[0].code;
};
