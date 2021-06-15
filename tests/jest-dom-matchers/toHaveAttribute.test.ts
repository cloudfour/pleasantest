import { withBrowser } from 'pleasantest';

test(
  'toHaveAttribute',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      '<button data-testid="ok-button" type="submit" disabled>ok</button>',
    );

    const button = await screen.getByTestId('ok-button');

    await expect(button).toHaveAttribute('disabled');
    await expect(button).not.toHaveAttribute('not');
    await expect(expect(button).toHaveAttribute('not')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveAttribute([22m[32m[32m\\"not\\"[39m[32m[39m[2m) // element.hasAttribute(\\"not\\")[22m

            Expected the element to have attribute:
            [32m  not[39m
            Received:
            [31m  null[39m"
          `);
    await expect(button).toHaveAttribute('type', 'submit');
    await expect(button).not.toHaveAttribute('type', 'button');
    await expect(expect(button).toHaveAttribute('type', 'button')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveAttribute([22m[32m[32m\\"type\\"[39m[32m[39m[2m, [22m[32m[32m\\"button\\"[39m[32m[39m[2m) // element.getAttribute(\\"type\\") === \\"button\\"[22m

            Expected the element to have attribute:
            [32m  type=\\"button\\"[39m
            Received:
            [31m  type=\\"submit\\"[39m"
          `);

    // The next two cases are asymmetric matchers, which jest-dom supports but we do not support (yet)
    await expect(
      expect(button).toHaveAttribute('type', expect.stringContaining('sub')),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Pleasantest does not support using asymmetric matchers in browser-based matchers

            Received [31mStringContaining \\"sub\\"[39m"
          `);

    await expect(
      expect(button).toHaveAttribute(
        'type',
        expect.not.stringContaining('but'),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Pleasantest does not support using asymmetric matchers in browser-based matchers

            Received [31mStringNotContaining \\"but\\"[39m"
          `);
  }),
);
