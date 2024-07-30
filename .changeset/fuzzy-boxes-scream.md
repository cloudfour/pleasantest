---
'pleasantest': major
---

Update jest-dom matchers. We are now using `@testing-library/jest-dom@6`.
We now support all of the jest-dom matchers, except for the deprecated ones.

- `toHaveErrorMessage` was deprecated, use `toHaveAccessibleErrorMessage` instead
- `toHaveRole` was added