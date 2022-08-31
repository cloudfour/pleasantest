import { withBrowser } from 'pleasantest';

test(
  'toBeChecked',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <input type="checkbox" checked data-testid="input-checkbox-checked" />
      <input type="checkbox" data-testid="input-checkbox-unchecked" />
      <div role="checkbox" aria-checked="true" data-testid="aria-checkbox-checked" />
      <div
        role="checkbox"
        aria-checked="false"
        data-testid="aria-checkbox-unchecked"
      />

      <input type="radio" checked value="foo" data-testid="input-radio-checked" />
      <input type="radio" value="foo" data-testid="input-radio-unchecked" />
      <div role="radio" aria-checked="true" data-testid="aria-radio-checked" />
      <div role="radio" aria-checked="false" data-testid="aria-radio-unchecked" />
      <div role="switch" aria-checked="true" data-testid="aria-switch-checked" />
      <div role="switch" aria-checked="false" data-testid="aria-switch-unchecked" />`);

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
    await expect(inputCheckboxChecked).toBeChecked();
    await expect(expect(inputCheckboxChecked).not.toBeChecked()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).not.toBeChecked()[22m

      Received element is checked:
        [31m<input
        type="checkbox"
        checked
        data-testid="input-checkbox-checked"
      />[39m"
    `);
    await expect(inputCheckboxUnchecked).not.toBeChecked();
    await expect(expect(inputCheckboxUnchecked).toBeChecked()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeChecked()[22m

      Received element is not checked:
        [31m<input type="checkbox" data-testid="input-checkbox-unchecked" />[39m"
    `);
    await expect(ariaCheckboxChecked).toBeChecked();
    await expect(ariaCheckboxUnchecked).not.toBeChecked();

    const inputRadioChecked = await screen.getByTestId('input-radio-checked');
    const inputRadioUnchecked = await screen.getByTestId(
      'input-radio-unchecked',
    );
    const ariaRadioChecked = await screen.getByTestId('aria-radio-checked');
    const ariaRadioUnchecked = await screen.getByTestId('aria-radio-unchecked');
    await expect(inputRadioChecked).toBeChecked();
    await expect(inputRadioUnchecked).not.toBeChecked();
    await expect(ariaRadioChecked).toBeChecked();
    await expect(ariaRadioUnchecked).not.toBeChecked();

    const ariaSwitchChecked = await screen.getByTestId('aria-switch-checked');
    const ariaSwitchUnchecked = await screen.getByTestId(
      'aria-switch-unchecked',
    );
    await expect(ariaSwitchChecked).toBeChecked();
    await expect(ariaSwitchUnchecked).not.toBeChecked();
  }),
);
