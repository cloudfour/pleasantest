import { withBrowser } from 'pleasantest';

test(
  'toContainHTML',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      '<span data-testid="parent"><span data-testid="child"></span></span>',
    );

    const parent = await screen.getByTestId('parent');

    await expect(parent).toContainHTML('<span data-testid="child"></span>');
    await expect(parent).not.toContainHTML('nope');

    await expect(expect(parent).toContainHTML('nope')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toContainHTML()[22m
            Expected:
              [32mnope[39m
            Received:
              [31m<span data-testid=\\"parent\\">
              <span data-testid=\\"child\\" />
            </span>[39m"
          `);

    await expect(
      expect(parent).not.toContainHTML('<span data-testid="child"></span>'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).not.toContainHTML()[22m
            Expected:
              [32m<span data-testid=\\"child\\"></span>[39m
            Received:
              [31m<span data-testid=\\"parent\\">
              <span data-testid=\\"child\\" />
            </span>[39m"
          `);
  }),
);
