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
    const body: ElementHandle = await page.evaluateHandle(() => document.body);
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
      main
        button "Add to cart"
        heading "hiiii"
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
        listitem
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
      <div id="click-me-description">extended description</div>
    `);
    expect(await getAccessibilityTree(body)).toMatchInlineSnapshot(`
      button "click me"
        ↳ description: "extended description"
    `);
    expect(await getAccessibilityTree(body, { includeText: true }))
      .toMatchInlineSnapshot(`
        button "click me"
          ↳ description: "extended description"
          text "click me"
        text "extended description"
      `);

    expect(
      await getAccessibilityTree(body, { includeDescriptions: false }),
    ).toMatchInlineSnapshot(`button "click me"`);
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
