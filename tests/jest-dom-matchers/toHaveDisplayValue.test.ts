import { withBrowser } from 'pleasantest';

test(
  'toHaveDisplayValue',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <label for="input-example">First name</label>
      <input type="text" id="input-example" value="Luca" />

      <label for="textarea-example">Description</label>
      <textarea id="textarea-example">An example description here.</textarea>

      <label for="single-select-example">Fruit</label>
      <select id="single-select-example">
        <option value="">Select a fruit...</option>
        <option value="banana">Banana</option>
        <option value="ananas">Ananas</option>
        <option value="avocado">Avocado</option>
      </select>

      <label for="multiple-select-example">Fruits</label>
      <select id="multiple-select-example" multiple>
        <option value="">Select a fruit...</option>
        <option value="banana" selected>Banana</option>
        <option value="ananas">Ananas</option>
        <option value="avocado" selected>Avocado</option>
      </select>`);

    const input = await screen.getByLabelText('First name');
    const textarea = await screen.getByLabelText('Description');
    const selectSingle = await screen.getByLabelText('Fruit');
    const selectMultiple = await screen.getByLabelText('Fruits');

    await expect(input).toHaveDisplayValue('Luca');
    await expect(expect(input).toHaveDisplayValue('no')).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "[2mexpect([22m[31melement[39m[2m).toHaveDisplayValue()[22m

            Expected element to have display value:
            [32m  no[39m
            Received:
            [31m  [\\"Luca\\"][39m"
          `);
    await expect(input).toHaveDisplayValue(/Luc/);
    await expect(textarea).toHaveDisplayValue('An example description here.');
    await expect(textarea).toHaveDisplayValue(/example/);
    await expect(selectSingle).toHaveDisplayValue('Select a fruit...');
    await expect(selectSingle).toHaveDisplayValue(/Select/);
    await expect(selectMultiple).toHaveDisplayValue([/Avocado/, 'Banana']);
  }),
);
