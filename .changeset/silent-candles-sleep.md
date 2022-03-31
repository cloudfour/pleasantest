---
'pleasantest': major
---

Add heading levels to `getAccessibilityTree`. The heading levels are computed from the corresponding element number in `<h1>` - `<h6>`, or from the `aria-level` role.

In the accessibility tree snapshot, it looks like this:

```
heading "Name of Heading" (level=2)
```

This is a breaking change because it will cause existing accessibility tree snapshots to fail which contain headings. Update the snapshots to make them pass again.
