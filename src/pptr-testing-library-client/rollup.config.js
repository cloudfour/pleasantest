import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { rollupPluginAriaQuery } from '../../rollup-plugin-aria-query';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

const stubs = {
  'pretty-format': `
    const prettyFormat = () => {}
    prettyFormat.plugins = { DOMElement: {}, DOMCollection: {} }
    export default prettyFormat
  `,
  [require.resolve('@testing-library/dom/dist/pretty-dom')]: `
    export const prettyDOM = (dom, maxLength, options) => {
      return window.__putElementInStringMap(dom)
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

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/pptr-testing-library-client/index.ts'],
  plugins: [
    rollupPluginAriaQuery(),
    stubPlugin,
    babel({ babelHelpers: 'bundled', extensions }),
    nodeResolve({ extensions }),
    terser({ ecma: 2019 }),
  ],
  external: [],
  treeshake: { moduleSideEffects: 'no-external' },
  output: { file: 'dist/pptr-testing-library-client.js' },
};

export default config;
