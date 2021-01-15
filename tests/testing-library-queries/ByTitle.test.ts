import { withBrowser } from 'test-mule';

test(
  'ByTitle',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <img title="Foo" />
    <img title="Foobar" />
    <img />
  `);
    // finds one
    await screen.getByTitle('Foobar');
    // too many
    await expect(screen.getByTitle(/Foo/)).rejects.toThrow(
      'Found multiple elements',
    );
    expect(await screen.getAllByTitle(/Foo/)).toHaveLength(2);
    // doesn't find any
    await expect(screen.getByTitle('Baz')).rejects.toThrow('Unable to find');
  }),
);
