import { withBrowser } from 'pleasantest';

test(
  'toBeRequired',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
    <input data-testid="required-input" required />
    <input data-testid="aria-required-input" aria-required="true" />
    <input data-testid="conflicted-input" required aria-required="false" />
    <input data-testid="aria-not-required-input" aria-required="false" />
    <input data-testid="optional-input" />
    <input data-testid="unsupported-type" type="image" required />
    <select data-testid="select" required></select>
    <textarea data-testid="textarea" required></textarea>
    <div data-testid="supported-role" role="tree" required></div>
    <div data-testid="supported-role-aria" role="tree" aria-required="true"></div>
  `);

    const requireInput = await screen.getByTestId('required-input');
    const ariaRequiredInput = await screen.getByTestId('aria-required-input');
    const conflictInput = await screen.getByTestId('conflicted-input');
    const ariaNotRequiredInput = await screen.getByTestId(
      'aria-not-required-input',
    );
    const optionalInput = await screen.getByTestId('optional-input');
    const unsportedType = await screen.getByTestId('unsupported-type');
    const select = await screen.getByTestId('select');
    const textarea = await screen.getByTestId('textarea');
    const supportedRole = await screen.getByTestId('supported-role');
    const supportedRoleAria = await screen.getByTestId('supported-role-aria');

    await expect(requireInput).toBeRequired();
    await expect(ariaRequiredInput).toBeRequired();
    await expect(conflictInput).toBeRequired();
    await expect(ariaNotRequiredInput).not.toBeRequired();
    await expect(optionalInput).not.toBeRequired();
    await expect(expect(optionalInput).toBeRequired()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toBeRequired()[22m

      Received element is not required:
        [31m<input data-testid="optional-input" />[39m"
    `);
    await expect(unsportedType).not.toBeRequired();
    await expect(select).toBeRequired();
    await expect(textarea).toBeRequired();
    await expect(supportedRole).not.toBeRequired();
    await expect(supportedRoleAria).toBeRequired();
  }),
);
