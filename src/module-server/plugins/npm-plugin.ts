import { dirname, join, normalize, posix } from 'path';
import type { Plugin, RollupCache } from 'rollup';
import { rollup } from 'rollup';
import { existsSync, promises as fs } from 'fs';
import { resolve, legacy as resolveLegacy } from 'resolve.exports';
import commonjs from '@rollup/plugin-commonjs';
import { processGlobalPlugin } from './process-global-plugin';
import * as esbuild from 'esbuild';
import { parse } from 'cjs-module-lexer';
import MagicString from 'magic-string';
import { fileURLToPath } from 'url';

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
      const result = await bundleNpmModule(resolved.path, false);
      // Queue up a second-pass optimized/minified build
      bundleNpmModule(resolved.path, true).then((optimizedResult) => {
        setInCache(cachePath, optimizedResult);
      });
      setInCache(cachePath, result);
      return result;
    },
  };
};

const nodeResolve = async (id: string, root: string) => {
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

  if (!result) {
    const extensions = ['.js', '/index.js', '.cjs', '/index.cjs'];
    for (const extension of extensions) {
      const path = normalize(join(pkgDir, subPath) + extension);
      if (existsSync(path)) return { path, idWithVersion };
    }

    throw new Error(`Could not resolve ${id}`);
  }

  return { path: join(pkgDir, result), idWithVersion };
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
      {
        // This plugin fixes cases of module.exports = require('...')
        // By default, the named exports from the required module are not generated
        // This plugin detects those exports,
        // and makes it so that @rollup/plugin-commonjs can see them and turn them into ES exports (via syntheticNamedExports)
        // This edge case happens in React, so it was necessary to fix it.
        name: 'cjs-module-lexer',
        async transform(code, id) {
          if (id.startsWith('\0')) return;
          const out = new MagicString(code);
          const re =
            /(^|[\s;])module\.exports\s*=\s*require\(["']([^"']*)["']\)($|[\s;])/g;
          let match;
          while ((match = re.exec(code))) {
            const [, leadingWhitespace, moduleName, trailingWhitespace] = match;

            const resolved = await this.resolve(moduleName, id);
            if (!resolved || resolved.external) return;

            try {
              const text = await fs.readFile(resolved.id, 'utf8');
              // eslint-disable-next-line @cloudfour/typescript-eslint/await-thenable
              const parsed = await parse(text);
              let replacement = '';
              for (const exportName of parsed.exports) {
                replacement += `\nmodule.exports.${exportName} = require("${moduleName}").${exportName}`;
              }

              out.overwrite(
                match.index,
                re.lastIndex,
                leadingWhitespace + replacement + trailingWhitespace,
              );
            } catch {
              return;
            }
          }

          return out.toString();
        },
      } as Plugin,
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
