---
'pleasantest': major
---

Values exported from `runJS` are now available in Node.

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
