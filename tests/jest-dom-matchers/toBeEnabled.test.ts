import { withBrowser } from 'test-mule';

test(
  'toBeEnabled',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <button disabled>Dont Click</button>
    <button>Do Click</button>
  `);
    const button1 = await screen.getByText('Dont Click');
    const button2 = await screen.getByText('Do Click');
    await expect(button2).toBeEnabled();
    // testing that the inverse throws a useful error message
    await expect(expect(button1).toBeEnabled()).rejects.toThrow(
      'element is not enabled',
    );
  }),
);
