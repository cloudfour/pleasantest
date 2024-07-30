import { withBrowser } from 'pleasantest';

test(
  'toHaveRole',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <button data-testid="button">Continue</button>
      <div role="button" data-testid="button-explicit">Continue</button>
      <button role="switch button" data-testid="button-explicit-multiple">Continue</button>
      <a href="/about" data-testid="link">About</a>
      <a data-testid="link-invalid">Invalid link<a/>
    `);
    await expect(await screen.getByTestId('button')).toHaveRole('button');
    await expect(await screen.getByTestId('button-explicit')).toHaveRole(
      'button',
    );
    await expect(
      await screen.getByTestId('button-explicit-multiple'),
    ).toHaveRole('button');
    await expect(
      await screen.getByTestId('button-explicit-multiple'),
    ).toHaveRole('switch');
    await expect(await screen.getByTestId('link')).toHaveRole('link');
    await expect(await screen.getByTestId('link-invalid')).not.toHaveRole(
      'link',
    );
    await expect(await screen.getByTestId('link-invalid')).toHaveRole(
      'generic',
    );
    await expect(expect(await screen.getByTestId('link')).toHaveRole('button'))
      .rejects.toThrowErrorMatchingInlineSnapshot(`
        "[2mexpect([22m[31melement[39m[2m).toHaveRole()[22m

        Expected element to have role:
        [32m  button[39m
        Received:
        [31m  link[39m"
      `);
    await expect(
      expect(await screen.getByTestId('link')).not.toHaveRole('link'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).not.toHaveRole()[22m

      Expected element not to have role:
      [32m  link[39m
      Received:
      [31m  link[39m"
    `);
  }),
);
