---
'pleasantest': minor
---

Expose `accessibilityTreeSnapshotSerializer`. This is the snapshot serializer that Pleasantest configures Jest to use to format accessibility tree snapshots. It was enabled by default in previous versions, and it still is, just now it is also exposed as an export so you can pass the snapshot serializer to other tools, like [`snapshot-diff`](https://github.com/jest-community/snapshot-diff).

Here's an example of using this:

This part you'd put in your test setup file (configured in Jest's `setupFilesAfterEnv`):

```js
import snapshotDiff from 'snapshot-diff';

expect.addSnapshotSerializer(snapshotDiff.getSnapshotDiffSerializer());
snapshotDiff.setSerializers([
  {
    test: accessibilityTreeSnapshotSerializer.test,
    // @ts-ignore
    print: (value) => accessibilityTreeSnapshotSerializer.serialize(value),
    diffOptions: () => ({ expand: true }),
  },
]);
```

Then in your tests:

```js
const beforeSnap = await getAccessibilityTree(element);

// ... interact with the DOM

const afterSnap = await getAccessibilityTree(element);

expect(snapshotDiff(beforeSnap, afterSnap)).toMatchInlineSnapshot(`
  Snapshot Diff:
  - First value
  + Second value

    region "Summary"
      heading "Summary"
        text "Summary"
      list
        listitem
          text "Items:"
  -       text "2"
  +       text "5"
      link "Checkout"
        text "Checkout"
`);
```

The diff provided by snapshotDiff automatically highlights the differences between the snapshots, to make it clear to the test reader what changed in the page accessibility structure as the interactions happened.
