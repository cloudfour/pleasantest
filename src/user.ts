import type { ElementHandle, JSHandle, Page } from 'puppeteer';
import {
  assertElementHandle,
  jsHandleToArray,
  removeFuncFromStackTrace,
} from './utils';
import { port } from './vite-server';

export interface TestMuleUser {
  /** Clicks an element, if the element is visible and not covered by another element */
  click(
    element: ElementHandle | null,
    options?: { force?: boolean },
  ): Promise<void>;
  type(
    element: ElementHandle | null,
    text: string,
    options?: { delay?: number; force?: boolean },
  ): Promise<void>;

  isAttached(element: ElementHandle | null): Promise<boolean>;
  isVisible(element: ElementHandle | null): Promise<boolean>;
}

const forgotAwaitMsg =
  'Cannot interact with browser after test finishes. Did you forget to await?';

export const testMuleUser = (
  page: Page,
  state: { isTestFinished: boolean },
) => {
  const user: TestMuleUser = {
    async click(el, { force = false } = {}) {
      assertElementHandle(el, user.click);

      const forgotAwaitError = removeFuncFromStackTrace(
        new Error(forgotAwaitMsg),
        user.click,
      );

      const handleForgotAwait = (error: Error) => {
        throw state.isTestFinished && /target closed/i.test(error.message)
          ? forgotAwaitError
          : error;
      };

      await el
        .evaluateHandle(
          runWithUtils((utils, clickEl, force: boolean) => {
            try {
              utils.assertAttached(clickEl);
              if (!force) utils.assertVisible(clickEl);
            } catch (e) {
              return e;
            }
            const clickElRect = clickEl.getBoundingClientRect();

            // See if there is an element covering the center of the click target element
            const coveringEl = document.elementFromPoint(
              Math.floor(clickElRect.x + clickElRect.width / 2),
              Math.floor(clickElRect.y + clickElRect.height / 2),
            )!;
            if (coveringEl === clickEl || clickEl.contains(coveringEl)) return;
            // TODO: try to find other points on the element that are clickable,
            // in case the covering element does not cover the whole click-target element
            return utils.error`Could not click element:
${clickEl}

Element was covered by:
${coveringEl}`;
          }),
          force,
        )
        .then(throwBrowserError(user.click))
        .catch(handleForgotAwait);

      await el.click().catch(handleForgotAwait);
    },

    // Implementation notes:
    // - *Appends* to existing text - different from some other tools:
    //   Puppeteer and Playwright *Prepend*
    //   Cypress and user-event *Append*
    // - The names of the commands in curly brackets are mirroring the user-event command names
    //   *NOT* the Cypress names.
    //   i.e. Cypress uses {leftarrow} but user-event and test-mule use {arrowleft}
    async type(el, text, { delay = 10, force = false } = {}) {
      assertElementHandle(el, user.type);

      const forgotAwaitError = removeFuncFromStackTrace(
        new Error(forgotAwaitMsg),
        user.type,
      );
      const handleForgotAwait = (error: Error) => {
        throw state.isTestFinished && /target closed/i.test(error.message)
          ? forgotAwaitError
          : error;
      };

      // Splits input into chunks
      // i.e. "something{backspace}something{enter} "
      // => ["something", "{backspace}", "something", "{enter}"]
      const chunks: string[] = [];
      while (text) {
        if (text.startsWith('{')) {
          text = text.replace(
            /^{[^{}]*}/,
            (substr) => (chunks.push(substr.toLowerCase()), ''),
          );
        } else {
          text = text.replace(/^[^{]*/, (substr) => (chunks.push(substr), ''));
        }
      }
      await el
        .evaluateHandle(
          runWithUtils((utils, el, force: boolean) => {
            try {
              utils.assertAttached(el);
              if (!force) utils.assertVisible(el);
            } catch (e) {
              return e;
            }

            if (document.activeElement === el) {
              // No need to focus it, it is already focused
              // We won't move the cursor to the end either because that could be unexpected
            } else if (
              el instanceof HTMLInputElement ||
              el instanceof HTMLTextAreaElement
            ) {
              el.focus();
              // Move cursor to the end
              const end = el.value.length;
              el.setSelectionRange(end, end);
            } else if (el instanceof HTMLElement && el.isContentEditable) {
              el.focus();
              const range = el.ownerDocument.createRange();
              range.selectNodeContents(el);
              const end = el.textContent!.length;
              range.setStart(el.firstChild!, end);
              range.setEnd(el.firstChild!, end);
              // Move cursor to the end
              const sel = el.ownerDocument.getSelection()!;
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              return utils.error`Cannot type in element that is not typeable:
${el}
Element must be an <input> or <textarea> or an element with the contenteditable attribute.`;
            }
          }),
          force,
        )
        .then(throwBrowserError(user.type))
        .catch(handleForgotAwait);

      for (const chunk of chunks) {
        const key = typeCommandsMap[chunk];
        if (key) {
          await page.keyboard.press(key, { delay }).catch(handleForgotAwait);
        } else if (chunk === '{selectall}') {
          await el
            .evaluateHandle(
              runWithUtils((utils, el) => {
                if (
                  el instanceof HTMLInputElement ||
                  el instanceof HTMLTextAreaElement
                ) {
                  el.select();
                } else {
                  return utils.error`{selectall} command is only available for <input> and textarea elements, received: ${el}`;
                }
              }),
            )
            .then(throwBrowserError(user.type))
            .catch(handleForgotAwait);
        } else {
          await page.keyboard.type(chunk, { delay }).catch(handleForgotAwait);
        }
      }
    },

    async isAttached(el) {
      assertElementHandle(el, user.isAttached);

      const forgotAwaitError = removeFuncFromStackTrace(
        new Error(forgotAwaitMsg),
        user.isAttached,
      );

      return await el
        .evaluate(
          runWithUtils((utils, clickEl) => {
            try {
              utils.assertAttached(clickEl);
            } catch (e) {
              return false;
            }
            return true;
          }),
        )
        .catch((error: Error) => {
          throw state.isTestFinished && /target closed/i.test(error.message)
            ? forgotAwaitError
            : error;
        });
    },

    async isVisible(el) {
      assertElementHandle(el, user.isVisible);

      const forgotAwaitError = removeFuncFromStackTrace(
        new Error(forgotAwaitMsg),
        user.isVisible,
      );

      return await el
        .evaluate(
          runWithUtils((utils, clickEl) => {
            try {
              utils.assertVisible(clickEl);
            } catch (e) {
              return false;
            }
            return true;
          }),
        )
        .catch((error: Error) => {
          throw state.isTestFinished && /target closed/i.test(error.message)
            ? forgotAwaitError
            : error;
        });
    },
  };
  return user;
};

// note: command chunks are already lowercased so it is not case-sensitive
// left side: command
// right side: passed to pptr keyboard.press, full list at https://github.com/puppeteer/puppeteer/blob/main/src/common/USKeyboardLayout.ts
const typeCommandsMap: Record<string, string> = {
  '{enter}': 'Enter',
  '{arrowleft}': 'ArrowLeft',
  '{arrowright}': 'ArrowRight',
  '{arrowup}': 'ArrowLeft',
  '{arrowdown}': 'ArrowDown',
  '{tab}': 'Tab',
  '{backspace}': 'Backspace',
  '{del}': 'Delete',
};

const runWithUtils = <Args extends any[], Return extends unknown>(
  fn: (userUtil: typeof import('./user-util'), ...args: Args) => Return,
): ((...args: Args) => Promise<Return>) => {
  return new Function(
    '...args',
    `return import("http://localhost:${port}/@test-mule/user-util")
    .then((utils) => [utils, (0, ${fn.toString()})(utils, ...args)])
    .then(([utils, result]) => {
      if (result && typeof result === 'object' && result.error) {
        const msgWithLiveEls = result.error
        if (typeof msgWithLiveEls === 'string') return { error: msgWithLiveEls }
        const msgWithStringEls = msgWithLiveEls
          .map(el => {
            if (el instanceof Element || el instanceof Document)
              return utils.printElement(el)
            return el
          })
          .join('')
        return { error: { msgWithLiveEls, msgWithStringEls } }
      }
      return result
    })`,
  ) as any;
};

/**
 * When code that is evaluated in the browser returns {error: ...}, this function causes an error to be thrown in Node.
 * This is better than just throwing directly from the browser code because that would cause the error to be wrapped by Puppeteer's EvaluationError, which causes a confusing stack trace.
 */
const throwBrowserError = (func: (...params: any) => any) => async (
  result: JSHandle,
) => {
  const resultJSON = (await result.jsonValue()) as any;
  if (resultJSON?.error) {
    let err;
    if (typeof resultJSON.error === 'string') {
      err = new Error(resultJSON.error);
    } else {
      const errorProp = await result.getProperty('error');
      const errorProperties = Object.fromEntries(
        await errorProp.getProperties(),
      );
      if (errorProperties.msgWithStringEls && errorProperties.msgWithLiveEls) {
        err = new Error(
          (await errorProperties.msgWithStringEls.jsonValue()) as any,
        );
        // @ts-expect-error
        err.messageForBrowser = await jsHandleToArray(
          errorProperties.msgWithLiveEls,
        );
      } else {
        err = new Error((await errorProp.jsonValue()) as any);
      }
    }
    removeFuncFromStackTrace(err, func);
    throw err;
  }
  return result;
};
