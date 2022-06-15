import { promises as fs } from 'node:fs';
import { dirname, join, resolve as pResolve, posix, relative } from 'node:path';

import { resolve, legacy as resolveLegacy } from 'resolve.exports';

import {
  isBareImport,
  isRelativeOrAbsoluteImport,
} from './extensions-and-detection.js';

// Only used for node_modules
const resolveCache = new Map<string, ResolveResult>();

const resolveCacheKey = (
  id: string,
  importer: string | undefined,
  root: string,
) => `${id}\n${importer}\n${root}`;

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
  if (isBareImport(id)) return resolveFromNodeModules(id, importer, root);
  if (isRelativeOrAbsoluteImport(id))
    return resolveRelativeOrAbsolute(id, importer);
};

const stat = (path: string) => fs.stat(path).catch(() => null);

// Note: Node does not allow implicit extension resolution for .cjs or .mjs files
// (it also doesn't do implicit extension resolution at all in modules, but it is so common because of bundlers, that we will support it)
const exts = ['.js', '.ts', '.tsx', '.jsx'];

const isFile = async (path: string) => {
  const stats = await stat(path);
  return stats?.isFile() || false;
};

const isDirectory = async (path: string) => {
  const stats = await stat(path);
  return stats?.isDirectory() || false;
};

export const resolveRelativeOrAbsolute = async (
  id: string,
  importer?: string,
): Promise<string> => {
  // LOAD_AS_FILE section in https://nodejs.org/api/modules.html#modules_all_together
  const resolved = importer ? pResolve(dirname(importer), id) : id;
  const result = await resolveAsFile(resolved);
  if (result) return result;

  // LOAD_AS_DIRECTORY section in https://nodejs.org/api/modules.html#modules_all_together
  if (await isDirectory(resolved)) {
    const result = await resolveAsDirectory(resolved);
    if (result) return result;
  }
  throw new Error(`Could not resolve ${id}`);
};

/** Given ./file, check for ./file.js (LOAD_AS_FILE) */
const resolveAsFile = async (path: string) => {
  if (await isFile(path)) return path;

  for (const ext of exts) {
    if (await isFile(path + ext)) return path + ext;
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
  if (await isFile(pkgJsonPath)) {
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
  importer: string | undefined,
  root: string,
): Promise<ResolveResult> => {
  const cacheKey = resolveCacheKey(id, importer, root);
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;
  const pathChunks = id.split(posix.sep);
  const isNpmNamespace = id[0] === '@';
  // If it is an npm namespace, then get the first two folders, otherwise just one
  const packageName = pathChunks.slice(0, isNpmNamespace ? 2 : 1);
  // Path within imported module
  const subPath = join(...pathChunks.slice(isNpmNamespace ? 2 : 1));

  const realRoot = await fs.realpath(root).catch(() => root);

  // Walk up folder by folder until a folder is found with <folder>/node_modules/<pkgName>
  // i.e. for 'asdf' from a/b/c.js look at
  // a/b/node_modules/asdf,
  // a/node_modules/asdf,
  // node_modules/asdf,

  let pkgDir: string | undefined;
  let scanDir = importer
    ? await fs
        .realpath(importer)
        .then((realImporter) => relative(realRoot, realImporter))
        .catch(() => relative(root, importer))
    : '.';
  while (!pkgDir || !(await isDirectory(pkgDir))) {
    if (scanDir === '.' || scanDir.startsWith('..')) {
      throw new Error(`Could not find ${id} in node_modules`);
    }
    // Not found; go up a level and try again
    scanDir = dirname(scanDir);
    pkgDir = join(root, scanDir, 'node_modules', ...packageName);
  }

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
    if (!(await stat(result)))
      throw new Error(`Could not resolve ${id}: ${result} does not exist`);
    const version = pkgJson.version;
    const normalizedPkgName = packageName.join('__');
    const idWithVersion = join(
      version ? `${normalizedPkgName}@${version}` : normalizedPkgName,
      subPath,
    );
    const resolved: ResolveResult = {
      path: await fs.realpath(result),
      idWithVersion,
    };
    resolveCache.set(cacheKey, resolved);
    return resolved;
  }

  throw new Error(
    `Could not resolve ${id}: ${pkgDir} exists but no package entrypoint was found`,
  );
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
