import { createTab } from 'test-mule';

test('ByText', async () => {
  const { screen, utils } = await createTab();
  await utils.injectHTML(`
    <div>hi</div>
    <div>hello</div>
  `);

  await screen.getByText('hi');
  await screen.getByText('hello');
  await screen.getByText(/hi/);
  await screen.getByText(/lo/);
  await expect(screen.getByText(/h/)).rejects.toThrow(
    'Found multiple elements with the text: /h/',
  );
  expect(await screen.getAllByText(/h/)).toHaveLength(2);
});
