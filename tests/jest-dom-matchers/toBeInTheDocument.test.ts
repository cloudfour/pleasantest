import { createTab } from 'test-mule';

test('toBeInTheDocument', async () => {
  const { screen, utils } = await createTab();
  await utils.injectHTML(`<button>Hi</button>`);
  const inDoc = await screen.getByText('Hi');
  await expect(inDoc).toBeInTheDocument();
  await inDoc.evaluate((el) => el.remove());
  await expect(expect(inDoc).toBeInTheDocument()).rejects.toThrow(
    'element could not be found in the document',
  );
});
