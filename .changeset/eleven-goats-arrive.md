---
'pleasantest': patch
---

Update `dom-accessibility-api` to 0.5.11

`<input type="number" />` now maps to role `spinbutton` (was `textbox` before).

This is technically a breaking change for users which depended on the incorrect behavior of `getAccessibilityTree` with `input[type="number"]` previously mapping to `textbox`.
