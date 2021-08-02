import * as colors from 'kolorist';
import { createCodeFrame } from 'simple-code-frame';
import { promises as fs } from 'fs';

export class ErrorWithLocation extends Error {
  filename?: string;
  line: number;
  column?: number;
  constructor({
    message,
    filename,
    line,
    column,
  }: {
    message: string;
    filename?: string;
    line: number;
    column?: number;
  }) {
    super(message);
    this.filename = filename;
    this.line = line;
    this.column = column;
  }

  async toCodeFrame() {
    if (!this.filename)
      throw new Error('filename missing in ErrorWithLocation');

    const originalCode = await fs.readFile(this.filename, 'utf8');
    const frame = createCodeFrame(
      originalCode,
      this.line - 1,
      this.column || 0,
    );
    const message = `${colors.red(this.message)}

${colors.blue(
  `${this.filename}:${this.line}${
    this.column === undefined ? '' : `:${this.column + 1}`
  }`,
)}

${frame}`;
    const modifiedError = new Error(message);
    modifiedError.stack = message;
    return modifiedError;
  }
}
