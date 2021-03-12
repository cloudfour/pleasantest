# Test Mule

Test Mule is a library that allows you test web applications using real browsers in your Jest tests. Test Mule is focused on helping you write tests that are [as similar as possible to how users use your application](https://twitter.com/kentcdodds/status/977018512689455106).

Test Mule is driven by these goals:

- Use a real browser so that the test environment is the same as what a real user uses.
- Integrate with existing tests - browser testing should not be a "separate thing" from other tests.
- Build on top of existing [Testing Library](https://testing-library.com) tools.
- Make the testing experience as fast and painless as possible.

---

- [Usage](#usage)
  - [Getting Started](#getting-started)
  - [Loading Content](#loading-content)
  - [Loading Styles](#loading-styles)
  - [Selecting Rendered Elements](#selecting-rendered-elements)
  - [Making Assertions](#making-assertions)
  - [Performing Actions](#performing-actions)
  - [Troubleshooting/Debugging a Failing Test](#troubleshootingdebugging-a-failing-test)
- [Full Example](#full-example)
- [API](#api)
  - [`withBrowser`](#withbrowser)
  - [`TestMuleContext`](#testmulecontext-object-passed-into-test-function-wrapped-by-withbrowser)
  - [User API: `TestMuleUser`](#user-api-testmuleuser)
  - [Utilities API: `TestMuleUtils`](#utilities-api-testmuleutils)
  - [`jest-dom` Matchers](#jest-dom-matchers)
- [Comparisons with other testing tools](#comparisons-with-other-testing-tools)
- [Limitations](#limitations)

## Usage

### Getting Started

Test Mule integrates with Jest tests. If you haven't set up Jest yet, [here is Jest's getting started guide](https://jestjs.io/docs/en/getting-started).

The [`withBrowser` wrapper](#withbrowser) tells Test Mule to launch a browser for the test. By default, a headless browser will be launched. The browser will close at the end of the test, unless the test failed. It is possible to have browser tests and non-browser tests in the same test suite.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async () => {
    // Your test code here
  }),
);
```

### Loading Content

#### Option 1: Rendering using a client-side framework

If your app is client-side rendered, that use case is supported too! You can use [`utils.runJS`](#testmuleutilsrunjscode-string-promisevoid) to tell Test Mule how to render your app:

```js
import { withBrowser } from 'test-mule';

test(
  'client side framework rendering',
  withBrowser(async ({ utils }) => {
    await utils.runJS(`
      // ./app could be a .js, .jsx .ts, or .tsx file
      import { App } from './app'
      import { render } from 'react-dom'

      render(<App />, document.body)
    `);
  }),
);
```

#### Option 2: Injecting HTML content

If you have the HTML content available as a string, you can use that as well, using [`utils.injectHTML`](#testmuleutilsinjecthtmlhtml-string-promisevoid):

```js
import { withBrowser } from 'test-mule';

const htmlString = `
  <h1>This is the HTML content</h1>
`;

test(
  'injected html',
  withBrowser(async ({ utils }) => {
    await utils.injectHTML(htmlString);
  }),
);
```

You could also load the HTML string from another file, for example if you are using [handlebars](https://handlebarsjs.com):

```js
import { withBrowser } from 'test-mule';
import fs from 'fs';
import Handlebars from 'handlebars';

const template = Handlebars.compile(fs.readFileSync('./content.hbs', 'utf8'));
const htmlString = template({ dataForTemplate: 'something' });

test(
  'injected html from external file',
  withBrowser(async ({ utils }) => {
    await utils.injectHTML(htmlString);
  }),
);
```

#### Option 3: Navigating to a real page

You can start a web server for your code (separately from Jest) and navigate to the site. This is similar to how [Cypress](https://www.cypress.io) works.

You can navigate using Puppeteer's `page.goto` method. [The `page` object comes from `TestMuleContext`](#testmulecontextpage). which is a parameter to the `withBrowser` callback:

```js
import { withBrowser } from 'test-mule';

test(
  'navigating to real site',
  withBrowser(async ({ page }) => {
    await page.goto('http://localhost:3000');
  }),
);
```

### Loading Styles

If you loaded your content by navigating to a real page, you shouldn't have to worry about this; your CSS should already be loaded. Also, if you rendered your content using a client-side framework and you import your CSS (or Sass, Less, etc.) into your JS (i.e. `import './something.css'`), then it should also just work.

Otherwise, you need to manually tell Test Mule to load your CSS, using [`utils.loadCSS`](#testmuleutilsloadcsscsspath-string-promisevoid)

```js
import { withBrowser } from 'test-mule';

test(
  'loading css with utils.loadCSS',
  withBrowser(async ({ utils }) => {
    // ... Whatever code you had before to load your content

    // You can import CSS (or Sass, Less, etc.) files
    await utils.loadCSS('./something.css');
  }),
);
```

### Selecting Rendered Elements

You can use [Testing Library queries](https://testing-library.com/docs/queries/about#overview) to find elements on the page. The goal is to select elements in a way similar to how a user would; for example by selecting based on a button's text rather than its class name.

The Testing Library queries are exposed through the [`screen` property](#testmulecontextscreen) in the test context parameter.

**You must `await` the result of the query. This is necessary to accomodate for the asynchronous communication with the browser.**

```js
import { withBrowser } from 'test-mule';

test(
  'selecting elements example',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML('<button>Log In</button>');

    const loginButton = await screen.getByText(/log in/i);
  }),
);
```

Sometimes, you may want to traverse the DOM tree to find parent, sibling, or descendant elements. Test Mule communicates asynchronously with the browser, so you do not have synchronous access to the DOM tree. You can use [`ElementHandle.evaluate`](https://pptr.dev/#?product=Puppeteer&version=v7.1.0&show=api-elementhandleevaluatepagefunction-args) to run code in the browser using an `ElementHandle` returned from a query:

```js
import { withBrowser } from 'test-mule';

test(
  'DOM traversal with ElementHandle.evaluate',
  withBrowser(async ({ utils, screen }) => {
    const button = await screen.getByText(/search/i);
    // Because the evaluate callback function runs in the browser,
    // it does not have access to variables from the scope it is defined in.
    const container = await button.evaluate((buttonEl) => buttonEl.parentNode);
  }),
);
```

### Making Assertions

You can use [`jest-dom`'s matchers](https://github.com/testing-library/jest-dom#table-of-contents) to make assertions against the state of the document.

**You must `await` assertions. This is necessary to accomodate for the asynchronous communication with the browser.**

```js
import { withBrowser } from 'test-mule';

test(
  'making assertions example',
  withBrowser(async ({ utils, screen }) => {
    await utils.injectHTML('<button>Log In</button>');

    const loginButton = await screen.getByText(/log in/i);

    await expect(loginButton).toBeVisible();
    await expect(loginButton).not.toBeDisabled();
  }),
);
```

### Performing Actions

You can use the [User API](#user-api-testmuleuser) to perform actions in the browser.

If the User API is missing a method that you need, you can instead use [methods on `ElementHandle`s directly](https://pptr.dev/#?product=Puppeteer&version=v7.0.1&show=api-class-elementhandle)

```js
test(
  'performing actions example',
  withBrowser(async ({ utils, screen, user }) => {
    await utils.injectHTML('<button>Log In</button>');

    const loginButton = await screen.getByText(/log in/i);

    await expect(loginButton).toBeVisible();
    await expect(loginButton).not.toBeDisabled();

    // Click using the User API
    await user.click(loginButton);

    // User API does not support `.hover` yet, so we perform the action directly on the ElementHandle instead:
    await loginButton.hover();
  }),
);
```

### Troubleshooting/Debugging a Failing Test

1. Switch to headed mode to open a visible browser and see what is going on. You can use the DOM inspector, network tab, console, and anything else that might help you figure out what is wrong.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser.headed(async () => {
    // Your test code here
  }),
);
```

2. Log queried elements in the headed browser.

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser.headed(async ({ screen, page }) => {
    const button = screen.getByText(/login/i);
    // Maybe the query returned an element that I didn't expect
    // We can log the element that was returned by the query, in the browser:
    await button.evaluate((el) => console.log(el));
  }),
);
```

## Full Example

There is a menu example in the [examples folder](./examples/menu/index.test.ts)

## API

### `withBrowser`

Use `withBrowser` to wrap any test function that needs access to a browser:

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser(async () => {
    // Your test code here
  }),
);
```

Call Signatures:

- `withBrowser(testFn: (context: TestMuleContext) => Promise<void>)`
- `withBrowser(opts: WithBrowserOpts, testFn: (context: TestMuleContext) => Promise<void>)`
- `withBrowser.headed(testFn: (context: TestMuleContext) => Promise<void>)`
- `withBrowser.headed(opts: WithBrowserOpts, testFn: (context: TestMuleContext) => Promise<void>)`

`WithBrowserOpts`:

- `headless`: `boolean`, default `true`: Whether to open a headless (not visible) browser. If you use the `withBrowser.headed` chain, that will override the value of `headless`.
- `device`: Device Object [described here](https://pptr.dev/#?product=Puppeteer&version=v7.1.0&show=api-pageemulateoptions).

By default, `withBrowser` will launch a headless Chromium browser. You can tell it to instead launch a headed (visible) browser by chaining `.headed`:

```js
import { withBrowser } from 'test-mule';

test(
  'test name',
  withBrowser.headed(async () => {
    // Your test code here
  }),
);
```

The browser will close after the test finishes, if the test passed. You can force the browser to stay open by making the test fail by throwing something.

You can also emulate a device viewport and user agent, by passing the `device` property to the options object in `withBrowser`:

```js
import { withBrowser, devices } from 'test-mule';
const iPhone = devices['iPhone 11'];

test(
  'test name',
  withBrowser({ device: iPhone }, async () => {
    // Your test code here
  }),
);
```

The `devices` import from `test-mule` is re-exported from Puppeteer, you can see the full list of available devices [here](https://github.com/puppeteer/puppeteer/blob/v7.1.0/src/common/DeviceDescriptors.ts)

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

The `TestMuleContext` object exposes the `within` property, which is similar to [`screen`](#testmulecontextscreen), but instead of the queries being pre-bound to the document, they are pre-bound to whichever element you pass to it. [Here's Testing Library's docs on `within`](https://testing-library.com/docs/dom-testing-library/api-within). Like `screen`, it returns an object with all of the pre-bound Testing Library queries.

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

#### `TestMuleUser.type(TODOOO): Promise<void>`

TODOOOOOO

{selectall} is only supported for `input` and `textarea` elements, not elements that use `contenteditable`.

### Utilities API: `TestMuleUtils`

The utilities API provides shortcuts for loading and running code in the browser. The methods are wrappers around behavior that can be performed more verbosely with the [Puppeteer `Page` object](#testmulecontextpage). This API is exposed via the [`utils` property in `TestMuleContext`](#testmulecontextutils-testmuleutils)

#### `TestMuleUtils.runJS(code: string): Promise<void>`

Execute a JS code string in the browser. The code string inherits the syntax abilities of the file it is in, i.e. if your test file is a `.tsx` file, then the code string can include JSX and TS. The code string can use (static or dynamic) ES6 imports to import other modules, including TS/JSX modules, and it supports resolving from `node_modules`, and relative paths from the test file. The code string supports top-level await to wait for a Promise to resolve. Since the code in the string is only a string, you cannot access variables that are defined in the Node.js scope. It is proably a bad idea to use interpolation in the code string, only static strings should be used, so that the source location detection works when an error is thrown.

The code that is allowed in `runJS` is designed to work similarly to the [TC39 Module Blocks Proposal](https://github.com/tc39/proposal-js-module-blocks), and eventually we hope to be able to switch to that official syntax.

```js
import { withBrowser } from 'test-mule';

test(
  'runJS example',
  withBrowser(async ({ utils }) => {
    await utils.runJS(`
      // ./other-file is resolved from the test file that called `runJS`
      import { render } from './other-file'
      // top-level await is supported
      await render()
    `);
  }),
);
```

To pass variables from the test environment into the browser, you can pass them as the 2nd parameter. Note that they must either be JSON-serializable or they can be a [`JSHandle`](https://pptr.dev/#?product=Puppeteer&version=v7.1.0&show=api-class-jshandle) or an [`ElementHandle`](https://pptr.dev/#?product=Puppeteer&version=v7.1.0&show=api-class-elementhandle). The arguments can be received in the browser as parameters to a default-exported function:

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
    await utils.loadCSS('./button.css');
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

Test Mule adds [`jest-dom`'s matchers](https://github.com/testing-library/jest-dom#table-of-contents) to Jest's `expect` global. They are slightly modified from the original matchers, they are wrapped to execute in the browser, and return a Promise.

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

## Comparisons with other testing tools

### [Cypress](https://www.cypress.io/)

Cypress is an browser testing tool that specializes in end-to-end tests.

- Cypress is not integrated with Jest.
- Cypress is not well-suited for testing individual components of an application, it specializes in end-to-end tests. Note: this will change as [Component Testing](https://docs.cypress.io/guides/component-testing/introduction.html#Getting-Started) support stabilizes.
- Cypress uses different assertion syntax from Jest. If you are using Cypress for browser tests, and Jest for non-browser tests, it can be difficult to remember both the Chai assertions and the Jest assertions.
- Cypress's chaining syntax increases the barrier to entry over using native JS promises with `async`/`await`. In many ways Cypress implements a "Cypress way" of doing things that is different from the intuitive way for people who are familiar with JavaScript.
- Cypress does not have first-class support for [Testing Library](https://testing-library.com) (though there is a [plugin](https://github.com/testing-library/cypress-testing-library)).
- Cypress [does not support having multi-tab tests](https://docs.cypress.io/guides/references/trade-offs.html#Multiple-tabs).

### [jsdom](https://github.com/jsdom/jsdom) + Jest

Jest uses [jsdom](https://github.com/jsdom/jsdom) and exposes browser-like globals to your tests (like `document` and `window`). This is helpful to write tests for browser code, for example using [DOM Testing Library](https://testing-library.com/docs/dom-testing-library/intro/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro), or something similar. However, there are some downsides to this approach because jsdom is not a real browser:

- jsdom does not implement a rendering engine. It does not render visual content. Because of this, your tests may pass, even when your code is broken, and your tests may fail even when your code is correct.
- jsdom is [missing many browser API's](https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform). If your code uses API's unsupported by jsdom, you'd have to patch them in. Since Test Mule uses a real browser, any API's that Chrome supports can be used.
- jsdom does not support [navigation](https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform) or multi-tab tests.
- It is harder to debug since you do not have access to browser devtools to inspect the DOM.

### [pptr-testing-library](https://github.com/testing-library/pptr-testing-library) + Jest

`pptr-testing-library` makes versions of the [Testing Library](https://testing-library.com) queries that work with Puppeteer's [ElementHandle](https://pptr.dev/#?product=Puppeteer&version=v7.1.0&show=api-class-elementhandle)s, similarly to how Test Mule does.

- It does not make the [jest-dom](https://github.com/testing-library/jest-dom) assertions work with Puppeteer ElementHandles.
- It does not manage the browser for you. You must manually set up and tear down the browser.
- It does not produce error messages as nicely as Test Mule does.
- In general, it is a good solution to a small piece of the puzzle, but it is not a complete solution like Test Mule is.

### [jest-puppeteer](https://github.com/smooth-code/jest-puppeteer) + Jest

`jest-puppeteer` is a [Jest environment](https://jestjs.io/docs/en/configuration#testenvironment-string) that manages launching browsers via puppeteer in Jest tests.

- It does not support [Testing Library](https://testing-library.com) or [jest-dom](https://github.com/testing-library/jest-dom) (but Testing Library support could be added via [pptr-testing-library](https://github.com/testing-library/pptr-testing-library)).
- Lacking maintenance

### [Playwright test runner](https://github.com/microsoft/playwright-test)

`@playwright/test` is a test runner from the Playwright team that is designed to run browser tests.

- It does not support [Testing Library](https://testing-library.com) or [jest-dom](https://github.com/testing-library/jest-dom).
- Since it is its own test runner, it does not integrate with Jest, so you still have to run your non-browser tests separately. Fortunately, the test syntax is almost the same as Jest, and it uses Jest's `expect` as its library.
- There is [no watch mode yet](https://github.com/microsoft/playwright-test/issues/33).

## Limitations

### Temporary Limitations

- **Browser Support**: We only support Chromium for now. We have also tested connecting with Edge and that test was successful, but we do not yet expose an API for that. We will also support Firefox in the near future, since Puppeteer supports it. We have prototyped with integrating Firefox with Test Mule and we have seen that it works. We will not support Safari/Webkit [until Puppeteer supports it](https://github.com/puppeteer/puppeteer/issues/5984). We will not support Internet Explorer. ([Tracking issue](https://github.com/cloudfour/test-mule/issues/32))
- **Visual Regression Testing**: Test Mule does not have an integrated approach for screenshot diffing/visual regression testing. For now, you can use [`jest-image-snapshot`](https://github.com/americanexpress/jest-image-snapshot#see-it-in-action), which should work fine. Eventually, we may have an integrated approach. ([Tracking issue](https://github.com/cloudfour/test-mule/issues/33))
- **Tied to Jest**: For now, Test Mule is designed to work with Jest, and not other test runners like Mocha or Ava. You could _probably_ make it work by loading Jest's `expect` into the other test runners, but this workflow has not been tested. ([Tracking issue](https://github.com/cloudfour/test-mule/issues/34))

### Permanent Limitations

- **No Synchronous DOM Access**: Because Jest runs your tests, Test Mule will never support synchronously and directly modifying the DOM. While you can use [`utils.runJS`](#testmuleutilsrunjscode-string-promisevoid) to execute snippets of code in the browser, all other browser manipulation must be through the provided asynchronous APIs. This is an advantage [jsdom](https://github.com/jsdom/jsdom)-based tests will always have over Test Mule tests.
