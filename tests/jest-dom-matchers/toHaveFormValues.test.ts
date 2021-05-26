import { withBrowser } from 'pleasantest';

test(
  'toHaveFormValues',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      `<form data-testid="login-form">
        <input type="text" name="username" value="jane.doe" />
        <input type="password" name="password" value="12345678" />
        <input type="checkbox" name="rememberMe" checked />
        <button type="submit">Sign in</button>
      </form>`,
    );

    await expect(await screen.getByTestId('login-form')).toHaveFormValues({
      username: 'jane.doe',
      rememberMe: true,
    });

    await expect(
      expect(await screen.getByTestId('login-form')).toHaveFormValues({
        username: 'jane',
        rememberMe: true,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveFormValues()[22m

            Expected the element to have form values

            [32m- Expected[39m
            [31m+ Received[39m

            [2m  Object {[22m
            [2m    \\"rememberMe\\": true,[22m
            [32m-   \\"username\\": \\"jane\\",[39m
            [31m+   \\"username\\": \\"jane.doe\\",[39m
            [2m  }[22m"
          `);
  }),
);
