---
'pleasantest': major
---

Normalize whitespace in `getAccessibilityTree`

Now anytime there is contiguous whitespace in text strings it is collapsed into a single space. This matches the behavior of browser accessibility trees.

This is a breaking change because it changes the `getAccessibilityTree` output, and may break your snapshots. Update your snapshots with Jest and review the changes.
