import { createTab } from 'test-mule';

const singleElementMarkup = `
  <h1>Hello</h1>
`;

const multipleElementMarkup = `
  <h1>Hello</h1>
  <h1>Hello</h1>
`;

test('findBy', async () => {
  const { screen, utils } = await createTab();

  // This should work because findByText waits for up to 1s to see the element
  setTimeout(() => utils.injectHTML(singleElementMarkup), 500);
  await screen.findByText(/Hello/);

  await expect(screen.findByText(/Hellooooo/)).rejects.toThrow(
    'Unable to find an element with the text: /Hellooooo/',
  );

  await utils.injectHTML(multipleElementMarkup);
  await expect(screen.findByText(/Hello/)).rejects.toThrow(
    'Found multiple elements with the text: /Hello/',
  );
}, 8000);

test('getBy', async () => {
  const { screen, utils } = await createTab();

  await utils.injectHTML(singleElementMarkup);
  await screen.getByText(/Hello/);

  await expect(screen.getByText(/Hellooooo/)).rejects.toThrow(
    'Unable to find an element with the text: /Hellooooo/',
  );

  await utils.injectHTML(multipleElementMarkup);
  await expect(screen.getByText(/Hello/)).rejects.toThrow(
    'Found multiple elements with the text: /Hello/',
  );
});

test('queryBy', async () => {
  const { screen, utils } = await createTab();

  await utils.injectHTML(singleElementMarkup);
  await screen.queryByText(/Hello/);

  expect(await screen.queryByText(/Hellooooo/)).toBeNull();

  await utils.injectHTML(multipleElementMarkup);
  await expect(screen.queryByText(/Hello/)).rejects.toThrow(
    'Found multiple elements with the text: /Hello/',
  );
});

test('findAllBy', async () => {
  const { screen, utils } = await createTab();

  // This should work because findAllByText waits for up to 1s to find any matching elements
  setTimeout(() => utils.injectHTML(singleElementMarkup), 500);
  expect(await screen.findAllByText(/Hello/)).toHaveLength(1);

  await expect(screen.findAllByText(/Hellooooo/)).rejects.toThrow(
    'Unable to find an element with the text: /Hellooooo/',
  );

  await utils.injectHTML(multipleElementMarkup);
  expect(await screen.findAllByText(/Hello/)).toHaveLength(2);
}, 8000);

test('getAllBy', async () => {
  const { screen, utils } = await createTab();

  await utils.injectHTML(singleElementMarkup);
  expect(await screen.getAllByText(/Hello/)).toHaveLength(1);

  await expect(screen.getAllByText(/Hellooooo/)).rejects.toThrow(
    'Unable to find an element with the text: /Hellooooo/',
  );

  await utils.injectHTML(multipleElementMarkup);
  expect(await screen.getAllByText(/Hello/)).toHaveLength(2);
});

test('queryAllBy', async () => {
  const { screen, utils } = await createTab();

  await utils.injectHTML(singleElementMarkup);
  await screen.queryAllByText(/Hello/);

  expect(await screen.queryAllByText(/Hellooooo/)).toEqual([]);

  await utils.injectHTML(multipleElementMarkup);
  expect(await screen.queryAllByText(/Hello/)).toHaveLength(2);
});
