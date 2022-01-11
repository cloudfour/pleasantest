import { withBrowser } from 'pleasantest';
import { printErrorFrames } from './test-utils';

test(
  'Basic case',
  withBrowser(async ({ utils, page, waitFor }) => {
    await utils.injectHTML('<h1></h1>');
    await utils.runJS(`
      setTimeout(() => {
        document.write('<h2>Hi</h2>')
      }, 100)
    `);
    // At first the element should not be there
    // Because it waits 10ms to add it
    expect(await page.$('h2')).toBeNull();
    const waitForCallback = jest.fn(async () => {
      expect(await page.$('h2')).not.toBeNull();
      return 42;
    });
    const returnedValue = await waitFor(waitForCallback);
    expect(returnedValue).toBe(42);
    expect(await page.$('h2')).not.toBeNull();
    expect(waitForCallback).toHaveBeenCalled();
  }),
);

test(
  'Throws error with timeout',
  withBrowser(async ({ waitFor, utils, screen }) => {
    const error1 = await waitFor(
      () => {
        throw new Error('something bad happened');
      },
      { timeout: 100 },
    ).catch((error) => error);
    expect(await printErrorFrames(error1)).toMatchInlineSnapshot(`
      "Error: something bad happened
      -------------------------------------------------------
      tests/wait-for.test.ts

              throw new Error('something bad happened');
                    ^"
    `);

    // If the callback function never resolves (or takes too long to resolve),
    // The error message is different
    const error2 = await waitFor(
      // Function returns a promise that never resolves
      () => new Promise<never>(() => {}),
      { timeout: 10 },
    ).catch((error) => error);
    expect(await printErrorFrames(error2)).toMatchInlineSnapshot(`
      "Error: Timed out in waitFor.
      -------------------------------------------------------
      tests/wait-for.test.ts

          const error2 = await waitFor(
                         ^
      -------------------------------------------------------
      dist/cjs/index.cjs"
    `);

    // Allows customizing error message using onTimeout
    const error3 = await waitFor(() => new Promise<never>(() => {}), {
      timeout: 10,
      onTimeout: (err) => {
        err.message += '\nCaleb wuz here';
        return err;
      },
    }).catch((error) => error);
    expect(await printErrorFrames(error3)).toMatchInlineSnapshot(`
      "Error: Timed out in waitFor.
      Caleb wuz here
      -------------------------------------------------------
      tests/wait-for.test.ts

          const error3 = await waitFor(() => new Promise<never>(() => {}), {
                         ^
      -------------------------------------------------------
      dist/cjs/index.cjs"
    `);
  }),
);
