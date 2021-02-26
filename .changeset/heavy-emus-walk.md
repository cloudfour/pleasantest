---
'test-mule': minor
---

Provide a helpful message if the user forgets to use `await`,

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
