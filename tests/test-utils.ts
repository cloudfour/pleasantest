import { parseStackTrace } from 'errorstacks';
import { promises as fs } from 'fs';
import * as path from 'path';

export const printErrorFrames = async (error: Error) => {
  if (!error.stack) return '';
  const stack = parseStackTrace(error.stack);

  const frames = await Promise.all(
    stack
      .filter(
        (stackFrame) =>
          stackFrame.fileName &&
          !/node_modules/.test(stackFrame.fileName) &&
          stackFrame.fileName.startsWith('/'),
      )
      .map(async (stackFrame) => {
        if (
          !stackFrame.fileName ||
          stackFrame.line === -1 ||
          stackFrame.column === -1
        ) {
          return stackFrame.raw;
        }
        const file = await fs.readFile(stackFrame.fileName, 'utf8');
        const line = file.split('\n')[stackFrame.line - 1];
        return (
          path.relative(process.cwd(), stackFrame.fileName) +
          '\n\n' +
          line +
          '\n' +
          ' '.repeat(stackFrame.column - 1) +
          '^'
        );
      }),
  );
  return [error.name + ': ' + error.message, ...frames].join(
    '\n' + '-'.repeat(55) + '\n',
  );
};
