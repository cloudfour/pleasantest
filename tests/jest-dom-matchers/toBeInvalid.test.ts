import { withBrowser } from 'test-mule';

test(
  'toBeInvalid',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <input data-testid="valid-input-1" />
    <input data-testid="invalid-input-1" aria-invalid />
    <input data-testid="invalid-input-2" aria-invalid="true" />
    <input data-testid="invalid-input-3" required value="" />
    <input data-testid="invalid-input-4" type="email" value="foo" />
    <form data-testid="valid-form-1"><input /></form>
    <form data-testid="invalid-form-1"><input required /></form>
  `);
    const validInput1 = await screen.getByTestId('valid-input-1');
    const invalidInput1 = await screen.getByTestId('invalid-input-1');
    const invalidInput2 = await screen.getByTestId('invalid-input-2');
    const invalidInput3 = await screen.getByTestId('invalid-input-3');
    const invalidInput4 = await screen.getByTestId('invalid-input-4');
    const validForm1 = await screen.getByTestId('valid-form-1');
    const invalidForm1 = await screen.getByTestId('invalid-form-1');
    await expect(invalidInput1).toBeInvalid();
    await expect(invalidInput2).toBeInvalid();
    await expect(invalidInput3).toBeInvalid();
    await expect(invalidInput4).toBeInvalid();
    await expect(invalidForm1).toBeInvalid();
    await expect(expect(validInput1).toBeInvalid()).rejects.toThrow(
      'element is not currently invalid',
    );
    await expect(expect(validForm1).toBeInvalid()).rejects.toThrow(
      'element is not currently invalid',
    );
  }),
);
