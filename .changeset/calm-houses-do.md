---
'pleasantest': minor
---

Update `@testing-library/dom` to [`v8.11.1`](https://github.com/testing-library/dom-testing-library/releases/tag/v8.11.1)

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
