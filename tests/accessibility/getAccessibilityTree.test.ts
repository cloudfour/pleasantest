import type { ElementHandle } from 'pleasantest';
import { getAccessibilityTree, withBrowser } from 'pleasantest';

test(
  'allows passing Page or ElementHandle',
  withBrowser(async ({ utils, page, screen }) => {
    await utils.injectHTML(`<ul></ul>`);
    await page.evaluate(() => (document.title = 'example title'));
    const htmlElement = await page.evaluateHandle<ElementHandle>(
      () => document.documentElement,
    );
    expect(String(await getAccessibilityTree(htmlElement))).toEqual(
      String(await getAccessibilityTree(page)),
    );
    // TODO: document's name should be from document.title (breaking change)
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        list
    `);

    const list = await screen.getByRole('list');

    // Allows passing a more specific element to get a subtree
    expect(await getAccessibilityTree(list)).toMatchInlineSnapshot(`list`);
  }),
);

test(
  'basic use cases',
  withBrowser(async ({ utils, page }) => {
    await utils.injectHTML(`
      <main>
        <button>
          <span aria-hidden="true">+</span>
          <span>Add to cart</span>
        </button>
        <h1>hiiii</h1>
        <div role="button" tabindex="-1">foo &gt bar</div>
      </main>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        main
          button "Add to cart"
          heading "hiiii"
            text "hiiii"
          button "foo > bar"
    `);
    await utils.injectHTML(`
      <ul>
        <li>something</li>
        <li>something else</li>
      </ul>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        list
          listitem
            text "something"
          listitem
            text "something else"
    `);
    expect(await getAccessibilityTree(page, { includeText: true }))
      .toMatchInlineSnapshot(`
      document
        list
          listitem
            text "something"
          listitem
            text "something else"
    `);
    await utils.injectHTML(`
      <button aria-describedby="click-me-description">click me</button>
      <button aria-describedby="click-me-description"><div>click me</div></button>
      <button aria-describedby="click-me-description"><h1>click me</h1></button>
      <div id="click-me-description">extended description</div>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        text "extended description"
    `);
    expect(await getAccessibilityTree(page, { includeText: true }))
      .toMatchInlineSnapshot(`
      document
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        text "extended description"
    `);

    expect(await getAccessibilityTree(page, { includeDescriptions: false }))
      .toMatchInlineSnapshot(`
      document
        button "click me"
        button "click me"
        button "click me"
        text "extended description"
    `);

    await utils.injectHTML(`
      <label>
        Label Text
        <input type="text"/>
      </label>

      <label for="input">Label Text</label>
      <input type="text" id="input"/>
    `);

    expect(await getAccessibilityTree(page, { includeText: true }))
      .toMatchInlineSnapshot(`
      document
        text "Label Text"
        textbox "Label Text"
        text "Label Text"
        textbox "Label Text"
    `);
  }),
);

test(
  'hidden elements are excluded',
  withBrowser(async ({ utils, page }) => {
    // https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion
    await utils.injectHTML(`
      <button>A</button>
      <button style="display: none">B</button>
      <button style="visibility: hidden">C</button>
      <button hidden>D</button>
      <button aria-hidden>E</button>
      <button aria-hidden="true">F</button>
      <button aria-hidden="false">G</button>
      <div>
        <button>H</button>
      </div>
      <div style="display: none">
        <button>I</button>
      </div>
      <div aria-hidden="true">
        <button>J</button>
      </div>
      <div style="visibility: hidden">
        <button>K</button>
      </div>
      <div style="visibility: hidden">
        <button style="visibility: visible">L</button>
      </div>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        button "A"
        button "E"
        button "G"
        button "H"
        button "L"
    `);
  }),
);

test(
  'role="presentation"',
  withBrowser(async ({ utils, page }) => {
    await utils.injectHTML(`<h1 role="presentation">Sample Content</h1>`);
    // Role="presentation" and role="none" are equivalent
    // They make it as if the outer element wasn't there.
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        text "Sample Content"
    `);
    await utils.injectHTML(`<h1 role="none">Sample Content</h1>`);
    // Role="presentation" and role="none" are equivalent
    // They make it as if the outer element wasn't there.
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        text "Sample Content"
    `);

    // The li (role=listitem) children are required owned elements of the ul (role=list)
    // When the list is set to role=presentation,
    // the role=presentation cascades to the required owned elements
    // which don't have an explicit role set.
    // The third li has a different role so it is not a required owned element of the list
    await utils.injectHTML(`
      <ul role="presentation">
        <li>Sample Content</li>
        <li>More Sample Content</li>
        <li role="heading">Hi</li>
      </ul>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        text "Sample Content"
        text "More Sample Content"
        heading "Hi"
          text "Hi"
    `);
    // Now the third list item has an explicit role which is the same as its implicit role.
    // When the list gets role="presentation",
    // it only cascades to required owned elements _without_ explicit roles.
    // So the first two <li>'s should get role="presentation", and the last one should still have listitem.
    await utils.injectHTML(`
      <ul role="presentation">
        <li>Sample Content</li>
        <li>More Sample Content</li>
        <li role="listitem">Hi</li>
      </ul>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        text "Sample Content"
        text "More Sample Content"
        listitem
          text "Hi"
    `);
    // The required owned elements search should pass through elements without roles
    await utils.injectHTML(`
      <ul role="presentation">
        <div>
          <li>Sample Content</li>
        </div>
        <li>More Sample Content</li>
        <li role="heading">Hi</li>
      </ul>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        text "Sample Content"
        text "More Sample Content"
        heading "Hi"
          text "Hi"
    `);
    // The required owned elements search should _not_ pass through elements with roles
    await utils.injectHTML(`
      <ul role="presentation">
        <h1>
          <li>Sample Content</li>
        </h1>
        <li>More Sample Content</li>
        <li role="heading">Hi</li>
      </ul>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        heading "Sample Content"
          listitem
            text "Sample Content"
        text "More Sample Content"
        heading "Hi"
          text "Hi"
    `);
  }),
);

test(
  'labels which element is focused',
  withBrowser(async ({ utils, user, screen, page }) => {
    await utils.injectHTML(`
      <button style="padding: 20px">Click me!</button>
    `);

    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        button "Click me!"
    `);

    await user.click(await screen.getByRole('button'));

    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document
        button "Click me!" (focused)
    `);
  }),
);
