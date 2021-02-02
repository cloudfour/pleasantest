import { withBrowser } from 'test-mule';

test(
  'toHaveDescription',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <button aria-label="Close" aria-describedby="description-close">
        X
      </button>
      <div id="description-close">
        Closing will discard any changes
      </div>

      <button>Delete</button>
    `);

    const closeButton = await screen.getByRole('button', { name: 'Close' });

    await expect(closeButton).toHaveDescription(
      'Closing will discard any changes',
    );
    await expect(closeButton).toHaveDescription(/will discard/);
    await expect(
      expect(closeButton).toHaveDescription(
        expect.stringContaining('will discard'),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Test Mule does not support using asymmetric matchers in browser-based matchers

            Received [31mStringContaining \\"will discard\\"[39m"
          `);
    await expect(closeButton).toHaveDescription(/^closing/i);
    await expect(closeButton).not.toHaveDescription('Other description');
    await expect(expect(closeButton).toHaveDescription('Other description'))
      .rejects.toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveDescription()[22m

            Expected the element to have description:
            [32m  [32m\\"Other description\\"[39m[32m[39m
            Received:
            [31m  [31m\\"Closing will discard any changes\\"[39m[31m[39m"
          `);
    await expect(expect(closeButton).not.toHaveDescription()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).not.toHaveDescription()[22m

            Expected the element not to have description:
            [32m  [32mnull[39m[32m[39m
            Received:
            [31m  [31m\\"Closing will discard any changes\\"[39m[31m[39m"
          `);

    const deleteButton = await screen.getByRole('button', { name: 'Delete' });
    await expect(deleteButton).not.toHaveDescription();
    await expect(deleteButton).toHaveDescription('');
  }),
);
