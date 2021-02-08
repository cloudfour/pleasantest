import type * as puppeteeer from 'puppeteer';
import { withBrowser } from 'test-mule';
import type { TestMuleUtils } from 'test-mule';

const setupOverlappingElements = async (
  utils: TestMuleUtils,
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
  "puppeteer's .click clicks the covering element",
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
  'user.click throws an error that the element is being covered',
  withBrowser(async ({ utils, page, user }) => {
    const [first, second] = await setupOverlappingElements(utils, page);

    await expect(user.click(first)).rejects.toThrowErrorMatchingInlineSnapshot(`
            "user.click(element)

            Could not click element:
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
  'user.click works fine for non-covered elements',
  withBrowser(async ({ utils, page, user }) => {
    const [first, second] = await setupOverlappingElements(utils, page, false);

    await user.click(first);
    await expect(first).not.toBeInTheDocument();
    await expect(second).toBeInTheDocument();
  }),
);

test(
  'user.click works fine for child elements that "cover" the parent',
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

    await user.click(button);
  }),
);
