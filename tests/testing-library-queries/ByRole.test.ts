import { withBrowser } from 'pleasantest';

test(
  'ByRole',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div role="heading">hi</div>
    <div>hello</div>
    <div role="button">butt1</div>
    <div role="button">butt2</div>
    <button aria-describedby="trash-desc">Move to trash</button>
    <p id="trash-desc">Items in the trash will be permanently removed after 30 days.</p>
  `);

    // Finds just one
    await screen.getByRole('heading');

    // Select by accessible name
    await screen.getByRole('button', { name: /butt2/ });

    // Select by accessible role and description
    await screen.getByRole('button', {
      description: /^items in the trash will be/i,
    });

    // Doesn't find any
    await expect(screen.getByRole('banner')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Unable to find an accessible element with the role "banner"

      Here are the accessible roles:

        document:

        Name "":
        <body>[...]</body>

        --------------------------------------------------
        heading:

        Name "hi":
        <div role="heading">hi</div>

        --------------------------------------------------
        button:

        Name "butt1":
        <div role="button">butt1</div>

        Name "butt2":
        <div role="button">butt2</div>

        Name "Move to trash":
        <button aria-describedby="trash-desc">Move to trash</button>

        --------------------------------------------------

      Within: #document"
    `);
    // Finds too many
    await expect(screen.getByRole('button')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "Found multiple elements with the role "button"

      Here are the matching elements:

      <div role="button">butt1</div>

      <div role="button">butt2</div>

      <button aria-describedby="trash-desc">Move to trash</button>

      (If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)).

      Within: #document"
    `);
  }),
);
