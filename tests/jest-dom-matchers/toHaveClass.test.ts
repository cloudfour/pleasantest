import { withBrowser } from 'test-mule';

test(
  'toHaveClass',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(
      `<button data-testid="delete-button" class="btn extra btn-danger">
        Delete item
      </button>
      <button data-testid="no-classes">No Classes</button>`,
    );

    const deleteButton = await screen.getByTestId('delete-button');
    const noClasses = await screen.getByTestId('no-classes');

    await expect(deleteButton).toHaveClass('extra');
    await expect(deleteButton).toHaveClass('btn-danger btn');
    await expect(deleteButton).toHaveClass('btn-danger', 'btn');
    await expect(deleteButton).not.toHaveClass('btn-link');
    await expect(expect(deleteButton).toHaveClass('btn-link')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveClass([22m[32m[32m\\"btn-link\\"[39m[32m[39m[2m)[22m

            Expected the element to have class:
            [32m  btn-link[39m
            Received:
            [31m  btn extra btn-danger[39m"
          `);

    await expect(deleteButton).toHaveClass('btn-danger extra btn', {
      // To check if the element has EXACTLY a set of classes
      exact: true,
    });

    await expect(deleteButton).not.toHaveClass('btn-danger extra', {
      // If it has more than expected it is going to fail
      exact: true,
    });
    await expect(
      expect(deleteButton).toHaveClass('btn-danger extra', {
        // If it has more than expected it is going to fail
        exact: true,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Expected the element to have EXACTLY defined classes

            btn-danger extra:
            [32m  Received[39m
            btn extra btn-danger:
            [31m  null[39m"
          `);

    await expect(deleteButton).not.toHaveClass('btn-danger extra', {
      // If it has more than expected it is going to fail
      exact: true,
    });

    await expect(noClasses).not.toHaveClass();
    await expect(expect(noClasses).toHaveClass()).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveClass([22m[32mexpected[39m[2m)[22m
            At least one expected class must be provided."
          `);
  }),
);
