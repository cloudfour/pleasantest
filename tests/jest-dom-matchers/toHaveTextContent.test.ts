import { withBrowser } from 'test-mule';

test(
  'toHaveTextContent',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      `<span data-testid="text-content">Text Content</span>`,
    );

    const element = await screen.getByTestId('text-content');

    await expect(element).toHaveTextContent('Content');
    await expect(element).toHaveTextContent(/^Text Content$/);

    await expect(expect(element).toHaveTextContent(/^nope$/i)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveTextContent()[22m

            Expected element to have text content:
            [32m  /^nope$/i[39m
            Received:
            [31m  Text Content[39m"
          `);

    await expect(element).toHaveTextContent(/content$/i);
    await expect(element).not.toHaveTextContent('content');
    await expect(expect(element).toHaveTextContent('content')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveTextContent()[22m

            Expected element to have text content:
            [32m  content[39m
            Received:
            [31m  Text Content[39m"
          `);
  }),
);
