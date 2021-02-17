# Test Mule

Test Mule is a library that allows you to use real browsers in your Jest tests. Test Mule is focused on helping you write tests that are [as similar as possible to how users use your application](https://twitter.com/kentcdodds/status/977018512689455106). It is built on [Puppeteer](https://github.com/puppeteer/puppeteer), [Testing Library](https://testing-library.com), and [jest-dom](https://github.com/testing-library/jest-dom).

Test Mule integrates with Jest tests. If you haven't set up Jest yet, [here is Jest's getting started guide](https://jestjs.io/docs/en/getting-started).

## Usage

The `withBrowser` wrapper tells Test Mule to launch a browser for the test. By default, a headless browser will be launched. The browser will close at the end of the test, unless the test failed. It is possible to have browser tests and non-browser tests in the same test suite.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async () => {
    // Your test code here
  }),
);
```

## Full Example

There is a menu example in the [examples folder](./examples/menu/index.test.ts)

## API

### `withBrowser`

Use `withBrowser` to wrap any test that needs access to a browser:

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async () => {
    // Your test code here
  }),
);
```

### `TestMuleContext` Object (passed into test function wrapped by `withBrowser`)

#### `TestMuleContext.screen`

The `TestMuleContext` object exposes the [`screen`](https://testing-library.com/docs/queries/about/#screen) property, which is an [object with Testing Library queries pre-bound to the document](https://testing-library.com/docs/queries/about/#screen). All of the [Testing Library queries](https://testing-library.com/docs/queries/about#overview) are available. These are used to find elements in the DOM for use in your tests. There is one difference in how you use the queries in Test Mule compared to Testing Library: in Test Mule, all queries must be `await`ed to handle the time it takes to communicate with the browser. In addition, since your tests are running in Node, the queries return Promises that resolve to [`ElementHandle`](https://pptr.dev/#?product=Puppeteer&version=v7.0.1&show=api-class-elementhandle)'s from Puppeteer.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async ({ screen }) => {
    //                 ^^^^^^

    const helloElement = await screen.getByText(/hello/i);
  }),
);
```

#### `TestMuleContext.within(element: ElementHandle)`

The `TestMuleContext` object exposes the `within` property, which is similar to [`screen`](#screen), but instead of the queries being pre-bound to the document, they are pre-bound to whichever element you pass to it. [Here's Testing Library's docs on `within`](https://testing-library.com/docs/dom-testing-library/api-within). Like `screen`, it returns an object with all of the pre-bound Testing Library queries.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async ({ within, screen }) => {
    //                 ^^^^^^
    const containerElement = await screen
      .getByText(/hello/i)
      .then((helloElement) => helloElement.parentElement);
    const container = within(containerElement);

    // Now `container` has queries bound to the container element
    // You can use `container` in the same way as `screen`

    const someElement = await container.getByText(/some element/i);
  }),
);
```

#### `TestMuleContext.page`

The `TestMuleContext` object exposes the `page` property, which is an instance of Puppeteer's [`Page` class](https://pptr.dev/#?product=Puppeteer&version=v7.0.1&show=api-class-page). This will most often be used for navigation ([`page.goto`](https://pptr.dev/#?product=Puppeteer&version=v7.0.1&show=api-pagegotourl-options)), but you can do anything with it that you can do with puppeteer.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async ({ page }) => {
    //                 ^^^^

    // Navigate to a page
    await page.goto('https://google.com');

    // Get access to the BrowserContext object
    const browser = page.browserContext();
  }),
);
```

#### `TestMuleContext.user`: [`TestMuleUser`](#user-api-testmuleuser)

#### `TestMuleContext.utils`: [`TestMuleUtils`](#utilities-api-testmuleutils)

### User API: `TestMuleUser`

The user API allows you to perform actions on behalf of the user. If you have used [`user-event`](https://github.com/testing-library/user-event), then this API will feel familiar. This API is exposed via the [`user` property in `TestMuleContext`](#testmulecontextuser-testmuleuser).

> **Warning**: The User API is in progress. It should be safe to use the existing methods, but keep in mind that more methods will be added in the future, and more checks will be performed for existing methods as well.

#### `TestMuleUser.click(element: ElementHandle): Promise<void>`

Clicks an element, if the element is visible and the center of it is not covered by another element. If the center of the element is covered by another element, an error is thrown. This is a thin wrapper around Puppeteer's [`ElementHandle.click` method](https://pptr.dev/#?product=Puppeteer&version=v7.0.1&show=api-elementhandleclickoptions). The difference is that `TestMuleUser.click` checks that the target element is not covered before performing the click. Don't forget to `await`, since this returns a Promise!

```js
import { withBrowser } from 'test-mule';

test(
  'click example',
  withBrowser(async ({ user, screen }) => {
    const button = await screen.getByRole('button', { name: /button text/i });
    await user.click(button);
  }),
);
```

### Utilities API: `TestMuleUtils`

The utilities API provides shortcuts for loading and running code in the browser. The methods are wrappers around behavior that can be performed more verbosely with the [Puppeteer `Page` object](#testmulecontext-page). This API is exposed via the [`utils` property in `TestMuleContext`](#testmulecontextutils-testmuleutils)

#### `TestMuleUtils.runJS(code: string): Promise<void>`

Execute a JS code string in the browser. The code string inherits the syntax abilities of the file it is in, i.e. if your test file is a .tsx file, then the code string can include JSX and TS. The code string can use (static or dynamic) ES6 imports to import other modules, including TS/JSX modules, and it supports resolving from `node_modules`, and relative paths from the test file. The code string supports top-level await to wait for a Promise to resolve. Since the code in the string is only a string, you cannot access variables that are defined in the Node.js scope. It is proably a bad idea to use interpolation in the code string, only static strings should be used, so that the source location detection works when an error is thrown.

The code that is allowed in `runJS` is designed to work similarly to the [TC39 Module Blocks Proposal](https://github.com/tc39/proposal-js-module-blocks), and eventually we hope to be able to switch to that official syntax.

```js
import { withBrowser } from 'test-mule';

test(
  'runJS example',
  withBrowser(async ({ utils }) => {
    await utils.runJS(`
      // `./other-file` is resolved from the test file that called `runJS`
      import { render } from './other-file'
      // top-level await is supported
      await render()
    `);
  }),
);
```

#### `TestMuleUtils.loadJS(jsPath: string): Promise<void>`

Load a JS (or TS, JSX) file into the browser. Pass a path that will be resolved from your test file.

```js
import { withBrowser } from 'test-mule';

test(
  'loadJS example',
  withBrowser(async ({ utils }) => {
    await utils.loadJS('./button');
  }),
);
```

#### `TestMuleUtils.loadCSS(cssPath: string): Promise<void>`

Load a CSS (or Sass, Less, etc.) file into the browser. Pass a path that will be resolved from your test file.

```js
import { withBrowser } from 'test-mule';

test(
  'loadCSS example',
  withBrowser(async ({ utils }) => {
    await utils.loadCSS('./button.sass');
  }),
);
```

#### `TestMuleUtils.injectCSS(css: string): Promise<void>`

Set the contents of a new `<style>` tag.

```js
import { withBrowser } from 'test-mule';

test(
  'injectCSS example',
  withBrowser(async ({ utils }) => {
    await utils.injectCSS(`
      .button {
        background: green;
      }
    `);
  }),
);
```

#### `TestMuleUtils.injectHTML(html: string): Promise<void>`

Set the contents of `document.body`.

```js
import { withBrowser } from 'test-mule';

test(
  'injectHTML example',
  withBrowser(async ({ utils }) => {
    await utils.injectHTML(`
      <h1>Hi</h1>
    `);
  }),
);
```

### [`jest-dom`](https://github.com/testing-library/jest-dom) Matchers

Test Mule adds `jest-dom`'s matchers to Jest's `expect` global. They are slightly modified from the original matchers, they are wrapped to execute in the browser, and return a Promise.

**Don't forget to `await` matchers! This is necessary because the matchers execute in the browser. If you forget, your matchers may execute after your test finishes, and you may get obscure errors.**

```js
import { withBrowser } from 'test-mule';

test(
  'jest-dom matchers example',
  withBrowser(async ({ screen }) => {
    const button = await screen.getByText();
    // jest-dom matcher -- Runs in browser, *must* be awaited
    await expect(button).toBeVisible();
    // Built-in Jest matcher -- Runs only in Node, does not need to be awaited
    expect(5).toEqual(5);
  }),
);
```

## Comparisons with other testing tools/Why does this exist?

### Cypress

- Cypress is not integrated with Jest.
- Cypress uses different assertion syntax from Jest. If you are using Cypress for browser tests, and Jest for non-browser tests, it can be difficult to remember both the Chai assertions and the Jest assertions.
- Cypress's chaining syntax increases the barrier to entry over using native JS promises with `async`/`await`. In many ways Cypress implements a "Cypress way" of doing things that is different from the intuitive way for people who are familiar with JavaScript.
- Cypress does not have first-class support for Testing Library (though there is a [plugin](https://github.com/testing-library/cypress-testing-library)).

### jsdom in Jest

Jest uses [jsdom](https://github.com/jsdom/jsdom) and exposes browser-like globals to your tests (like `document` and `window`). This is helpful to write tests for browser code, for example using [DOM Testing Library](https://testing-library.com/docs/dom-testing-library/intro/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro), or something similar. However, there are some downsides to this approach because jsdom is not a real browser:

- jsdom does not implement a rendering engine. It does not render visual content. That means that in many cases, your tests do not resemble the way users use your software.
- jsdom is [missing many browser API's](https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform). If your code uses API's unsupported by jsdom, you'd have to patch them in. Since Test Mule uses a real browser, any API's that Chrome supports can be used.
