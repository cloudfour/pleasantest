# test-mule

## 0.2.0

### Minor Changes

- [`064e5b4`](https://github.com/cloudfour/test-mule/commit/064e5b4d4b6c08d54cb4dcf167a824fe115b23ce) [#48](https://github.com/cloudfour/test-mule/pull/48) Thanks [@calebeby](https://github.com/calebeby)! - - Add user.type method
  - Add actionability checks: visible and attached

* [`beb1914`](https://github.com/cloudfour/test-mule/commit/beb19143fb8de4b4fc8aeb3c6c9899906e193c90) [#43](https://github.com/cloudfour/test-mule/pull/43) Thanks [@calebeby](https://github.com/calebeby)! - Provide a helpful message if the user forgets to use `await`.

  For example, if a user forgets to use `await` in the jest-dom assertion:

  ```js
  test(
    'example',
    withBrowser(async ({ screen, utils }) => {
      await utils.injectHTML('<button>Hi</button>');
      const button = await screen.getByText(/hi/i);
      expect(button).toBeVisible();
    }),
  );
  ```

  Then a useful error message is produced:

  ```
  Cannot execute assertion toBeVisible after test finishes. Did you forget to await?

    103 |     await utils.injectHTML('<button>Hi</button>');
    104 |     const button = await screen.getByText(/hi/i);
  > 105 |     expect(button).toBeVisible();
        |                    ^
    106 |   }),
    107 | );
    108 |
  ```

  This is also handled for utility functions, user methods, and Testing Library queries.

- [`732fbff`](https://github.com/cloudfour/test-mule/commit/732fbffd3abb63d679a00a5cbef2aaf60fe9a147) [#45](https://github.com/cloudfour/test-mule/pull/45) Thanks [@calebeby](https://github.com/calebeby)! - Now it is possible to pass variables to the browser in runJS:

  ```js
  import { withBrowser } from 'test-mule';

  test(
    'runJS example with argument',
    withBrowser(async ({ utils, screen }) => {
      // element is an ElementHandle (pointer to an element in the browser)
      const element = await screen.getByText(/button/i);
      // we can pass element into runJS and the default exported function can access it as an Element
      await utils.runJS(
        `
          export default (element) => console.log(element);
        `,
        [element],
      );
    }),
  );
  ```

## 0.1.0

### Minor Changes

- [`85893b3`](https://github.com/cloudfour/test-mule/commit/85893b32648e1f640a0c3505a84ee0e35061cd71) [#37](https://github.com/cloudfour/test-mule/pull/37) Thanks [@calebeby](https://github.com/calebeby)! - First publish
