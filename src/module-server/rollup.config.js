import path from 'path';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['./cli-for-testing.ts'],
  output: {
    format: 'cjs',
    dir: 'dist',
    entryFileNames: '[name].cjs',
    chunkFileNames: '[name].cjs',
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions,
      configFile: path.join(process.cwd(), '..', '..', 'babel.config.cjs'),
    }),
    nodeResolve({ extensions }),
  ],
  external: ['acorn', 'acorn-class-fields'],
};

export default config;
