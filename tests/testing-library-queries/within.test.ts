import type { ElementHandle } from 'pleasantest';
import { withBrowser } from 'pleasantest';

test(
  'within()',
  withBrowser(async ({ within, utils, screen }) => {
    await utils.injectHTML(`
      <div class="checkout">
        <h1>Checkout</h1>

        <button>Checkout button</button>
      </div>

      <button>Extra button</button>
    `);

    await expect(screen.getByRole('button')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the role \\"button\\"

            Here are the matching elements:

            <button>Checkout button</button>

            <button>Extra button</button>

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);

    const checkoutHeading = await screen.getByRole('heading', {
      name: /checkout/i,
    });

    const checkoutContainer =
      await checkoutHeading.evaluateHandle<ElementHandle>(
        (heading) => heading.parentElement,
      );

    const checkoutQueries = within(checkoutContainer);

    // This should pass now because there is only one button within the checkout section
    await checkoutQueries.getByRole('button');

    // The .container property returns a promise resolving to the container element
    await utils.runJS(
      `export default (originalContainer, containerReference) => {
        if (originalContainer !== containerReference)
          throw new Error('.container property did not return correct reference')
      }`,
      [checkoutContainer, await checkoutQueries.container],
    );

    // Also screen.container should exist as well and should point to document.body
    // since screen === within(document.body)
    await utils.runJS(
      `export default (container) => {
        if (document.body !== container)
          throw new Error('.container property did not return correct reference')
      }`,
      [await screen.container],
    );
  }),
);
