# pleasantest

## 0.5.0

### Minor Changes

- [#90](https://github.com/cloudfour/pleasantest/pull/90) [`ecffd3a`](https://github.com/cloudfour/pleasantest/commit/ecffd3a8b881453b5a4fe1abed54d464fef3b632) Thanks [@renovate](https://github.com/apps/renovate)! - New `jest-dom` matcher: `toHaveErrorMessage`

* [#86](https://github.com/cloudfour/pleasantest/pull/86) [`35be60a`](https://github.com/cloudfour/pleasantest/commit/35be60a641a2e48f5fca0fc48afcfeee44f2d45f) Thanks [@renovate](https://github.com/apps/renovate)! - Update puppeteer to v10.0.0

  Chromium version is now 92.0.4512.0 (r884014)

### Patch Changes

- [`7705216`](https://github.com/cloudfour/pleasantest/commit/770521667c158de94a5c17f4b4ad48b8955b0952) Thanks [@calebeby](https://github.com/calebeby)! - Update `@testing-library/dom` to `v7.31.2`. This change fixes some issues with label associations.

## 0.4.1

### Patch Changes

- [#78](https://github.com/cloudfour/pleasantest/pull/78) [`55b75f9`](https://github.com/cloudfour/pleasantest/commit/55b75f9141e74ac3cf50a5ff02f478371d499f04) Thanks [@calebeby](https://github.com/calebeby)! - Handle errors thrown by browser launcher instead of silently hanging

## 0.4.0

### Minor Changes

- [#61](https://github.com/cloudfour/pleasantest/pull/61) [`be9eef7`](https://github.com/cloudfour/pleasantest/commit/be9eef7aed51c51cac3ab604ac023cd114b2e6a7) Thanks [@calebeby](https://github.com/calebeby)! - Update puppeteer to v9.1.1

  Chromium version is now 91.0.4469.0 (r869685)

### Patch Changes

- [#63](https://github.com/cloudfour/pleasantest/pull/63) [`dd1bb5d`](https://github.com/cloudfour/pleasantest/commit/dd1bb5d0f6b5b792c6016bcc630d89e4fed7d483) Thanks [@calebeby](https://github.com/calebeby)! - Update dependencies

## 0.3.0

### Minor Changes

- [`4e0335c`](https://github.com/cloudfour/pleasantest/commit/4e0335c81b6ce1360109e79ddc2bb73a46d841fd) [#58](https://github.com/cloudfour/pleasantest/pull/58) Thanks [@calebeby](https://github.com/calebeby)! - Implement `user.clear()`

  Additionally, the default delay between keypresses in `user.type` has been decreased to 1ms.

* [`f5c2fab`](https://github.com/cloudfour/pleasantest/commit/f5c2fab83ca23e676a27b0c33f2ce6275f8eb59d) [#60](https://github.com/cloudfour/pleasantest/pull/60) Thanks [@calebeby](https://github.com/calebeby)! - Implement `user.selectOptions()`

## 0.2.2

### Patch Changes

- [`31cc1a9`](https://github.com/cloudfour/pleasantest/commit/31cc1a91e0ebf1a0ec9f82ed2575acf7371bb9b1) [#55](https://github.com/cloudfour/pleasantest/pull/55) Thanks [@calebeby](https://github.com/calebeby)! - Export `JSHandle` and `ElementHandle` types from puppeteer. Now if you want to use those types you can import them directly from pleasantest.

## 0.2.1

### Patch Changes

- [`ae4a89a`](https://github.com/cloudfour/pleasantest/commit/ae4a89a2b822976d17ecb291a0b7b9c32cc1b6a6) [#53](https://github.com/cloudfour/pleasantest/pull/53) Thanks [@calebeby](https://github.com/calebeby)! - Bundle types for `@testing-library/dom` so people don't have to install `@testing-library/dom` (closes [#50](https://github.com/cloudfour/pleasantest/issues/50))

## 0.2.0

### Minor Changes

- [`064e5b4`](https://github.com/cloudfour/pleasantest/commit/064e5b4d4b6c08d54cb4dcf167a824fe115b23ce) [#48](https://github.com/cloudfour/pleasantest/pull/48) Thanks [@calebeby](https://github.com/calebeby)! - - Add user.type method
  - Add actionability checks: visible and attached

* [`beb1914`](https://github.com/cloudfour/pleasantest/commit/beb19143fb8de4b4fc8aeb3c6c9899906e193c90) [#43](https://github.com/cloudfour/pleasantest/pull/43) Thanks [@calebeby](https://github.com/calebeby)! - Provide a helpful message if the user forgets to use `await`.

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

- [`732fbff`](https://github.com/cloudfour/pleasantest/commit/732fbffd3abb63d679a00a5cbef2aaf60fe9a147) [#45](https://github.com/cloudfour/pleasantest/pull/45) Thanks [@calebeby](https://github.com/calebeby)! - Now it is possible to pass variables to the browser in runJS:

  ```js
  import { withBrowser } from 'pleasantest';

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

- [`85893b3`](https://github.com/cloudfour/pleasantest/commit/85893b32648e1f640a0c3505a84ee0e35061cd71) [#37](https://github.com/cloudfour/pleasantest/pull/37) Thanks [@calebeby](https://github.com/calebeby)! - First publish
