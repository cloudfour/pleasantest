---
'test-mule': minor
---

Add ability to pass variables to the browser in runJS:

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
