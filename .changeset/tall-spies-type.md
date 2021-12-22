---
'pleasantest': minor
---

Add `screen.container` property

This is an easy way to get a reference to document.body:

```js
const body = await screen.container;
```

Anytime you access the container property, it will be an up-to-date reference to the latest `body`.

This can also be used on queries bound to elements other than `screen`, to retrieve the container the queries were bound to:

```js
const elQueries = within(el);
const container = await elQueries.container;
```

In this example, `container` and `el` are both `ElementHandle`s that point to the same element.
