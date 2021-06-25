/*
 * Refactored based on https://github.com/preactjs/wmr/blob/main/packages/wmr/src/lib/rollup-plugin-container.js
 */

/*
  https://github.com/preactjs/wmr/blob/main/LICENSE
  MIT License
  Copyright (c) 2020 The Preact Authors
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */

/*
  Specific commit: https://github.com/preactjs/wmr/blob/7e653cd1000b40bca32ae824401d2ddd16807c8d/packages/wmr/src/lib/rollup-plugin-container.js

  Differences from original:
  - Inline types added
  - ESLint fixes
  - WMR-specific debugging removed
  - opts removed
  - options, watchChange, resolveImportMeta, resolveFileUrl hooks removed
  - ctx.emitFile, ctx.addWatchFile, ctx.setAssetSource, ctx.getFileName removed
  - relative resolution fixed to handle '.' for ctx.resolveId
  */

import { resolve, dirname } from 'path';
import { Parser } from 'acorn';
import type {
  LoadResult,
  Plugin,
  PluginContext as RollupPluginContext,
  ResolveIdResult,
} from 'rollup';

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
>;

export const createPluginContainer = (plugins: Plugin[]) => {
  const MODULES = new Map();

  let plugin: Plugin | undefined;
  const parser = Parser;

  const ctx: PluginContext = {
    meta: {
      rollupVersion: '2.8.0',
      watchMode: true,
    },
    parse(code, opts) {
      return parser.parse(code, {
        sourceType: 'module',
        ecmaVersion: 2020,
        locations: true,
        onComment: [],
        ...opts,
      });
    },
    async resolve(id, importer, { skipSelf = false } = { skipSelf: false }) {
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
    error(error) {
      if (typeof error === 'string') throw new Error(error);
      throw error;
    },
  };

  const container = {
    ctx,
    async buildStart() {
      await Promise.all(
        plugins.map((plugin) => plugin.buildStart?.call(ctx as any, {} as any)),
      );
    },

    async resolveId(
      id: string,
      importer?: string,
      _skip?: Plugin[],
    ): Promise<ResolveIdResult> {
      const key = identifierPair(id, importer);

      const opts: { id?: string } = {};
      for (const p of plugins) {
        if (!p.resolveId) continue;

        if (_skip) {
          if (_skip.includes(p)) continue;
          if (resolveSkips.has(p, key)) continue;
          resolveSkips.add(p, key);
        }

        plugin = p;

        let result;
        try {
          result = await p.resolveId.call(ctx as any, id, importer, {});
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

    async transform(code: string, id: string) {
      for (plugin of plugins) {
        if (!plugin.transform) continue;
        const result = await plugin.transform.call(ctx as any, code, id);
        if (!result) continue;

        code = typeof result === 'object' ? result.code || code : result;
      }

      return code;
    },

    async load(id: string): Promise<LoadResult> {
      for (plugin of plugins) {
        if (!plugin.load) continue;
        const result = await plugin.load.call(ctx as any, id);
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
