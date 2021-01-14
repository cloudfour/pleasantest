import ansiRegex from 'ansi-regex';

export const ansiColorsLog = (input: string) => {
  // CSS properties, so that nested styles works (in browsers %c will reset styles from any previous %c)
  const styleStack: Record<string, string> = {};
  const styles: string[] = [];
  const transformedStr = input.replace(ansiRegex(), (escapeCode) => {
    // \u001b is unicode for <ESC>
    const parsedEscapeCode = /\u001b\[([0-9]*)m/.exec(escapeCode);
    if (!parsedEscapeCode) return ''; // unrecognized escape code, remove it
    const escapeCodeNum = Number(parsedEscapeCode[1]); // capture group
    const cssObj = ansiCodes[escapeCodeNum];
    if (!cssObj) return '';
    Object.assign(styleStack, cssObj);
    const cssStr = Object.entries(styleStack)
      .map(([key, val]) => (val === 'inherit' ? '' : `${key}: ${val};`))
      .join('');
    styles.push(cssStr);
    return '%c';
  });
  return [transformedStr, ...styles];
};

const colors = {
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

const ansiCodes: Record<number, Record<string, string>> = {
  // styles

  1: { 'font-weight': 'bold' },
  22: { 'font-weight': 'inherit' },

  // foreground colors

  39: fg('inherit'), // reset foreground
  30: fg(colors.black),
  31: fg(colors.red),
  32: fg(colors.green),
  33: fg(colors.yellow),
  34: fg(colors.blue),
  35: fg(colors.magenta),
  36: fg(colors.cyan),
  37: fg(colors.white),
  97: fg(colors.white), // this is the whiteBright color
  90: fg(colors.gray),

  // background colors

  49: bg('inherit'), // reset background
  40: bg(colors.black),
  41: bg(colors.red),
  42: bg(colors.green),
  43: bg(colors.yellow),
  44: bg(colors.blue),
  45: bg(colors.magenta),
  46: bg(colors.cyan),
  47: bg(colors.white),
};
