import { changeErrorMessage } from '../../utils.js';
import { isRelativeOrAbsoluteImport } from '../extensions-and-detection.js';
import { resolveRelativeOrAbsolute } from '../node-resolve.js';
import type { Plugin } from '../plugin.js';

/**
 * Handles resolving './foo' to './foo.js', and './foo/index.js', and resolving through './foo/package.json'
 */
export const resolveExtensionsPlugin = (): Plugin => ({
  name: 'resolve-extensions-plugin',
  async resolveId(id, importer) {
    if (!isRelativeOrAbsoluteImport(id)) return;
    return resolveRelativeOrAbsolute(id, importer).catch((error) => {
      throw importer
        ? changeErrorMessage(error, (msg) => `${msg} (imported by ${importer})`)
        : error;
    });
  },
});
