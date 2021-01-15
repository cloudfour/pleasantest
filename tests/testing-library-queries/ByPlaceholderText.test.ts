import { withBrowser } from 'test-mule';

test(
  'ByPlaceholderText',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <input placeholder="Foo" />
    <input placeholder="Foobar" />
    <input />
  `);
    // finds one
    await screen.getByPlaceholderText('Foobar');
    // too many
    await expect(screen.getByPlaceholderText(/Foo/)).rejects.toThrow(
      'Found multiple elements',
    );
    expect(await screen.getAllByPlaceholderText(/Foo/)).toHaveLength(2);
    // doesn't find any
    await expect(screen.getByPlaceholderText('Baz')).rejects.toThrow(
      'Unable to find',
    );
  }),
);
