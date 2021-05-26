import type { ElementHandle } from 'puppeteer';
import { withBrowser } from 'pleasantest';

test(
  'toBePartiallyChecked',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <input type="checkbox" aria-checked="mixed" data-testid="aria-checkbox-mixed" />
      <input type="checkbox" checked data-testid="input-checkbox-checked" />
      <input type="checkbox" data-testid="input-checkbox-unchecked" />
      <div role="checkbox" aria-checked="true" data-testid="aria-checkbox-checked" />
      <div
        role="checkbox"
        aria-checked="false"
        data-testid="aria-checkbox-unchecked"
      />
      <input type="checkbox" data-testid="input-checkbox-indeterminate" />
    `);

    const ariaCheckboxMixed = await screen.getByTestId('aria-checkbox-mixed');
    const inputCheckboxChecked = await screen.getByTestId(
      'input-checkbox-checked',
    );
    const inputCheckboxUnchecked = await screen.getByTestId(
      'input-checkbox-unchecked',
    );
    const ariaCheckboxChecked = await screen.getByTestId(
      'aria-checkbox-checked',
    );
    const ariaCheckboxUnchecked = await screen.getByTestId(
      'aria-checkbox-unchecked',
    );
    const inputCheckboxIndeterminate = (await screen.getByTestId(
      'input-checkbox-indeterminate',
    )) as ElementHandle<HTMLInputElement>;

    await expect(ariaCheckboxMixed).toBePartiallyChecked();

    await expect(inputCheckboxChecked).not.toBePartiallyChecked();
    await expect(inputCheckboxUnchecked).not.toBePartiallyChecked();
    await expect(ariaCheckboxChecked).not.toBePartiallyChecked();
    await expect(ariaCheckboxUnchecked).not.toBePartiallyChecked();

    await inputCheckboxIndeterminate.evaluate((el) => {
      el.indeterminate = true;
    });
    await expect(inputCheckboxIndeterminate).toBePartiallyChecked();
    await expect(expect(inputCheckboxIndeterminate).not.toBePartiallyChecked())
      .rejects.toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).not.toBePartiallyChecked()[22m

            Received element is partially checked:
              [31m<input type=\\"checkbox\\" data-testid=\\"input-checkbox-indeterminate\\" />[39m"
          `);
  }),
);
