import { extname } from 'node:path';

import * as esbuild from 'esbuild';

import { jsExts } from '../extensions-and-detection.js';
import type { Plugin } from '../plugin.js';

const shouldProcess = (id: string) => {
  if (id[0] === '\0') return false;
  return jsExts.test(id);
};

export const esbuildPlugin = (
  esbuildOptions: esbuild.TransformOptions,
): Plugin => ({
  name: 'esbuild',
  async transform(code, id) {
    if (!shouldProcess(id)) return null;
    const ext = extname(id).slice(1);
    const loader = /[cm]?jsx?$/.test(ext) ? 'jsx' : (ext as esbuild.Loader);
    return esbuild
      .transform(code, {
        sourcefile: id,
        loader,
        sourcemap: 'external',
        ...esbuildOptions,
      })
      .catch((error) => {
        if (!('errors' in error)) throw error;
        const err = error.errors[0];
        this.error(err.text, {
          line: err.location.line,
          column: err.location.column,
        });
      });
  },
});
