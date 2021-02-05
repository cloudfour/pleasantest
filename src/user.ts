import type { ElementHandle } from 'puppeteer';
import {
  assertElementHandle,
  jsHandleToArray,
  removeFuncFromStackTrace,
} from './utils';

export interface TestMuleUser {
  /** Clicks an element, if the element is visible and not covered by another element */
  click(element: ElementHandle | null): Promise<void>;
}

export const testMuleUser = () => {
  const user: TestMuleUser = {
    async click(el) {
      assertElementHandle(el, user.click, 'user.click(el)', 'el');

      const failed = await el.evaluateHandle((clickEl) => {
        const clickElRect = clickEl.getBoundingClientRect();

        // See if there is an element covering the center of the click target element
        const coveringEl = document.elementFromPoint(
          Math.floor(clickElRect.x + clickElRect.width / 2),
          Math.floor(clickElRect.y + clickElRect.height / 2),
        );
        if (coveringEl === clickEl) return;
        // TODO: try to find other points on the element that are clickable,
        // in case the covering element does not cover the whole click-target element
        const messagePart1 =
          'user.click(element)\n\nCould not click element:\n';
        const messagePart2 = '\n\nElement was covered by:\n';
        // TODO: instead of using .outerHTML use the html formatter
        return {
          message:
            messagePart1 +
            clickEl.outerHTML +
            messagePart2 +
            coveringEl!.outerHTML,
          messageForBrowser: [messagePart1, clickEl, messagePart2, coveringEl],
        };
      });

      if (await failed.jsonValue()) {
        const error = new Error(
          (await failed
            .getProperty('message')
            .then((r) => r.jsonValue())) as any,
        );
        // @ts-expect-error
        error.messageForBrowser = await jsHandleToArray(
          await failed.getProperty('messageForBrowser'),
        );
        throw removeFuncFromStackTrace(error, user.click);
      }

      await el.click();
    },
  };
  return user;
};
