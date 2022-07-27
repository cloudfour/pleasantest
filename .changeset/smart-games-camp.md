---
'pleasantest': major
---

The way that `runJS` receives parameters in the browser has changed. Now, parameters are available as `import.meta.pleasantestArgs` instead of through an automatically-called default export.

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
