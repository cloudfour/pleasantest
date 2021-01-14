import { createTab } from 'test-mule';

test('toBeVisible', async () => {
  const { screen, utils } = await createTab();

  await utils.injectHTML(`<div>hello</div>`);
  const div = await screen.getByText(/hello/);
  await expect(div).toBeVisible();
  // testing that the inverse throws a useful error message
  await expect(expect(div).not.toBeVisible()).rejects.toThrow(
    'Received element is visible',
  );

  await utils.injectCSS(`div { opacity: 0 }`);
  await expect(div).not.toBeVisible();
  // testing that the inverse throws a useful error message
  await expect(expect(div).toBeVisible()).rejects.toThrow(
    'Received element is not visible',
  );
});
