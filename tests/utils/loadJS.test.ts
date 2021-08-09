import { withBrowser } from 'pleasantest';
import { formatErrorWithCodeFrame, printErrorFrames } from '../test-utils';

test.todo('loads from .ts file with transpiling');

test(
  'if the file throws an error the error is source mapped',
  withBrowser(async ({ utils }) => {
    const error = await utils
      .loadJS('./external-throwing.ts')
      .catch((error) => error);
    expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
      "Error: asdf
      -------------------------------------------------------
      tests/utils/external-throwing.ts

      throw new Error('asdf');
            ^"
    `);
  }),
);

test(
  'if the file has a syntax error the location is source mapped',
  withBrowser(async ({ utils }) => {
    const loadPromise = utils.loadJS('./external-with-syntax-error.ts');
    await expect(formatErrorWithCodeFrame(loadPromise)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        "[esbuild] The constant \\"someVariable\\" must be initialized

        <root>/tests/utils/external-with-syntax-error.ts:###:###

          # | // @ts-expect-error: this is intentionally invalid
        > # | const someVariable: string;
            |       ^
          # | 
        "
      `);
  }),
);
