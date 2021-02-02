import { withBrowser } from 'test-mule';

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

    const checkout = within(
      (await checkoutHeading.evaluateHandle(
        (heading) => heading.parentElement,
      )) as any,
    );

    // This should pass now because there is only one button within the checkout section
    await checkout.getByRole('button');
  }),
);
