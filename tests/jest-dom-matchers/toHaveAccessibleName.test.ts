import { withBrowser } from 'pleasantest';

test(
  'toHaveAccessibleName',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <img data-testid="img-alt" src="" alt="Test alt" />
      <img data-testid="img-empty-alt" src="" alt="" />
      <svg data-testid="svg-title"><title>Test title</title></svg>
      <button data-testid="button-img-alt"><img src="" alt="Test" /></button>
      <p><img data-testid="img-paragraph" src="" alt="" /> Test content</p>
      <button data-testid="svg-button"><svg><title>Test</title></svg></p>
      <div><svg data-testid="svg-without-title"></svg></div>
      <input data-testid="input-title" title="test" />
    `);

    await expect(await screen.getByTestId('img-alt')).toHaveAccessibleName(
      'Test alt',
    );

    await expect(await screen.getByTestId('img-alt')).not.toHaveAccessibleName(
      'not test alt',
    );
    await expect(
      expect(await screen.getByTestId('img-alt')).toHaveAccessibleName(
        'not test alt',
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveAccessibleName()[22m

            Expected element to have accessible name:
            [32m  not test alt[39m
            Received:
            [31m  Test alt[39m"
          `);

    await expect(
      expect(await screen.getByTestId('img-empty-alt')).toHaveAccessibleName(),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
                  "[2mexpect([22m[31melement[39m[2m).toHaveAccessibleName()[22m

                  Expected element to have accessible name:
                  [32m  null[39m
                  Received:
                  "
              `);

    await expect(
      await screen.getByTestId('img-empty-alt'),
    ).not.toHaveAccessibleName();
    await expect(
      expect(await screen.getByTestId('img-empty-alt')).toHaveAccessibleName(),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
                  "[2mexpect([22m[31melement[39m[2m).toHaveAccessibleName()[22m

                  Expected element to have accessible name:
                  [32m  null[39m
                  Received:
                  "
              `);

    await expect(await screen.getByTestId('svg-title')).toHaveAccessibleName(
      'Test title',
    );

    await expect(
      await screen.getByTestId('button-img-alt'),
    ).toHaveAccessibleName();

    await expect(
      await screen.getByTestId('img-paragraph'),
    ).not.toHaveAccessibleName();

    await expect(await screen.getByTestId('svg-button')).toHaveAccessibleName();

    await expect(
      await screen.getByTestId('svg-without-title'),
    ).not.toHaveAccessibleName();

    await expect(
      await screen.getByTestId('input-title'),
    ).toHaveAccessibleName();
  }),
);
