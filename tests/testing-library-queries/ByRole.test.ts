import { withBrowser } from 'pleasantest';

test(
  'ByRole',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div role="heading">hi</div>
    <div>hello</div>
    <div role="button">butt1</div>
    <div role="button">butt2</div>
  `);

    // Finds just one
    await screen.getByRole('heading');
    // Alternate syntax
    await screen.getByRole('button', { name: /butt2/ });
    // Doesn't find any
    await expect(screen.getByRole('banner')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Unable to find an accessible element with the role \\"banner\\"

            Here are the accessible roles:

              document:

              Name \\"\\":
              <body>[...]</body>

              --------------------------------------------------
              heading:

              Name \\"hi\\":
              <div role=\\"heading\\">hi</div>

              --------------------------------------------------
              button:

              Name \\"butt1\\":
              <div role=\\"button\\">butt1</div>

              Name \\"butt2\\":
              <div role=\\"button\\">butt2</div>

              --------------------------------------------------

            Within: #document"
          `);
    // Finds too many
    await expect(screen.getByRole('button')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Found multiple elements with the role \\"button\\"

            Here are the matching elements:

            <div role=\\"button\\">butt1</div>

            <div role=\\"button\\">butt2</div>

            (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

            Within: #document"
          `);
  }),
);
