---
'pleasantest': major
---

Added `aria-expanded` support to `getAccessibilityTree` and fix handling for `<details>`/`<summary>`

Now, elements which have the `aria-expanded` attribute will represent the state of that attribute in accessibility tree snapshots. `<details>`/`<summary>` elements will represent their expanded state in the tree as well.

Also, for collapsed `<details>`/`<summary>` elements, the hidden content is now hidden in the accessibility tree, to match screen reader behavior.
