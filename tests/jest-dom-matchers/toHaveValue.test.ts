import { withBrowser } from 'pleasantest';

test(
  'toHaveValue',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <input type="text" value="text" data-testid="input-text" />
      <input type="number" value="5" data-testid="input-number" />
      <input type="text" data-testid="input-empty" />
      <select multiple data-testid="select-number">
        <option value="first">First Value</option>
        <option value="second" selected>Second Value</option>
        <option value="third" selected>Third Value</option>
      </select>`);

    const textInput = await screen.getByTestId('input-text');
    const numberInput = await screen.getByTestId('input-number');
    const emptyInput = await screen.getByTestId('input-empty');
    const selectInput = await screen.getByTestId('select-number');

    await expect(textInput).toHaveValue('text');
    await expect(expect(textInput).toHaveValue('nope')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveValue([22m[32mnope[39m[2m)[22m

            Expected the element to have value:
            [32m  nope[39m
            Received:
            [31m  text[39m"
          `);
    await expect(numberInput).toHaveValue(5);
    await expect(emptyInput).not.toHaveValue();
    await expect(selectInput).toHaveValue(['second', 'third']);
    await expect(expect(selectInput).toHaveValue([])).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toHaveValue([22m[2m)[22m

      Expected the element to have value:
      [32m  [][39m
      Received:
      [31m  ["second", "third"][39m"
    `);
  }),
);
