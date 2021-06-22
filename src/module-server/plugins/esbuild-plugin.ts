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
      const loader = extname(id).slice(1) as esbuild.Loader;
      const result = await esbuild.transform(code, { sourcefile: id, loader });

      return result.code;
    },
  };
};
