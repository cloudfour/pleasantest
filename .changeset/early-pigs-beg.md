---
'pleasantest': minor
---

New assertion: `expect(page).toPassAxeTests()`

This assertion is based on the [`jest-puppeteer-axe`](https://github.com/WordPress/gutenberg/tree/3b2eccc289cfc90bd99252b12fc4c6e470ce4c04/packages/jest-puppeteer-axe) package. (That package already works with Pleasantest, our new feature just formats error messages a little differently)

It allows you to pass a page to be checked with the [axe accessibility linter](https://github.com/dequelabs/axe-core).

```js
test(
  'Axe tests',
  withBrowser(async ({ utils, page }) => {
    await utils.injectHTML(`
      <h1>Some html</h1>
    `);

    await expect(page).toPassAxeTests();
  }),
);
```
