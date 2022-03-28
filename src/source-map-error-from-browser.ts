import { join, posix, sep, resolve } from 'path';
import { parseStackTrace } from 'errorstacks';
import _ansiRegex from 'ansi-regex';
import { printStackLine, removeFuncFromStackTrace } from './utils';
import type { SourceDescription } from 'rollup';

export const sourceMapErrorFromBrowser = async (
  res: unknown,
  requestCache: Map<string, SourceDescription>,
  port: number,
  func: (...args: any[]) => void,
) => {
  if (res === undefined) return;
  if (
    typeof res !== 'object' ||
    !res ||
    !('message' in res) ||
    !('stack' in res)
  )
    throw res;
  const { message, stack } = res as {
    message: string;
    stack: string;
  };
  const parsedStack = parseStackTrace(stack);
  const modifiedStack = await Promise.all(
    parsedStack.map(async (stackItem) => {
      if (stackItem.raw.startsWith(stack.slice(0, stack.indexOf('\n'))))
        return null;
      if (!stackItem.fileName) return stackItem.raw;
      const fileName = stackItem.fileName;
      const line = stackItem.line;
      const column = stackItem.column;
      if (!fileName.startsWith(`http://localhost:${port}`))
        return stackItem.raw;
      const url = new URL(fileName);
      const osPath = url.pathname.slice(1).split(posix.sep).join(sep);
      // Absolute file path
      const file = resolve(process.cwd(), osPath);
      // Rollup-style Unix-normalized path "id":
      const id = file.split(sep).join(posix.sep);
      const transformResult = requestCache.get(id);
      const map = typeof transformResult === 'object' && transformResult.map;
      if (!map) {
        let p = url.pathname;
        const npmPrefix = '/@npm/';
        if (p.startsWith(npmPrefix))
          p = join(process.cwd(), 'node_modules', p.slice(npmPrefix.length));
        return printStackLine(p, line, column, stackItem.name);
      }

      const { SourceMapConsumer } = await import('source-map');
      const consumer = await new SourceMapConsumer(map as any);
      const sourceLocation = consumer.originalPositionFor({
        line,
        column: column - 1, // Source-map uses zero-based column numbers
      });
      consumer.destroy();
      return printStackLine(
        join(process.cwd(), url.pathname),
        sourceLocation.line ?? line,
        sourceLocation.column === null
          ? column
          : // Convert back from zero-based column to 1-based
            sourceLocation.column + 1,
        stackItem.name,
      );
    }),
  );
  const errorName = stack.slice(0, stack.indexOf(':')) || 'Error';
  const ErrorConstructor = specializedErrors[errorName] || Error;
  const error = new ErrorConstructor(message);

  const finalStack = modifiedStack.filter(Boolean).join('\n');

  // If the browser error did not provide a stack, use the stack trace from node
  if (finalStack) {
    error.stack = `${errorName}: ${message}\n${finalStack}`;
  } else {
    removeFuncFromStackTrace(error, func);
    if (error.stack)
      error.stack = error.stack
        .split('\n')
        .filter(
          // This was appearing in stack traces and it messed up the Jest output
          (line) => !(/runMicrotasks/.test(line) && /<anonymous>/.test(line)),
        )
        .join('\n');
  }

  throw error;
};

const specializedErrors: Record<string, ErrorConstructor | undefined> = {
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
};
