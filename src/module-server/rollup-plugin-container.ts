/*
 * Refactored based on https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js
 * https://github.com/preactjs/wmr/blob/main/LICENSE
 * MIT License
 * Copyright (c) 2020 The Preact Authors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
 * Plugin ordering based on https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/pluginContainer.ts
 * https://github.com/vitejs/vite/blob/main/LICENSE
 *
 * MIT License
 *
 * Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
  Specific commit: https://github.com/preactjs/wmr/blob/7e653cd1000b40bca32ae824401d2ddd16807c8d/packages/wmr/src/lib/rollup-plugin-container.js

  Differences from WMR version:
  - Inline types added
  - ESLint fixes
  - WMR-specific debugging removed
  - opts removed
  - options, watchChange, resolveImportMeta, resolveFileUrl hooks removed
  - ctx.emitFile, ctx.addWatchFile, ctx.setAssetSource, ctx.getFileName removed
  - relative resolution fixed to handle '.' for ctx.resolveId
  - Source map handling added to transform hook
  - Error handling (with code frame, using source maps) added to transform hook
  - Stubbed out options hook was added
  - Added object-hooks support and plugin ordering (from Vite version)
  - Updated to use import { parseAst } from 'rollup/parseAst' instead of acorn (rollup v4 change)
  */

import { dirname, resolve } from 'node:path';

import type { DecodedSourceMap, RawSourceMap } from '@ampproject/remapping';
import type {
  LoadResult,
  ResolveIdResult,
  TransformPluginContext as RollupPluginContext,
} from 'rollup';
// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import { parseAst } from 'rollup/parseAst';

import { combineSourceMaps } from './combine-source-maps.js';
import { ErrorWithLocation } from './error-with-location.js';
import type { Plugin } from './plugin.js';

/** Fast splice(x,1) when order doesn't matter (h/t Rich) */
const popIndex = (array: any[], index: number) => {
  const tail = array.pop();
  if (index !== array.length) array[index] = tail;
};

/** Get a unique key for a (id,importer) resolve pair */
const identifierPair = (id: string, importer?: string) => {
  if (importer) return `${id}\n${importer}`;
  return id;
};

type PluginContext = Omit<
  RollupPluginContext,
  // Undocumented
  | 'cache'
  // Deprecated
  | 'emitAsset'
  | 'emitChunk'
  | 'getAssetFileName'
  | 'getChunkFileName'
  | 'isExternal'
  | 'moduleIds'
  | 'resolveId'
  | 'load'
  | 'debug'
  | 'getCombinedSourcemap'
  | 'info'
>;

export const createPluginContainer = (plugins: Plugin[]) => {
  const MODULES = new Map();

  let plugin: Plugin | undefined;

  const ctx: PluginContext = {
    meta: {
      rollupVersion: '2.8.0',
      watchMode: true,
    },
    parse(code, opts) {
      return parseAst(code, {
        ...opts,
      });
    },
    async resolve(id, importer, { skipSelf = false } = {}) {
      const skip = [];
      if (skipSelf && plugin) skip.push(plugin);
      let out = await container.resolveId(id, importer, skip);
      if (typeof out === 'string') out = { id: out };
      if (!out || !out.id) out = { id };
      if (/^\.\.?[/\\]/.test(out.id) || out.id === '.') {
        out.id = resolve('.', importer ? dirname(importer) : '.', out.id);
      }

      return (out as any) || false;
    },
    getModuleInfo(id) {
      let mod = MODULES.get(id);
      if (mod) return mod.info;
      mod = {
        info: {},
      };
      MODULES.set(id, mod);
      return mod.info;
    },
    emitFile() {
      throw new Error('emitFile is not implemented');
    },
    setAssetSource() {
      throw new Error('setAssetSource is not implemented');
    },
    getFileName() {
      throw new Error('getFileName is not implemented');
    },
    addWatchFile() {
      // No-op
    },
    getWatchFiles() {
      throw new Error('getWatchFiles is not implemented');
    },
    getModuleIds() {
      throw new Error('getModuleIds is not implemented');
    },
    warn(...args) {
      console.log(`[${plugin?.name}]`, ...args);
    },
    error(error, pos) {
      if (pos === undefined) {
        if (typeof error === 'string') throw new Error(error);
        throw error;
      }

      throw new ErrorWithLocation({
        message: `[${plugin?.name}] ${String(error)}`,
        line: typeof pos === 'number' ? pos : pos.line,
        column: (pos as any).column,
      });
    },
  };

  const container = {
    ctx,
    async buildStart() {
      await Promise.all(
        getSortedPluginsByHook('buildStart', plugins).map(async (plugin) => {
          if (plugin.buildStart) {
            const f =
              'handler' in plugin.buildStart
                ? plugin.buildStart.handler
                : plugin.buildStart;
            await f.call(ctx as any, {} as any);
          }
        }),
      );
    },

    async resolveId(
      id: string,
      importer?: string,
      _skip?: Plugin[],
    ): Promise<ResolveIdResult> {
      const key = identifierPair(id, importer);

      const opts: { id?: string } = {};
      for (const p of getSortedPluginsByHook('resolveId', plugins)) {
        if (!p.resolveId) continue;

        if (_skip) {
          if (_skip.includes(p)) continue;
          if (resolveSkips.has(p, key)) continue;
          resolveSkips.add(p, key);
        }

        plugin = p;

        let result;
        try {
          const resolveId =
            'handler' in p.resolveId ? p.resolveId.handler : p.resolveId;
          result = await resolveId.call(ctx as any, id, importer, {
            isEntry: false,
            attributes: {},
          });
        } finally {
          if (_skip) resolveSkips.delete(p, key);
        }

        if (!result) continue;
        if (typeof result === 'string') {
          id = result;
        } else {
          id = result.id;
          Object.assign(opts, result);
        }

        // ResolveId() is hookFirst - first non-null result is returned.
        break;
      }

      opts.id = id;
      return Object.keys(opts).length > 1 ? (opts as { id: string }) : id;
    },

    async transform(
      originalCode: string,
      id: string,
      inputMap?: DecodedSourceMap | RawSourceMap | string,
    ) {
      let code = originalCode;
      // To consider implementing next time this code is touched:
      // if any of the transforms is missing sourcemaps, then there should be no source maps emitted
      const sourceMaps: (DecodedSourceMap | RawSourceMap)[] = inputMap
        ? [typeof inputMap === 'string' ? JSON.parse(inputMap) : inputMap]
        : [];
      for (plugin of getSortedPluginsByHook('transform', plugins)) {
        if (!plugin.transform) continue;
        try {
          const f =
            'handler' in plugin.transform
              ? plugin.transform.handler
              : plugin.transform;
          const result = await f.call(ctx as any, code, id);
          if (!result) continue;

          if (typeof result === 'object') {
            if (!result.code) continue;
            code = result.code;
            if (result.map)
              sourceMaps.push(
                typeof result.map === 'string'
                  ? JSON.parse(result.map)
                  : result.map,
              );
          } else {
            code = result;
          }
        } catch (error) {
          if (error instanceof ErrorWithLocation) {
            if (!error.filename) error.filename = id;
            // If the error has a location,
            // apply the source maps to get the original location
            const line = error.line;
            const column = error.column || 0;
            if (sourceMaps.length > 0) {
              const { SourceMapConsumer } = await import('source-map');
              const consumer = await new SourceMapConsumer(
                combineSourceMaps(id, sourceMaps) as any,
              );
              const sourceLocation = consumer.originalPositionFor({
                line,
                column,
              });
              consumer.destroy();
              if (sourceLocation.line !== null) {
                error.line = sourceLocation.line;
                error.column =
                  sourceLocation.column === null
                    ? undefined
                    : sourceLocation.column;
              }
              error.filename = sourceLocation.source || id;
            }
          }

          throw error;
        }
      }

      return {
        code,
        map: combineSourceMaps(id, sourceMaps),
      };
    },

    async options() {
      for (plugin of getSortedPluginsByHook('options', plugins)) {
        // Since we don't have "input options", we just pass {}
        // This hook must be called for @rollup/plugin-babel
        if (!plugin.options) continue;
        const f =
          'handler' in plugin.options ? plugin.options.handler : plugin.options;
        await f.call(ctx as any, {});
      }
    },

    async load(id: string): Promise<LoadResult> {
      for (plugin of getSortedPluginsByHook('load', plugins)) {
        if (!plugin.load) continue;
        const f = 'handler' in plugin.load ? plugin.load.handler : plugin.load;
        const result = await f.call(ctx as any, id);
        if (result) {
          return result;
        }
      }

      return null;
    },
  };

  // Tracks recursive resolveId calls
  const resolveSkips = {
    skip: new Map<Plugin, string[]>(),
    has(plugin: Plugin, key: string) {
      const skips = this.skip.get(plugin);
      return skips ? skips.includes(key) : false;
    },
    add(plugin: Plugin, key: string) {
      const skips = this.skip.get(plugin);
      if (skips) skips.push(key);
      else this.skip.set(plugin, [key]);
    },
    delete(plugin: Plugin, key: string) {
      const skips = this.skip.get(plugin);
      if (!skips) return;
      const i = skips.indexOf(key);
      if (i !== -1) popIndex(skips, i);
    },
  };

  return container;
};

const getSortedPluginsByHook = (
  hookName: keyof Plugin,
  plugins: readonly Plugin[],
): Plugin[] => {
  const pre: Plugin[] = [];
  const normal: Plugin[] = [];
  const post: Plugin[] = [];
  for (const plugin of plugins) {
    const hook = plugin[hookName];
    if (hook) {
      if (typeof hook === 'object') {
        if (hook.order === 'pre') {
          pre.push(plugin);
          continue;
        }
        if (hook.order === 'post') {
          post.push(plugin);
          continue;
        }
      }
      normal.push(plugin);
    }
  }
  return [...pre, ...normal, ...post];
};
