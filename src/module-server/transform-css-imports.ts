// Copied from https://github.com/preactjs/wmr/blob/18b8f00923ddf578f2f747c35bd24a8039eee3ba/packages/wmr/src/lib/transform-css-imports.js

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
  - ESLint fixes
  */

type MaybePromise<T> = Promise<T> | T;
type ResolveFn = (
  specifier: string,
  id: string,
) => MaybePromise<string | false | null | void>;

/**
 * @param code Module code
 * @param id Source module specifier
 */
export const transformCssImports = async (
  code: string,
  id: string,
  { resolveId }: { resolveId: ResolveFn },
) => {
  const CSS_IMPORTS = /@import\s+["'](.*?)["'];|url\(["']?(.*?)["']?\)/g;

  let out = code;
  let offset = 0;

  let match;
  while ((match = CSS_IMPORTS.exec(code))) {
    const spec = match[1] || match[2];
    const start = match.index + match[0].indexOf(spec) + offset;
    const end = start + spec.length;

    const resolved = await resolveId(spec, id);
    if (typeof resolved === 'string') {
      out = out.slice(0, start) + resolved + out.slice(end);
      offset += resolved.length - spec.length;
    }
  }

  return out;
};
