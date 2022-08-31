import { withBrowser } from 'pleasantest';

test(
  'toContainElement',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      '<span data-testid="ancestor"><span data-testid="descendant"></span></span>',
    );
    const ancestor = await screen.getByTestId('ancestor');
    const descendant = await screen.getByTestId('descendant');

    await expect(ancestor).toContainElement(descendant);
    await expect(descendant).not.toContainElement(ancestor);

    // Should pass with null
    await expect(ancestor).not.toContainElement(null);
    // Should fail with non-element value
    await expect(expect(ancestor).not.toContainElement(5 as any)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31mreceived[39m[2m).not.toContainElement()[22m

            [31mreceived[39m value must be an HTMLElement or an SVGElement.
            "
          `);

    await expect(expect(ancestor).not.toContainElement(descendant)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).not.toContainElement([22m[32melement[39m[2m)[22m

      [31m<span data-testid="ancestor">
        <span data-testid="descendant" />
      </span> contains: <span data-testid="descendant" />[39m
      [31m        [39m"
    `);

    await expect(expect(descendant).toContainElement(ancestor)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toContainElement([22m[32melement[39m[2m)[22m

      [31m<span data-testid="descendant" /> does not contain: <span data-testid="ancestor">
        <span data-testid="descendant" />
      </span>[39m
      [31m        [39m"
    `);
  }),
);
