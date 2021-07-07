// The matcher test files cover most of the functionality.
// This file checks behavior that is common to all matchers

import { withBrowser } from 'pleasantest';

test(
  'throws useful error if Promise is passed',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML('<h1>Hi</h1>');
    await expect(expect(screen.getByText('Hi')).toBeVisible()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
                  "[2mexpect([22m[31mreceived[39m[2m).toBeVisible()[22m

                  [31mreceived[39m value must be an HTMLElement or an SVGElement.
                  Received a [31mPromise[39m. Did you forget to await?"
              `);
    // This short delay is necessary to make sure that the screen.getByText finishes before the test finishes
    // Otherwise, the forgot await error is triggered
    await new Promise((resolve) => setTimeout(resolve, 100));
  }),
);

test(
  'throws useful error if non-ElementHandle is passed',
  withBrowser(async () => {
    await expect(expect(null).toBeVisible()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
                  "[2mexpect([22m[31mreceived[39m[2m).toBeVisible()[22m

                  [31mreceived[39m value must be an HTMLElement or an SVGElement.
                  Received has value: [31mnull[39m"
              `);
    await expect(expect({}).toBeVisible()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31mreceived[39m[2m).toBeVisible()[22m

            [31mreceived[39m value must be an HTMLElement or an SVGElement.
            Received has type:  object
            Received has value: [31m{}[39m"
          `);
  }),
);
