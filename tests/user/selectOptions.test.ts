import { withBrowser } from 'pleasantest';

test(
  'throws if you pass it a non-element',
  withBrowser(async ({ user }) => {
    // @ts-expect-error This is testing the runtime behavior of the wrong type being passed
    await expect(user.selectOptions(5, ['1', '3'])).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "element must be an ElementHandle

            Received number"
          `);
  }),
);

test(
  'throws if you pass it the wrong kind of element',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML('<input>');
    const selectEl = await screen.getByRole('textbox');
    await expect(
      user.selectOptions(selectEl, ['1', '3']),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"user.selectOptions is only available for <select> elements, received: <input />"`,
    );
  }),
);

test(
  'selects option by value for <select>',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
    `);
    const selectEl = await screen.getByRole('combobox');
    await user.selectOptions(selectEl, '2');
    await expect(selectEl).toHaveValue('2');
  }),
);

test(
  'throws if you try to select multiple options for a single select',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
    `);
    const selectEl = await screen.getByRole('combobox');
    await expect(user.selectOptions(selectEl, ['2', '3'])).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Cannot select multiple options on a <select> element without the \`multiple\` attribute:

            <select>[...]</select>"
          `);
    await expect(selectEl).toHaveValue('1'); // Default is still selected
  }),
);

test(
  'selects options by value for <select multiple>',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select multiple>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
    `);
    const selectEl = await screen.getByRole('listbox');
    await user.selectOptions(selectEl, ['1', '3']);
    await expect(selectEl).toHaveValue(['1', '3']);
  }),
);

test(
  'selects option by element for <select>',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
    `);
    const selectEl = await screen.getByRole('combobox');
    const option = await screen.getByRole('option', { name: 'B' });
    await user.selectOptions(selectEl, option);
    await expect(selectEl).toHaveValue('2');
  }),
);

test(
  'selects options by element for <select multiple>',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select multiple>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
    `);
    const selectEl = await screen.getByRole('listbox');
    const optionB = await screen.getByRole('option', { name: 'B' });
    const optionC = await screen.getByRole('option', { name: 'C' });
    await user.selectOptions(selectEl, [optionB, optionC]);
    await expect(selectEl).toHaveValue(['2', '3']);
  }),
);

test(
  'throws if string value is not an option',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
    `);
    const selectEl = await screen.getByRole('combobox');
    await expect(
      user.selectOptions(selectEl, '4'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not select an option \\"4\\", it is not one of the valid options in the <select>. Valid options are: [\\"1\\",\\"2\\",\\"3\\"]"`,
    );
    await expect(selectEl).toHaveValue('1'); // Default is still selected
  }),
);

test(
  'throws if element value is not an option',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`
      <select>
        <option value="1">A</option>
        <option value="2">B</option>
        <option value="3">C</option>
      </select>,
      <option value="3">not-an-option</option>
    `);
    const selectEl = await screen.getByRole('combobox');
    const option = await screen.getByRole('option', { name: 'not-an-option' });
    await expect(
      user.selectOptions(selectEl, option),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not select an option <option value=\\"3\\">not-an-option</option>, it is not one of the valid options in the <select>. Valid options are: [\\"1\\",\\"2\\",\\"3\\"]"`,
    );
    await expect(selectEl).toHaveValue('1'); // Default is still selected
  }),
);
