import { withBrowser } from 'pleasantest';

test(
  'toBeVisible',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`<div>hello</div>`);
    const div = await screen.getByText(/hello/);
    await expect(div).toBeVisible();

    // Testing that the inverse throws a useful error message with the element correctly serialized
    await expect(expect(div).not.toBeVisible()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).not.toBeVisible()[22m

            Received element is visible:
              [31m<div>hello</div>[39m"
          `);

    await utils.injectCSS(`div { opacity: 0 }`);
    await expect(div).not.toBeVisible();
    // Testing that the inverse throws a useful error message
    await expect(expect(div).toBeVisible()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toBeVisible()[22m

            Received element is not visible:
              [31m<div>hello</div>[39m"
          `);
  }),
);
