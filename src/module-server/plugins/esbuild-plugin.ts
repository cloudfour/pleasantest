import * as esbuild from 'esbuild';
import { extname } from 'path';
import type { Plugin } from 'rollup';

const shouldProcess = (id: string) => {
  if (id[0] === '\0') return false;
  return /\.[jt]sx?$/.test(id);
};

export const esbuildPlugin = (): Plugin => {
  return {
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
        })
        .catch((error) => {
          const err = error.errors[0];
          this.error(err.text, {
            line: err.location.line,
            column: err.location.column,
          });
        });
    },
  };
};
