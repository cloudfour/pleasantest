// Copied from https://github.com/vitejs/vite/blob/d97b33a8cb9a72ed64244f239900a9a862b6ba68/packages/vite/src/node/utils.ts#L431

/*
  https://github.com/vitejs/vite/blob/main/LICENSE
  MIT License
  Copyright (c) 2019-present, Yuxi (Evan) You and Vite contributors
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
  - Function style changed
  - ESLint fixes
  - Order of source maps is reversed in input
  - Make it not break if a sourcemap is missing sources
  */

import remapping, {
  type DecodedSourceMap,
  type RawSourceMap,
} from '@ampproject/remapping';

// Based on https://github.com/sveltejs/svelte/blob/abf11bb02b2afbd3e4cac509a0f70e318c306364/src/compiler/utils/mapped_code.ts#L221
const nullSourceMap: RawSourceMap = {
  names: [],
  sources: [],
  mappings: '',
  version: 3,
};
export const combineSourceMaps = (
  filename: string,
  _sourceMapList: (DecodedSourceMap | RawSourceMap)[],
): RawSourceMap => {
  const sourceMapList = _sourceMapList
    .map((map) => {
      // eslint-disable-next-line @cloudfour/typescript-eslint/no-unnecessary-condition
      if (!map.sources) map.sources = [];
      return map;
    })
    .reverse();
  if (sourceMapList.every((m) => m.sources.length === 0))
    return { ...nullSourceMap };

  let mapIndex = 1;
  const useArrayInterface = !sourceMapList
    .slice(0, -1)
    .some((m) => m.sources.length !== 1);
  const map = useArrayInterface
    ? remapping(sourceMapList, () => null, true)
    : remapping(
        sourceMapList[0],
        (sourcefile) =>
          sourcefile === filename && sourceMapList[mapIndex]
            ? sourceMapList[mapIndex++]
            : { ...nullSourceMap },
        true,
      );

  if (!map.file) delete map.file;

  return map as RawSourceMap;
};
