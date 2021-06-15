import { withBrowser } from 'pleasantest';

test(
  'clears input element',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<input />`);
    const input = await screen.getByRole('textbox');
    await user.type(input, 'hiiiiiiii');
    await expect(input).toHaveValue('hiiiiiiii');
    await user.clear(input);
    await expect(input).toHaveValue('');
  }),
);

test(
  'clears textarea element',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<textarea>some text</textarea>`);
    const input = await screen.getByRole('textbox');
    await expect(input).toHaveValue('some text');
    await user.type(input, ' asdf{enter}hi');
    await expect(input).toHaveValue('some text asdf\nhi');
    await user.clear(input);
    await expect(input).toHaveValue('');
  }),
);

test(
  'throws for contenteditable elements',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<div contenteditable>text</div>`);
    const div = await screen.getByText(/text/);
    await expect(user.clear(div)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"user.clear is only available for <input> and <textarea> elements, received: <div contenteditable=\\"\\">text</div>"`,
    );
  }),
);

test(
  'throws for non-input elements',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<div>text</div>`);
    const div = await screen.getByText(/text/);
    await expect(user.clear(div)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"user.clear is only available for <input> and <textarea> elements, received: <div>text</div>"`,
    );
  }),
);
