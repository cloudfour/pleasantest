import * as colors from 'kolorist';

import {
  ansiColorsLog,
  colors as browserColors,
} from './ansi-colors-browser.js';

// For some reason the tests fail without this
colors.options.enabled = true;

test('basic string coloring', () => {
  expect(ansiColorsLog(`1 ${colors.blue('2')} 3`)).toEqual([
    '1 %c2%c 3',
    `color: ${browserColors.blue};`,
    '',
  ]);
});

// Retrieve the ansi codes for the opening and closing tags
const [blueOpen, blueClose] = colors.blue('split').split('split');

test('handles intermingled non-strings', () => {
  expect(ansiColorsLog(`1 ${blueOpen}2`, {}, `3${blueClose} 4`)).toEqual([
    '1 %c2%o3%c 4',
    `color: ${browserColors.blue};`,
    {},
    '',
  ]);
});
