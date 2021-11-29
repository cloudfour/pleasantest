import type { ElementHandle } from 'pleasantest';
import {
  experimentalGetAccessibilityTree as getAccessibilityTree,
  withBrowser,
} from 'pleasantest';

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
    const body = await page.evaluateHandle<ElementHandle>(() => document.body);
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
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
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
      list
        listitem
          text "something"
        listitem
          text "something else"
    `);
    expect(await getAccessibilityTree(body, { includeText: true }))
      .toMatchInlineSnapshot(`
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
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
      button "click me"
        ↳ description: "extended description"
      button "click me"
        ↳ description: "extended description"
      button "click me"
        ↳ description: "extended description"
      text "extended description"
    `);
    expect(await getAccessibilityTree(body, { includeText: true }))
      .toMatchInlineSnapshot(`
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        text "extended description"
      `);

    expect(await getAccessibilityTree(body, { includeDescriptions: false }))
      .toMatchInlineSnapshot(`
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

    expect(await getAccessibilityTree(body, { includeText: true }))
      .toMatchInlineSnapshot(`
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
    const body = await page.evaluateHandle<ElementHandle>(() => document.body);
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
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
    const body = (await page.$('body'))!;
    await utils.injectHTML(`<h1 role="presentation">Sample Content</h1>`);
    // Role="presentation" and role="none" are equivalent
    // They make it as if the outer element wasn't there.
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(
      `text "Sample Content"`,
    );
    await utils.injectHTML(`<h1 role="none">Sample Content</h1>`);
    // Role="presentation" and role="none" are equivalent
    // They make it as if the outer element wasn't there.
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(
      `text "Sample Content"`,
    );

    // The li (role=listitem) children are required owned elements of the ul (role=list)
    // so when the list is set to role=presentation, the required owned elements are too
    // The third li has a different role so it is not a required owned element of the list
    await utils.injectHTML(`
      <ul role="presentation">
        <li>Sample Content</li>
        <li>More Sample Content</li>
        <li role="heading">Hi</li>
      </ul>
    `);
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
      text "Sample Content"
      text "More Sample Content"
      heading "Hi"
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
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
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
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
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
  withBrowser(async ({ utils, page, user, screen }) => {
    await utils.injectHTML(`
      <button>Click me!</button>
    `);

    const body = await page.evaluateHandle<ElementHandle>(() => document.body);

    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(
      `button "Click me!"`,
    );

    await user.click(await screen.getByRole('button'));

    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(
      `button "Click me!" (focused)`,
    );
  }),
);
