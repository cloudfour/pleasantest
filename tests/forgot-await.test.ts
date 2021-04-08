/* eslint-disable @cloudfour/typescript-eslint/require-await */
import { withBrowser } from 'test-mule';
import { printErrorFrames } from './test-utils';

test('forgot await in testing library query', (done) => {
  withBrowser(async ({ screen }) => {
    screen.getByText('hi').catch(async (error) => {
      expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
        "Error: Cannot execute query getByText after test finishes. Did you forget to await?
        -------------------------------------------------------
        tests/forgot-await.test.ts

            screen.getByText('hi').catch(async (error) => {
                   ^
        -------------------------------------------------------
        dist/cjs/index.cjs"
      `);
      done();
    });
  })();
});

test('forgot await in jest dom assertion', (done) => {
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML('<button>Hi</button>');
    const button = await screen.getByText(/hi/i);
    expect(button)
      .toBeVisible()
      .catch(async (error) => {
        expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
          "Error: Cannot execute assertion toBeVisible after test finishes. Did you forget to await?
          -------------------------------------------------------
          tests/forgot-await.test.ts

                .toBeVisible()
                 ^
          -------------------------------------------------------
          dist/cjs/index.cjs"
        `);
        done();
      });
  })();
});

test('forgot await in utils.injectHTML', (done) => {
  withBrowser(async ({ utils }) => {
    utils.injectHTML('<button>Hi</button>').catch(async (error) => {
      expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
        "Error: Cannot interact with browser using injectHTML after test finishes. Did you forget to await?
        -------------------------------------------------------
        tests/forgot-await.test.ts

            utils.injectHTML('<button>Hi</button>').catch(async (error) => {
                  ^
        -------------------------------------------------------
        dist/cjs/index.cjs"
      `);
      done();
    });
  })();
});

test('forgot await in utils.runJS', (done) => {
  withBrowser(async ({ utils }) => {
    utils.runJS('if (false) {}').catch(async (error) => {
      expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
        "Error: Cannot interact with browser using runJS after test finishes. Did you forget to await?
        -------------------------------------------------------
        tests/forgot-await.test.ts

            utils.runJS('if (false) {}').catch(async (error) => {
                  ^
        -------------------------------------------------------
        dist/cjs/index.cjs"
      `);
      done();
    });
  })();
});

test('forgot await in user.click', (done) => {
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML('<button>Hi</button>');
    const button = await screen.getByText('Hi');
    user.click(button).catch(async (error) => {
      expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
        "Error: Cannot interact with browser after test finishes. Did you forget to await?
        -------------------------------------------------------
        tests/forgot-await.test.ts

            user.click(button).catch(async (error) => {
                 ^
        -------------------------------------------------------
        dist/cjs/index.cjs"
      `);
      done();
    });
  })();
});

test('forgot await in user.type', (done) => {
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML('<input />');
    const input = await screen.getByRole('textbox');
    user.type(input, 'hello').catch(async (error) => {
      expect(await printErrorFrames(error)).toMatchInlineSnapshot(`
        "Error: Cannot interact with browser after test finishes. Did you forget to await?
        -------------------------------------------------------
        tests/forgot-await.test.ts

            user.type(input, 'hello').catch(async (error) => {
                 ^
        -------------------------------------------------------
        dist/cjs/index.cjs"
      `);
      done();
    });
  })();
});
