// TODO before merge: See how to integrate with resolve-extensions-plugin:
// './asdf' should look at package.json if ./asdf is a folder with package.json
// './asdf' should also look for ./asdf/index.js

import { dirname, join, posix, resolve as pResolve } from 'path';
import { promises as fs } from 'fs';
import { resolve, legacy as resolveLegacy } from 'resolve.exports';
import {
  isBareImport,
  isRelativeOrAbsoluteImport,
} from './extensions-and-detection';

// Only used for node_modules
const resolveCache = new Map<string, ResolveResult>();

const resolveCacheKey = (id: string, root: string) => `${id}\0\0${root}`;

/**
 * Attempts to implement a combination of:
 * - Node's CommonJS resolution algorithm: https://nodejs.org/api/modules.html#modules_all_together
 * - Node's ESM resolution algorithm: https://nodejs.org/api/esm.html#esm_resolver_algorithm_specification
 * - How people expect resolution to happen in webpack, rollup, and other tools
 */
export const nodeResolve = async (
  id: string,
  importer: string,
  root: string,
) => {
  if (isBareImport(id)) return resolveFromNodeModules(id, root);
  if (isRelativeOrAbsoluteImport(id))
    return resolveRelativeOrAbsolute(id, importer);
};

const stat = (path: string) => fs.stat(path).catch(() => null);

// Note: Node does not allow implicit extension resolution for .cjs or .mjs files
// (it also doesn't do implicit extension resolution at all in modules, but it is so common because of bundlers, that we will support it)
const exts = ['.js', '.ts', '.tsx', '.jsx'];

export const resolveRelativeOrAbsolute = async (
  id: string,
  importer?: string,
) => {
  // LOAD_AS_FILE section in https://nodejs.org/api/modules.html#modules_all_together
  const resolved = importer ? pResolve(dirname(importer), id) : id;
  const result = await resolveAsFile(resolved);
  if (result) return result;

  // LOAD_AS_DIRECTORY section in https://nodejs.org/api/modules.html#modules_all_together
  if ((await stat(resolved))?.isDirectory()) {
    return resolveAsDirectory(resolved);
  }
};

/** Given ./file, check for ./file.js (LOAD_AS_FILE) */
const resolveAsFile = async (path: string) => {
  if ((await stat(path))?.isFile()) return path;

  for (const ext of exts) {
    const stats = await stat(path + ext);
    if (stats?.isFile()) return path + ext;
  }
};

/** Given ./folder, check for ./folder/index.js (LOAD_INDEX) */
const resolveIndex = async (directory: string) => {
  const path = join(directory, 'index');
  for (const ext of exts) {
    const stats = await stat(path + ext);
    if (stats?.isFile()) return path + ext;
  }
};

const readPkgJson = async (directory: string) => {
  const pkgJsonPath = join(directory, 'package.json');
  if ((await stat(pkgJsonPath))?.isFile()) {
    try {
      return JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    } catch (error) {
      throw new Error(
        `Could not read or parse package.json at ${pkgJsonPath}: ${error.message}`,
      );
    }
  }
};

const resolveAsDirectory = async (directory: string) => {
  const pkgJson = await readPkgJson(directory);
  if (pkgJson) {
    // Node does not look at the "exports" field when importing a directory via a relative/absolute import.
    // Node only uses the "exports" field when the import is a bare import
    const main = readMainFields(pkgJson, '.', false);
    if (main) {
      const resolvedMain = pResolve(directory, main);
      const result =
        (await resolveAsFile(resolvedMain)) ||
        (await resolveIndex(resolvedMain));
      if (result) return result;
    }
  }

  // Couldn't resolve via ./folder/package.json, so check for ./folder/index.js
  return resolveIndex(directory);
};

interface ResolveResult {
  path: string;
  idWithVersion: string;
}

export const resolveFromNodeModules = async (
  id: string,
  root: string,
): Promise<ResolveResult | undefined> => {
  const cacheKey = resolveCacheKey(id, root);
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;
  const pathChunks = id.split(posix.sep);
  const isNpmNamespace = id[0] === '@';
  // If it is an npm namespace, then get the first two folders, otherwise just one
  const packageName = pathChunks.slice(0, isNpmNamespace ? 2 : 1);
  // Path within imported module
  const subPath = join(...pathChunks.slice(isNpmNamespace ? 2 : 1));

  const pkgDir = join(root, 'node_modules', ...packageName);
  const stats = await stat(pkgDir);
  if (!stats || !stats.isDirectory())
    throw new Error(
      `Could not resolve ${id} from ${root}: ${pkgDir} ${
        stats ? 'is not a directory' : 'does not exist'
      }`,
    );

  const pkgJson = await readPkgJson(pkgDir);
  const main = readMainFields(pkgJson, subPath, true);
  let result;
  if (main) result = join(pkgDir, main);
  else if (!('exports' in pkgJson)) {
    const fullPath = join(pkgDir, subPath);
    result =
      (await resolveAsFile(fullPath)) || (await resolveAsDirectory(fullPath));
  }

  if (result) {
    const version = pkgJson.version;
    const normalizedPkgName = packageName.join('__');
    const idWithVersion = join(
      version ? `${normalizedPkgName}@${version}` : normalizedPkgName,
      subPath,
    );
    const resolved: ResolveResult = { path: result, idWithVersion };
    resolveCache.set(cacheKey, resolved);
    return resolved;
  }
};

const readMainFields = (pkgJson: any, subPath: string, useExports: boolean) => {
  if (useExports && 'exports' in pkgJson) {
    return resolve(pkgJson, subPath, {
      browser: true,
      conditions: ['development', 'esmodules', 'module'],
    });
  }

  let result;

  if (subPath === '.')
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
  return result;
};
