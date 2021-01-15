import { withBrowser } from 'test-mule';

test(
  'ByText',
  withBrowser(async ({ screen, utils }) => {
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
  }),
);
