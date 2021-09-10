import ansiRegex from 'ansi-regex';

/**
 * Converts ansi codes into CSS logs that are understood by browsers
 * https://developer.mozilla.org/en-US/docs/Web/API/console#Styling_console_output
 */
export const ansiColorsLog = (...input: unknown[]) => {
  // CSS properties, so that nested styles works (in browsers %c will reset styles from any previous %c)
  const styleStack: Record<string, string> = {};
  const stylesAndSubstitutions: unknown[] = [];
  let str = '';
  for (const segment of input) {
    if (typeof segment !== 'string') {
      stylesAndSubstitutions.push(segment);
      str += '%o'; // https://developer.mozilla.org/en-US/docs/Web/API/console#Using_string_substitutions
      continue;
    }

    str += segment
      // Convert back from "next-line" character into regular newline for display in browser
      .replace(/\u0085/g, '\n')
      .replace(ansiRegex(), (escapeCode) => {
        // \u001b is unicode for <ESC>
        // eslint-disable-next-line no-control-regex
        const parsedEscapeCode = /\u001B\[(\d*)m/.exec(escapeCode);
        if (!parsedEscapeCode) return ''; // Unrecognized escape code, remove it
        const escapeCodeNum = Number(parsedEscapeCode[1]); // Capture group
        const cssObj = ansiCodes[escapeCodeNum];
        if (!cssObj) return '';
        Object.assign(styleStack, cssObj);
        const cssStr = Object.entries(styleStack)
          .map(([key, val]) => (val === 'inherit' ? '' : `${key}: ${val};`))
          .join('');
        stylesAndSubstitutions.push(cssStr);
        return '%c';
      });
  }

  return [str, ...stylesAndSubstitutions];
};

export const colors = {
  gray: '#8e908c',
  red: '#c82829',
  green: '#718c00',
  yellow: '#eab700',
  blue: '#4271ae',
  magenta: '#8959a8',
  cyan: '#3e999f',
  orange: '#f5871f',
  white: 'white',
  black: 'black',
};

const fg = (color: string) => ({ color });
const bg = (color: string) => ({ 'background-color': color });

const ansiCodes: Record<number, undefined | Record<string, string>> = {
  // Styles

  1: { 'font-weight': 'bold' },
  22: { 'font-weight': 'inherit' },

  // Foreground colors

  39: fg('inherit'), // Reset foreground
  30: fg(colors.black),
  31: fg(colors.red),
  32: fg(colors.green),
  33: fg(colors.yellow),
  34: fg(colors.blue),
  35: fg(colors.magenta),
  36: fg(colors.cyan),
  37: fg(colors.white),
  97: fg(colors.white), // This is the whiteBright color
  90: fg(colors.gray),

  // Background colors

  49: bg('inherit'), // Reset background
  40: bg(colors.black),
  41: bg(colors.red),
  42: bg(colors.green),
  43: bg(colors.yellow),
  44: bg(colors.blue),
  45: bg(colors.magenta),
  46: bg(colors.cyan),
  47: bg(colors.white),
};
