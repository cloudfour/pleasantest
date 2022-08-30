---
'pleasantest': major
---

**Normalize whitespace in element accessible names in `getAccessibilityTree`**. Markup with elements which have an accessible name that includes irregular whitespace, like non-breaking spaces, will now have a different output for `getAccessibilityTree` snapshots. Previously, the whitespace was included, now, whitespace is replaced with a single space.
