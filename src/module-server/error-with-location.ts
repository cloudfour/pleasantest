import * as colors from 'kolorist';
import { createCodeFrame } from 'simple-code-frame';
import { promises as fs } from 'fs';
import * as path from 'path';

export class ErrorWithLocation extends Error {
  filename?: string;
  line: number;
  column?: number;
  /**
   * Allows overriding the source code to be displayed.
   * Useful when the error can't be source-mapped all the way back to the file on disk
   */
  code?: string;
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
    let code = this.code;
    if (!this.filename)
      throw new Error('filename missing in ErrorWithLocation');
    if (!code) {
      code = await fs.readFile(this.filename, 'utf8');
    }
    const relativeFilename = path.relative(process.cwd(), this.filename);
    const frame = createCodeFrame(code, this.line - 1, this.column || 0);
    const message = `${colors.red(this.message)}

${colors.blue(
  `${relativeFilename}:${this.line}${
    this.column === undefined ? '' : `:${this.column + 1}`
  }`,
)}

${frame}`;
    const modifiedError = new Error(message);
    modifiedError.stack = message;
    return modifiedError;
  }
}
