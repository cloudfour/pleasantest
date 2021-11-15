import { withBrowser } from 'pleasantest';
import { printErrorFrames } from '../test-utils';

test(
  'Stack frames are correct',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(
      '<button style="visibility:hidden; padding:20px">Hi</button>',
    );
    const button = await screen.getByText(/hi/i);
    const error = await user.click(button).catch((error) => error);
    expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
      "Error: Cannot perform action on element that is not visible (it has visibility:hidden):
      <button style=\\"visibility:hidden; padding:20px\\">Hi</button>
      -------------------------------------------------------
      tests/user/general.test.ts

          const error = await user.click(button).catch((error) => error);
                        ^
      -------------------------------------------------------
      dist/cjs/index.cjs"
    `);
  }),
);
