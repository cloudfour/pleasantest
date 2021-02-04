import { printErrorFrames } from './test-utils';

test('printErrorFrames', async () => {
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

const fnThatThrows = async () => {
  throw new Error('this is an error');
};
