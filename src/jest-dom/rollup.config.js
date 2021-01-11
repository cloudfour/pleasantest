import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

const stubs = {
  [require.resolve('@testing-library/jest-dom/dist/to-have-style')]: `
    export function toHaveStyle () {
      throw new Error('toHaveStyle is not implemented.')
    }
  `,
  [require.resolve('@testing-library/jest-dom/dist/to-have-form-values')]: `
    export function toHaveFormValues () {
      throw new Error('toHaveFormValues is not implemented.')
    }
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
  input: ['src/jest-dom/index.ts'],
  plugins: [
    stubPlugin,
    babel({ babelHelpers: 'bundled', extensions }),
    nodeResolve({ extensions }),
    terser({ ecma: 2019 }),
  ],
  external: ['css'],
  treeshake: { moduleSideEffects: 'no-external' },
  output: { file: 'dist/jest-dom.js' },
};

export default config;
