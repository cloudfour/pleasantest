# Error: Cannot click element that is too small

## Background/Intent

This error is intended to encourage developers and designers to use target sizes that are large enough for users to easily click.

An element's **target size** is the size of the clickable/tappable region that activates the element. Having a large-enough target size ensures that users can easily click/tap elements, especially in cases where low-input-precision devices (like touchscreens) are used, and for users who may have difficulty aiming cursors due to fine motor movement challenges.

The [W3C's guidance on target size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) is that developers should use target sizes that are at least 44px × 44px.

## Implementation

Pleasantest implements the target size check as a part of [actionability checks](../../README.md#actionability). Target size is checked when `user.click()` is called.

Inline elements are not checked, based on the reasoning used [by the W3C](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html#intent).

Elements must be at least 44px × 44px in order to pass the check (or whatever the configured target size is).

### Configuring the minimum target size

Setting the `targetSize` option changes the minimum width/height (in px) used to check elements when `user.click` is called. The `targetSize` option can be passed in several places to control the scope of the change:

**On an individual call**:

```ts
await user.click(button, { targetSize: 30 /* px */ });
```

**For a single test**:

```ts
test(
  'test name',
  withBrowser(
    {
      user: {
        targetSize: 30 /* px */,
      },
    },
    async ({ user }) => {
      await user.click(something);
    },
  ),
);
```

**For a test file**:

```ts
import { configureDefaults } from 'pleasantest';

configureDefaults({
  user: { targetSize: 50 /* px */ },
});
```

**For all test files**

[Configure Jest to run a setup file before all tests](https://jestjs.io/docs/configuration#setupfilesafterenv-array) (usually called `jest.setup.ts` or `jest.setup.js`) and add the same `configureDefaults` call there, so it is applied to all tests.

## Making the error go away

### Approach 1: Increasing the target size

Much of the time, increasing the target size is the correct solution to the problem. By doing this, you are making your site more accessible to users. Usually, increasing `padding` or setting a `min-width`/`min-height` is the easiest way to ensure an element is large enough.

### Approach 2: Disabling the check

Pleasantest's target size check can be disabled per-call, per-file, or globally.

**On an individual call**:

```ts
await user.click(button, { targetSize: false });
```

**For a single test**:

```ts
test(
  'test name',
  withBrowser(
    {
      user: {
        targetSize: false,
      },
    },
    async ({ user }) => {
      await user.click(something);
    },
  ),
);
```

**For a test file**:

```ts
import { configureDefaults } from 'pleasantest';

configureDefaults({
  user: { targetSize: false },
});
```

**For all test files**

[Configure Jest to run a setup file before all tests](https://jestjs.io/docs/configuration#setupfilesafterenv-array) (usually called `jest.setup.ts` or `jest.setup.js`) and add the same `configureDefaults` call there, so it is applied to all tests.
