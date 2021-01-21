import { withBrowser } from 'test-mule';

test(
  'toBeInTheDocument',
  withBrowser.headed(async ({ screen, utils }) => {
    await utils.injectHTML(`<button>Hi</button>`);
    const inDoc = await screen.getByText('Hi');
    await expect(inDoc).toBeInTheDocument();
    await expect(inDoc).not.toBeInTheDocument();
    await inDoc.evaluate((el) => el.remove());
    await expect(inDoc).not.toBeInTheDocument();
    // await expect(expect(inDoc).toBeInTheDocument()).rejects.toThrow(
    //   'element could not be found in the document',
    // );
  }),
);
