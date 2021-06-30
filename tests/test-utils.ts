import { parseStackTrace } from 'errorstacks';
import { promises as fs } from 'fs';
import * as path from 'path';

export const printErrorFrames = async (error?: Error) => {
  if (!error?.stack) return '';
  const stack = parseStackTrace(error.stack);

  const frames = (
    await Promise.all(
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

          const relativePath = path.relative(
            process.cwd(),
            stackFrame.fileName,
          );
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
    )
  ).filter(Boolean);
  return [`${error.name}: ${error.message}`, ...frames].join(
    `\n${'-'.repeat(55)}\n`,
  );
};
