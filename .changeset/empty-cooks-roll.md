---
'pleasantest': patch
---

[bugfix] Don't override `<head>` when using `utils.injectHTML`

This was a bug introduced in `3.0.0`. This change fixes that behavior to match what is documented. The documented behavior is that `injectHTML` replaces the content of the body _only_. The behavior introduced in `3.0.0` also resets the `<head>` to the default; that was unintended behavior that is now removed.
