import { dirname, join } from 'path';
import type { Plugin } from '../plugin';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { jsExts, isBareImport, npmPrefix } from '../extensions-and-detection';
import { changeErrorMessage } from '../../utils';
import { bundleNpmModule } from '../bundle-npm-module';
import { resolveFromNodeModules } from '../node-resolve';
import { createHash } from 'crypto';

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

const getFromCache = async (cachePath: string) =>
  npmTranspileCache.get(cachePath) ||
  fs
    .readFile(cachePath, 'utf8')
    .catch(() => {}) // Ignore if file is not found in cache
    .then((code) => {
      if (code) npmTranspileCache.set(cachePath, code);
      return code;
    });

export const npmPlugin = ({
  root,
  envVars,
}: {
  root: string;
  envVars: Record<string, string>;
}): Plugin => ({
  name: 'npm',
  // Rewrite bare imports to have @npm/ prefix
  async resolveId(id, importer) {
    if (!isBareImport(id)) return;
    const resolved = await resolveFromNodeModules(id, importer, root).catch(
      (error) => {
        throw importer
          ? changeErrorMessage(
              error,
              (msg) => `${msg} (imported by ${importer})`,
            )
          : error;
      },
    );
    if (!jsExts.test(resolved.path))
      // Don't pre-bundle, use the full path to the file in node_modules
      // (ex: CSS files in node_modules)
      return resolved.path;

    return `${npmPrefix}${id}?resolvedPath=${encodeURIComponent(
      resolved.path,
    )}&idWithVersion=${encodeURIComponent(resolved.idWithVersion)}`;
  },
  async load(fullId) {
    if (!fullId.startsWith(npmPrefix)) return;
    fullId = fullId.slice(npmPrefix.length);
    const params = new URLSearchParams(fullId.slice(fullId.indexOf('?')));
    const [id] = fullId.split('?');
    let resolvedPath = params.get('resolvedPath');
    let idWithVersion = params.get('idWithVersion');
    if (!resolvedPath || !idWithVersion) {
      const resolveResult = await resolveFromNodeModules(id, undefined, root);
      resolvedPath = resolveResult.path;
      idWithVersion = resolveResult.idWithVersion;
    }

    const cachePath = join(
      cacheDir,
      '@npm',
      `${idWithVersion}-${hash(envVars)}.js`,
    );
    const cached = await getFromCache(cachePath);
    if (cached) return cached;
    const result = await bundleNpmModule(resolvedPath, id, false, envVars);
    // Queue up a second-pass optimized/minified build
    bundleNpmModule(resolvedPath, id, true, envVars).then((optimizedResult) => {
      setInCache(cachePath, optimizedResult);
    });
    setInCache(cachePath, result);
    return result;
  },
});

const hash = (inputs: Record<string, string>) =>
  createHash('sha512').update(JSON.stringify(inputs)).digest('hex').slice(0, 7);
