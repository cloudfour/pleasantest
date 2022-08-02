import { withBrowser } from 'pleasantest';

test(
  'injectHTML',
  withBrowser(async ({ utils, page }) => {
    const getHTML = () => page.evaluate(() => document.body.innerHTML.trim());

    await utils.injectHTML('<div>Hi</div>');
    expect(await getHTML()).toEqual('<div>Hi</div>');

    // It should fully override existing content
    await utils.injectHTML('<div>Hiya</div>');
    expect(await getHTML()).toEqual('<div>Hiya</div>');

    // Executes scripts by default
    await utils.injectHTML(`
      <div>hello</div>
      <script>document.querySelector('div').textContent = 'changed'</script>
    `);
    expect(await getHTML()).toMatchInlineSnapshot(`
      "<div>changed</div>
            <script>document.querySelector('div').textContent = 'changed'</script>"
    `);

    // Can pass option to not execute
    await utils.injectHTML(
      `
      <div>hello</div>
      <script>document.querySelector('div').textContent = 'changed'</script>
    `,
      { executeScriptTags: false },
    );
    expect(await getHTML()).toMatchInlineSnapshot(`
      "<div>hello</div>
            <script>document.querySelector('div').textContent = 'changed'</script>"
    `);
  }),
);
