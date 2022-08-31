import { withBrowser } from 'pleasantest';

test(
  'ByLabelText',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <label for="input1">Input1</label>
    <input id="input1" />
    <label><input type="checkbox" /> Input2</label>
  `);

    // Finds just one
    await screen.getByLabelText('Input1');
    // Alternate syntax
    await screen.getByLabelText('Input2');
    // Doesn't find any
    await expect(screen.getByLabelText('Input3')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find a label with the text of: Input3

            Within: #document"
          `);
    // Finds too many
    await expect(screen.getByLabelText(/Input/)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Found multiple elements with the text of: /Input/

      Here are the matching elements:

      <input id="input1" />

      <input type="checkbox" />

      (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

      Within: #document"
    `);
  }),
);
