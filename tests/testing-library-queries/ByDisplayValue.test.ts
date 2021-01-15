import { withBrowser } from 'test-mule';

test(
  'ByDisplayValue',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <input value="Foo" />
    <input value="Fo" />
    <textarea>Bar</textarea>
    <select>
      <option value="1" selected>Apple</option>
      <option value="2">Banana</option>
    </select>
  `);
    // finds one
    await screen.getByDisplayValue('Foo');
    await screen.getByDisplayValue('Bar');
    await screen.getByDisplayValue('Apple');
    // too many
    await expect(screen.getByDisplayValue(/Fo/)).rejects.toThrow(
      'Found multiple elements',
    );
    // doesn't find any
    await expect(screen.getByDisplayValue('Cheeseburger')).rejects.toThrow(
      'Unable to find',
    );
  }),
);
