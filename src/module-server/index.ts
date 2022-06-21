import type * as esbuild from 'esbuild';
import type polka from 'polka';
import type { SourceDescription } from 'rollup';

import { cssMiddleware } from './middleware/css.js';
import { indexHTMLMiddleware } from './middleware/index-html.js';
import { jsMiddleware } from './middleware/js.js';
import { staticMiddleware } from './middleware/static.js';
import type { Plugin } from './plugin.js';
import { cssPlugin } from './plugins/css.js';
import { environmentVariablesPlugin } from './plugins/environment-variables-plugin.js';
import { esbuildPlugin } from './plugins/esbuild-plugin.js';
import { npmPlugin } from './plugins/npm-plugin.js';
import { resolveExtensionsPlugin } from './plugins/resolve-extensions-plugin.js';
import { createServer } from './server.js';

export interface ModuleServerOpts {
  root?: string;
  /** List of Rollup/Vite/WMR plugins to add */
  plugins?: (Plugin | false | undefined)[];
  /**
   * Environment variables to pass into the bundle.
   * They can be accessed via import.meta.env.<name> (or process.env.<name> for compatability)
   */
  envVars?: Record<string, string>;
  /** Options to pass to esbuild. Set to false to disable esbuild */
  esbuild?: esbuild.TransformOptions | false;
}

export const createModuleServer = async ({
  root = process.cwd(),
  plugins: userPlugins = [],
  envVars: _envVars = {},
  esbuild: esbuildOptions = {},
}: ModuleServerOpts = {}) => {
  const prePlugins: Plugin[] = [];
  const normalPlugins: Plugin[] = [];
  const postPlugins: Plugin[] = [];

  const envVars = {
    NODE_ENV: 'development',
    ..._envVars,
  };

  for (const plugin of userPlugins) {
    if (!plugin) continue;
    if (plugin.enforce === 'pre') prePlugins.push(plugin);
    else if (plugin.enforce === 'post') postPlugins.push(plugin);
    else normalPlugins.push(plugin);
  }

  const plugins: Plugin[] = [
    ...prePlugins,

    ...normalPlugins,

    resolveExtensionsPlugin(),
    environmentVariablesPlugin(envVars),
    npmPlugin({ root, envVars }),

    ...(esbuildOptions ? [esbuildPlugin(esbuildOptions)] : []),
    cssPlugin({ root }),

    ...postPlugins,
  ];
  const requestCache = new Map<string, SourceDescription>();
  const middleware: polka.Middleware[] = [
    indexHTMLMiddleware,
    await jsMiddleware({ root, plugins, requestCache }),
    cssMiddleware({ root }),
    staticMiddleware({ root }),
  ];

  return {
    ...(await createServer({ middleware })),
    requestCache,
  };
};
