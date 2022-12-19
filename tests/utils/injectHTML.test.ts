import { withBrowser } from 'pleasantest';

test(
  'injectHTML',
  withBrowser(async ({ utils, page }) => {
    const getHTML = () =>
      page.evaluate(() => document.documentElement.innerHTML.trim());

    await utils.injectHTML('<div>Hi</div>');
    expect(await getHTML()).toMatchInlineSnapshot(`
      "<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="data:;base64,=">
          <title>pleasantest</title>
        </head>
        <body><div>Hi</div></body>"
    `);

    // It should fully override existing content
    await utils.injectHTML('<div>Hiya</div>');
    expect(await getHTML()).toMatchInlineSnapshot(`
      "<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="data:;base64,=">
          <title>pleasantest</title>
        </head>
        <body><div>Hiya</div></body>"
    `);

    // Executes scripts by default
    await utils.injectHTML(`
      <div>hello</div>
      <script>document.querySelector('div').textContent = 'changed'</script>
    `);
    expect(await getHTML()).toMatchInlineSnapshot(`
      "<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="data:;base64,=">
          <title>pleasantest</title>
        </head>
        <body>
            <div>changed</div>
            <script>document.querySelector('div').textContent = 'changed'</script>
          </body>"
    `);

    // Can pass option to not execute
    await utils.injectHTML(
      `
      <div>hello</div>
      <script foo="bar" asdf>document.querySelector('div').textContent = 'changed'</script>
    `,
      { executeScriptTags: false },
    );
    expect(await getHTML()).toMatchInlineSnapshot(`
      "<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="data:;base64,=">
          <title>pleasantest</title>
        </head>
        <body>
            <div>hello</div>
            <script foo="bar" asdf="">document.querySelector('div').textContent = 'changed'</script>
          </body>"
    `);

    // Stuff in <head> should be left as-is and not re-executed after injectHTML is called again below
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.text =
        'document.body.querySelector("div").innerHTML = "changed from script in head"';
      document.head.append(script);
    });

    expect(await getHTML()).toMatchInlineSnapshot(`
      "<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="data:;base64,=">
          <title>pleasantest</title>
        <script>document.body.querySelector("div").innerHTML = "changed from script in head"</script></head>
        <body>
            <div>changed from script in head</div>
            <script foo="bar" asdf="">document.querySelector('div').textContent = 'changed'</script>
          </body>"
    `);

    await utils.injectHTML(
      `
      <div>injected HTML</div>
    `,
    );

    expect(await getHTML()).toMatchInlineSnapshot(`
      "<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="icon" href="data:;base64,=">
          <title>pleasantest</title>
        <script>document.body.querySelector("div").innerHTML = "changed from script in head"</script></head>
        <body>
            <div>injected HTML</div>
          </body>"
    `);
  }),
);
