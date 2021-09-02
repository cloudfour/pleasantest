import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { rollupPluginDomAccessibilityApi } from '../rollup-plugin-dom-accessibility-api';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

const stubs = {
  [require.resolve('@testing-library/jest-dom/dist/to-have-style')]: `
    export { toHaveStyle } from "${require.resolve(
      // eslint-disable-next-line @cloudfour/node/no-missing-require
      './src/jest-dom/to-have-style',
    )}"
  `,
  // No need for polyfill in real browser
  'css.escape': `
    const escape = (str) => CSS.escape(str)
    export default escape
  `,
  'aria-query': `
    export const roles = {
      'get': () => ({ props: { 'aria-checked': true } })
    }
  `,
  'lodash/isEqualWith': `
    import { isEqual } from 'smoldash'
    export default (value, other, customizer) => {
      const result = customizer(value, other)
      if (result !== undefined) return result
      return isEqual(value, other)
    }
  `,
  'lodash/isEqual': `export { isEqual as default } from 'smoldash'`,
  'lodash/uniq': `export { uniq as default } from 'smoldash'`,
  '@babel/runtime/helpers/extends': `export default Object.assign`,
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
 * When jest-dom logs messages it uses el.cloneNode() before it logs them
 * Normally that would be fine, but for logging in the browser,
 * it makes hovering over the element in devtools not work
 * So we are removing the cloneNodes to fix hovering
 * @type {import('rollup').Plugin}
 */
const removeCloneNodePlugin = {
  name: 'remove-clone-node',
  async transform(code) {
    return code.replace(/\.cloneNode\((?:false|true)\)/g, '').replace(
      // For some reason toBeEmptyDOMElement and toBeEmpty log element.innerHTML
      /this\.utils\.printReceived\(([A-Za-z]*)\.innerHTML\)/,
      'this.utils.printReceived($1)',
    );
  },
};

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/jest-dom/index.ts'],
  plugins: [
    stubPlugin,
    babel({ babelHelpers: 'bundled', extensions }),
    nodeResolve({ extensions }),
    removeCloneNodePlugin,
    rollupPluginDomAccessibilityApi(),
    terser({
      ecma: 2019,
      // Jest-dom uses function names for error messages
      // https://github.com/testing-library/jest-dom/blob/v5.11.9/src/utils.js#L26
      keep_fnames: /^to/,
    }),
  ],
  external: ['css'],
  treeshake: { moduleSideEffects: 'no-external' },
  output: { file: 'dist/jest-dom.js' },
};

export default config;
