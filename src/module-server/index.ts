import type polka from 'polka';
import type { Plugin } from 'rollup';
import { indexHTMLMiddleware } from './middleware/index-html';
import { jsMiddleware } from './middleware/js';
import { npmPlugin } from './plugins/npm-plugin';
import { processGlobalPlugin } from './plugins/process-global-plugin';
import { resolveExtensionsPlugin } from './plugins/resolve-extensions-plugin';
import { createServer } from './server';
import type { RollupAliasOptions } from '@rollup/plugin-alias';
import aliasPlugin from '@rollup/plugin-alias';
import postcssPlugin from 'rollup-plugin-postcss';
import { esbuildPlugin } from './plugins/esbuild-plugin';

interface ModuleServerOpts {
  root?: string;
  aliases?: RollupAliasOptions['entries'];
  plugins?: (Plugin | false | undefined)[];
}

export const createModuleServer = async ({
  root = process.cwd(),
  aliases,
  plugins: userPlugins = [],
}: ModuleServerOpts = {}) => {
  const plugins = [
    ...userPlugins,
    aliases && aliasPlugin({ entries: aliases }),
    resolveExtensionsPlugin({
      extensions: ['.ts', '.tsx', '.js', '.cjs'],
      index: true,
    }),
    processGlobalPlugin({ NODE_ENV: 'development' }),
    npmPlugin({ root }),
    esbuildPlugin(),
    postcssPlugin(),
  ];
  const filteredPlugins = plugins.filter(Boolean) as Plugin[];
  const middleware: polka.Middleware[] = [
    indexHTMLMiddleware,
    jsMiddleware({ root, plugins: filteredPlugins }),
  ];
  return createServer({ middleware });
};
