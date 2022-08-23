import * as path from 'node:path';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

import { rollupPluginDomAccessibilityApi } from '../rollup-plugin-dom-accessibility-api.js';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

const stubs = {
  'pretty-format': `
    const prettyFormat = () => {}
    prettyFormat.plugins = { DOMElement: {}, DOMCollection: {} }
    export default prettyFormat
  `,
  [require.resolve('@testing-library/dom/dist/pretty-dom')]: `
    import {addToElementCache} from ${JSON.stringify(
      path.join(process.cwd(), 'src', 'serialize', 'index.ts'),
    )}
    export const prettyDOM = (dom, maxLength, options) => {
      return addToElementCache(dom)
    }
  `,
};

/** @type {import('rollup').Plugin} */
const stubPlugin = {
  name: 'stub',
  async resolveId(id) {
    if (stubs[id]) return id;
    return null;
  },
  async load(id) {
    if (stubs[id]) return stubs[id];
    return null;
  },
};

/**
 * Sometimes when testing-library logs messages it uses el.cloneNode() before it logs them
 * Normally that would be fine, but for logging in the browser,
 * it makes hovering over the element in devtools not work
 * So we are removing the cloneNodes to fix hovering
 * @type {import('rollup').Plugin}
 */
const removeCloneNodePlugin = {
  name: 'remove-clone-node',
  async transform(code) {
    return code.replace(/\.cloneNode\((?:false|true)\)/g, '');
  },
};

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/pptr-testing-library-client/index.ts'],
  plugins: [
    rollupPluginDomAccessibilityApi(),
    stubPlugin,
    babel({ babelHelpers: 'bundled', extensions }),
    nodeResolve({ extensions }),
    removeCloneNodePlugin,
    terser({
      ecma: 2019,
      module: true,
      compress: {
        passes: 3,
        global_defs: {
          jest: false,
          'globalVar.process': undefined,
        },
      },
    }),
  ],
  external: [],
  treeshake: { moduleSideEffects: 'no-external' },
  output: { file: 'dist/pptr-testing-library-client.js', preferConst: true },
};

export default config;
