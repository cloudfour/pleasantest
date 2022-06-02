import { withBrowser } from 'pleasantest';

test(
  'Fails as expected and passes as expected',
  withBrowser(async ({ utils, page }) => {
    await utils.injectHTML(`
      <img />
    `);
    await expect(expect(page).toPassAxeTests()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        "[2mexpect([22m[31mpage[39m[2m).toPassAxeTests()[22m
        Expected page to pass Axe accessibility tests.
        Violations found:

        [31m[1mImages must have alternate text[22m[39m (image-alt)
        https://dequeuniversity.com/rules/axe/4.4/image-alt?application=axe-puppeteer
        Affected Nodes:

        <img />
        Fix any of the following:
          • Element does not have an alt attribute
          • aria-label attribute does not exist or is empty
          • aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
          • Element has no title attribute
          • Element's default semantics were not overridden with role=\\"none\\" or role=\\"presentation\\"

        [31m[1mDocument should have one main landmark[22m[39m (landmark-one-main)
        https://dequeuniversity.com/rules/axe/4.4/landmark-one-main?application=axe-puppeteer
        Affected Nodes:

        <html lang=\\"en\\">
          <head>[...]</head>
          <body>
            <img />
          </body>
        </html>
        Fix the following:
          • Document does not have a main landmark.

        [31m[1mPage should contain a level-one heading[22m[39m (page-has-heading-one)
        https://dequeuniversity.com/rules/axe/4.4/page-has-heading-one?application=axe-puppeteer
        Affected Nodes:

        <html lang=\\"en\\">
          <head>[...]</head>
          <body>
            <img />
          </body>
        </html>
        Fix the following:
          • Page must have a level-one heading.

        [31m[1mAll page content should be contained by landmarks[22m[39m (region)
        https://dequeuniversity.com/rules/axe/4.4/region?application=axe-puppeteer
        Affected Nodes:

        <img />
        Fix the following:
          • Some page content is not contained by landmarks
        "
      `);
    await expect(page).not.toPassAxeTests();
    await expect(page).toPassAxeTests({
      disabledRules: [
        'image-alt',
        'landmark-one-main',
        'page-has-heading-one',
        'region',
      ],
    });
    await utils.injectHTML(`
      <main>
        <h1>An example page</h1>
        <img alt="example image alt text"/>
      </main>
    `);
    await expect(page).toPassAxeTests();
    await expect(expect(page).not.toPassAxeTests()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
        "[2mexpect([22m[31mpage[39m[2m).not.toPassAxeTests()[22m

        Expected page to contain accessibility check violations.
        No violations found."
    `);
  }),
);
