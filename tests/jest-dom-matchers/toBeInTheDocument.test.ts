import { createTab } from 'test-mule';

test.skip('toBeInTheDocument', async () => {
  const { screen, utils } = await createTab();
  await utils.injectHTML(`<button>Hi</button>`);
  const inDoc = await screen.getByText('Hi');
  await expect(inDoc).toBeInTheDocument();
  await inDoc.parentNode.removeChild(inDoc);
  await expect(expect(inDoc).toBeInTheDocument()).rejects.toThrow('foo');
});
