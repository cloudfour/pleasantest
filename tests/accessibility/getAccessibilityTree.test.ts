import { getAccessibilityTree, withBrowser } from 'pleasantest';

test(
  'allows passing Page or ElementHandle',
  withBrowser(async ({ utils, page, screen }) => {
    await utils.injectHTML(`<ul></ul>`);
    await page.evaluate(() => (document.title = 'example title'));
    const htmlElement = await page.evaluateHandle(
      () => document.documentElement,
    );
    expect(String(await getAccessibilityTree(htmlElement))).toEqual(
      String(await getAccessibilityTree(page)),
    );
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "example title"
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
        <!-- This comment shouldn't show up -->
        <h1>hiiii</h1>
        <div role="button" tabindex="-1">foo &gt bar</div>
      </main>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        main
          button "Add to cart"
          heading "hiiii" (level=1)
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
      document "pleasantest"
        list
          listitem
            text "something"
          listitem
            text "something else"
    `);
    expect(await getAccessibilityTree(page, { includeText: false }))
      .toMatchInlineSnapshot(`
        document "pleasantest"
          list
            listitem
            listitem
      `);
    await utils.injectHTML(`
      <button aria-describedby="click-me-description">click me</button>
      <button aria-describedby="click-me-description"><div>click me</div></button>
      <button aria-describedby="click-me-description"><h1>click me</h1></button>
      <div id="click-me-description">extended description</div>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        button "click me"
          ↳ description: "extended description"
        text "extended description"
    `);
    expect(await getAccessibilityTree(page, { includeText: false }))
      .toMatchInlineSnapshot(`
        document "pleasantest"
          button "click me"
            ↳ description: "extended description"
          button "click me"
            ↳ description: "extended description"
          button "click me"
            ↳ description: "extended description"
      `);

    expect(await getAccessibilityTree(page, { includeDescriptions: false }))
      .toMatchInlineSnapshot(`
        document "pleasantest"
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

    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        text "Label Text"
        textbox "Label Text"
        text "Label Text"
        textbox "Label Text"
    `);

    // Make sure whitespace is normalized
    await utils.injectHTML(`
         <h1>


         Hello  
           world
       </h1>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        heading "Hello world" (level=1)
          text "Hello world"
    `);
  }),
);

test(
  'Whitespace is normalized in element names',
  withBrowser(async ({ utils, page }) => {
    // https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion
    await utils.injectHTML(
      `<button>Between these words is a ->\u00A0<- nbsp</button>`,
    );
    // The nbsp is normalized to a space so in the snapshot it is just a space
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        button "Between these words is a -> <- nbsp"
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
      document "pleasantest"
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
      document "pleasantest"
        text "Sample Content"
    `);
    await utils.injectHTML(`<h1 role="none">Sample Content</h1>`);
    // Role="presentation" and role="none" are equivalent
    // They make it as if the outer element wasn't there.
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
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
      document "pleasantest"
        text "Sample Content"
        text "More Sample Content"
        heading "Hi" (MISSING HEADING LEVEL)
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
      document "pleasantest"
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
      document "pleasantest"
        text "Sample Content"
        text "More Sample Content"
        heading "Hi" (MISSING HEADING LEVEL)
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
      document "pleasantest"
        heading "Sample Content" (level=1)
          listitem
            text "Sample Content"
        text "More Sample Content"
        heading "Hi" (MISSING HEADING LEVEL)
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
      document "pleasantest"
        button "Click me!"
    `);

    await user.click(await screen.getByRole('button'));

    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        button "Click me!" (focused)
    `);
  }),
);

test(
  'heading level labels',
  withBrowser(async ({ utils, page }) => {
    await utils.injectHTML(`
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <h4>Heading 4</h4>
      <h5>Heading 5</h5>
      <h6>Heading 6</h6>

      <div>Not a heading</div>
      <div aria-level="3">Not a heading</div>
      <div role="heading" aria-level="3">Heading 3 div</div>
      <div role="heading">Heading missing level</div>
      <div role="heading" aria-level="-2">Invalid heading level</div>
      <div role="heading" aria-level="asdf">Invalid heading level</div>
      <h2 aria-level="3">Heading 3 h2</h2>
    `);

    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        heading "Heading 1" (level=1)
          text "Heading 1"
        heading "Heading 2" (level=2)
          text "Heading 2"
        heading "Heading 3" (level=3)
          text "Heading 3"
        heading "Heading 4" (level=4)
          text "Heading 4"
        heading "Heading 5" (level=5)
          text "Heading 5"
        heading "Heading 6" (level=6)
          text "Heading 6"
        text "Not a heading"
        text "Not a heading"
        heading "Heading 3 div" (level=3)
          text "Heading 3 div"
        heading "Heading missing level" (MISSING HEADING LEVEL)
          text "Heading missing level"
        heading "Invalid heading level" (INVALID HEADING LEVEL: "-2")
          text "Invalid heading level"
        heading "Invalid heading level" (INVALID HEADING LEVEL: "asdf")
          text "Invalid heading level"
        heading "Heading 3 h2" (level=3)
          text "Heading 3 h2"
    `);
  }),
);

test(
  '<details>/<summary>',
  withBrowser(async ({ utils, page, screen, user }) => {
    await utils.injectHTML(`
      <details>
        <summary>
          Click me!
          <h1>Tags in summary do not preserve their semantic meaning</h1>
        </summary>
        <p>Some content</p>
        <h2>Tags in details do preserve their semantic meaning</h2>
      </details>
    `);

    // Starts collapsed
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        group
          button "Click me! Tags in summary do not preserve their semantic meaning" (expanded=false)
    `);

    const toggle = await screen.getByText(/click me!/i);
    await user.click(toggle);

    // After toggling it should be expanded
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        group
          button "Click me! Tags in summary do not preserve their semantic meaning" (expanded=true) (focused)
          text "Some content"
          heading "Tags in details do preserve their semantic meaning" (level=2)
            text "Tags in details do preserve their semantic meaning"
    `);
  }),
);

test(
  'aria-expanded and aria-collapsed',
  withBrowser(async ({ utils, page }) => {
    await utils.injectHTML(`
      <button aria-expanded="false">Click me!</button>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        button "Click me!" (expanded=false)
    `);

    await utils.injectHTML(`
      <button aria-expanded="true">Click me!</button>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        button "Click me!" (expanded=true)
    `);

    await utils.injectHTML(`
      <button>Click me!</button>
    `);
    expect(await getAccessibilityTree(page)).toMatchInlineSnapshot(`
      document "pleasantest"
        button "Click me!"
    `);
  }),
);
