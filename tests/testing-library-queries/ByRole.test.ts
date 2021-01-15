import { withBrowser } from 'test-mule';

test(
  'ByRole',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div role="heading">hi</div>
    <div>hello</div>
    <div role="button">butt1</div>
    <div role="button">butt2</div>
  `);

    // finds just one
    await screen.getByRole('heading');
    // alternate syntax
    await screen.getByRole('button', { name: /butt2/ });
    // doesn't find any
    await expect(screen.getByRole('banner')).rejects.toThrow(
      'Unable to find an accessible element with the role "banner"',
    );
    // finds too many
    await expect(screen.getByRole('button')).rejects.toThrow(
      'Found multiple elements with the role "button"',
    );
  }),
);
