# pleasantest

## 4.0.0

### Major Changes

- [#684](https://github.com/cloudfour/pleasantest/pull/684) [`53fe380`](https://github.com/cloudfour/pleasantest/commit/53fe380a7382f67ecbf43e57362a0eb156713617) Thanks [@renovate](https://github.com/apps/renovate)! - Update `@testing-library/dom` to `v9`.

  Breaking changes:

  - `ByRole` now only allows string as a role. The `exact`, `trim`, `collapseWhitespace`, and `normalizer` options are no longer supported for role queries.

- [#681](https://github.com/cloudfour/pleasantest/pull/681) [`f00efad`](https://github.com/cloudfour/pleasantest/commit/f00efad029084dbef888506e78f54b36e85f0a90) Thanks [@calebeby](https://github.com/calebeby)! - Drop support for node 14 and 19

- [#686](https://github.com/cloudfour/pleasantest/pull/686) [`563cd06`](https://github.com/cloudfour/pleasantest/commit/563cd065943f8f1dc29351d2025611bafc9a59c2) Thanks [@renovate](https://github.com/apps/renovate)! - Update Puppeteer from `v18` to `v20`. [The `puppeteer` changelog is available here](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer/CHANGELOG.md#1900-2022-10-14).

### Minor Changes

- [#698](https://github.com/cloudfour/pleasantest/pull/698) [`fd66068`](https://github.com/cloudfour/pleasantest/commit/fd660686df142785e1500e3fcd61afce0f23080c) Thanks [@calebeby](https://github.com/calebeby)! - Add support for Node 20

## 3.1.0

### Minor Changes

- [#650](https://github.com/cloudfour/pleasantest/pull/650) [`d83f32b`](https://github.com/cloudfour/pleasantest/commit/d83f32b79872973a577115c00abbe265f85168f3) Thanks [@calebeby](https://github.com/calebeby)! - Add support for node 19

- [#640](https://github.com/cloudfour/pleasantest/pull/640) [`893d9d5`](https://github.com/cloudfour/pleasantest/commit/893d9d5d8fb61b95071815db190bbb11abd80fd9) Thanks [@calebeby](https://github.com/calebeby)! - Bump puppeteer and @axe-core/puppeteer versions

## 3.0.1

### Patch Changes

- [#631](https://github.com/cloudfour/pleasantest/pull/631) [`f124a5a`](https://github.com/cloudfour/pleasantest/commit/f124a5a12144a29e1263be25eefa09c4311be2a8) Thanks [@calebeby](https://github.com/calebeby)! - [bugfix] Don't override `<head>` when using `utils.injectHTML`

  This was a bug introduced in `3.0.0`. This change fixes that behavior to match what is documented. The documented behavior is that `injectHTML` replaces the content of the body _only_. The behavior introduced in `3.0.0` also resets the `<head>` to the default; that was unintended behavior that is now removed.

## 3.0.0

### Major Changes

- [#561](https://github.com/cloudfour/pleasantest/pull/561) [`b565e0b`](https://github.com/cloudfour/pleasantest/commit/b565e0b64e535337ea5ac53c0c17fa7227861f0f) Thanks [@calebeby](https://github.com/calebeby)! - **Normalize whitespace in element accessible names in `getAccessibilityTree`**. Markup with elements which have an accessible name that includes irregular whitespace, like non-breaking spaces, will now have a different output for `getAccessibilityTree` snapshots. Previously, the whitespace was included, now, whitespace is replaced with a single space.

* [#535](https://github.com/cloudfour/pleasantest/pull/535) [`dc6f81c`](https://github.com/cloudfour/pleasantest/commit/dc6f81cf054c9ae57ed0d7ca05a1b624e580f930) Thanks [@calebeby](https://github.com/calebeby)! - **Values exported from `runJS` are now available in Node.**

  For example:

  ```js
  test(
    'receiving exported values from runJS',
    withBrowser(async ({ utils }) => {
      // Each export is available in the returned object.
      // Each export is wrapped in a JSHandle, meaning that it points to an in-browser object
      const { focusTarget, favoriteNumber } = await utils.runJS(`
        export const focusTarget = document.activeElement
        export const favoriteNumber = 20
      `);

      // Serializable JSHandles can be unwrapped using JSONValue:
      console.log(await favoriteNumber.jsonValue()); // Logs "20"

      // A JSHandle<Element>, or ElementHandle is not serializable
      // But we can pass it back into the browser to use it (it will be unwrapped in the browser):

      await utils.runJS(
        `
        // The import.meta.pleasantestArgs context object receives the parameters passed in below
        const [focusTarget] = import.meta.pleasantestArgs;
        console.log(focusTarget) // Logs the element in the browser
        `,
        // Passing the JSHandle in here passes it into the browser (unwrapped) in import.meta.pleasantestArgs
        [focusTarget],
      );
    }),
  );
  ```

  We've also introduced a utility function to make it easier to call `JSHandle`s that point to functions, `makeCallableJSHandle`. This function takes a `JSHandle<Function>` and returns a node function that calls the corresponding browser function, passing along the parameters, and returning the return value wrapped in `Promise<JSHandle<T>>`:

  ```js
  // new import:
  import { makeCallableJSHandle } from 'pleasantest';

  test(
    'calling functions with makeCallableJSHandle',
    withBrowser(async ({ utils }) => {
      const { displayFavoriteNumber } = await utils.runJS(`
        export const displayFavoriteNumber = (number) => {
          document.querySelector('.output').innerHTML = "Favorite number is: " + number
        }
      `);

      // displayFavoriteNumber is a JSHandle<Function>
      // (a pointer to a function in the browser)
      // so we cannot call it directly, so we wrap it in a node function first:

      const displayFavoriteNumberNode = makeCallableJSHandle(
        displayFavoriteNumber,
      );

      // Note the added `await`.
      // Even though the original function was not async, the wrapped function is.
      // This is needed because the wrapped function needs to asynchronously communicate with the browser.
      await displayFavoriteNumberNode(42);
    }),
  );
  ```

  For TypeScript users, `runJS` now accepts a new optional type parameter, to specify the exported types of the in-browser module that is passed in. The default value for this parameter is `Record<string, unknown>` (an object with string properties and unknown values). Note that this type does not include `JSHandles`, those are wrapped in the return type from `runJS` automatically.

  Using the first example, the optional type would be:

  ```ts
  test(
    'receiving exported values from runJS',
    withBrowser(async ({ utils }) => {
      const { focusTarget, favoriteNumber } = await utils.runJS<{
        focusTarget: Element;
        favoriteNumber: number;
      }>(`
        export const focusTarget = document.activeElement
        export const favoriteNumber = 20
      `);
    }),
  );
  ```

  Now `focusTarget` automatically has the type `JSHandle<Element>` and `favoriteNumber` automatically has the type `JSHandle<number>`. Without passing in the type parameter to `runJS`, their types would both be `JSHandle<unknown>`.

- [#541](https://github.com/cloudfour/pleasantest/pull/541) [`39085ac`](https://github.com/cloudfour/pleasantest/commit/39085ace6e2bdb64698156953a375376c7d9b912) Thanks [@calebeby](https://github.com/calebeby)! - **`injectHTML` now executes script tags in the injected markup by default**. This can be disabled by passing the `executeScriptTags: false` option as the second parameter.

  For example, the script tag is now executed by default:

  ```js
  await utils.injectHTML(
    "<script>document.querySelector('div').textContent = 'changed'</script>",
  );
  ```

  But by passing `executeScriptTags: false`, we can disable execution:

  ```js
  await utils.injectHTML(
    "<script>document.querySelector('div').textContent = 'changed'</script>",
    { executeScriptTags: false },
  );
  ```

* [#535](https://github.com/cloudfour/pleasantest/pull/535) [`dc6f81c`](https://github.com/cloudfour/pleasantest/commit/dc6f81cf054c9ae57ed0d7ca05a1b624e580f930) Thanks [@calebeby](https://github.com/calebeby)! - **The way that `runJS` receives parameters in the browser has changed.** Now, parameters are available as `import.meta.pleasantestArgs` instead of through an automatically-called default export.

  For example, code that used to work like this:

  ```js
  test(
    'old version of runJS parameters',
    withBrowser(async ({ utils }) => {
      // Pass a variable from node to the browser
      const url = isDev ? 'dev.example.com' : 'prod.example.com';

      await utils.runJS(
        `
        // Parameters get passed into the default-export function, which is called automatically
        export default (url) => {
          console.log(url)
        }
        `,
        // array of parameters passed here
        [url],
      );
    }),
  );
  ```

  Now should be written like this:

  ```js
  test(
    'new version of runJS parameters',
    withBrowser(async ({ utils }) => {
      // Pass a variable from node to the browser
      const url = isDev ? 'dev.example.com' : 'prod.example.com';

      await utils.runJS(
        `
        // Parameters get passed as an array into this context variable, and we can destructure them
        const [url] = import.meta.pleasantestArgs
        console.log(url)
        // If we added a default exported function here, it would no longer be automatically called.
        `,
        // array of parameters passed here
        [url],
      );
    }),
  );
  ```

  This is a breaking change, because the previous mechanism for receiving parameters no longer works, and functions that are `default export`s from runJS are no longer called automatically.

- [#506](https://github.com/cloudfour/pleasantest/pull/506) [`7592994`](https://github.com/cloudfour/pleasantest/commit/759299431ec8649b9d8152d88633ef3600d540ad) Thanks [@calebeby](https://github.com/calebeby)! - **Drop support for Node 12 and 17**

### Minor Changes

- [#557](https://github.com/cloudfour/pleasantest/pull/557) [`7bb10e0`](https://github.com/cloudfour/pleasantest/commit/7bb10e0435173f6c30272ed3dec920a29ce6d660) Thanks [@calebeby](https://github.com/calebeby)! - Update `@testing-library/dom` to `8.17.1` and `@testing-library/jest-dom` to `5.16.5`

## 2.2.0

### Minor Changes

- [#494](https://github.com/cloudfour/pleasantest/pull/494) [`730300e`](https://github.com/cloudfour/pleasantest/commit/730300e354b90b250466b75484f5ea9167e552e6) Thanks [@calebeby](https://github.com/calebeby)! - New assertion: `expect(page).toPassAxeTests()`

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

* [#459](https://github.com/cloudfour/pleasantest/pull/459) [`d36f234`](https://github.com/cloudfour/pleasantest/commit/d36f234db3067ab039e7cb92c5220e52ba9c4de4) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency `@testing-library/dom` to `v8.13.0`.

  This adds support to filtering `ByRole` queries by description:

  ```ts
  // Select by accessible role and description
  await screen.getByRole('button', {
    description: /^items in the trash will be/i,
  });
  ```

## 2.1.0

### Minor Changes

- [#486](https://github.com/cloudfour/pleasantest/pull/486) [`c142d73`](https://github.com/cloudfour/pleasantest/commit/c142d73bbd7b5b7ef92f8e38fee686f3e43d1b27) Thanks [@calebeby](https://github.com/calebeby)! - Add support for node 18

* [#481](https://github.com/cloudfour/pleasantest/pull/481) [`10a8364`](https://github.com/cloudfour/pleasantest/commit/10a836471144bcf6c500d06a72143c7fec64c751) Thanks [@calebeby](https://github.com/calebeby)! - Add full support for Jest 28

## 2.0.0

### Major Changes

- [#345](https://github.com/cloudfour/pleasantest/pull/345) [`847cbd8`](https://github.com/cloudfour/pleasantest/commit/847cbd829504ae7ac518063cc380bc1b0adc3adc) Thanks [@calebeby](https://github.com/calebeby)! - Normalize whitespace in `getAccessibilityTree`

  Now anytime there is contiguous whitespace in text strings it is collapsed into a single space. This matches the behavior of browser accessibility trees.

  This is a breaking change because it changes the `getAccessibilityTree` output, and may break your snapshots. Update your snapshots with Jest and review the changes.

* [#446](https://github.com/cloudfour/pleasantest/pull/446) [`1eaa648`](https://github.com/cloudfour/pleasantest/commit/1eaa648dc8e2307a622383b9decf7ff637fad681) Thanks [@calebeby](https://github.com/calebeby)! - Use document.title as fallback implicit accessible name for html root element in accessibility tree snapshots

- [#445](https://github.com/cloudfour/pleasantest/pull/445) [`5fa4103`](https://github.com/cloudfour/pleasantest/commit/5fa41034ee423559203669282c6af7f03042ec01) Thanks [@calebeby](https://github.com/calebeby)! - Add heading levels to `getAccessibilityTree`. The heading levels are computed from the corresponding element number in `<h1>` - `<h6>`, or from the `aria-level` role.

  In the accessibility tree snapshot, it looks like this:

  ```
  heading "Name of Heading" (level=2)
  ```

  This is a breaking change because it will cause existing accessibility tree snapshots to fail which contain headings. Update the snapshots to make them pass again.

* [#451](https://github.com/cloudfour/pleasantest/pull/451) [`eb364cc`](https://github.com/cloudfour/pleasantest/commit/eb364cce9f077247f3f08c4e4319f4d2dbac8b3c) Thanks [@calebeby](https://github.com/calebeby)! - Added `aria-expanded` support to `getAccessibilityTree` and fix handling for `<details>`/`<summary>`

  Now, elements which have the `aria-expanded` attribute will represent the state of that attribute in accessibility tree snapshots. `<details>`/`<summary>` elements will represent their expanded state in the tree as well.

  Also, for collapsed `<details>`/`<summary>` elements, the hidden content is now hidden in the accessibility tree, to match screen reader behavior.

- [#248](https://github.com/cloudfour/pleasantest/pull/248) [`abe22a6`](https://github.com/cloudfour/pleasantest/commit/abe22a6ba71eb04fa858447272a171474483b105) Thanks [@gerardo-rodriguez](https://github.com/gerardo-rodriguez)! - Enforce minimum target size when calling `user.click()`, per WCAG Success Criterion 2.5.5 Target Size guideline.

### Minor Changes

- [#409](https://github.com/cloudfour/pleasantest/pull/409) [`cf3ad32`](https://github.com/cloudfour/pleasantest/commit/cf3ad32f60e463b3b72b6cf58254152832fff758) Thanks [@renovate](https://github.com/apps/renovate)! - Update puppeteer to 13.5.2

## 1.7.0

### Minor Changes

- [#403](https://github.com/cloudfour/pleasantest/pull/403) [`6ceb029`](https://github.com/cloudfour/pleasantest/commit/6ceb029be3152ed7b7d34a1a6b643591f1ce7cf2) Thanks [@calebeby](https://github.com/calebeby)! - Expose `accessibilityTreeSnapshotSerializer`. This is the snapshot serializer that Pleasantest configures Jest to use to format accessibility tree snapshots. It was enabled by default in previous versions, and it still is, just now it is also exposed as an export so you can pass the snapshot serializer to other tools, like [`snapshot-diff`](https://github.com/jest-community/snapshot-diff).

  Here's an example of using this:

  This part you'd put in your test setup file (configured in Jest's `setupFilesAfterEnv`):

  ```js
  import snapshotDiff from 'snapshot-diff';

  expect.addSnapshotSerializer(snapshotDiff.getSnapshotDiffSerializer());
  snapshotDiff.setSerializers([
    {
      test: accessibilityTreeSnapshotSerializer.test,
      // @ts-ignore
      print: (value) => accessibilityTreeSnapshotSerializer.serialize(value),
      diffOptions: () => ({ expand: true }),
    },
  ]);
  ```

  Then in your tests:

  ```js
  const beforeSnap = await getAccessibilityTree(element);

  // ... interact with the DOM

  const afterSnap = await getAccessibilityTree(element);

  expect(snapshotDiff(beforeSnap, afterSnap)).toMatchInlineSnapshot(`
    Snapshot Diff:
    - First value
    + Second value
  
      region "Summary"
        heading "Summary"
          text "Summary"
        list
          listitem
            text "Items:"
    -       text "2"
    +       text "5"
        link "Checkout"
          text "Checkout"
  `);
  ```

  The diff provided by snapshotDiff automatically highlights the differences between the snapshots, to make it clear to the test reader what changed in the page accessibility structure as the interactions happened.

### Patch Changes

- [#412](https://github.com/cloudfour/pleasantest/pull/412) [`33ddf04`](https://github.com/cloudfour/pleasantest/commit/33ddf047aef3dfb43fdd31eedc3da491e50b7df9) Thanks [@calebeby](https://github.com/calebeby)! - Ignore HTML comments in `getAccessibilityTree` output (potentially breaking bugfix)

## 1.6.0

### Minor Changes

- [#353](https://github.com/cloudfour/pleasantest/pull/353) [`19c7cbb`](https://github.com/cloudfour/pleasantest/commit/19c7cbb86e0be198c3c95c613c180356faab9e80) Thanks [@renovate](https://github.com/apps/renovate)! - Update puppeteer to 13.1.2

### Patch Changes

- [#391](https://github.com/cloudfour/pleasantest/pull/391) [`55a7d42`](https://github.com/cloudfour/pleasantest/commit/55a7d4205f756625bf5764ec4dd0a4287194b48c) Thanks [@renovate](https://github.com/apps/renovate)! - Update `dom-accessibility-api` to 0.5.11

  `<input type="number" />` now maps to role `spinbutton` (was `textbox` before).

  This is technically a breaking change for users which depended on the incorrect behavior of `getAccessibilityTree` with `input[type="number"]` previously mapping to `textbox`.

## 1.5.0

### Minor Changes

- [#369](https://github.com/cloudfour/pleasantest/pull/369) [`c0a8a0a`](https://github.com/cloudfour/pleasantest/commit/c0a8a0ae008507b36a664dc8a1d009507021c146) Thanks [@calebeby](https://github.com/calebeby)! - Add `waitFor` feature

* [#344](https://github.com/cloudfour/pleasantest/pull/344) [`d7bbae3`](https://github.com/cloudfour/pleasantest/commit/d7bbae367e9d5fb8c7756ec337568c18e34faf3f) Thanks [@calebeby](https://github.com/calebeby)! - Allow passing `page` instead of an `ElementHandle` to `getAccessibilityTree`.

  If `page` is passed, the accessibility tree will be of the root `html` element.

- [#363](https://github.com/cloudfour/pleasantest/pull/363) [`4bdfb5b`](https://github.com/cloudfour/pleasantest/commit/4bdfb5b58c4a61567ac7c9367483aab5a261180c) Thanks [@calebeby](https://github.com/calebeby)! - Add support for Node 17

## 1.4.0

### Minor Changes

- [#314](https://github.com/cloudfour/pleasantest/pull/314) [`542f3f9`](https://github.com/cloudfour/pleasantest/commit/542f3f96b62318cc159cdabf135fc3ba33cefc35) Thanks [@calebeby](https://github.com/calebeby)! - Improve printing of HTML elements in error messages

  - Printed HTML now is syntax-highlighted
  - Adjacent whitespace is collapsed in places where the browser would collapse it

* [#265](https://github.com/cloudfour/pleasantest/pull/265) [`2b92fbc`](https://github.com/cloudfour/pleasantest/commit/2b92fbcd1f47f8ab020ff26be276a9da02b9b368) Thanks [@renovate](https://github.com/apps/renovate)! - Update `@testing-library/dom` to [`v8.11.1`](https://github.com/testing-library/dom-testing-library/releases/tag/v8.11.1)

  Read their [release notes](https://github.com/testing-library/dom-testing-library/releases) for all the versions between 8.1.0 and 8.11.1 to see the full changes.

  Notably, we have added the ability for TypeScript users to optionally specify an element type as a type parameter for DTL queries:

  ```ts
  import { withBrowser } from 'pleasantest';

  test(
    'changelog example',
    withBrowser(async ({ screen }) => {
      // ElementHandle<HTMLButtonElement>
      const button = await screen.getByRole<HTMLButtonElement>(/button/);

      // ElementHandle<HTMLButtonElement>[]
      const buttons = await screen.getAllByRole<HTMLButtonElement>(/button/);
    }),
  );
  ```

  The return type is automatically determined based on the specified element type. Since Pleasantest DTL queries return `ElementHandle`s, the return type will be wrapped with `Promise<ElementHandle<...>>`. For queries which return arrays of elements, the singular version of the element type is accepted as the type parameter, and the return type will automatically be wrapped with `Promise<Array<ElementHandle<...>>>`.

- [#297](https://github.com/cloudfour/pleasantest/pull/297) [`97e075c`](https://github.com/cloudfour/pleasantest/commit/97e075c915dedc754abcdb5de0db4e757479e02f) Thanks [@renovate](https://github.com/apps/renovate)! - Update puppeteer to v13.0.0

* [#236](https://github.com/cloudfour/pleasantest/pull/236) [`67a222f`](https://github.com/cloudfour/pleasantest/commit/67a222f62bc96ce2a646f9ed0670a5959f60c7ac) Thanks [@calebeby](https://github.com/calebeby)! - Add accessibility snapshots feature: `getAccessibilityTree`. This feature can be used to ensure that changes to the accessibility structure of your applications are intentional and correct.

- [#327](https://github.com/cloudfour/pleasantest/pull/327) [`dfc9620`](https://github.com/cloudfour/pleasantest/commit/dfc9620712ba12d355d84fe2165722ccf2314176) Thanks [@calebeby](https://github.com/calebeby)! - Add suggestion to error message when transformation plugin is missing for unrecognized file extensions

### Patch Changes

- [#283](https://github.com/cloudfour/pleasantest/pull/283) [`93b3922`](https://github.com/cloudfour/pleasantest/commit/93b39227f87196c01319a4650af34fa8371bfa14) Thanks [@calebeby](https://github.com/calebeby)! - Add logo (thanks @dromo77)

* [#290](https://github.com/cloudfour/pleasantest/pull/290) [`e9808b5`](https://github.com/cloudfour/pleasantest/commit/e9808b59ef6836904897895981dc6a53ce0ab64a) Thanks [@calebeby](https://github.com/calebeby)! - Fix regression in stack frames handling when calling `user.*` and `screen.*` methods.

## 1.3.0

### Minor Changes

- [#234](https://github.com/cloudfour/pleasantest/pull/234) [`bf53e31`](https://github.com/cloudfour/pleasantest/commit/bf53e310b0480eeaf19451c5cde02d19dfb4edd1) Thanks [@gerardo-rodriguez](https://github.com/gerardo-rodriguez)! - Allow functions to be passed to runJS

## 1.2.0

### Minor Changes

- [#216](https://github.com/cloudfour/pleasantest/pull/216) [`0c25d10`](https://github.com/cloudfour/pleasantest/commit/0c25d10f8ee3e9d4bffed307e601d8ecb7f67d31) Thanks [@calebeby](https://github.com/calebeby)! - Improve forgot-await detection

* [#219](https://github.com/cloudfour/pleasantest/pull/219) [`f0ee064`](https://github.com/cloudfour/pleasantest/commit/f0ee0645d9f0fbd2a5edaaaf06d13987d644d6cb) Thanks [@calebeby](https://github.com/calebeby)! - Improve node_modules resolver (now it is able to resolve multiple package versions and it supports pnpm)

- [#205](https://github.com/cloudfour/pleasantest/pull/205) [`6fba724`](https://github.com/cloudfour/pleasantest/commit/6fba724cd23f612e4bf51db0898653826f5b1ad7) Thanks [@renovate](https://github.com/apps/renovate)! - Update Puppeteer to 10.2.0

  Chromium version is now 93

## 1.1.1

### Patch Changes

- [#217](https://github.com/cloudfour/pleasantest/pull/217) [`93058ed`](https://github.com/cloudfour/pleasantest/commit/93058ed1a0ffc8b9aa9f78ac7a9671cbcd58e9a0) Thanks [@calebeby](https://github.com/calebeby)! - Fix regression with loadJS always throwing

## 1.1.0

### Minor Changes

- [#199](https://github.com/cloudfour/pleasantest/pull/199) [`8e26bea`](https://github.com/cloudfour/pleasantest/commit/8e26bea8bcbc49a794c623472f9905d53d3c5872) Thanks [@calebeby](https://github.com/calebeby)! - Make loadJS share error mapping logic with runJS

* [#190](https://github.com/cloudfour/pleasantest/pull/190) [`9fb149d`](https://github.com/cloudfour/pleasantest/commit/9fb149dae6f5b83c16a2b3047d71fdbd1d0d54c7) Thanks [@calebeby](https://github.com/calebeby)! - Improve error message output for resolution errors and syntax errors/transform errors

### Patch Changes

- [#197](https://github.com/cloudfour/pleasantest/pull/197) [`537fbef`](https://github.com/cloudfour/pleasantest/commit/537fbefebd3e60fd92d4610f879e3e12f2617ae3) Thanks [@calebeby](https://github.com/calebeby)! - Fix column offsets when esbuild is disabled

## 1.0.0

### Major Changes

- [#186](https://github.com/cloudfour/pleasantest/pull/186) [`33691ba`](https://github.com/cloudfour/pleasantest/commit/33691bafe4a147290a72467cabcdfc26bef1e38d) Thanks [@calebeby](https://github.com/calebeby)! - Release 1.0

  There are no breaking changes, we are just bumping the version to 1.0, so from now going forwards, we'll be following post-1.0 semver.

### Patch Changes

- [#184](https://github.com/cloudfour/pleasantest/pull/184) [`e02417e`](https://github.com/cloudfour/pleasantest/commit/e02417e3f0d21b8f060f218150fd8f092090f372) Thanks [@calebeby](https://github.com/calebeby)! - Remove unused dependency

## 0.8.0

### Minor Changes

- [#163](https://github.com/cloudfour/pleasantest/pull/163) [`248376d`](https://github.com/cloudfour/pleasantest/commit/248376d6ed0b5290191659590d5da4ad5ca897f5) Thanks [@calebeby](https://github.com/calebeby)! - Make module server configurable

### Patch Changes

- [#159](https://github.com/cloudfour/pleasantest/pull/159) [`a999340`](https://github.com/cloudfour/pleasantest/commit/a9993400847dd9e6dcf35a83c3156c020093401d) Thanks [@calebeby](https://github.com/calebeby)! - Improve node_modules and relative paths resolution

## 0.7.0

### Minor Changes

- [#146](https://github.com/cloudfour/pleasantest/pull/146) [`8619f64`](https://github.com/cloudfour/pleasantest/commit/8619f64b2b7f2aea145450b491f086eb7aa14ddc) Thanks [@calebeby](https://github.com/calebeby)! - Allow throwing things other than errors within withBrowser

* [#104](https://github.com/cloudfour/pleasantest/pull/104) [`69fd00b`](https://github.com/cloudfour/pleasantest/commit/69fd00b285e9a1ed4cf21cdf5cfefd29a642cd5b) Thanks [@renovate](https://github.com/apps/renovate)! - Remove toHaveDescription, toBeInTheDOM, and toBeEmpty (they are deprecated by jest-dom)

- [#104](https://github.com/cloudfour/pleasantest/pull/104) [`69fd00b`](https://github.com/cloudfour/pleasantest/commit/69fd00b285e9a1ed4cf21cdf5cfefd29a642cd5b) Thanks [@renovate](https://github.com/apps/renovate)! - Add toHaveAccessibleDescription and toHaveAccessibleName from jest-dom matchers

* [#137](https://github.com/cloudfour/pleasantest/pull/137) [`707f97b`](https://github.com/cloudfour/pleasantest/commit/707f97bc8acc6b67bf2c438c3946c44c817820cd) Thanks [@renovate](https://github.com/apps/renovate)! - Update puppeteer to [`10.1.0`](https://github.com/puppeteer/puppeteer/blob/main/CHANGELOG.md#1010-2021-06-29)

## 0.6.2

### Patch Changes

- [#139](https://github.com/cloudfour/pleasantest/pull/139) [`1d5f16c`](https://github.com/cloudfour/pleasantest/commit/1d5f16cfd9bc0ef73528117d4a80f541d3ce9f30) Thanks [@calebeby](https://github.com/calebeby)! - Improve error message when Promise is passed into jest-dom matcher

* [#143](https://github.com/cloudfour/pleasantest/pull/143) [`0ba7584`](https://github.com/cloudfour/pleasantest/commit/0ba7584cace9f5cf8126e07ee66b923f4ca2d5ad) Thanks [@calebeby](https://github.com/calebeby)! - Improve CJS interop with packages that can't be statically analyzed

- [#141](https://github.com/cloudfour/pleasantest/pull/141) [`a9ef60c`](https://github.com/cloudfour/pleasantest/commit/a9ef60c7379a0ce5006f5ea779a9d2853f373d1d) Thanks [@calebeby](https://github.com/calebeby)! - Refactor and improve browser stack trace printing

* [#142](https://github.com/cloudfour/pleasantest/pull/142) [`2da5f1c`](https://github.com/cloudfour/pleasantest/commit/2da5f1cab7dff9384954b80f8a783835d605232a) Thanks [@calebeby](https://github.com/calebeby)! - Fix bug where css files in node_modules were pre-bundled

- [#143](https://github.com/cloudfour/pleasantest/pull/143) [`0ba7584`](https://github.com/cloudfour/pleasantest/commit/0ba7584cace9f5cf8126e07ee66b923f4ca2d5ad) Thanks [@calebeby](https://github.com/calebeby)! - Allow resolving subfolders with package.json files

## 0.6.1

### Patch Changes

- [#128](https://github.com/cloudfour/pleasantest/pull/128) [`c074d3d`](https://github.com/cloudfour/pleasantest/commit/c074d3d96d253cb2379211b98f495ade9f1bd0c3) Thanks [@calebeby](https://github.com/calebeby)! - Enable JSX parsing/transpilation for .js, .mjs, .cjs files (not just .jsx)

## 0.6.0

### Minor Changes

- [#115](https://github.com/cloudfour/pleasantest/pull/115) [`b4eb08d`](https://github.com/cloudfour/pleasantest/commit/b4eb08d5659e0f869cb5dddb4fcd49aa6ada0286) Thanks [@calebeby](https://github.com/calebeby)! - Replace vite-based module server with wmr-based custom module server
  (This is probably a breaking change - minor bump is only because pre-1.0)

* [#126](https://github.com/cloudfour/pleasantest/pull/126) [`e06e6bc`](https://github.com/cloudfour/pleasantest/commit/e06e6bc683cf3052ce2c4321694decb5d769bd98) Thanks [@calebeby](https://github.com/calebeby)! - Improve error message display for errors coming from browsers

- [#116](https://github.com/cloudfour/pleasantest/pull/116) [`5afa0a6`](https://github.com/cloudfour/pleasantest/commit/5afa0a6a0d45b22c6cfa719453b2676f3bea6872) Thanks [@calebeby](https://github.com/calebeby)! - Add support for static files and css requested directly

* [#106](https://github.com/cloudfour/pleasantest/pull/106) [`994b810`](https://github.com/cloudfour/pleasantest/commit/994b810e5eb4ed7cb57be6d2bf5b044d42a7b75c) Thanks [@calebeby](https://github.com/calebeby)! - Cache browser instances locally instead of globally

### Patch Changes

- [#122](https://github.com/cloudfour/pleasantest/pull/122) [`f2632ce`](https://github.com/cloudfour/pleasantest/commit/f2632ce237e4ce84177d6df4375c002105e12f54) Thanks [@renovate](https://github.com/apps/renovate)! - Update `@testing-library/dom` to [`v8.0.0`](https://github.com/testing-library/dom-testing-library/releases/tag/v8.0.0)

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
