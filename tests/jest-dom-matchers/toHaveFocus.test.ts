import type { ElementHandle } from 'puppeteer';
import { withBrowser } from 'pleasantest';

test(
  'toHaveFocus',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      `<div><input type="text" data-testid="element-to-focus" /></div>`,
    );

    const input: ElementHandle<HTMLElement> = await screen.getByTestId(
      'element-to-focus',
    );

    await input.focus();
    await expect(input).toHaveFocus();
    await expect(expect(input).not.toHaveFocus()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).not.toHaveFocus()[22m

            Expected element with focus:
              [32m<input type=\\"text\\" data-testid=\\"element-to-focus\\" />[39m
            Received element with focus:
              [31m<input type=\\"text\\" data-testid=\\"element-to-focus\\" />[39m"
          `);

    await input.evaluate((el) => el.blur());

    await expect(input).not.toHaveFocus();
    await expect(expect(input).toHaveFocus()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveFocus()[22m

            Expected element with focus:
              [32m<input type=\\"text\\" data-testid=\\"element-to-focus\\" />[39m
            Received element with focus:
              [31m<body>
              <div>
                <input type=\\"text\\" data-testid=\\"element-to-focus\\" />
              </div>
            </body>[39m"
          `);
  }),
);
