import { dirname, join, normalize, posix } from 'path';
import type { Plugin, RollupCache } from 'rollup';
import { rollup } from 'rollup';
import { promises as fs } from 'fs';
import { resolve, legacy as resolveLegacy } from 'resolve.exports';
import commonjs from '@rollup/plugin-commonjs';
import { processGlobalPlugin } from './process-global-plugin';
import * as esbuild from 'esbuild';
import { parse } from 'cjs-module-lexer';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { jsExts } from '../middleware/js';
import { changeErrorMessage } from '../../utils';

// This is the folder that Pleasantest is installed in (e.g. <something>/node_modules/pleasantest)
const installFolder = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
// Something like <something>/node_modules/pleasantest/.cache
const cacheDir = join(installFolder, '.cache');

const npmTranspileCache = new Map<string, string>();
const setInCache = (cachePath: string, code: string) => {
  npmTranspileCache.set(cachePath, code);
  fs.mkdir(dirname(cachePath), { recursive: true }).then(() =>
    fs.writeFile(cachePath, code),
  );
};

const getFromCache = async (cachePath: string) => {
  return (
    npmTranspileCache.get(cachePath) ||
    fs
      .readFile(cachePath, 'utf8')
      .catch(() => {}) // Ignore if file is not found in cache
      .then((code) => {
        if (code) npmTranspileCache.set(cachePath, code);
        return code;
      })
  );
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
    async resolveId(id, importer) {
      if (!isBareImport(id)) return;
      const resolved = await nodeResolve(id, root).catch((error) => {
        throw importer
          ? changeErrorMessage(
              error,
              (msg) => `${msg} (imported by ${importer})`,
            )
          : error;
      });
      if (!jsExts.test(resolved.path))
        // Don't pre-bundle, use the full path to the file in node_modules
        // (ex: CSS files in node_modules)
        return resolved.path;

      return prefix + id;
    },
    async load(id) {
      if (!id.startsWith(prefix)) return null;
      id = id.slice(prefix.length);
      const resolved = await nodeResolve(id, root);
      if (!jsExts.test(resolved.path)) return null; // Don't pre-bundle
      const cachePath = join(cacheDir, '@npm', `${resolved.idWithVersion}.js`);
      const cached = await getFromCache(cachePath);
      if (cached) return cached;
      const result = await bundleNpmModule(resolved.path, id, false);
      // Queue up a second-pass optimized/minified build
      bundleNpmModule(resolved.path, id, true).then((optimizedResult) => {
        setInCache(cachePath, optimizedResult);
      });
      setInCache(cachePath, result);
      return result;
    },
  };
};

interface ResolveResult {
  path: string;
  idWithVersion: string;
}

const resolveFromFolder = async (
  pkgDir: string,
  subPath: string,
  packageName: string[],
): Promise<false | ResolveResult> => {
  const pkgJsonPath = join(pkgDir, 'package.json');
  let pkgJson;
  try {
    pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
  } catch {
    throw new Error(`Could not read or parse package.json at ${pkgJsonPath}`);
  }

  const version = pkgJson.version;
  const idWithVersion = join(`${packageName.join('__')}@${version}`, subPath);

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

  if (!result && !('exports' in pkgJson)) {
    const extensions = ['.js', '/index.js', '.cjs', '/index.cjs'];
    // If this was not conditionally included, this would have infinite recursion
    if (subPath !== '.') extensions.unshift('');
    for (const extension of extensions) {
      const path = normalize(join(pkgDir, subPath) + extension);
      const stats = await fs.stat(path).catch(() => null);
      if (stats) {
        if (stats.isFile()) return { path, idWithVersion };
        if (stats.isDirectory()) {
          // If you import some-package/foo and foo is a folder with a package.json in it,
          // resolve main fields from the package.json
          const result = await resolveFromFolder(path, '.', packageName);
          if (result) return { path: result.path, idWithVersion };
        }
      }
    }
  }

  if (!result) return false;
  return { path: join(pkgDir, result), idWithVersion };
};

const resolveCache = new Map<string, ResolveResult>();

const resolveCacheKey = (id: string, root: string) => `${id}\0\0${root}`;

const nodeResolve = async (id: string, root: string) => {
  const cacheKey = resolveCacheKey(id, root);
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;
  const pathChunks = id.split(posix.sep);
  const isNpmNamespace = id[0] === '@';
  const packageName = pathChunks.slice(0, isNpmNamespace ? 2 : 1);
  // If it is an npm namespace, then get the first two folders, otherwise just one
  const pkgDir = join(root, 'node_modules', ...packageName);
  await fs.stat(pkgDir).catch(() => {
    throw new Error(`Could not resolve ${id} from ${root}`);
  });
  // Path within imported module
  const subPath = join(...pathChunks.slice(isNpmNamespace ? 2 : 1));
  const result = await resolveFromFolder(pkgDir, subPath, packageName);
  if (result) {
    resolveCache.set(cacheKey, result);
    return result;
  }

  throw new Error(`Could not resolve ${id}`);
};

const pluginNodeResolve = (): Plugin => {
  return {
    name: 'node-resolve',
    resolveId(id) {
      if (isBareImport(id)) return { id: prefix + id, external: true };
      // If requests already have the npm prefix, mark them as external
      if (id.startsWith(prefix)) return { id, external: true };
    },
  };
};

let npmCache: RollupCache | undefined;

/**
 * Bundle am npm module entry path into a single file
 * @param mod The full path of the module to bundle, including subpackage/path
 * @param id The imported identifier
 * @param optimize Whether the bundle should be a minified/optimized bundle, or the default quick non-optimized bundle
 */
const bundleNpmModule = async (mod: string, id: string, optimize: boolean) => {
  let namedExports: string[] = [];
  if (dynamicCJSModules.has(id)) {
    let isValidCJS = true;
    try {
      const text = await fs.readFile(mod, 'utf8');
      // Goal: Determine if it is ESM or CJS.
      // Try to parse it with cjs-module-lexer, if it fails, assume it is ESM
      // eslint-disable-next-line @cloudfour/typescript-eslint/await-thenable
      await parse(text);
    } catch {
      isValidCJS = false;
    }

    if (isValidCJS) {
      const require = createRequire(import.meta.url);
      // eslint-disable-next-line @cloudfour/typescript-eslint/no-var-requires
      const imported = require(mod);
      if (typeof imported === 'object' && !imported.__esModule)
        namedExports = Object.keys(imported);
    }
  }

  const virtualEntry = '\0virtualEntry';
  const hasSyntheticNamedExports = namedExports.length > 0;
  const bundle = await rollup({
    input: hasSyntheticNamedExports ? virtualEntry : mod,
    cache: npmCache,
    shimMissingExports: true,
    treeshake: true,
    preserveEntrySignatures: 'allow-extension',
    plugins: [
      hasSyntheticNamedExports &&
        ({
          // This plugin handles special-case packages whose named exports cannot be found via static analysis
          // For these packages, the package is require()'d, and the named exports are determined that way.
          // A virtual entry exports the named exports from the real entry package
          name: 'cjs-named-exports',
          resolveId(id) {
            if (id === virtualEntry) return virtualEntry;
          },
          load(id) {
            if (id === virtualEntry) {
              const code = `export * from '${mod}'
export {${namedExports.join(', ')}} from '${mod}'
export { default } from '${mod}'`;
              return code;
            }
          },
        } as Plugin),
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
    exports: 'named',
    preferConst: true,
  });

  return output[0].code;
};

/**
 * Any package names in this set will need to have their named exports detected manually via require()
 * because the export names cannot be statically analyzed
 */
const dynamicCJSModules = new Set(['prop-types', 'react-dom', 'react']);
