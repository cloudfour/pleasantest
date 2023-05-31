import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import * as ariaQuery from 'aria-query';
import { terser } from 'rollup-plugin-terser';

import { rollupPluginDomAccessibilityApi } from '../rollup-plugin-dom-accessibility-api.js';

const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

/**
 * When 'generated:requiredOwnedElements' is imported,
 * This generates that file from aria-query
 * Contains a map from role names to required owned elements
 *
 * @returns {import('rollup').Plugin}
 */
const requiredOwnedElementsPlugin = () => ({
  name: 'required-owned-elements',
  resolveId: (id) => (id === 'generated:requiredOwnedElements' ? id : null),
  load(id) {
    if (id !== 'generated:requiredOwnedElements') return;
    let output = 'export default new Map([\n';
    for (const [role, data] of ariaQuery.roles.entries()) {
      if (data.requiredOwnedElements.length > 0) {
        // Some of the sub-arrays have two items,
        // which means that the outer element owns elements
        // which have a role within another element with another role
        // Our implementation doesn't support this yet.
        const nonNestedRequiredOwnElements = data.requiredOwnedElements
          .filter((d) => d.length === 1)
          .map((d) => d[0]);
        output += `${JSON.stringify([role, nonNestedRequiredOwnElements])},\n`;
      }
    }
    return `${output}])`;
  },
});

/** @type {import('rollup').RollupOptions} */
const config = {
  input: ['src/accessibility/browser.ts'],
  plugins: [
    babel({ babelHelpers: 'bundled', extensions }),
    requiredOwnedElementsPlugin(),
    nodeResolve({ extensions }),
    rollupPluginDomAccessibilityApi(),
    terser({ ecma: 2019 }),
  ],
  output: { file: 'dist/accessibility.js' },
};

export default config;
