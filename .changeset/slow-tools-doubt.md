---
'pleasantest': major
---

**`injectHTML` now executes script tags in the injected markup by default**. This can be disabled by passing the `executeScriptTags: false` option as the second parameter.

For example, the script tag is now executed by default:

```js
await utils.injectHTML(
  "<script>document.querySelector('div').textContent = 'changed'</script>",
);
```

But by passing `executeScriptTags: false`, we can disable execution:

```js
await utils.injectHTML(
  "<script>document.querySelector('div').textContent = 'changed'</script>",
  { executeScriptTags: false },
);
```
