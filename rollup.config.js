import jestDomConfig from './src/jest-dom/rollup.config';
import pptrTestingLibraryConfig from './src/pptr-testing-library-client/rollup.config';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

/** @type {import('rollup').RollupOptions} */
const mainConfig = {
  input: ['src/index.ts'],
  output: [
    {
      format: 'esm',
      dir: 'dist/esm',
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name].mjs',
    },
    {
      format: 'cjs',
      dir: 'dist/cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name].cjs',
    },
  ],
  plugins: [
    babel({
      presets: ['@babel/preset-typescript'],
      plugins: ['babel-plugin-un-cjs'],
      configFile: false,
      babelHelpers: 'bundled',
      extensions,
    }),
    nodeResolve({ extensions }),
    bundlePlugin(),
  ],
  external: ['puppeteer', 'vite', 'pptr-testing-library'],
};

export default [mainConfig, jestDomConfig, pptrTestingLibraryConfig];

/**
 * Creates sub-bundles when you do `import fileName from "bundle:./path-here"
 * Mostly taken from https://github.com/preactjs/wmr/blob/1.0.0/src/plugins/bundle-plugin.js
 * @returns {import('rollup').Plugin}
 */
function bundlePlugin() {
  return {
    name: 'bundle-plugin',
    async resolveId(id, importer) {
      if (!id.startsWith('bundle:')) return;
      const resolved = await this.resolve(id.slice(7), importer, {
        skipSelf: true,
      });
      if (resolved) {
        resolved.id = `\0bundle:${resolved.id}`;
      }
      return resolved;
    },
    resolveFileUrl({ relativePath, format }) {
      return format === 'es'
        ? `new URL('${relativePath}', import.meta.url).href`
        : `require('path').join(__dirname,'${relativePath}')`;
    },
    resolveImportMeta(property, { moduleId, format }) {
      console.log(moduleId);
      if (property === 'url' && format === 'cjs') {
        return '`file://${__filename}`';
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith('\0bundle:')) return;
      id = id.slice(8);

      const fileId = this.emitFile({
        type: 'chunk',
        id,
      });
      this.addWatchFile(id);
      return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
    },
  };
}
