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

test(
  'target size check should pass',
  withBrowser(async ({ utils, screen, user }) => {
    //
    // Custom target size
    //
    {
      // Start with a tiny button
      await utils.injectHTML(`
        <button style="width: 3px; height: 3px; border: none; padding: 0;">hi</button>
      `);

      const button: puppeteeer.ElementHandle<HTMLButtonElement> =
        await screen.getByRole('button', { name: /hi/i });

      // Confirms a passing test when setting a custom target size
      await user.click(button, { targetSize: 2 });
    }

    //
    // Inline element
    //
    {
      // Inline elements don't have the 44px × 44px minimum, per W3C recommendation
      await utils.injectHTML(`
        <p>This is text <a href="#">with a link</a></p>
      `);

      const link: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('link');

      await user.click(link);
    }

    //
    // Inputs with large enough sizing
    //
    {
      await utils.injectHTML(`
        <style>
          label,
          input[type="text"] {
            padding: 1em;
          }
        </style>
        <label>
          <input type="checkbox" name="test-checkbox" /> Test checkbox
        </label>
        <label>
          <input type="radio" name="test-radio" /> Test radio
        </label>
        <label>Test text</label>
        <input type="text" name="test-text" id="text-text" /> 
      `);

      const checkbox: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('checkbox');
      const radio: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('radio');
      const text: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('textbox');

      await user.click(checkbox);
      await user.click(radio);
      await user.click(text);
    }
  }),
);

test(
  'target size check should throw error',
  withBrowser(async ({ utils, screen, user }) => {
    await utils.injectHTML(`
      <button style="width: 2px; height: 2px; border: none; padding: 0;">hi</button>
    `);

    const button: puppeteeer.ElementHandle<HTMLButtonElement> =
      await screen.getByRole('button', { name: /hi/i });

    await expect(user.click(button)).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Cannot click element that is too small.
            Target size of element does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
            Element was 2px × 2px
            <button style=\\"width: 2px; height: 2px; border: none; padding: 0;\\">hi</button>
            You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
          `);

    // Customizing the target size should catch elements that pass based on the default target size
    // The error message should also change when a custom target size is set
    await button.evaluate((button) => {
      button.style.width = '45px';
      button.style.height = '45px';
    });
    await expect(user.click(button, { targetSize: 46 })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "Cannot click element that is too small.
            Target size of element is smaller than 46px × 46px
            Element was 45px × 45px
            <button style=\\"width: 45px; height: 45px; border: none; padding: 0px;\\">hi</button>
            You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
          `);

    //
    // Checkbox input with small label
    //
    {
      // Small checkboxes with small labels should fail
      await utils.injectHTML(`
        <label style="display:block; width: 120px; height: 20px">
          <input type="checkbox" name="test-checkbox" /> Test checkbox
        </label>
      `);

      const checkbox: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('checkbox');

      await expect(user.click(checkbox)).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot click checkbox input that is too small.
              Target size of checkbox input does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
              Checkbox input was 13px × 13px
              <input type=\\"checkbox\\" name=\\"test-checkbox\\" />
              Label associated with the checkbox input was 120px × 20px
              <label style=\\"display:block; width: 120px; height: 20px\\">
                
                        
                <input type=\\"checkbox\\" name=\\"test-checkbox\\" />
                 Test checkbox
                      
              </label>
              You can increase the target size by making the label or checkbox input larger than 44px × 44px.
              You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
            `);
    }

    //
    // Checkbox input with no label
    //
    {
      // Small checkboxes with no label should fail
      await utils.injectHTML(`
        <input type="checkbox" name="test-checkbox" />
      `);

      const checkbox: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('checkbox');

      await expect(user.click(checkbox)).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot click checkbox input that is too small.
              Target size of checkbox input does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
              Checkbox input was 13px × 13px
              <input type=\\"checkbox\\" name=\\"test-checkbox\\" />
              You can increase the target size of the checkbox input by adding a label that is larger than 44px × 44px
              You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
            `);
    }

    //
    // Radio input with small label
    //
    {
      // Small radio inputs with small labels should fail
      await utils.injectHTML(`
        <label style="display:block; width: 120px; height: 20px">
          <input type="radio" name="test-radio" /> Test radio
        </label>
      `);

      const radio: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('radio');

      await expect(user.click(radio)).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot click radio input that is too small.
              Target size of radio input does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
              Radio input was 13px × 13px
              <input type=\\"radio\\" name=\\"test-radio\\" />
              Label associated with the radio input was 120px × 20px
              <label style=\\"display:block; width: 120px; height: 20px\\">
                
                        
                <input type=\\"radio\\" name=\\"test-radio\\" />
                 Test radio
                      
              </label>
              You can increase the target size by making the label or radio input larger than 44px × 44px.
              You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
            `);
    }

    //
    // Radio input with no label
    //
    {
      // Small radio inputs with no label should fail
      await utils.injectHTML(`
        <input type="radio" name="test-radio" />
      `);

      const radio: puppeteeer.ElementHandle<HTMLElement> =
        await screen.getByRole('radio');

      await expect(user.click(radio)).rejects
        .toThrowErrorMatchingInlineSnapshot(`
              "Cannot click radio input that is too small.
              Target size of radio input does not meet W3C recommendation of 44px × 44px: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
              Radio input was 13px × 13px
              <input type=\\"radio\\" name=\\"test-radio\\" />
              You can increase the target size of the radio input by adding a label that is larger than 44px × 44px
              You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
            `);
    }
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
            You can customize this check by setting the targetSize option, more details at https://github.com/cloudfour/pleasantest/blob/v2.0.0/docs/errors/target-size.md"
          `);
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
