import { printErrorFrames } from './test-utils.js';

test('printErrorFrames with native stack trace', async () => {
  const error = await fnThatThrows().catch((error) => error);
  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: this is an error
    -------------------------------------------------------
    tests/test-utils.test.ts

      throw new Error('this is an error');
            ^
    -------------------------------------------------------
    tests/test-utils.test.ts

      const error = await fnThatThrows().catch((error) => error);
                          ^"
  `);
});

test('printErrorFrames with browser-made stack trace', async () => {
  const error = new Error('something');
  error.stack = `Error: something
        at ${process.cwd()}/tests/utils/external.tsx:12:9
        at S.re [as render] (http://localhost:56999/@npm/preact:1:8041)
        at W (http://localhost:56999/@npm/preact:1:5810)
        at B (http://localhost:56999/@npm/preact:1:2144)
        at W (http://localhost:56999/@npm/preact:1:6043)
        at Y (http://localhost:56999/@npm/preact:1:8155)
        at renderThrow (tests/utils/external.tsx:16:3)`;

  expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
    "Error: something
    -------------------------------------------------------
    tests/utils/external.tsx

      throw new Error('you have rendered the death component');
            ^
    -------------------------------------------------------
    tests/utils/external.tsx

      preactRender(<ThrowComponent />, document.body);
      ^"
  `);
});

// eslint-disable-next-line @cloudfour/typescript-eslint/require-await
const fnThatThrows = async () => {
  throw new Error('this is an error');
};
