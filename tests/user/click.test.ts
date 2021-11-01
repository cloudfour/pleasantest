import type * as puppeteeer from 'puppeteer';
import { withBrowser } from 'pleasantest';
import type { PleasantestUtils } from 'pleasantest';

const setupOverlappingElements = async (
  utils: PleasantestUtils,
  page: puppeteeer.Page,
  cover = true,
) => {
  await utils.injectHTML(`
    <div id="first">First Box</div>
    <div id="second">Second Box</div>
  `);
  await utils.injectCSS(`
    #first {
      background: green;
      width: 30px;
      height: 30px;
      position: absolute;
      top: 5px;
      left: 5px
    }
    #second {
      background: red;
      width: 50px;
      height: 50px;
      position: absolute;
      top: ${cover ? '0' : '200px'};
      left: 0;
    }
  `);

  await utils.runJS(`
    const first = document.getElementById('first')
    const second = document.getElementById('second')
    first.addEventListener('click', () => {
      first.remove()
    })
    second.addEventListener('click', () => {
      second.remove()
    })
  `);

  const first = await page.$('#first');
  const second = await page.$('#second');

  await expect(first).toBeVisible();
  await expect(second).toBeVisible();

  return [first, second];
};

test(
  "puppeteer's .click clicks an overlapping element",
  withBrowser(async ({ utils, page }) => {
    const [first, second] = await setupOverlappingElements(utils, page);

    await first?.click();

    // This is the unexpected behavior:
    // because puppeteer fires a click at the _pixel location_ of the element
    // but since there is another element on top, the one on top actually gets clicked
    await expect(first).toBeInTheDocument();
    await expect(second).not.toBeInTheDocument();
  }),
);

test(
  'throws an error that the element is being covered',
  withBrowser(async ({ utils, page, user }) => {
    const [first, second] = await setupOverlappingElements(utils, page);
    await expect(user.click(first, { targetSize: false })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Could not click element:
            <div id=\\"first\\">First Box</div>

            Element was covered by:
            <div id=\\"second\\">Second Box</div>"
          `);

    // Since it threw neither element should have been clicked
    await expect(first).toBeInTheDocument();
    await expect(second).toBeInTheDocument();
  }),
);

test(
  '{ force: true } overrides covering check',
  withBrowser(async ({ utils, page, user }) => {
    const [first, second] = await setupOverlappingElements(utils, page);
    await user.click(first, { force: true });

    // With { force: true } it triggers the click, even though the element is covered,
    // so the covered element gets clicked (Puppeteer's default behavior)
    await expect(first).toBeInTheDocument();
    await expect(second).not.toBeInTheDocument();
  }),
);

test(
  'works fine for non-covered elements',
  withBrowser(async ({ utils, page, user }) => {
    const [first, second] = await setupOverlappingElements(utils, page, false);

    await user.click(first, { targetSize: false });
    await expect(first).not.toBeInTheDocument();
    await expect(second).toBeInTheDocument();
  }),
);

test(
  'works fine for child elements that "cover" the parent',
  withBrowser(async ({ utils, user, screen }) => {
    // The text in the button "covers" the button,
    // but the button should still be clickable
    await utils.injectHTML(`
      <button>
        <div>this is some text in the button</div>
      </button>
    `);

    const button = await screen.getByRole('button', {
      name: /this is some text/i,
    });

    await user.click(button, { targetSize: false });
  }),
);

describe('actionability checks', () => {
  test(
    'refuses to click detached element',
    withBrowser(async ({ utils, user, screen }) => {
      await utils.injectHTML(`<button>hi</button>`);
      const button = await screen.getByRole('button', { name: /hi/i });
      // Remove element from the DOM but still keep a reference to it
      await button.evaluate((b) => b.remove());
      await expect(user.click(button, { targetSize: false })).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot perform action on element that is not attached to the DOM:
              <button>hi</button>"
            `);
      // Puppeteer's .click doesn't work on detached elements,
      // so even with { force: true } we will not attempt to click
      await expect(user.click(button, { force: true })).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot perform action on element that is not attached to the DOM:
              <button>hi</button>"
            `);
    }),
  );

  test(
    'refuses to click non-visible element',
    withBrowser(async ({ utils, user, screen }) => {
      await utils.injectHTML(`
      <button style="opacity: 0">hi</button>
    `);

      const button = await screen.getByRole('button', { name: /hi/i });

      await expect(user.click(button, { targetSize: false })).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot perform action on element that is not visible (it is near zero opacity):
              <button style=\\"opacity: 0\\">hi</button>"
            `);
      // With { force: true } it should skip the visibility check
      await user.click(button, { force: true });
    }),
  );
});

test(
  'throws error if target size is too small',
  withBrowser(async ({ utils, screen, user }) => {
    await utils.injectHTML(`
      <button style="width: 2px; height: 2px; border: none; padding: 0;">hi</button>
    `);

    const button = await screen.getByRole('button', { name: /hi/i });

    await expect(user.click(button)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Cannot click element that is too small.
            Target size of element does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
            Element was 2px × 2px
            <button style=\\"width: 2px; height: 2px; border: none; padding: 0;\\">hi</button>
            You can customize the minimum target size by passing the user.targetSize option to configureDefaults or withBrowser or user.click"
          `);

    // This confirms a passing test when setting a custom target size
    await user.click(button, { targetSize: 2 });

    await expect(user.click(button, { targetSize: 46 })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Cannot click element that is too small.
            Target size of element is smaller than 46px × 46px
            Element was 2px × 2px
            <button style=\\"width: 2px; height: 2px; border: none; padding: 0;\\">hi</button>
            You can customize the minimum target size by passing the user.targetSize option to configureDefaults or withBrowser or user.click"
          `);

    await utils.injectHTML(`
      <p>This is text <a href="#">with a link</a></p>
    `);
    // Inline elements don't have the 44px × 44px minimum, per W3C recommendation
    const link: puppeteeer.ElementHandle<HTMLElement> = await screen.getByRole(
      'link',
    );

    await user.click(link);
  }),
);

test(
  'withBrowser custom target size',
  withBrowser({ user: { targetSize: 46 } }, async ({ utils, screen, user }) => {
    await utils.injectHTML(`
      <button style="width: 2px; height: 2px; border: none; padding: 0;">hi</button>
    `);

    const button = await screen.getByRole('button', { name: /hi/i });

    await expect(user.click(button)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Cannot click element that is too small.
            Target size of element is smaller than 46px × 46px
            Element was 2px × 2px
            <button style=\\"width: 2px; height: 2px; border: none; padding: 0;\\">hi</button>
            You can customize the minimum target size by passing the user.targetSize option to configureDefaults or withBrowser or user.click"
          `);
  }),
);
