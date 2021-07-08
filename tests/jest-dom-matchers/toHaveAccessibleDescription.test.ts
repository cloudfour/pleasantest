import { withBrowser } from 'pleasantest';

test(
  'toHaveAccessibleDescription',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <a
        data-testid="link"
        href="/"
        aria-label="Home page"
        title="A link to start over"
        >Start</a
      >
      <a data-testid="extra-link" href="/about" aria-label="About page">About</a>
      <img src="" data-testid="avatar" alt="User profile pic" />
      <img
        src=""
        data-testid="logo"
        alt="Company logo"
        aria-describedby="t1"
      />
      <span id="t1" role="presentation">The logo of Our Company</span>
    `);

    const link = await screen.getByTestId('link');
    await expect(link).toHaveAccessibleDescription();
    await expect(expect(link).not.toHaveAccessibleDescription()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).not.toHaveAccessibleDescription()[22m

            Expected element not to have accessible description:
            [32m  null[39m
            Received:
            [31m  A link to start over[39m"
          `);
    await expect(link).toHaveAccessibleDescription('A link to start over');
    await expect(link).not.toHaveAccessibleDescription('Home page');
    await expect(expect(link).toHaveAccessibleDescription('Home page')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveAccessibleDescription()[22m

            Expected element to have accessible description:
            [32m  Home page[39m
            Received:
            [31m  A link to start over[39m"
          `);

    await expect(
      await screen.getByTestId('extra-link'),
    ).not.toHaveAccessibleDescription();

    await expect(
      await screen.getByTestId('avatar'),
    ).not.toHaveAccessibleDescription();

    const logo = await screen.getByTestId('logo');
    await expect(logo).not.toHaveAccessibleDescription('Company logo');
    await expect(logo).toHaveAccessibleDescription('The logo of Our Company');
  }),
);
