import { createTab } from 'test-mule';

test('ByLabelText', async () => {
  const { screen, utils } = await createTab();
  await utils.injectHTML(`
    <label for="input1">Input1</label>
    <input id="input1" />
    <label><input type="checkbox" /> Input2</label>
  `);

  // finds just one
  await screen.getByLabelText('Input1');
  // alternate syntax
  await screen.getByLabelText('Input2');
  // doesn't find any
  await expect(screen.getByLabelText('Input3')).rejects.toThrow(
    'Unable to find a label with the text of',
  );
  // finds too many
  await expect(screen.getByLabelText(/Input/)).rejects.toThrow(
    'Found multiple elements with the text of',
  );
});
