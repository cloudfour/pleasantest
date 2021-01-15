import { withBrowser } from 'test-mule';

test(
  'toBeEmptyDOMElement',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <div data-testid="notempty">
      <div data-testid="empty"></div>
    </div>
  `);
    const empty = await screen.getByTestId('empty');
    const notempty = await screen.getByTestId('notempty');
    await expect(empty).toBeEmptyDOMElement();
    await expect(expect(notempty).toBeEmptyDOMElement()).rejects.toThrow(
      'toBeEmptyDOMElement()', // jest-dom's error message is pretty vague
    );
  }),
);
