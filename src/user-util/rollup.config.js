import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/user-util/index.ts'],
  plugins: [
    babel({ babelHelpers: 'bundled', extensions }),
    nodeResolve({ extensions }),
    terser({ ecma: 2019 }),
  ],
  output: { file: 'dist/user-util.js' },
};

export default config;
