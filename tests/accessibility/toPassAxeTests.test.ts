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
        • Element's default semantics were not overridden with role="none" or role="presentation"

      [31m[1mDocument should have one main landmark[22m[39m (landmark-one-main)
      https://dequeuniversity.com/rules/axe/4.4/landmark-one-main?application=axe-puppeteer
      Affected Nodes:

      <html lang="en">
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

      <html lang="en">
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

    await utils.injectHTML(`
      <svg viewBox="0 0 24 24" width="24" height="24" class="Icon Icon--large" role="img"><path d="M21.79,1H2.21A1.21,1.21,0,0,0,1,2.21V21.79A1.21,1.21,0,0,0,2.21,23H12.75V14.48H9.88V11.16h2.87V8.71A4,4,0,0,1,17,4.32a23.52,23.52,0,0,1,2.56.13v3H17.83A1.38,1.38,0,0,0,16.18,9v2.12h3.29L19,14.48H16.18V23h5.61A1.21,1.21,0,0,0,23,21.79V2.21A1.21,1.21,0,0,0,21.79,1Z"></path></svg>
    `);
    // Axe-core shortens the returned HTML snippet for long elements
    // This test makes sure that we are still able to find the real HTML in the DOM and use our custom formatting for the HTML
    await expect(expect(page).toPassAxeTests()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31mpage[39m[2m).toPassAxeTests()[22m
      Expected page to pass Axe accessibility tests.
      Violations found:

      [31m[1mDocument should have one main landmark[22m[39m (landmark-one-main)
      https://dequeuniversity.com/rules/axe/4.4/landmark-one-main?application=axe-puppeteer
      Affected Nodes:

      <html lang="en">
        <head>[...]</head>
        <body>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            class="Icon Icon--large"
            role="img"
          >
            <path d="M21.79,1H2.21A1.21,1.21,0,0,0,[...]" />
          </svg>
        </body>
      </html>
      Fix the following:
        • Document does not have a main landmark.

      [31m[1mPage should contain a level-one heading[22m[39m (page-has-heading-one)
      https://dequeuniversity.com/rules/axe/4.4/page-has-heading-one?application=axe-puppeteer
      Affected Nodes:

      <html lang="en">
        <head>[...]</head>
        <body>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            class="Icon Icon--large"
            role="img"
          >
            <path d="M21.79,1H2.21A1.21,1.21,0,0,0,[...]" />
          </svg>
        </body>
      </html>
      Fix the following:
        • Page must have a level-one heading.

      [31m[1m<svg> elements with an img role must have an alternative text[22m[39m (svg-img-alt)
      https://dequeuniversity.com/rules/axe/4.4/svg-img-alt?application=axe-puppeteer
      Affected Nodes:

      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        class="Icon Icon--large"
        role="img"
      >
        <path d="M21.79,1H2.21A1.21,1.21,0,0,0,[...]" />
      </svg>
      Fix any of the following:
        • Element has no child that is a title
        • aria-label attribute does not exist or is empty
        • aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
        • Element has no title attribute
      "
    `);
  }),
);
