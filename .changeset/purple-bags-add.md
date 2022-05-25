---
'pleasantest': minor
---

Update dependency `@testing-library/dom` to `v8.13.0`.

This adds support to filtering `ByRole` queries by description:

```ts
// Select by accessible role and description
await screen.getByRole('button', {
  description: /^items in the trash will be/i,
});
```
