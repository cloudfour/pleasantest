import type { ElementHandle } from 'puppeteer';
import { withBrowser } from 'test-mule';

type InputHandle = ElementHandle<HTMLInputElement>;
type FormHandle = ElementHandle<HTMLFormElement>;

test(
  'element text changes, and separate input events are fired',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(
      `<input oninput="document.querySelector('h1').innerHTML++"/>
      <h1>0</h1>`,
    );
    const input: InputHandle = await screen.getByRole('textbox');
    await user.type(input, 'hiiiiiiii');
    const heading = await screen.getByRole('heading');
    // 9 input events should have fired
    expect(await heading.evaluate((h) => Number(h.innerHTML))).toEqual(9);
    expect(await input.evaluate((input) => input.value)).toEqual('hiiiiiiii');
  }),
);

test(
  'appends to existing text (<input />)',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<input value="1234" />`);
    const input: InputHandle = await screen.getByRole('textbox');
    await user.type(input, '5678');
    expect(await input.evaluate((input) => input.value)).toEqual('12345678');
  }),
);

test(
  'appends to existing text (<textarea />)',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<textarea>1234</textarea>`);
    const textarea: InputHandle = await screen.getByRole('textbox');
    await user.type(textarea, '5678');
    expect(await textarea.evaluate((textarea) => textarea.value)).toEqual(
      '12345678',
    );
  }),
);

test(
  'appends to existing text (<div contenteditable />)',
  withBrowser(async ({ user, utils, screen }) => {
    // directly on the contenteditable element
    await utils.injectHTML(`<div contenteditable role="textbox">1234</div>`);
    const div: InputHandle = await screen.getByRole('textbox');
    await user.type(div, '5678');
    expect(await div.evaluate((div) => div.textContent)).toEqual('12345678');

    // ancestor element is contenteditable
    await utils.injectHTML(`<div contenteditable><a href="hi">1234</a></div>`);
    const link = await screen.getByText('1234');
    await user.type(link, '5678');
    expect(
      await link.evaluate((link) => link.parentElement!.textContent),
    ).toEqual('12345678');
  }),
);

describe('special character sequences', () => {
  test(
    '{enter} in <input> submits form',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(
        `<form name="searchForm" onsubmit="event.preventDefault(); this.remove()"><input value="1234" /></form>`,
      );
      const input: InputHandle = await screen.getByRole('textbox');
      const form: FormHandle = await screen.getByRole('form');
      await expect(form).toBeInTheDocument();
      // it shouldn't care about the capitalization in the command sequences
      await user.type(input, 'hello{eNtEr}');
      expect(await input.evaluate((i) => i.value)).toEqual('1234hello');
      await expect(form).not.toBeInTheDocument();
    }),
  );
  test(
    '{enter} in <textarea> adds newline',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<textarea>1234</textarea>`);
      const input: InputHandle = await screen.getByRole('textbox');
      // it shouldn't care about the capitalization in the command sequences
      await user.type(input, 'hello{ENteR}hello2');
      expect(await input.evaluate((i) => i.value)).toEqual('1234hello\nhello2');
    }),
  );
  test(
    'arrow keys',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<textarea>1234</textarea>`);
      const input: InputHandle = await screen.getByRole('textbox');
      await user.type(input, '56{arrowleft}insert');
      expect(await input.evaluate((i) => i.value)).toEqual('12345insert6');
    }),
  );
  test(
    '{tab} moves the focus to the next field and continues typing',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`
        <label>
          name
          <input />
        </label>
        <label>
          description
          <textarea></textarea>
        </label
      `);
      const nameBox: InputHandle = await screen.getByLabelText(/name/i);
      const descriptionBox: InputHandle = await screen.getByLabelText(/desc/i);
      await user.type(nameBox, '1234{tab}5678');
      expect(await nameBox.evaluate((i) => i.value)).toEqual('1234');
      expect(await descriptionBox.evaluate((i) => i.value)).toEqual('5678');
    }),
  );
  test(
    '{backspace} and {del}',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<textarea>1234</textarea>`);
      const input: InputHandle = await screen.getByRole('textbox');
      await user.type(input, '56{arrowleft}{backspace}');
      expect(await input.evaluate((i) => i.value)).toEqual('12346');
      await user.type(input, '{arrowleft}{arrowleft}{del}');
      expect(await input.evaluate((i) => i.value)).toEqual('1246');
    }),
  );
  test(
    '{selectall}',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<textarea>1234</textarea>`);
      const input: InputHandle = await screen.getByRole('textbox');
      await user.type(input, '56{selectall}{backspace}abc');
      expect(await input.evaluate((i) => i.value)).toEqual('abc');
    }),
  );
  test(
    '{selectall} throws if used on contenteditable',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<div contenteditable>hello</div>`);
      const div: ElementHandle<HTMLDivElement> = await screen.getByText(
        'hello',
      );
      await expect(
        user.type(div, '{selectall}'),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"{selectall} command is only available for <input> and textarea elements, received: <div contenteditable=\\"\\">hello</div>"`,
      );
    }),
  );
});

test(
  'delay',
  withBrowser(async ({ user, utils, screen }) => {
    await utils.injectHTML(`<textarea>1234</textarea>`);
    const input: InputHandle = await screen.getByRole('textbox');
    let startTime = new Date().getTime();
    await user.type(input, '123');
    expect(new Date().getTime() - startTime).toBeLessThan(100);
    startTime = new Date().getTime();
    await user.type(input, '123', { delay: 50 });
    expect(new Date().getTime() - startTime).toBeGreaterThan(150);
  }),
);

describe('actionability checks', () => {
  test(
    'refuses to type in element that is not in the DOM',
    withBrowser(async ({ screen, user, utils }) => {
      await utils.injectHTML('<input />');
      const input = await screen.getByRole('textbox');
      await input.evaluate((input) => input.remove());
      await expect(user.type(input, 'hello')).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot perform action on element that is not attached to the DOM:
              <input />"
            `);
      // Puppeteer's .type silently fails/refuses to type in an unattached element
      // So our .type won't type in an unattached element even with { force: true }
      await expect(user.type(input, 'hello', { force: true })).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot perform action on element that is not attached to the DOM:
              <input />"
            `);
    }),
  );
  test(
    'refuses to type in element that is not visible',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<input style="opacity: 0" />`);
      const input = await screen.getByRole('textbox');
      await expect(user.type(input, 'some text')).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot perform action on element that is not visible (it is near zero opacity):
              <input style=\\"opacity: 0\\" />"
            `);
    }),
  );
  test(
    '{ force: true } overrides visibility check',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<input style="opacity: 0" />`);
      const input = await screen.getByRole('textbox');
      await user.type(input, 'some text', { force: true });
    }),
  );
  test(
    'refuses to type in element that is not typeable',
    withBrowser(async ({ user, utils, screen }) => {
      await utils.injectHTML(`<div>Hi</div>`);
      const div = await screen.getByText('Hi');
      await expect(user.type(div, '5678')).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot type in element that is not typeable:
              <div>Hi</div>
              Element must be an <input> or <textarea> or an element with the contenteditable attribute."
            `);
    }),
  );
});
