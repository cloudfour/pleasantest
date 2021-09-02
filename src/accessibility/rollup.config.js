import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { rollupPluginDomAccessibilityApi } from '../rollup-plugin-dom-accessibility-api';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/accessibility/browser.ts'],
  plugins: [
    babel({ babelHelpers: 'bundled', extensions }),
    nodeResolve({ extensions }),
    rollupPluginDomAccessibilityApi(),
    terser({ ecma: 2019 }),
  ],
  output: { file: 'dist/accessibility.js' },
};

export default config;
