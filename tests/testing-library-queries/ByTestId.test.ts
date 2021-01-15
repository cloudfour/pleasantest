import { withBrowser } from 'test-mule';

test(
  'ByTestId',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div data-testid="foo">hi</div>
    <div data-testid="bar">hello</div>
    <div data-testid="bar">hello</div>
  `);

    // finds just one
    await screen.getByTestId('foo');
    // doesn't find any
    await expect(screen.getByTestId('woot')).rejects.toThrow('Unable to find');
    // finds too many
    await expect(screen.getByTestId('bar')).rejects.toThrow(
      'Found multiple elements',
    );
  }),
);
