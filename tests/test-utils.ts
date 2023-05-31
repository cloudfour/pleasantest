import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import ansiRegex from 'ansi-regex';
import { parseStackTrace } from 'errorstacks';

export const printErrorFrames = async (error?: Error) => {
  if (!error?.stack) return '';
  const stack = parseStackTrace(error.stack);

  const frames = await Promise.all(
    stack
      .filter(
        (stackFrame) =>
          stackFrame.fileName && !/node_modules/.test(stackFrame.fileName),
      )
      .map(async (stackFrame) => {
        if (
          !stackFrame.fileName ||
          stackFrame.line === -1 ||
          stackFrame.column === -1
        ) {
          return stackFrame.raw;
        }

        const relativePath = path.relative(process.cwd(), stackFrame.fileName);
        if (relativePath.startsWith('dist/')) return relativePath;
        let file;
        try {
          file = await fs.readFile(stackFrame.fileName, 'utf8');
        } catch {
          return null;
        }

        const line = file.split('\n')[stackFrame.line - 1];
        return `${relativePath}\n\n${line}\n${' '.repeat(
          stackFrame.column - 1,
        )}^`;
      }),
  );

  return [`${error.name}: ${error.message}`, ...frames.filter(Boolean)].join(
    `\n${'-'.repeat(55)}\n`,
  );
};

const stripAnsi = (input: string) => input.replace(ansiRegex(), '');

const removeLineNumbers = (input: string) => {
  const lineRegex = /^\s*▶?\s*(\d)*\s+│/gm;
  const fileRegex = new RegExp(`${process.cwd()}([a-zA-Z/._-]*)[\\d:]*`, 'g');
  return (
    input
      .replace(lineRegex, (_match, lineNum) => (lineNum ? ' ### │' : '     │'))
      // Take out the file paths so the tests will pass on more than 1 person's machine
      .replace(fileRegex, '<root>$1:###:###')
  );
};

export const formatErrorWithCodeFrame = <T>(input: Promise<T>) =>
  input.catch((error) => {
    error.message = removeLineNumbers(stripAnsi(error.message));
    error.stack = removeLineNumbers(stripAnsi(error.stack));
    throw error;
  });
