import { withBrowser } from 'test-mule';

test(
  'toBeInTheDocument',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`<button>Hi</button>`);
    const inDoc = await screen.getByText('Hi');
    await expect(inDoc).toBeInTheDocument();
    // Several things are being tested here that are not immediately obvious:
    // 1. Testing that nested calls to jest-matcher-utils from the jest-dom matchers are working
    // 2. Testing that elements get re-serialized to strings before Jest logs them in Node
    //    (if that wasn't working, we'd see JSHandle@node)
    await expect(expect(inDoc).not.toBeInTheDocument()).rejects.toThrowError(
      'expected document not to contain element, found <button>Hi</button> instead',
    );
    await inDoc.evaluate((el) => el.remove());
    await expect(inDoc).not.toBeInTheDocument();
    await expect(expect(inDoc).toBeInTheDocument()).rejects.toThrowError(
      'element could not be found in the document',
    );
  }),
);
