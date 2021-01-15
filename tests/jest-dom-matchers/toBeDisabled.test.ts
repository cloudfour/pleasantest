import { createTab } from 'test-mule';

test('toBeDisabled', async () => {
  const { screen, utils } = await createTab();
  await utils.injectHTML(`
    <button disabled>Dont Click</button>
    <button>Do Click</button>
  `);
  const button1 = await screen.getByText('Dont Click');
  const button2 = await screen.getByText('Do Click');
  await expect(button1).toBeDisabled();
  // testing that the inverse throws a useful error message
  await expect(expect(button2).toBeDisabled()).rejects.toThrow(
    'element is not disabled',
  );
});
