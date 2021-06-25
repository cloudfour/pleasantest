// Copied from https://github.com/preactjs/wmr/blob/c03abcc36c26dc936af8701ab9031ddff44995a5/packages/wmr/src/plugins/resolve-extensions-plugin.js

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
  Differences from original:
  - Types
  - Function style changed
  - Comments changed
  */

import { promises as fs } from 'fs';
import { resolve, dirname, join } from 'path';
import type { Plugin } from 'rollup';

const MAINFIELDS = ['module', 'main'];

const fileExists = async (file: string) => {
  try {
    if ((await fs.stat(file)).isFile()) {
      return true;
    }
  } catch {}

  return false;
};

const fstat = async (file: string) => {
  try {
    return await fs.stat(file);
  } catch {}

  return false;
};

interface Options {
  /** File extensions/suffixes to check for */
  extensions: string[];
  /** Also check for `/index.*` for all extensions */
  index: boolean;
  /** If set, checks for package.json main fields */
  mainFields?: string[];
}
export const resolveExtensionsPlugin = ({
  extensions,
  index,
  mainFields = MAINFIELDS,
}: Options): Plugin => {
  if (index) {
    extensions = [...extensions, ...extensions.map((e) => `/index${e}`)];
  }

  return {
    name: 'resolve-extensions-plugin',
    async resolveId(id, importer) {
      if (id[0] === '\0') return;
      if (/\.(tsx?|css|s[ac]ss|wasm)$/.test(id)) return;

      let resolved;
      try {
        resolved = await this.resolve(id, importer, { skipSelf: true });
      } catch {}

      if (resolved) {
        id = resolved.id;
      } else if (importer) {
        id = resolve(dirname(importer), id);
      }

      const stats = await fstat(id);
      if (stats) {
        // If the resolved specifier is a file, use it.
        if (stats.isFile()) {
          return id;
        }

        // Specifier resolved to a directory: look for package.json or ./index file
        if (stats.isDirectory()) {
          let pkgJson: string | undefined;
          let pkg: any;
          try {
            pkgJson = await fs.readFile(resolve(id, 'package.json'), 'utf-8');
          } catch {}

          if (pkgJson) {
            try {
              pkg = JSON.parse(pkgJson);
            } catch (error) {
              console.warn(`Failed to parse package.json: ${id}\n  ${error}`);
            }
          }

          if (pkg) {
            const field = mainFields.find((f) => pkg[f]);
            if (field) {
              id = join(id, pkg[field]);
              if (/\.([cm]?js|jsx?)$/.test(id)) {
                return id;
              }
            } else {
              // Package.json has an implicit "main" field of `index.js`:
              id = join(id, 'index.js');
            }
          }
        }
      }

      const p = id.replace(/\.[cm]?js$/, '');
      for (const suffix of extensions) {
        if (await fileExists(p + suffix)) {
          return p + suffix;
        }
      }
    },
  };
};
