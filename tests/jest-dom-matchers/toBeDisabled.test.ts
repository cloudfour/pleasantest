import { withBrowser } from 'pleasantest';

test(
  'toBeDisabled',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <button disabled>Dont Click</button>
    <button>Do Click</button>
  `);
    const button1 = await screen.getByText('Dont Click');
    const button2 = await screen.getByText('Do Click');
    await expect(button1).toBeDisabled();
    // Testing that the inverse throws a useful error message
    await expect(expect(button2).toBeDisabled()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toBeDisabled()[22m

            Received element is not disabled:
              [31m<button>Do Click</button>[39m"
          `);
  }),
);
