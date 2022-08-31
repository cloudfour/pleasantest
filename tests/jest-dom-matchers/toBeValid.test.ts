import { withBrowser } from 'pleasantest';

test(
  'toBeValid',
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
    await expect(validInput1).toBeValid();
    await expect(validForm1).toBeValid();
    await expect(expect(invalidInput1).toBeValid()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeValid()[22m

      Received element is not currently valid:
        [31m<input data-testid="invalid-input-1" aria-invalid="" />[39m"
    `);
    await expect(expect(invalidInput2).toBeValid()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeValid()[22m

      Received element is not currently valid:
        [31m<input data-testid="invalid-input-2" aria-invalid="true" />[39m"
    `);
    await expect(expect(invalidInput3).toBeValid()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeValid()[22m

      Received element is not currently valid:
        [31m<input
        data-testid="invalid-input-3"
        required
        value=""
      />[39m"
    `);
    await expect(expect(invalidInput4).toBeValid()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeValid()[22m

      Received element is not currently valid:
        [31m<input
        data-testid="invalid-input-4"
        type="email"
        value="foo"
      />[39m"
    `);
    await expect(expect(invalidForm1).toBeValid()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeValid()[22m

      Received element is not currently valid:
        [31m<form data-testid="invalid-form-1">
        <input required />
      </form>[39m"
    `);
  }),
);
