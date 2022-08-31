import { withBrowser } from 'pleasantest';

test(
  'toHaveStyle',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      `<button
        data-testid="delete-button"
        style="display: none; background-color: red"
      >
        Delete item
      </button>`,
    );

    const button = await screen.getByTestId('delete-button');

    await expect(
      expect(button).toHaveStyle('display: none' as any),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"pleasantest only supports specifying expected styles as objects, received "display: none""`,
    );
    await expect(button).toHaveStyle({ display: 'none' });
    await expect(expect(button).toHaveStyle({ display: 'invalid' })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveStyle()[22m

            [32m- Expected[39m
            [31m+ Received[39m

            [32m- display: block;[39m
            [31m+ display: none;[39m"
          `);
    await expect(button).toHaveStyle({
      backgroundColor: 'red',
      display: 'none',
    });
    await expect(button).not.toHaveStyle({
      backgroundColor: 'blue',
      display: 'none',
    });
    await expect(
      expect(button).toHaveStyle({
        backgroundColor: 'blue',
        display: 'none',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveStyle()[22m

            [32m- Expected[39m
            [31m+ Received[39m

            [32m- backgroundColor: rgb(0, 0, 255);[39m
            [31m+ backgroundColor: rgb(255, 0, 0);[39m
            [2m  display: none;[22m"
          `);
  }),
);
