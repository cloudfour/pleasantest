import { createTab } from 'test-mule';

test('ByAltText', async () => {
  const { screen, utils } = await createTab();
  await utils.injectHTML(`
    <img alt="Foo" />
    <img alt="Foobar" />
    <img />
  `);
  // finds one
  await screen.getByAltText('Foobar');
  // too many
  await expect(screen.getByAltText(/Foo/)).rejects.toThrow(
    'Found multiple elements',
  );
  expect(await screen.getAllByAltText(/Foo/)).toHaveLength(2);
  // doesn't find any
  await expect(screen.getByAltText('Baz')).rejects.toThrow('Unable to find');
});
